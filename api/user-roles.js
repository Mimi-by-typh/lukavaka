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
            const { userId } = req.query || {};
            
            if (userId) {
                const roles = await db.getUserRolesList(userId);
                const mainRole = await db.getUserMainRole(userId);
                const user = await db.getUser(userId);
                
                return res.status(200).json({
                    success: true,
                    roles: roles,
                    mainRole: mainRole,
                    customPrefix: user?.customPrefix || null,
                    prefixColor: user?.prefixColor || null
                });
            }
            
            const userRoles = await db.getUserRoles();
            return res.status(200).json({
                success: true,
                userRoles: userRoles
            });
        }

        if (req.method === 'POST') {
            let body = req.body;
            if (typeof body === 'string') {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid JSON' });
                }
            }

            const { userId, roleId } = body;
            
            if (!userId || !roleId) {
                return res.status(400).json({ error: 'User ID and Role ID are required' });
            }

            await db.assignRoleToUser(userId, roleId);

            return res.status(200).json({
                success: true,
                message: 'Role assigned successfully'
            });
        }

        if (req.method === 'DELETE') {
            const { userId, roleId } = req.query || req.body || {};
            
            if (!userId || !roleId) {
                return res.status(400).json({ error: 'User ID and Role ID are required' });
            }

            await db.removeRoleFromUser(userId, roleId);

            return res.status(200).json({
                success: true,
                message: 'Role removed successfully'
            });
        }

        if (req.method === 'PUT') {
            let body = req.body;
            if (typeof body === 'string') {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid JSON' });
                }
            }

            const { userId, customPrefix, prefixColor } = body;
            
            if (!userId) {
                return res.status(400).json({ error: 'User ID is required' });
            }

            await db.updateUserPrefix(userId, customPrefix, prefixColor);

            return res.status(200).json({
                success: true,
                message: 'User prefix updated successfully'
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('User roles API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

