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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        try {
            const settings = await db.getWidgetSettings();
            return res.status(200).json({
                success: true,
                settings: settings
            });
        } catch (error) {
            console.error('Widget settings API error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    const admin = await verifyAdminAuth(req);
    if (!admin) {
        return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
    }

    try {
        if (req.method === 'PUT' || req.method === 'POST') {
            let body = req.body;
            if (typeof body === 'string') {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid JSON' });
                }
            }

            await db.saveWidgetSettings(body);

            return res.status(200).json({
                success: true,
                message: 'Widget settings saved successfully',
                settings: await db.getWidgetSettings()
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Widget settings API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

