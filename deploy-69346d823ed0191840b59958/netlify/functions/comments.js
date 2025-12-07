// База данных комментариев (в реальном проекте используйте MongoDB/PostgreSQL)
let comments = [
    {
        id: 1,
        author: 'Demo User',
        avatar: 'https://picsum.photos/seed/demo1/40/40.jpg',
        text: 'Отличный сайт! Очень атмосферный дизайн.',
        date: new Date(Date.now() - 3600000).toISOString(),
        userId: 'demo1'
    },
    {
        id: 2,
        author: 'Visitor',
        avatar: 'https://picsum.photos/seed/demo2/40/40.jpg',
        text: 'Визуальные эффекты просто потрясающие!',
        date: new Date(Date.now() - 7200000).toISOString(),
        userId: 'demo2'
    }
];

// Проверка авторизации
function verifyAuth(event) {
    const token = event.headers.authorization?.replace('Bearer ', '');
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

// GET - получение комментариев
// POST - добавление комментария
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
    
    // GET - получение комментариев
    if (method === 'GET') {
        try {
            const page = parseInt(event.queryStringParameters?.page) || 1;
            const limit = parseInt(event.queryStringParameters?.limit) || 10;
            const start = (page - 1) * limit;
            const end = start + limit;
            
            const paginatedComments = comments.slice(start, end);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    comments: paginatedComments,
                    total: comments.length,
                    page: page,
                    totalPages: Math.ceil(comments.length / limit)
                })
            };
        } catch (error) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to fetch comments' })
            };
        }
    }
    
    // POST - добавление комментария
    if (method === 'POST') {
        try {
            const user = verifyAuth(event);
            if (!user) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Unauthorized' })
                };
            }
            
            const { text } = JSON.parse(event.body);
            
            if (!text || text.trim().length === 0) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Comment text is required' })
                };
            }
            
            if (text.length > 500) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Comment too long (max 500 characters)' })
                };
            }
            
            const newComment = {
                id: Date.now(),
                author: user.username,
                avatar: `https://picsum.photos/seed/${user.id}/40/40.jpg`,
                text: text.trim(),
                date: new Date().toISOString(),
                userId: user.id
            };
            
            comments.unshift(newComment);
            
            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    success: true,
                    comment: newComment
                })
            };
        } catch (error) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to create comment' })
            };
        }
    }
    
    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
    };
};
