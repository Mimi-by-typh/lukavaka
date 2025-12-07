const crypto = require('crypto');

// Telegram Bot конфигурация
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Генерация JWT токена
function generateToken(user) {
    const payload = {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        provider: user.provider,
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 часа
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// Проверка токена
function verifyToken(token) {
    try {
        const payload = JSON.parse(Buffer.from(token, 'base64').toString());
        if (payload.exp < Date.now()) {
            return null;
        }
        return payload;
    } catch (error) {
        return null;
    }
}

// Проверка данных от Telegram
function verifyTelegramAuth(telegramData) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('TELEGRAM_BOT_TOKEN is not set');
        return false;
    }

    const { hash, ...data } = telegramData;

    if (!hash) {
        return false;
    }

    // Проверяем время авторизации (не старше 24 часов)
    const authDate = parseInt(data.auth_date, 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
        return false;
    }

    // Создаем строку для проверки
    const checkString = Object.keys(data)
        .sort()
        .map(key => `${key}=${data[key]}`)
        .join('\n');

    // Создаем секретный ключ из токена бота
    const secretKey = crypto.createHash('sha256')
        .update(TELEGRAM_BOT_TOKEN)
        .digest();

    // Вычисляем HMAC
    const hmac = crypto.createHmac('sha256', secretKey)
        .update(checkString)
        .digest('hex');

    return hmac === hash;
}

// Обработка CORS preflight
function handleCORS(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.status(200).end();
}

module.exports = async (req, res) => {
    // Устанавливаем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    // Обработка CORS preflight
    if (req.method === 'OPTIONS') {
        return handleCORS(res);
    }

    try {
        const body = req.body || {};
        const { action, token } = body;

        // Telegram вход с верификацией
        if (action === 'telegram') {
            const telegramData = body.telegramData;

            if (!telegramData) {
                return res.status(400).json({ error: 'Telegram data is required' });
            }

            // Проверяем подпись от Telegram
            const isValid = verifyTelegramAuth(telegramData);

            if (!isValid) {
                return res.status(401).json({ error: 'Invalid Telegram authentication' });
            }

            // Создаем пользователя из данных Telegram
            const user = {
                id: 'telegram_' + telegramData.id,
                telegramId: telegramData.id,
                username: telegramData.username || `user${telegramData.id}`,
                firstName: telegramData.first_name || '',
                lastName: telegramData.last_name || '',
                photoUrl: telegramData.photo_url || '',
                provider: 'telegram'
            };

            // Генерируем токен
            const authToken = generateToken(user);

            return res.status(200).json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    avatar: user.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName || user.username)}&background=random`,
                    provider: user.provider
                },
                token: authToken
            });
        }

        // Google OAuth вход (упрощенная демо-версия)
        if (action === 'google') {
            const googleUser = {
                id: 'google_' + crypto.randomBytes(16).toString('hex'),
                username: `GoogleUser_${Math.random().toString(36).substr(2, 9)}`,
                email: `user${Math.random().toString(36).substr(2, 9)}@gmail.com`,
                avatar: `https://ui-avatars.com/api/?name=Google+User&background=random`,
                provider: 'google'
            };

            const authToken = generateToken(googleUser);

            return res.status(200).json({
                success: true,
                user: {
                    id: googleUser.id,
                    username: googleUser.username,
                    avatar: googleUser.avatar,
                    provider: googleUser.provider
                },
                token: authToken
            });
        }

        // Проверка токена
        if (action === 'verify') {
            const payload = verifyToken(token);
            if (payload) {
                return res.status(200).json({
                    success: true,
                    user: payload
                });
            } else {
                return res.status(401).json({ error: 'Invalid token' });
            }
        }

        // Выход
        if (action === 'logout') {
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

