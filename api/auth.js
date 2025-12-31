const crypto = require('crypto');
const db = require('../lib/database');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'unknown';
}

function generateToken(user) {
    const payload = {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        provider: user.provider,
        exp: Date.now() + (24 * 60 * 60 * 1000)
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

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

function verifyTelegramAuth(telegramData) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('TELEGRAM_BOT_TOKEN is not set');
        return false;
    }

    const { hash, ...data } = telegramData;

    if (!hash) {
        return false;
    }

    const authDate = parseInt(data.auth_date, 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
        return false;
    }

    const checkString = Object.keys(data)
        .sort()
        .map(key => `${key}=${data[key]}`)
        .join('\n');

    const secretKey = crypto.createHash('sha256')
        .update(TELEGRAM_BOT_TOKEN)
        .digest();

    const hmac = crypto.createHmac('sha256', secretKey)
        .update(checkString)
        .digest('hex');

    return hmac === hash;
}

function handleCORS(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.status(200).end();
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return handleCORS(res);
    }

    try {
        const body = req.body || {};
        const { action, token } = body;

        if (action === 'telegram') {
            const telegramData = body.telegramData;

            if (!telegramData || typeof telegramData !== 'object') {
                return res.status(400).json({ error: 'Valid Telegram data is required' });
            }

            if (!telegramData.id || !telegramData.hash) {
                return res.status(400).json({ error: 'Missing required Telegram data fields' });
            }

            const isValid = verifyTelegramAuth(telegramData);

            if (!isValid) {
                return res.status(401).json({ error: 'Invalid Telegram authentication' });
            }

            const user = {
                id: 'telegram_' + telegramData.id,
                telegramId: telegramData.id,
                username: telegramData.username || `user${telegramData.id}`,
                firstName: telegramData.first_name || '',
                lastName: telegramData.last_name || '',
                photoUrl: telegramData.photo_url || '',
                provider: 'telegram',
                createdAt: new Date().toISOString()
            };

            const ipAddress = getClientIP(req);
            console.log('Telegram auth: Saving user', user.id, 'username:', user.username);
            const saveResult = await db.saveUser(user);
            console.log('Telegram auth: User save result', saveResult);
            await db.addUserIP(user.id, ipAddress);

            const isBanned = await db.isUserBanned(user.id);
            if (isBanned) {
                return res.status(403).json({ error: 'Your account has been banned' });
            }

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

        if (action === 'google') {
            const { idToken } = body;

            if (!idToken || typeof idToken !== 'string') {
                return res.status(400).json({ error: 'Valid Google ID token is required' });
            }

            try {
                const tokenParts = idToken.split('.');
                if (tokenParts.length !== 3) {
                    return res.status(400).json({ error: 'Invalid Google token format' });
                }

                const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());

                if (payload.exp && payload.exp * 1000 < Date.now()) {
                    return res.status(401).json({ error: 'Token expired' });
                }

                const googleUser = {
                    id: 'google_' + payload.sub,
                    username: payload.given_name || payload.name || `User${payload.sub.substr(0, 8)}`,
                    firstName: payload.given_name || '',
                    lastName: payload.family_name || '',
                    email: payload.email || '',
                    photoUrl: payload.picture || '',
                    provider: 'google',
                    createdAt: new Date().toISOString()
                };

                const ipAddress = getClientIP(req);
                console.log('Google auth: Saving user', googleUser.id, 'username:', googleUser.username);
                const saveResult = await db.saveUser(googleUser);
                console.log('Google auth: User save result', saveResult);
                await db.addUserIP(googleUser.id, ipAddress);

                const isBanned = await db.isUserBanned(googleUser.id);
                if (isBanned) {
                    return res.status(403).json({ error: 'Your account has been banned' });
                }

                const authToken = generateToken(googleUser);

                return res.status(200).json({
                    success: true,
                    user: {
                        id: googleUser.id,
                        username: googleUser.username,
                        firstName: googleUser.firstName,
                        lastName: googleUser.lastName,
                        avatar: googleUser.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(googleUser.username)}&background=random`,
                        email: googleUser.email,
                        provider: googleUser.provider
                    },
                    token: authToken
                });
            } catch (error) {
                console.error('Google token decode error:', error);
                return res.status(400).json({ error: 'Invalid Google token' });
            }
        }

        if (action === 'verify') {
            const payload = verifyToken(token);
            if (payload) {
                const isBanned = await db.isUserBanned(payload.id);
                if (isBanned) {
                    return res.status(403).json({ error: 'Your account has been banned' });
                }

                const ipAddress = getClientIP(req);
                await db.addUserIP(payload.id, ipAddress);

                return res.status(200).json({
                    success: true,
                    user: payload
                });
            } else {
                return res.status(401).json({ error: 'Invalid token' });
            }
        }

        if (action === 'logout') {
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
