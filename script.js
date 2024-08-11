document.addEventListener('DOMContentLoaded', () => {
    const EVENTS_DELAY = 20000;
    const TELEGRAM_BOT_TOKEN = '7230408857:AAFiBAIdDBcyNg4-jNOwIVHaWKs11Venl4k';
    const MTPROTO_PROXY = {
        server: '95.169.173.163',
        port: '777',
        secret: '79ea54d21249bd7ac519CQ'
    };

    const games = {
        1: {
            name: 'Riding Extreme 3D',
            appToken: 'd28721be-fd2d-4b45-869e-9f253b554e50',
            promoId: '43e35910-c168-4634-ad4f-52fd764a843f',
        },
        2: {
            name: 'Chain Cube 2048',
            appToken: 'd1690a07-3780-4068-810f-9b5bbf2931b2',
            promoId: 'b4170868-cef0-424f-8eb9-be0622e8e8e3',
        },
        3: {
            name: 'My Clone Army',
            appToken: '74ee0b5b-775e-4bee-974f-63e7f4d5bacb',
            promoId: 'fe693b26-b342-4159-8808-15e3ff7f8767',
        },
        4: {
            name: 'Train Miner',
            appToken: '82647f43-3f87-402d-88dd-09a90025313f',
            promoId: 'c4480ac7-e178-4973-8061-9ed5b2e17954',
        }
    };

    const startBtn = document.getElementById('startBtn');
    const keyCountSelect = document.getElementById('keyCountSelect');
    const keyCountLabel = document.getElementById('keyCountLabel');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressLog = document.getElementById('progressLog');
    const gameSelect = document.getElementById('gameSelect');
    const gameSelectGroup = document.getElementById('gameSelectGroup');
    const keyCountGroup = document.getElementById('keyCountGroup');
    const generateMoreBtn = document.getElementById('generateMoreBtn');
    const supportBtn = document.getElementById('supportBtn');

    startBtn.addEventListener('click', async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const chatId = urlParams.get('chatId');

        if (!chatId) {
            alert('ChatId is missing. Please use a valid URL with chatId parameter.');
            return;
        }

        const gameChoice = parseInt(gameSelect.value);
        const keyCount = parseInt(keyCountSelect.value);
        const game = games[gameChoice];

        // Hide the form sections
        gameSelectGroup.style.display = 'none';
        keyCountGroup.style.display = 'none';

        keyCountLabel.innerText = `Number of keys: ${keyCount}`;

        progressBar.style.width = '0%';
        progressText.innerText = '0%';
        progressLog.innerText = 'Starting...';
        progressContainer.classList.remove('hidden');
        keyCountSelect.classList.add('hidden');
        gameSelect.classList.add('hidden');
        startBtn.classList.add('hidden');
        startBtn.disabled = true;

        let progress = 0;
        const updateProgress = (increment, message) => {
            progress += increment;
            progressBar.style.width = `${progress}%`;
            progressText.innerText = `${progress}%`;
            progressLog.innerText = message;
        };

        const generateKeyProcess = async () => {
            const clientId = generateClientId();
            let clientToken;
            try {
                clientToken = await login(clientId, game.appToken);
            } catch (error) {
                alert(`Failed to login: ${error.message}`);
                startBtn.disabled = false;
                return null;
            }

            for (let i = 0; i < 11; i++) {
                await sleep(EVENTS_DELAY * delayRandom());
                const hasCode = await emulateProgress(clientToken, game.promoId);
                updateProgress(7 / keyCount, 'Emulating progress...');
                if (hasCode) {
                    break;
                }
            }

            try {
                const key = await generateKey(clientToken, game.promoId);
                updateProgress(30 / keyCount, 'Generating key...');
                return key;
            } catch (error) {
                alert(`Failed to generate key: ${error.message}`);
                return null;
            }
        };

        const keys = await Promise.all(Array.from({ length: keyCount }, generateKeyProcess));

        if (keys.length > 0) {
            const validKeys = keys.filter(key => key);
            const message = `Generated keys for ${game.name}:\n\n${validKeys.join('\n')}`;
            try {
                await sendTelegramMessage(chatId, message);
                progressLog.innerText = 'Keys sent via Telegram!';
            } catch (error) {
                progressLog.innerText = `Failed to send keys: ${error.message}`;
            }
        } else {
            progressLog.innerText = 'Failed to generate keys.';
        }

        progressBar.style.width = '100%';
        progressText.innerText = '100%';

        generateMoreBtn.classList.remove('hidden');
        startBtn.disabled = false;
    });

    generateMoreBtn.addEventListener('click', () => {
        progressContainer.classList.add('hidden');
        startBtn.classList.remove('hidden');
        keyCountSelect.classList.remove('hidden');
        gameSelect.classList.remove('hidden');
        generateMoreBtn.classList.add('hidden');
        keyCountLabel.innerText = 'Number of keys:';
        
        // Show the form sections again
        gameSelectGroup.style.display = 'block';
        keyCountGroup.style.display = 'block';
    });

    supportBtn.addEventListener('click', () => {
        window.open('https://t.me/hoofik', '_blank');
    });

    const generateClientId = () => {
        const timestamp = Date.now();
        const randomNumbers = Array.from({ length: 19 }, () => Math.floor(Math.random() * 10)).join('');
        return `${timestamp}-${randomNumbers}`;
    };

    const login = async (clientId, appToken) => {
        const response = await fetch('https://api.gamepromo.io/promo/login-client', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                appToken,
                clientId,
                clientOrigin: 'deviceid'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to login');
        }

        const data = await response.json();
        return data.clientToken;
    };

    const emulateProgress = async (clientToken, promoId) => {
        const response = await fetch('https://api.gamepromo.io/promo/register-event', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${clientToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                promoId,
                eventId: generateUUID(),
                eventOrigin: 'undefined'
            })
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        return data.hasCode;
    };

    const generateKey = async (clientToken, promoId) => {
        const response = await fetch('https://api.gamepromo.io/promo/create-code', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${clientToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                promoId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate key');
        }

        const data = await response.json();
        return data.promoCode;
    };

    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    const delayRandom = () => Math.random() / 3 + 1;

    const sendTelegramMessage = async (chatId, text) => {
        const proxyUrl = `https://${MTPROTO_PROXY.server}:${MTPROTO_PROXY.port}/${MTPROTO_PROXY.secret}/api.telegram.org`;
        const url = `${proxyUrl}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Message sent successfully:', result);
            return result;
        } catch (error) {
            console.error('Failed to send Telegram message:', error);
            throw error;
        }
    };
});
