const db = require('../lib/db');

async function isAdmin(email) {
    const adminEmails = await db.getAdminEmails();
    return adminEmails.includes(email?.toLowerCase());
}

async function initAdmin() {
    try {
        const adminEmails = await db.getAdminEmails();
        const defaultAdmin = process.env.ADMIN_EMAIL || 'dalinnatasha6@gmail.com';
        if (!adminEmails.includes(defaultAdmin.toLowerCase())) {
            await db.addAdminEmail(defaultAdmin);
        }
    } catch (error) {
        console.error('Error initializing admin:', error);
    }
}

async function verifyAdminAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    
    const token = authHeader.replace('Bearer ', '');
    if (!token) return null;
    
    try {
        const payload = JSON.parse(Buffer.from(token, 'base64').toString());
        if (payload.exp < Date.now()) {
            return null;
        }
        const adminCheck = await isAdmin(payload.email);
        if (!adminCheck) {
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await initAdmin();
        
        const { action } = req.body || req.query || {};

        if (action === 'check') {
            const admin = await verifyAdminAuth(req);
            if (admin) {
                return res.status(200).json({
                    success: true,
                    isAdmin: true,
                    admin: {
                        email: admin.email,
                        username: admin.username
                    }
                });
            } else {
                return res.status(401).json({
                    success: false,
                    isAdmin: false,
                    error: 'Not authorized as admin'
                });
            }
        }

        if (action === 'login' && req.method === 'POST') {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            const adminCheck = await isAdmin(email);
            if (!adminCheck) {
                return res.status(403).json({ error: 'Access denied. You are not an admin.' });
            }

            const adminToken = Buffer.from(JSON.stringify({
                email: email.toLowerCase(),
                username: email.split('@')[0],
                role: 'admin',
                exp: Date.now() + (24 * 60 * 60 * 1000)
            })).toString('base64');

            return res.status(200).json({
                success: true,
                token: adminToken,
                admin: {
                    email: email.toLowerCase(),
                    username: email.split('@')[0]
                }
            });
        }

        const admin = await verifyAdminAuth(req);
        if (!admin) {
            return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
        }

        if (action === 'stats' && req.method === 'GET') {
            try {
                const totalComments = await db.getCommentsCount();
                const onlineUsers = await db.getOnlineUsersCount();
                
                return res.status(200).json({
                    success: true,
                    stats: {
                        totalComments: totalComments,
                        totalUsers: 0,
                        onlineUsers: onlineUsers
                    }
                });
            } catch (error) {
                console.error('Error getting stats:', error);
                return res.status(500).json({ error: 'Failed to get statistics' });
            }
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
        console.error('Admin API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
