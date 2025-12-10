const express = require('express');
const cors = require('cors');
dotenv = require('dotenv');
const { TelegramClient } = require('gramjs');
const { StringSession } = require('gramjs/sessions');
const { Api } = require('gramjs/tl');
const fs = require('fs');
const path = require('path');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Menyajikan file HTML, CSS, JS dari folder public

const PORT = 3000;

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
let stringSession = new StringSession(process.env.SESSION_STRING || "");
let telegramClient;
let isLoggedIn = false;

// Fungsi untuk menyimpan session string ke file .env
const saveSessionToEnv = (sessionString) => {
    try {
        const envPath = path.join(__dirname, '.env');
        let envContent = fs.readFileSync(envPath, 'utf-8');
        const regex = /^SESSION_STRING=.*$/m;
        const newLine = `SESSION_STRING=${sessionString}`;
        if (envContent.match(regex)) {
            envContent = envContent.replace(regex, newLine);
        } else {
            envContent += `\n${newLine}`;
        }
        fs.writeFileSync(envPath, envContent);
        process.env.SESSION_STRING = sessionString; // Update di memori
    } catch (err) {
        console.error("Gagal menyimpan session ke .env:", err);
    }
};

// Endpoint untuk mengecek status backend
app.get('/api/status', (req, res) => {
    res.json({ status: 'online', loggedIn: isLoggedIn });
});

// Endpoint untuk meminta kode login
app.post('/api/send-code', async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'Nomor telepon diperlukan' });

    try {
        telegramClient = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
        await telegramClient.start({
            phoneNumber: async () => phoneNumber,
            password: async () => '', // Jika ada 2FA, Anda perlu menanganinya
            onError: (err) => console.error(err),
        });
        // `start` akan meminta kode secara otomatis jika session tidak valid
        res.json({ success: true, message: 'Kode telah dikirim ke Telegram Anda.' });
    } catch (error) {
        console.error("Error sending code:", error);
        res.status(500).json({ error: 'Gagal mengirim kode. Periksa nomor telepon dan API ID/Hash.' });
    }
});

// Endpoint untuk memasukkan kode dan sign in
app.post('/api/sign-in', async (req, res) => {
    const { code } = req.body;
    if (!telegramClient) return res.status(400).json({ error: 'Proses login belum dimulai.' });

    try {
        // `start` akan menggunakan kode yang diberikan
        await telegramClient.start({
            phoneNumber: async () => "", // Sudah diisi sebelumnya
            password: async () => "",
            code: async () => code,
            onError: (err) => console.error(err),
        });
        
        console.log("Login berhasil!");
        isLoggedIn = true;
        stringSession = telegramClient.session.save();
        saveSessionToEnv(stringSession.toString()); // Simpan session agar tidak login lagi
        
        res.json({ success: true, message: 'Login berhasil!' });
    } catch (error) {
        console.error("Error signing in:", error);
        res.status(500).json({ error: 'Kode salah atau kedaluwarsa.' });
    }
});

// Endpoint untuk broadcast
app.post('/api/broadcast', async (req, res) => {
    if (!isLoggedIn || !telegramClient) {
        return res.status(401).json({ error: 'Anda belum login.' });
    }

    const { message, buttonText, buttonLink } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    }

    try {
        const dialogs = await telegramClient.getDialogs({});
        const groups = dialogs.filter(d => d.isChannel || d.isGroup);

        let buttons = [];
        if (buttonText && buttonLink) {
            buttons = [Api.TypeInlineKeyboardButton.url({ text: buttonText, url: buttonLink })];
        }

        let successCount = 0;
        for (const group of groups) {
            try {
                await telegramClient.sendMessage(group.id, {
                    message: message,
                    buttons: buttons.length > 0 ? buttons : undefined,
                });
                successCount++;
                // Jeda agar tidak terkena rate limit (spam)
                await new Promise(resolve => setTimeout(resolve, 1000)); 
            } catch (e) {
                console.error(`Gagal mengirim ke grup ${group.title}:`, e.message);
            }
        }
        res.json({ success: true, message: `Broadcast berhasil dikirim ke ${successCount} grup.` });
    } catch (error) {
        console.error("Error during broadcast:", error);
        res.status(500).json({ error: 'Gagal melakukan broadcast.' });
    }
});

// Endpoint untuk logout
app.post('/api/logout', async (req, res) => {
    if (telegramClient) {
        await telegramClient.disconnect();
    }
    telegramClient = null;
    isLoggedIn = false;
    saveSessionToEnv(""); // Hapus session
    res.json({ success: true, message: 'Logout berhasil.' });
});

app.listen(PORT, () => {
    console.log(`Backend berjalan di http://localhost:${PORT}`);
});
