const { TelegramClient } = require('gramjs');
const { StringSession } = require('gramjs/sessions');
const { Api } = require('gramjs/tl');
const { kv } = require('@vercel/kv');

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const SESSION_KEY = 'telegram-session-string'; // Key untuk menyimpan session di Vercel KV

// Fungsi untuk mendapatkan klien Telegram yang sudah login
const getLoggedInClient = async () => {
    const sessionString = await kv.get(SESSION_KEY);
    if (!sessionString) {
        return null; // Belum ada session, belum login
    }
    const stringSession = new StringSession(sessionString);
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });
    // Coba koneksi untuk memastikan session valid
    await client.connect();
    if (!(await client.checkAuth())) {
        await kv.del(SESSION_KEY); // Session tidak valid, hapus
        return null;
    }
    return client;
};

// Export handler untuk Vercel
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action } = req.body;

    try {
        if (action === 'status') {
            const client = await getLoggedInClient();
            res.json({ status: 'online', loggedIn: !!client });
            if (client) await client.disconnect();
            return;
        }

        if (action === 'send-code') {
            const { phoneNumber } = req.body;
            const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });
            await client.start({
                phoneNumber: async () => phoneNumber,
                onError: (err) => console.error(err),
            });
            res.json({ success: true, message: 'Kode telah dikirim.' });
            await client.disconnect();
            return;
        }

        if (action === 'sign-in') {
            const { code, phoneNumber } = req.body;
            const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });
            await client.start({
                phoneNumber: async () => phoneNumber,
                code: async () => code,
                onError: (err) => console.error(err),
            });
            console.log("Login berhasil!");
            const sessionString = client.session.save();
            await kv.set(SESSION_KEY, sessionString.toString()); // Simpan session ke Vercel KV
            res.json({ success: true, message: 'Login berhasil!' });
            await client.disconnect();
            return;
        }

        if (action === 'broadcast') {
            const client = await getLoggedInClient();
            if (!client) {
                return res.status(401).json({ error: 'Anda belum login atau session habis.' });
            }

            const { message, buttonText, buttonLink } = req.body;
            const dialogs = await client.getDialogs({});
            const groups = dialogs.filter(d => d.isChannel || d.isGroup);

            let buttons = [];
            if (buttonText && buttonLink) {
                buttons = [Api.TypeInlineKeyboardButton.url({ text: buttonText, url: buttonLink })];
            }

            let successCount = 0;
            for (const group of groups) {
                try {
                    await client.sendMessage(group.id, {
                        message: message,
                        buttons: buttons.length > 0 ? buttons : undefined,
                    });
                    successCount++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (e) {
                    console.error(`Gagal mengirim ke grup ${group.title}:`, e.message);
                }
            }
            res.json({ success: true, message: `Broadcast berhasil dikirim ke ${successCount} grup.` });
            await client.disconnect();
            return;
        }

        if (action === 'logout') {
            const client = await getLoggedInClient();
            if (client) {
                await client.disconnect();
            }
            await kv.del(SESSION_KEY); // Hapus session dari KV
            res.json({ success: true, message: 'Logout berhasil.' });
            return;
        }

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: error.message || 'Terjadi kesalahan pada server.' });
    }
};
