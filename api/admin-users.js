const db = require('../lib/database');

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
        if (payload.role !== 'admin') {
            return null;
        }
        
        const adminEmails = await db.getAdminEmails();
        if (!adminEmails.includes(payload.email?.toLowerCase())) {
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const admin = await verifyAdminAuth(req);
    if (!admin) {
        return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
    }

    try {
        if (req.method === 'GET') {
            const { action } = req.query || {};
            
            if (action === 'admins') {
                const adminEmails = await db.getAdminEmails();
                return res.status(200).json({
                    success: true,
                    admins: adminEmails
                });
            }
            
            if (action === 'users') {
                const users = await db.getAllUsers();
                console.log('getAllUsers returned:', users.length, 'users');
                console.log('Sample user:', users[0]);
                
                const usersList = users.map(user => ({
                    id: user.id,
                    username: user.username || user.firstName || `user${user.id}` || 'Unknown',
                    email: user.email || null,
                    avatar: user.avatar || user.photoUrl || null,
                    provider: user.provider || 'unknown',
                    createdAt: user.createdAt || user.updatedAt || null,
                    lastIP: user.lastIP || null,
                    ipAddresses: user.ipAddresses || [],
                    isBanned: user.isBanned || false,
                    bannedAt: user.bannedAt || null,
                    customPrefix: user.customPrefix || null,
                    prefixColor: user.prefixColor || null
                }));
                
                console.log('Users list prepared:', usersList.length, 'users');
                
                return res.status(200).json({
                    success: true,
                    users: usersList,
                    total: usersList.length
                });
            }
            
            const adminEmails = await db.getAdminEmails();
            return res.status(200).json({
                success: true,
                admins: adminEmails
            });
        }

        if (req.method === 'POST') {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            const success = await db.addAdminEmail(email);
            if (success) {
                return res.status(200).json({
                    success: true,
                    message: 'Admin added successfully',
                    email: email.toLowerCase()
                });
            } else {
                return res.status(500).json({ error: 'Failed to add admin' });
            }
        }

        if (req.method === 'PUT') {
            const { userId, action } = req.body;
            
            if (!userId || !action) {
                return res.status(400).json({ error: 'User ID and action are required' });
            }

            if (action === 'ban') {
                const success = await db.banUser(userId);
                if (success) {
                    return res.status(200).json({
                        success: true,
                        message: 'User banned successfully'
                    });
                } else {
                    return res.status(500).json({ error: 'Failed to ban user' });
                }
            }

            if (action === 'unban') {
                const success = await db.unbanUser(userId);
                if (success) {
                    return res.status(200).json({
                        success: true,
                        message: 'User unbanned successfully'
                    });
                } else {
                    return res.status(500).json({ error: 'Failed to unban user' });
                }
            }

            return res.status(400).json({ error: 'Invalid action' });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Admin users API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
