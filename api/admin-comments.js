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

function verifyAdminAuth(req) {
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
        return payload;
    } catch (error) {
        return null;
    }
}

function syncComments() {
    return comments;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const admin = verifyAdminAuth(req);
    if (!admin) {
        return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
    }

    try {
        if (req.method === 'GET') {
            const allComments = syncComments();
            return res.status(200).json({
                success: true,
                comments: allComments,
                total: allComments.length
            });
        }

        if (req.method === 'DELETE') {
            const { commentId } = req.body || req.query || {};
            
            if (!commentId) {
                return res.status(400).json({ error: 'Comment ID is required' });
            }

            const commentIndex = comments.findIndex(c => c.id === parseInt(commentId));
            if (commentIndex === -1) {
                return res.status(404).json({ error: 'Comment not found' });
            }

            const deletedComment = comments.splice(commentIndex, 1)[0];

            return res.status(200).json({
                success: true,
                message: 'Comment deleted successfully',
                deletedComment: deletedComment
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Admin comments API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
