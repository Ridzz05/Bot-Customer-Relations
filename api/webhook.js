require('dotenv').config();

const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

// =============================================================================
// Inisialisasi Bot & Supabase Client
// =============================================================================

const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'Environment variables BOT_TOKEN, SUPABASE_URL, dan SUPABASE_KEY harus diisi!'
  );
}

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================================================
// Helper: Kirim pesan dengan format HTML
// =============================================================================

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// =============================================================================
// Command: /start
// =============================================================================

bot.start((ctx) => {
  const nama = ctx.from.first_name || 'User';
  return ctx.replyWithHTML(
    `👋 <b>Halo, ${escapeHtml(nama)}!</b>\n\n` +
      `Saya adalah Bot Manajemen Pelanggan.\n` +
      `Berikut command yang tersedia:\n\n` +
      `📦 <code>/add_layanan {nama_layanan}</code>\n` +
      `   → Menambah kategori layanan baru\n\n` +
      `👤 <code>/add_pelanggan {nama} {layanan} {durasi}</code>\n` +
      `   → Menambah data pelanggan\n\n` +
      `📋 <code>/list_layanan</code>\n` +
      `   → Melihat daftar layanan yang tersedia`
  );
});

// =============================================================================
// Command: /add_layanan {nama_layanan}
// =============================================================================

bot.command('add_layanan', async (ctx) => {
  try {
    const args = ctx.message.text.split(' ').slice(1);
    const namaLayanan = args.join(' ').trim();

    if (!namaLayanan) {
      return ctx.replyWithHTML(
        `⚠️ <b>Format salah!</b>\n\n` +
          `Gunakan: <code>/add_layanan {nama_layanan}</code>\n` +
          `Contoh: <code>/add_layanan Internet Fiber</code>`
      );
    }

    const { data, error } = await supabase
      .from('layanan')
      .insert({ nama_layanan: namaLayanan })
      .select()
      .single();

    if (error) {
      // Handle duplicate (unique constraint violation)
      if (error.code === '23505') {
        return ctx.replyWithHTML(
          `❌ Layanan <b>"${escapeHtml(namaLayanan)}"</b> sudah terdaftar.`
        );
      }
      console.error('[add_layanan] Supabase error:', error);
      return ctx.replyWithHTML(
        `❌ Gagal menambah layanan.\n<code>${escapeHtml(error.message)}</code>`
      );
    }

    return ctx.replyWithHTML(
      `✅ Layanan berhasil ditambahkan!\n\n` +
        `📦 <b>Nama:</b> ${escapeHtml(data.nama_layanan)}\n` +
        `🆔 <b>ID:</b> ${data.id}`
    );
  } catch (err) {
    console.error('[add_layanan] Unexpected error:', err);
    return ctx.replyWithHTML('❌ Terjadi kesalahan internal. Coba lagi nanti.');
  }
});

// =============================================================================
// Command: /add_pelanggan {nama} {layanan} {durasi}
// =============================================================================

