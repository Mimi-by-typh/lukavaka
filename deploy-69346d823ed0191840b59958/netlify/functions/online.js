// Хранилище онлайн-пользователей
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

// GET - получение количества онлайн пользователей
// POST - обновление активности пользователя
exports.handler = async (event, context) => {
    const method = event.httpMethod;
    
    // CORS заголовки
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };
    
    // Обработка OPTIONS запроса (CORS)
    if (method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers
        };
    }
    
    // Очистка неактивных сессий
    cleanupInactiveSessions();
    
    // GET - получение количества онлайн пользователей
    if (method === 'GET') {
        try {
            const uniqueUsers = new Set(userSessions.values());
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    online: uniqueUsers.size,
                    sessions: onlineUsers.size
                })
            };
        } catch (error) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to get online count' })
            };
        }
    }
    
    // POST - обновление активности пользователя
    if (method === 'POST') {
        try {
            const sessionId = event.headers['x-session-id'] || 
                            event.headers['session-id'] || 
                            context.awsrequestid;
            
            const { userId } = JSON.parse(event.body || '{}');
            
            if (!sessionId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Session ID required' })
                };
            }
            
            // Обновляем время последней активности
            onlineUsers.set(sessionId, Date.now());
            
            if (userId) {
                userSessions.set(sessionId, userId);
            }
            
            const uniqueUsers = new Set(userSessions.values());
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    online: uniqueUsers.size,
                    sessionId: sessionId
                })
            };
        } catch (error) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to update activity' })
            };
        }
    }
    
    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
    };
};
