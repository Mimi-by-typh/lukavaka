const db = require('../lib/database');

// Таймаут неактивности - 15 секунд (если нет heartbeat - сессия мертва)
const SESSION_TIMEOUT = 15 * 1000;

async function cleanupInactiveSessions() {
    const now = Date.now();
    const sessions = await db.getOnlineSessions();
    const activeSessions = {};
    
    for (const [sessionId, sessionData] of Object.entries(sessions)) {
        // Проверяем что сессия активна
        if (sessionData.lastActivity && (now - sessionData.lastActivity < SESSION_TIMEOUT)) {
            activeSessions[sessionId] = sessionData;
        }
    }
    
    await db.saveOnlineSessions(activeSessions);
    return activeSessions;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-ID, session-id');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Всегда сначала чистим старые сессии
    await cleanupInactiveSessions();
    
    if (req.method === 'GET') {
        try {
            const sessions = await db.getOnlineSessions();
            const onlineCount = Object.keys(sessions).length;
            
            return res.status(200).json({
                success: true,
                online: Math.max(1, onlineCount)
            });
        } catch (error) {
            console.error('Error getting online count:', error);
            return res.status(200).json({ success: true, online: 1 });
        }
    }
    
    if (req.method === 'POST') {
        try {
            const sessionId = req.headers['x-session-id'] || req.headers['session-id'];
            
            if (!sessionId) {
                return res.status(200).json({ success: true, online: 1 });
            }
            
            const { userId } = req.body || {};
            
            // Обновляем сессию с текущим временем
            await db.updateOnlineSession(sessionId, userId || 'guest', Date.now());
            
            // Получаем актуальный счёт
            const sessions = await db.getOnlineSessions();
            const onlineCount = Object.keys(sessions).length;
            
            return res.status(200).json({
                success: true,
                online: Math.max(1, onlineCount),
                sessionId: sessionId
            });
        } catch (error) {
            console.error('Error updating activity:', error);
            return res.status(200).json({ success: true, online: 1 });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
};
