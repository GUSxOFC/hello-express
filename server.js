const express = require('express');
const { TelegramClient } = require('gramjs');
const { StringSession } = require('gramjs/sessions');
const { Api } = require('gramjs/tl');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;

const sessionFile = '.session.txt';
let stringSession = new StringSession(fs.existsSync(sessionFile) ? fs.readFileSync(sessionFile, 'utf8') : '');
let telegramClient;
let isLoggedIn = false;

const saveSession = (sessionString) => {
  fs.writeFileSync(sessionFile, sessionString);
};

// --- API ENDPOINTS ---
app.get('/api/status', (req, res) => res.json({ status: 'online', loggedIn: isLoggedIn }));
app.post('/api/send-code', async (req, res) => { /* ... kode untuk send code ... */ });
app.post('/api/sign-in', async (req, res) => { /* ... kode untuk sign in ... */ });
app.post('/api/broadcast', async (req, res) => { /* ... kode untuk broadcast ... */ });
app.post('/api/logout', async (req, res) => { /* ... kode untuk logout ... */ });

// --- Salin kode lengkapnya di sini ---
// (Saya memberikan versi lengkapnya di bawah agar tidak ada yang terlewat)
const express = require('express');
const { TelegramClient } = require('gramjs');
const { StringSession } = require('gramjs/sessions');
const { Api } = require('gramjs/tl');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;

const sessionFile = '.session.txt';
let stringSession = new StringSession(fs.existsSync(sessionFile) ? fs.readFileSync(sessionFile, 'utf8') : '');
let telegramClient;
let isLoggedIn = false;

const saveSession = (sessionString) => {
  fs.writeFileSync(sessionFile, sessionString);
};

app.get('/api/status', (req, res) => {
    res.json({ status: 'online', loggedIn: isLoggedIn });
});

app.post('/api/send-code', async (req, res) => {
    const { phoneNumber } = req.body;
    try {
        telegramClient = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
        await telegramClient.start({ phoneNumber: async () => phoneNumber, onError: (err) => console.error(err) });
        res.json({ success: true, message: 'Kode telah dikirim.' });
    } catch (error) {
        console.error("Error sending code:", error);
        res.status(500).json({ error: 'Gagal mengirim kode. Periksa API ID/Hash dan nomor telepon.' });
    }
});

app.post('/api/sign-in', async (req, res) => {
    const { code } = req.body;
    if (!telegramClient) return res.status(400).json({ error: 'Proses login belum dimulai.' });
    try {
        await telegramClient.start({ code: async () => code, onError: (err) => console.error(err) });
        console.log("Login berhasil!");
        isLoggedIn = true;
        stringSession = telegramClient.session.save();
        saveSession(stringSession.toString());
        res.json({ success: true, message: 'Login berhasil!' });
    } catch (error) {
        console.error("Error signing in:", error);
        res.status(500).json({ error: 'Kode salah atau kedaluwarsa.' });
    }
});

app.post('/api/broadcast', async (req, res) => {
    if (!isLoggedIn || !telegramClient) return res.status(401).json({ error: 'Anda belum login.' });
    const { message, buttonText, buttonLink } = req.body;
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
                await telegramClient.sendMessage(group.id, { message, buttons: buttons.length > 0 ? buttons : undefined });
                successCount++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) { console.error(`Gagal ke ${group.title}:`, e.message); }
        }
        res.json({ success: true, message: `Broadcast berhasil ke ${successCount} grup.` });
    } catch (error) { res.status(500).json({ error: 'Gagal broadcast.' }); }
});

app.post('/api/logout', async (req, res) => {
    if (telegramClient) await telegramClient.disconnect();
    telegramClient = null; isLoggedIn = false;
    if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
    res.json({ success: true, message: 'Logout berhasil.' });
});

app.listen(PORT, () => console.log('Server siap!'));