bot.command('add_pelanggan', async (ctx) => {
  try {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 3) {
      return ctx.replyWithHTML(
        `⚠️ <b>Format salah!</b>\n\n` +
          `Gunakan: <code>/add_pelanggan {nama} {layanan} {durasi}</code>\n` +
          `Contoh: <code>/add_pelanggan "Budi Santoso" "Internet Fiber" "30 Hari"</code>\n\n` +
          `💡 Gunakan tanda kutip <code>"..."</code> untuk nama/layanan yang mengandung spasi.`
      );
    }

    // Parse arguments — support quoted strings
    const rawText = ctx.message.text.replace(/^\/add_pelanggan\s+/, '');
    const parsed = parseQuotedArgs(rawText);

    if (parsed.length < 3) {
      return ctx.replyWithHTML(
        `⚠️ <b>Argumen tidak lengkap!</b>\n\n` +
          `Dibutuhkan 3 argumen: <b>nama</b>, <b>layanan</b>, <b>durasi</b>.\n` +
          `Gunakan tanda kutip <code>"..."</code> untuk nilai yang mengandung spasi.\n\n` +
          `Contoh: <code>/add_pelanggan "Budi Santoso" "Internet Fiber" "30 Hari"</code>`
      );
    }

    const [namaPelanggan, namaLayanan, durasiWaktu] = parsed;

    // Cek apakah layanan sudah terdaftar
    const { data: layanan, error: layananErr } = await supabase
      .from('layanan')
      .select('nama_layanan')
      .eq('nama_layanan', namaLayanan)
      .single();

    if (layananErr || !layanan) {
      return ctx.replyWithHTML(
        `❌ Layanan <b>"${escapeHtml(namaLayanan)}"</b> belum terdaftar!\n\n` +
          `Silakan tambahkan dulu dengan:\n` +
          `<code>/add_layanan ${escapeHtml(namaLayanan)}</code>`
      );
    }

    // Insert pelanggan
    const { data, error } = await supabase
      .from('pelanggan')
      .insert({
        nama_pelanggan: namaPelanggan,
        nama_layanan: namaLayanan,
        durasi_waktu: durasiWaktu,
      })
      .select()
      .single();

    if (error) {
      // Handle foreign key violation (fallback)
      if (error.code === '23503') {
        return ctx.replyWithHTML(
          `❌ Layanan <b>"${escapeHtml(namaLayanan)}"</b> belum terdaftar!\n\n` +
            `Silakan tambahkan dulu dengan:\n` +
            `<code>/add_layanan ${escapeHtml(namaLayanan)}</code>`
        );
      }
      console.error('[add_pelanggan] Supabase error:', error);
      return ctx.replyWithHTML(
        `❌ Gagal menambah pelanggan.\n<code>${escapeHtml(error.message)}</code>`
      );
    }

    const tanggal = new Date(data.tanggal_masuk).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return ctx.replyWithHTML(
      `✅ Pelanggan berhasil ditambahkan!\n\n` +
        `👤 <b>Nama:</b> ${escapeHtml(data.nama_pelanggan)}\n` +
        `📦 <b>Layanan:</b> ${escapeHtml(data.nama_layanan)}\n` +
        `⏱️ <b>Durasi:</b> ${escapeHtml(data.durasi_waktu)}\n` +
        `📅 <b>Tanggal Masuk:</b> ${tanggal}`
    );
  } catch (err) {
    console.error('[add_pelanggan] Unexpected error:', err);
    return ctx.replyWithHTML('❌ Terjadi kesalahan internal. Coba lagi nanti.');
  }
});

// =============================================================================
// Command: /list_layanan
// =============================================================================

bot.command('list_layanan', async (ctx) => {
  try {
    const { data, error } = await supabase
      .from('layanan')
      .select('id, nama_layanan')
      .order('id', { ascending: true });

    if (error) {
      console.error('[list_layanan] Supabase error:', error);
      return ctx.replyWithHTML(
        `❌ Gagal mengambil data layanan.\n<code>${escapeHtml(error.message)}</code>`
      );
    }

    if (!data || data.length === 0) {
      return ctx.replyWithHTML(
        `📭 Belum ada layanan terdaftar.\n\n` +
          `Tambahkan dengan: <code>/add_layanan {nama_layanan}</code>`
      );
    }

    const list = data
      .map((item, i) => `${i + 1}. ${escapeHtml(item.nama_layanan)}`)
      .join('\n');

    return ctx.replyWithHTML(
      `📋 <b>Daftar Layanan:</b>\n\n${list}\n\n` +
        `Total: <b>${data.length}</b> layanan`
    );
  } catch (err) {
    console.error('[list_layanan] Unexpected error:', err);
    return ctx.replyWithHTML('❌ Terjadi kesalahan internal. Coba lagi nanti.');
  }
});

// =============================================================================
// Helper: Parse quoted arguments
// Supports: "arg with space" arg2 "arg3 with space"
// =============================================================================

function parseQuotedArgs(text) {
  const result = [];
  const regex = /"([^"]+)"|(\S+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    result.push(match[1] || match[2]);
  }
  return result;
}

// =============================================================================
// Vercel Serverless Handler (Webhook)
// =============================================================================

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body, res);
    } else {
      res.status(200).json({
        status: 'ok',
        bot: 'Manajemen Pelanggan Bot',
        message: 'Webhook endpoint aktif. Gunakan POST untuk update dari Telegram.',
      });
    }
  } catch (err) {
    console.error('[webhook] Error handling update:', err);
    res.status(200).json({ error: 'Internal error' });
  }
};
