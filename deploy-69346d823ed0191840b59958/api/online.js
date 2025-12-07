// Хранилище онлайн-пользователей
// В продакшене используйте Redis или другую внешнюю БД
const onlineUsers = new Map();
const userSessions = new Map();

// Очистка неактивных сессий
function cleanupInactiveSessions() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 минут
    
    for (const [sessionId, lastActivity] of onlineUsers.entries()) {
        if (now - lastActivity > timeout) {
            onlineUsers.delete(sessionId);
            const userId = userSessions.get(sessionId);
            if (userId) {
                userSessions.delete(sessionId);
            }
        }
    }
}

module.exports = async (req, res) => {
    // CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-ID, session-id');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    
    // Обработка OPTIONS запроса (CORS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Очистка неактивных сессий
    cleanupInactiveSessions();
    
    // GET - получение количества онлайн пользователей
    if (req.method === 'GET') {
        try {
            const uniqueUsers = new Set(userSessions.values());
            
            return res.status(200).json({
                success: true,
                online: uniqueUsers.size,
                sessions: onlineUsers.size
            });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to get online count' });
        }
    }
    
    // POST - обновление активности пользователя
    if (req.method === 'POST') {
        try {
            const sessionId = req.headers['x-session-id'] || 
                            req.headers['session-id'] || 
                            `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const { userId } = req.body || {};
            
            if (!sessionId) {
                return res.status(400).json({ error: 'Session ID required' });
            }
            
            // Обновляем время последней активности
            onlineUsers.set(sessionId, Date.now());
            
            if (userId) {
                userSessions.set(sessionId, userId);
            }
            
            const uniqueUsers = new Set(userSessions.values());
            
            return res.status(200).json({
                success: true,
                online: uniqueUsers.size,
                sessionId: sessionId
            });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to update activity' });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
};

