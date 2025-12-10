document.addEventListener('DOMContentLoaded', () => {
    const statusIndicator = document.getElementById('statusIndicator');
    const messageDiv = document.getElementById('message');

    const showMessage = (text, type) => {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            messageDiv.className = 'message';
            messageDiv.textContent = '';
        }, 5000);
    };

    const checkBackendStatus = async () => {
        try {
            const response = await fetch('/api/bot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'status' }),
            });
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

    setInterval(checkBackendStatus, 3000);
    checkBackendStatus();

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
                const response = await fetch('/api/bot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'send-code', phoneNumber }),
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
            const phoneNumber = document.getElementById('phoneNumber').value; // Ambil lagi nomornya
            signInBtn.disabled = true;
            signInBtn.textContent = 'Memproses...';
            try {
                const response = await fetch('/api/bot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sign-in', code, phoneNumber }),
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
                const response = await fetch('/api/bot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'broadcast', message, buttonText, buttonLink }),
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
                    await fetch('/api/bot', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'logout' }),
                    });
                    window.location.href = 'index.html';
                } catch (error) {
                    showMessage('Gagal logout.', 'error');
                }
            });
        }
    }
});
