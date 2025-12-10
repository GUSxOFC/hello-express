document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api';
    const statusIndicator = document.getElementById('statusIndicator');
    const messageDiv = document.getElementById('message');

    // --- Fungsi Umum ---
    const showMessage = (text, type) => {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            messageDiv.className = 'message';
            messageDiv.textContent = '';
        }, 5000);
    };

    // --- Cek Status Backend ---
    const checkBackendStatus = async () => {
        try {
            const response = await fetch(`${API_URL}/status`);
            const data = await response.json();
            if (data.status === 'online') {
                statusIndicator.classList.add('online');
            } else {
                statusIndicator.classList.remove('online');
            }
        } catch (error) {
            statusIndicator.classList.remove('online');
            console.error('Backend tidak bisa dihubungi:', error);
        }
    };

    // Polling status setiap 3 detik
    setInterval(checkBackendStatus, 3000);
    checkBackendStatus(); // Cek saat pertama kali load

    // --- Logika Halaman Login (index.html) ---
    const loginForm = document.getElementById('loginForm');
    const codeForm = document.getElementById('codeForm');
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    const signInBtn = document.getElementById('signInBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phoneNumber = document.getElementById('phoneNumber').value;
            sendCodeBtn.disabled = true;
            sendCodeBtn.textContent = 'Mengirim...';

            try {
                const response = await fetch(`${API_URL}/send-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber }),
                });
                const data = await response.json();
                if (response.ok) {
                    showMessage(data.message, 'success');
                    codeForm.style.display = 'block';
                } else {
                    showMessage(data.error, 'error');
                }
            } catch (error) {
                showMessage('Gagal terhubung ke server.', 'error');
            } finally {
                sendCodeBtn.disabled = false;
                sendCodeBtn.textContent = 'Kirim Kode';
            }
        });

        codeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('code').value;
            signInBtn.disabled = true;
            signInBtn.textContent = 'Memproses...';

            try {
                const response = await fetch(`${API_URL}/sign-in`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code }),
                });
                const data = await response.json();
                if (response.ok) {
                    showMessage(data.message, 'success');
                    setTimeout(() => {
                        window.location.href = 'broadcast.html';
                    }, 1500);
                } else {
                    showMessage(data.error, 'error');
                }
            } catch (error) {
                showMessage('Gagal terhubung ke server.', 'error');
            } finally {
                signInBtn.disabled = false;
                signInBtn.textContent = 'Masuk';
            }
        });
    }

    // --- Logika Halaman Broadcast (broadcast.html) ---
    const broadcastForm = document.getElementById('broadcastForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const broadcastBtn = document.getElementById('broadcastBtn');

    if (broadcastForm) {
        broadcastForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            broadcastBtn.disabled = true;
            broadcastBtn.textContent = 'Mengirim...';

            const message = document.getElementById('message').value;
            const buttonText = document.getElementById('buttonText').value;
            const buttonLink = document.getElementById('buttonLink').value;

            try {
                const response = await fetch(`${API_URL}/broadcast`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, buttonText, buttonLink }),
                });
                const data = await response.json();
                if (response.ok) {
                    showMessage(data.message, 'success');
                    broadcastForm.reset();
                } else {
                    showMessage(data.error, 'error');
                }
            } catch (error) {
                showMessage('Gagal terhubung ke server.', 'error');
            } finally {
                broadcastBtn.disabled = false;
                broadcastBtn.textContent = 'Kirim Broadcast';
            }
        });

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await fetch(`${API_URL}/logout`, { method: 'POST' });
                    window.location.href = 'index.html';
                } catch (error) {
                    showMessage('Gagal logout.', 'error');
                }
            });
        }
    }
});
