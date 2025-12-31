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
            const roles = await db.getAllRoles();
            return res.status(200).json({
                success: true,
                roles: roles
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

            const { name, color, icon, permissions, isDisplaySeparate, priority } = body;
            
            if (!name || name.trim().length === 0) {
                return res.status(400).json({ error: 'Role name is required' });
            }

            const newRole = await db.createRole({
                name: name.trim(),
                color: color || '#6366f1',
                icon: icon || null,
                permissions: permissions || {},
                isDisplaySeparate: isDisplaySeparate || false,
                priority: priority || 0
            });

            return res.status(201).json({
                success: true,
                role: newRole
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

            const { roleId, ...updates } = body;
            
            if (!roleId) {
                return res.status(400).json({ error: 'Role ID is required' });
            }

            const updatedRole = await db.updateRole(roleId, updates);
            
            if (!updatedRole) {
                return res.status(404).json({ error: 'Role not found' });
            }

            return res.status(200).json({
                success: true,
                role: updatedRole
            });
        }

        if (req.method === 'DELETE') {
            const { roleId } = req.query || req.body || {};
            
            if (!roleId) {
                return res.status(400).json({ error: 'Role ID is required' });
            }

            await db.deleteRole(roleId);

            return res.status(200).json({
                success: true,
                message: 'Role deleted successfully'
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Roles API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

