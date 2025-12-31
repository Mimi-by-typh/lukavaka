// GitHub as Database
// Stores data in a JSON file in your repository

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'Mimi-by-typh/lukavaka';
const DATA_FILE = 'data/storage.json';

let cache = null;
let cacheSha = null;
let lastFetch = 0;
const CACHE_TTL = 30000; // 30 seconds

// Online sessions in memory only (not saved to GitHub)
let onlineSessionsMemory = {};

async function githubRequest(method, endpoint, body = null) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}${endpoint}`;
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'LukaFrizz-App'
        }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    if (!response.ok && response.status !== 404) {
        const text = await response.text();
        throw new Error(`GitHub API error: ${response.status} - ${text}`);
    }
    if (response.status === 404) return null;
    return response.json();
}

async function getData() {
    // Return cache if fresh
    if (cache && Date.now() - lastFetch < CACHE_TTL) {
        return cache;
    }

    try {
        const result = await githubRequest('GET', `/contents/${DATA_FILE}`);
        if (!result) {
            // File doesn't exist, return default
            cache = getDefaultData();
            cacheSha = null;
            lastFetch = Date.now();
            return cache;
        }
        
        cacheSha = result.sha;
        const content = Buffer.from(result.content, 'base64').toString('utf8');
        cache = JSON.parse(content);
        lastFetch = Date.now();
        return cache;
    } catch (error) {
        console.error('Error fetching data from GitHub:', error);
        if (cache) return cache;
        return getDefaultData();
    }
}

async function saveData(data) {
    if (!GITHUB_TOKEN) {
        console.warn('GITHUB_TOKEN not set, cannot save to GitHub');
        cache = data;
        return false;
    }

    try {
        const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
        
        const body = {
            message: `Update data ${new Date().toISOString()}`,
            content: content,
            branch: 'main'
        };
        
        if (cacheSha) {
            body.sha = cacheSha;
        }

        const result = await githubRequest('PUT', `/contents/${DATA_FILE}`, body);
        if (result && result.content) {
            cacheSha = result.content.sha;
        }
        cache = data;
        lastFetch = Date.now();
        return true;
    } catch (error) {
        console.error('Error saving data to GitHub:', error);
        cache = data;
        return false;
    }
}

function getDefaultData() {
    return {
        comments: [],
        users: {},
        onlineSessions: {},
        adminEmails: ['dalinnatasha6@gmail.com'],
        roles: [],
        userRoles: {}
    };
}

// Export functions matching the db.js interface
module.exports = {
    async getComments() {
        const data = await getData();
        return data.comments || [];
    },

    async saveComments(comments) {
        const data = await getData();
        data.comments = comments;
        return saveData(data);
    },

    async addComment(comment) {
        const data = await getData();
        data.comments = data.comments || [];
        data.comments.unshift(comment);
        await saveData(data);
        return comment;
    },

    async deleteComment(commentId) {
        const data = await getData();
        const index = data.comments.findIndex(c => c.id === parseInt(commentId));
        if (index === -1) return null;
        const deleted = data.comments.splice(index, 1)[0];
        await saveData(data);
        return deleted;
    },

    async deleteCommentById(commentId) {
        return this.deleteComment(commentId);
    },

    async getUser(userId) {
        const data = await getData();
        return data.users?.[userId] || null;
    },

    async saveUser(user) {
        if (!user?.id) return false;
        const data = await getData();
        data.users = data.users || {};
        user.updatedAt = new Date().toISOString();
        if (!data.users[user.id]) {
            user.createdAt = user.createdAt || new Date().toISOString();
        }
        data.users[user.id] = user;
        return saveData(data);
    },

    async updateUserProfile(userId, updates) {
        const data = await getData();
        data.users = data.users || {};
        let user = data.users[userId] || {
            id: userId,
            createdAt: new Date().toISOString()
        };
        Object.assign(user, updates, { updatedAt: new Date().toISOString() });
        data.users[userId] = user;
        await saveData(data);
        return user;
    },

    async getAllUsers() {
        const data = await getData();
        return Object.values(data.users || {});
    },

    async getOnlineSessions() {
        return onlineSessionsMemory;
    },

    async saveOnlineSessions(sessions) {
        onlineSessionsMemory = sessions;
        return true;
    },

    async updateOnlineSession(sessionId, userId, timestamp) {
        onlineSessionsMemory[sessionId] = { userId, lastActivity: timestamp };
        return true;
    },

    async getAdminEmails() {
        const data = await getData();
        return data.adminEmails || ['dalinnatasha6@gmail.com'];
    },

    async isAdmin(email) {
        const admins = await this.getAdminEmails();
        return admins.includes(email?.toLowerCase());
    },

    async addAdminEmail(email) {
        const data = await getData();
        data.adminEmails = data.adminEmails || [];
        if (!data.adminEmails.includes(email.toLowerCase())) {
            data.adminEmails.push(email.toLowerCase());
            await saveData(data);
        }
        return true;
    },

    // Stubs for compatibility
    async banUser(userId) { return true; },
    async unbanUser(userId) { return true; },
    async isUserBanned(userId) { return false; },
    async addUserIP() { return true; },
    async getCommentsCount() { return (await this.getComments()).length; },
    async getOnlineUsersCount() { return Object.keys(await this.getOnlineSessions()).length; },
    async getAllRoles() { return []; },
    async saveRoles() { return true; },
    async createRole() { return null; },
    async updateRole() { return null; },
    async deleteRole() { return true; },
    async getUserRoles() { return {}; },
    async saveUserRoles() { return true; },
    async assignRoleToUser() { return true; },
    async removeRoleFromUser() { return true; },
    async getUserRolesList() { return []; },
    async getUserMainRole() { return null; },
    async updateUserPrefix() { return true; },
    async getWidgetSettings() { return {}; },
    async saveWidgetSettings() { return true; },
    async removeOnlineSession() { return true; },
    isKVEnabled: () => false,
    isGitHubEnabled: () => !!GITHUB_TOKEN
};
