const db = require('../lib/db');

function verifyAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;

    const token = authHeader.replace('Bearer ', '');
    if (!token) return null;

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

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const user = verifyAuth(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (req.method === 'GET') {
            const userProfile = await db.getUser(user.id);

            if (!userProfile) {
                return res.status(200).json({
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username || user.firstName || 'User',
                        avatar: user.photoUrl || user.avatar || null,
                        email: user.email || null,
                        provider: user.provider || 'google'
                    },
                    profile: {
                        id: user.id,
                        username: user.username || user.firstName || 'User',
                        avatar: user.photoUrl || user.avatar || null,
                        email: user.email || null,
                        provider: user.provider || 'google'
                    }
                });
            }

            return res.status(200).json({
                success: true,
                user: userProfile,
                profile: userProfile
            });
        }

        if (req.method === 'PUT' || req.method === 'POST') {
            let body = req.body;
            if (typeof body === 'string') {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid JSON' });
                }
            }

            const { username, avatar } = body || {};

            if (username !== undefined) {
                if (typeof username !== 'string' || username.trim().length === 0) {
                    return res.status(400).json({ error: 'Username cannot be empty' });
                }
                if (username.length > 32) {
                    return res.status(400).json({ error: 'Username too long (max 32 characters)' });
                }
            }

            if (avatar !== undefined && avatar !== null) {
                if (typeof avatar !== 'string' || avatar.trim().length === 0) {
                    return res.status(400).json({ error: 'Invalid avatar URL' });
                }
                if (avatar.startsWith('data:image/')) {
                    // Allow data URIs
                } else {
                    try {
                        new URL(avatar);
                    } catch (e) {
                        return res.status(400).json({ error: 'Invalid avatar URL format' });
                    }
                }
            }

            const updates = {};
            if (username !== undefined) {
                updates.username = username.trim();
            }
            if (avatar !== undefined) {
                updates.avatar = avatar.trim();
            }
            if (user.email) {
                updates.email = user.email;
            }

            const updatedProfile = await db.updateUserProfile(user.id, updates);

            if (!updatedProfile) {
                return res.status(500).json({ error: 'Failed to update profile' });
            }

            return res.status(200).json({
                success: true,
                user: updatedProfile,
                profile: updatedProfile,
                message: 'Profile updated successfully'
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Profile API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

