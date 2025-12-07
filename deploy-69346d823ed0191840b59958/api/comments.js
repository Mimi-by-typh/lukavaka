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
    // CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    
    // Обработка OPTIONS запроса (CORS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // GET - получение комментариев
    if (req.method === 'GET') {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const start = (page - 1) * limit;
            const end = start + limit;
            
            const paginatedComments = comments.slice(start, end);
            
            return res.status(200).json({
                success: true,
                comments: paginatedComments,
                total: comments.length,
                page: page,
                totalPages: Math.ceil(comments.length / limit)
            });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch comments' });
        }
    }
    
    // POST - добавление комментария
    if (req.method === 'POST') {
        try {
            const user = verifyAuth(req);
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            const { text } = req.body;
            
            if (!text || text.trim().length === 0) {
                return res.status(400).json({ error: 'Comment text is required' });
            }
            
            if (text.length > 500) {
                return res.status(400).json({ error: 'Comment too long (max 500 characters)' });
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
            
            return res.status(201).json({
                success: true,
                comment: newComment
            });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to create comment' });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
};

