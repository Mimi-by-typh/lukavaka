const db = require('../lib/database');

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

async function isAdmin(user) {
    if (!user) return false;

    if (user.role === 'admin') return true;

    if (user.email) {
        return await db.isAdmin(user.email);
    }

    return false;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        try {
            let comments = await db.getComments();

            const status = req.query.status;
            const search = req.query.search;
            const author = req.query.author;

            if (status && status !== 'all') {
                comments = comments.filter(c => c.status === status);
            }

            if (search) {
                const searchLower = search.toLowerCase();
                comments = comments.filter(c =>
                    c.text.toLowerCase().includes(searchLower) ||
                    c.author.toLowerCase().includes(searchLower)
                );
            }

            if (author) {
                comments = comments.filter(c => c.userId === author || c.author === author);
            }

            for (const comment of comments) {
                if (comment.userId && comment.userId !== 'unknown') {
                    const userRoles = await db.getUserRolesList(comment.userId);
                    const mainRole = await db.getUserMainRole(comment.userId);
                    const userData = await db.getUser(comment.userId);

                    comment.role = mainRole ? {
                        name: mainRole.name,
                        color: mainRole.color,
                        icon: mainRole.icon,
                        isDisplaySeparate: mainRole.isDisplaySeparate
                    } : null;
                    comment.customPrefix = userData?.customPrefix || null;
                    comment.prefixColor = userData?.prefixColor || null;
                }
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 100;
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
            console.error('Error fetching comments:', error);
            return res.status(500).json({ error: 'Failed to fetch comments' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const user = verifyAuth(req);
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
            }

            const adminCheck = await isAdmin(user);
            if (!adminCheck) {
                return res.status(403).json({ error: 'Forbidden. Admin access required.' });
            }

            const { commentId } = req.body || req.query || {};

            if (!commentId) {
                return res.status(400).json({ error: 'Comment ID is required' });
            }

            const deletedComment = await db.deleteCommentById(commentId);
            if (!deletedComment) {
                return res.status(404).json({ error: 'Comment not found' });
            }

            return res.status(200).json({
                success: true,
                message: 'Comment deleted successfully',
                deletedComment: deletedComment
            });
        } catch (error) {
            console.error('Comment deletion error:', error);
            return res.status(500).json({ error: 'Failed to delete comment' });
        }
    }

    if (req.method === 'PUT') {
        try {
            const user = verifyAuth(req);
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const adminCheck = await isAdmin(user);
            if (!adminCheck) {
                return res.status(403).json({ error: 'Forbidden. Admin access required.' });
            }

            let body = req.body;
            if (typeof body === 'string') {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid JSON' });
                }
            }

            const { commentId, text, status } = body;

            if (!commentId) {
                return res.status(400).json({ error: 'Comment ID is required' });
            }

            const comments = await db.getComments();
            const commentIndex = comments.findIndex(c => c.id === parseInt(commentId));

            if (commentIndex === -1) {
                return res.status(404).json({ error: 'Comment not found' });
            }

            if (text !== undefined) {
                if (text.trim().length === 0) {
                    return res.status(400).json({ error: 'Comment text cannot be empty' });
                }
                comments[commentIndex].text = text.trim();
            }

            if (status !== undefined) {
                const validStatuses = ['published', 'pending', 'hidden', 'deleted'];
                if (!validStatuses.includes(status)) {
                    return res.status(400).json({ error: 'Invalid status' });
                }
                comments[commentIndex].status = status;
            }

            comments[commentIndex].updatedAt = new Date().toISOString();
            await db.saveComments(comments);

            return res.status(200).json({
                success: true,
                comment: comments[commentIndex]
            });
        } catch (error) {
            console.error('Comment update error:', error);
            return res.status(500).json({ error: 'Failed to update comment' });
        }
    }

    if (req.method === 'POST') {
        try {
            const user = verifyAuth(req);
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            let body = req.body;
            if (typeof body === 'string') {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid JSON' });
                }
            }

            const { text } = body || {};

            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return res.status(400).json({ error: 'Comment text is required' });
            }

            if (text.length > 1000) {
                return res.status(400).json({ error: 'Comment too long (max 1000 characters)' });
            }

            // Basic sanitization (prevent script injection)
            const sanitizedText = text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
                .replace(/on\w+="[^"]*"/g, "")
                .trim();

            if (sanitizedText.length === 0) {
                return res.status(400).json({ error: 'Invalid comment text' });
            }

            let authorName = user.username || user.firstName || 'User';
            let avatarUrl = user.photoUrl || user.avatar;

            if (user.role === 'admin') {
                authorName = user.username || user.email?.split('@')[0] || 'Admin';
                avatarUrl = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=6366f1&color=fff`;
            } else {
                avatarUrl = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random`;
            }

            const userRoles = await db.getUserRolesList(user.id);
            const mainRole = await db.getUserMainRole(user.id);
            const userData = await db.getUser(user.id);

            const newComment = {
                id: Date.now(),
                author: authorName,
                avatar: avatarUrl,
                text: text.trim(),
                date: new Date().toISOString(),
                userId: user.id || user.email || 'unknown',
                isAdmin: user.role === 'admin' || await isAdmin(user),
                status: 'published',
                role: mainRole ? {
                    name: mainRole.name,
                    color: mainRole.color,
                    icon: mainRole.icon,
                    isDisplaySeparate: mainRole.isDisplaySeparate
                } : null,
                customPrefix: userData?.customPrefix || null,
                prefixColor: userData?.prefixColor || null
            };

            await db.addComment(newComment);

            return res.status(201).json({
                success: true,
                comment: newComment
            });
        } catch (error) {
            console.error('Comment creation error:', error);
            return res.status(500).json({ error: 'Failed to create comment: ' + error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
