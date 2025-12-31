const fs = require('fs');
const path = require('path');

let kv = null;
let useKV = false;
let kvInitialized = false;

// Local DB path - use /tmp on serverless (Vercel)
const isProduction = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const DB_DIR = isProduction ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
    try {
        fs.mkdirSync(DB_DIR, { recursive: true });
    } catch (e) {
        console.error('Failed to create data directory:', e);
    }
}

// Keys for data storage
const KEYS = {
    COMMENTS: 'comments',
    USERS: 'users',
    ONLINE_SESSIONS: 'online_sessions',
    ADMIN_EMAILS: 'admin_emails',
    ROLES: 'roles',
    USER_ROLES: 'user_roles',
    WIDGET_SETTINGS: 'widget_settings'
};

const memoryStore = {
    comments: [],
    onlineSessions: {},
    adminEmails: [],
    users: {},
    roles: [],
    userRoles: {},
    widgetSettings: {}
};

// Helper to save to local JSON file
function saveToLocalDB() {
    // On production serverless, skip local DB if KV is available
    if (isProduction && useKV) {
        return; // KV is the source of truth
    }

    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(memoryStore, null, 2));
    } catch (error) {
        // Gracefully handle read-only filesystem (Vercel)
        if (error.code === 'EROFS' || error.code === 'EACCES') {
            console.warn('⚠️ Local DB save skipped (read-only filesystem). Using memory/KV only.');
            return;
        }
        console.error('Error saving to local DB:', error);
    }
}

// Helper to load from local JSON file
function loadFromLocalDB() {
    // On production serverless with KV, skip local DB
    if (isProduction && useKV) {
        return;
    }

    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            const parsed = JSON.parse(data);
            Object.assign(memoryStore, parsed);
            console.log('Loaded data from local DB');
        }
    } catch (error) {
        if (error.code !== 'EROFS' && error.code !== 'ENOENT') {
            console.error('Error loading from local DB:', error);
        }
    }
}

async function syncFromKV() {
    if (!useKV || !kv) return;

    try {
        const comments = await kv.get(KEYS.COMMENTS);
        if (comments) memoryStore.comments = comments;

        const sessions = await kv.get(KEYS.ONLINE_SESSIONS);
        if (sessions) memoryStore.onlineSessions = sessions;

        const admins = await kv.get(KEYS.ADMIN_EMAILS);
        if (admins) memoryStore.adminEmails = admins;

        const roles = await kv.get(KEYS.ROLES);
        if (roles) memoryStore.roles = roles;

        const userRoles = await kv.get(KEYS.USER_ROLES);
        if (userRoles) memoryStore.userRoles = userRoles;

        const widgetSettings = await kv.get(KEYS.WIDGET_SETTINGS);
        if (widgetSettings) memoryStore.widgetSettings = widgetSettings;

        try {
            const userKeys = await kv.keys(`${KEYS.USERS}:*`);
            console.log('syncFromKV: Found', userKeys.length, 'user keys in KV');
            for (const key of userKeys) {
                try {
                    const user = await kv.get(key);
                    if (user && user.id) {
                        memoryStore.users[user.id] = user;
                    }
                } catch (getError) {
                    console.error('Error getting user from key', key, ':', getError);
                }
            }
            console.log('syncFromKV: Loaded', Object.keys(memoryStore.users).length, 'users into memory');
        } catch (userError) {
            console.error('Error syncing users from KV:', userError);
        }

        // Also save to local DB as backup/cache
        saveToLocalDB();

    } catch (error) {
        console.error('Error syncing from KV:', error);
    }
}

async function initKV() {
    if (kvInitialized) {
        return useKV;
    }

    kvInitialized = true;

    // Try to load local data first
    loadFromLocalDB();

    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        try {
            const { createClient } = require('@vercel/kv');
            kv = createClient({
                url: process.env.KV_REST_API_URL,
                token: process.env.KV_REST_API_TOKEN,
            });
            useKV = true;
            console.log('✅ Vercel KV initialized successfully');

            await syncFromKV();

            return true;
        } catch (error) {
            console.error('❌ Failed to initialize KV:', error);
            useKV = false;
            return false;
        }
    } else {
        console.warn('⚠️ KV not configured. Using local file storage.');

        if (memoryStore.comments.length === 0) {
            memoryStore.comments = [
                {
                    id: Date.now() - 3600000,
                    author: 'Demo User',
                    avatar: 'https://picsum.photos/seed/demo1/40/40.jpg',
                    text: 'Отличный сайт! Очень атмосферный дизайн.',
                    date: new Date(Date.now() - 3600000).toISOString(),
                    userId: 'demo1'
                },
                {
                    id: Date.now() - 7200000,
                    author: 'Visitor',
                    avatar: 'https://picsum.photos/seed/demo2/40/40.jpg',
                    text: 'Визуальные эффекты просто потрясающие!',
                    date: new Date(Date.now() - 7200000).toISOString(),
                    userId: 'demo2'
                }
            ];
            saveToLocalDB();
        }

        if (memoryStore.adminEmails.length === 0) {
            const adminEmail = process.env.ADMIN_EMAIL || 'dalinnatasha6@gmail.com';
            memoryStore.adminEmails = [adminEmail.toLowerCase()];
            saveToLocalDB();
        } else {
            // Ensure default admin is always in the list
            const adminEmail = (process.env.ADMIN_EMAIL || 'dalinnatasha6@gmail.com').toLowerCase();
            if (!memoryStore.adminEmails.includes(adminEmail)) {
                memoryStore.adminEmails.push(adminEmail);
                saveToLocalDB();
            }
        }
        return false;
    }
}

async function getComments() {
    await initKV();

    if (useKV && kv) {
        try {
            const data = await kv.get(KEYS.COMMENTS);
            if (data) {
                memoryStore.comments = data;
                saveToLocalDB(); // Sync to local
                return data;
            }
            return memoryStore.comments;
        } catch (error) {
            console.error('Error getting comments from KV:', error);
            return memoryStore.comments;
        }
    }
    return memoryStore.comments || [];
}

async function saveComments(comments) {
    await initKV();

    memoryStore.comments = comments;
    saveToLocalDB(); // Always save locally

    if (useKV && kv) {
        try {
            await kv.set(KEYS.COMMENTS, comments);
            return true;
        } catch (error) {
            console.error('Error saving comments to KV:', error);
            return false;
        }
    }
    return true;
}

async function addComment(comment) {
    const comments = await getComments();
    comments.unshift(comment);
    await saveComments(comments);
    return comment;
}

async function deleteCommentById(commentId) {
    const comments = await getComments();
    const index = comments.findIndex(c => c.id === parseInt(commentId));
    if (index === -1) {
        return null;
    }
    const deleted = comments.splice(index, 1)[0];
    await saveComments(comments);
    return deleted;
}

async function getUser(userId) {
    await initKV();

    if (useKV && kv) {
        try {
            const user = await kv.get(`${KEYS.USERS}:${userId}`);
            if (user) {
                memoryStore.users[userId] = user;
                saveToLocalDB();
                return user;
            }
            return memoryStore.users[userId] || null;
        } catch (error) {
            console.error('Error getting user from KV:', error);
            return memoryStore.users[userId] || null;
        }
    }
    return memoryStore.users[userId] || null;
}

async function saveUser(user) {
    if (!user || !user.id) {
        console.error('saveUser: Invalid user data', user);
        return false;
    }

    await initKV();

    if (!memoryStore.users[user.id]) {
        user.createdAt = user.createdAt || new Date().toISOString();
        user.isBanned = user.isBanned || false;
        user.ipAddresses = user.ipAddresses || [];
    }

    user.updatedAt = new Date().toISOString();
    memoryStore.users[user.id] = user;
    saveToLocalDB();

    console.log('saveUser: Saving user', user.id, 'username:', user.username || user.firstName);

    if (useKV && kv) {
        try {
            await kv.set(`${KEYS.USERS}:${user.id}`, user);
            console.log('saveUser: User saved to KV successfully', user.id);
            return true;
        } catch (error) {
            console.error('Error saving user to KV:', error);
            return true;
        }
    } else {
        console.log('saveUser: KV not available, saved to memory/local only', user.id);
    }
    return true;
}

async function updateUserProfile(userId, updates) {
    if (!userId || !updates) return null;

    let user = await getUser(userId);

    if (!user) {
        user = {
            id: userId,
            username: updates.username || 'User',
            avatar: updates.avatar || null,
            email: updates.email || null,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isBanned: false,
            ipAddresses: []
        };
    } else {
        if (updates.username !== undefined) {
            user.username = updates.username;
        }
        if (updates.avatar !== undefined) {
            user.avatar = updates.avatar;
        }
        if (updates.email !== undefined) {
            user.email = updates.email;
        }
        user.updatedAt = new Date().toISOString();
    }

    await saveUser(user);

    return user;
}

async function addUserIP(userId, ipAddress) {
    if (!userId || !ipAddress) return false;

    const user = await getUser(userId);
    if (!user) return false;

    if (!user.ipAddresses) {
        user.ipAddresses = [];
    }

    if (!user.ipAddresses.includes(ipAddress)) {
        user.ipAddresses.push(ipAddress);
        user.lastIP = ipAddress;
        await saveUser(user);
    }

    return true;
}

async function getAllUsers() {
    await initKV();

    console.log('getAllUsers called, useKV:', useKV, 'memoryStore users:', Object.keys(memoryStore.users).length);

    if (useKV && kv) {
        try {
            const allKeys = await kv.keys(`${KEYS.USERS}:*`);
            console.log('Found keys in KV:', allKeys.length);

            const usersFromKV = [];

            for (const key of allKeys) {
                try {
                    const user = await kv.get(key);
                    if (user && user.id) {
                        memoryStore.users[user.id] = user;
                        usersFromKV.push(user);
                    }
                } catch (getError) {
                    console.error(`Error getting user from key ${key}:`, getError);
                }
            }

            saveToLocalDB();

            console.log('Loaded from KV:', usersFromKV.length, 'users');
            console.log('Memory store has:', Object.keys(memoryStore.users).length, 'users');

            const allUsers = usersFromKV.length > 0 ? usersFromKV : Object.values(memoryStore.users);

            return allUsers.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.updatedAt || 0);
                const dateB = new Date(b.createdAt || b.updatedAt || 0);
                return dateB - dateA;
            });
        } catch (keysError) {
            console.error('Error getting user keys from KV:', keysError);
            const users = Object.values(memoryStore.users);
            console.log('Fallback: returning', users.length, 'users from memory');
            return users.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.updatedAt || 0);
                const dateB = new Date(b.createdAt || b.updatedAt || 0);
                return dateB - dateA;
            });
        }
    }

    const users = Object.values(memoryStore.users);
    console.log('No KV, returning', users.length, 'users from memory');
    return users.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.updatedAt || 0);
        const dateB = new Date(b.createdAt || b.updatedAt || 0);
        return dateB - dateA;
    });
}

async function banUser(userId) {
    if (!userId) return false;

    const user = await getUser(userId);
    if (!user) return false;

    user.isBanned = true;
    user.bannedAt = new Date().toISOString();
    await saveUser(user);

    return true;
}

async function unbanUser(userId) {
    if (!userId) return false;

    const user = await getUser(userId);
    if (!user) return false;

    user.isBanned = false;
    user.bannedAt = null;
    await saveUser(user);

    return true;
}

async function isUserBanned(userId) {
    if (!userId) return false;

    const user = await getUser(userId);
    if (!user) return false;

    return user.isBanned === true;
}

async function getOnlineSessions() {
    await initKV();

    if (useKV && kv) {
        try {
            const data = await kv.get(KEYS.ONLINE_SESSIONS);
            if (data) {
                memoryStore.onlineSessions = data;
                saveToLocalDB();
                return data;
            }
            return memoryStore.onlineSessions;
        } catch (error) {
            console.error('Error getting online sessions from KV:', error);
            return memoryStore.onlineSessions;
        }
    }
    return memoryStore.onlineSessions || {};
}

async function saveOnlineSessions(sessions) {
    await initKV();

    memoryStore.onlineSessions = sessions;
    saveToLocalDB();

    if (useKV && kv) {
        try {
            await kv.set(KEYS.ONLINE_SESSIONS, sessions);
            return true;
        } catch (error) {
            console.error('Error saving online sessions to KV:', error);
            return false;
        }
    }
    return true;
}

async function updateOnlineSession(sessionId, userId, timestamp) {
    const sessions = await getOnlineSessions();
    sessions[sessionId] = {
        userId: userId,
        lastActivity: timestamp
    };
    await saveOnlineSessions(sessions);
}

async function removeOnlineSession(sessionId) {
    const sessions = await getOnlineSessions();
    delete sessions[sessionId];
    await saveOnlineSessions(sessions);
}

function getDefaultAdminEmail() {
    return (process.env.ADMIN_EMAIL || 'dalinnatasha6@gmail.com').toLowerCase();
}

async function getAdminEmails() {
    await initKV();

    if (useKV && kv) {
        try {
            const emails = await kv.get(KEYS.ADMIN_EMAILS);
            if (emails && Array.isArray(emails) && emails.length > 0) {
                memoryStore.adminEmails = emails;
                saveToLocalDB();

                // Ensure default admin is present even in KV data
                const defaultAdmin = getDefaultAdminEmail();
                if (!memoryStore.adminEmails.includes(defaultAdmin)) {
                    console.log('Restoring default admin to KV list');
                    await addAdminEmail(defaultAdmin);
                    return [...memoryStore.adminEmails, defaultAdmin]; // Return updated list immediately
                }

                return emails;
            }
        } catch (error) {
            console.error('Error getting admin emails from KV:', error);
        }
    }

    // If memory store has emails, return them (ensuring default is there)
    if (memoryStore.adminEmails.length > 0) {
        const defaultAdmin = getDefaultAdminEmail();
        if (!memoryStore.adminEmails.includes(defaultAdmin)) {
            memoryStore.adminEmails.push(defaultAdmin);
            saveToLocalDB();
        }
        return memoryStore.adminEmails;
    }

    // Fallback: return default admin
    const defaultAdmin = getDefaultAdminEmail();
    // We don't necessarily need to save to DB here if it's just a getter, 
    // but initializing it in memory is good practice if we want it to persist locally later.
    memoryStore.adminEmails = [defaultAdmin];
    saveToLocalDB();
    return [defaultAdmin];
}

async function addAdminEmail(email) {
    if (!email) return false;

    await initKV();

    // Force load current list
    await getAdminEmails();

    const emailLower = email.toLowerCase();

    if (!memoryStore.adminEmails.includes(emailLower)) {
        memoryStore.adminEmails.push(emailLower);
        saveToLocalDB();

        if (useKV && kv) {
            try {
                await kv.set(KEYS.ADMIN_EMAILS, memoryStore.adminEmails);
                console.log('Admin added to KV:', emailLower);
                return true;
            } catch (error) {
                console.error('Error adding admin email to KV:', error);
                // We still return true because we saved it locally/in-memory
                return true;
            }
        }
        return true;
    }

    return true; // Already exists
}

async function isAdmin(email) {
    if (!email) return false;
    const adminEmails = await getAdminEmails();
    return adminEmails.includes(email.toLowerCase());
}

async function getCommentsCount() {
    const comments = await getComments();
    return comments.length;
}

async function getOnlineUsersCount() {
    const sessions = await getOnlineSessions();
    const uniqueUsers = new Set();
    for (const sessionData of Object.values(sessions)) {
        if (sessionData.userId) {
            uniqueUsers.add(sessionData.userId);
        }
    }
    return uniqueUsers.size;
}

async function getAllRoles() {
    await initKV();

    if (useKV && kv) {
        try {
            const roles = await kv.get(KEYS.ROLES);
            if (roles && Array.isArray(roles)) {
                memoryStore.roles = roles;
                saveToLocalDB();
                return roles;
            }
            return memoryStore.roles || [];
        } catch (error) {
            console.error('Error getting roles from KV:', error);
            return memoryStore.roles || [];
        }
    }
    return memoryStore.roles || [];
}

async function saveRoles(roles) {
    await initKV();

    memoryStore.roles = roles;
    saveToLocalDB();

    if (useKV && kv) {
        try {
            await kv.set(KEYS.ROLES, roles);
            return true;
        } catch (error) {
            console.error('Error saving roles to KV:', error);
            return false;
        }
    }
    return true;
}

async function createRole(roleData) {
    const roles = await getAllRoles();
    const newRole = {
        id: Date.now().toString(),
        name: roleData.name,
        color: roleData.color || '#6366f1',
        icon: roleData.icon || null,
        permissions: roleData.permissions || {},
        isDisplaySeparate: roleData.isDisplaySeparate || false,
        priority: roleData.priority || 0,
        createdAt: new Date().toISOString()
    };
    roles.push(newRole);
    await saveRoles(roles);
    return newRole;
}

async function updateRole(roleId, updates) {
    const roles = await getAllRoles();
    const index = roles.findIndex(r => r.id === roleId);
    if (index === -1) return null;

    roles[index] = { ...roles[index], ...updates, updatedAt: new Date().toISOString() };
    await saveRoles(roles);
    return roles[index];
}

async function deleteRole(roleId) {
    const roles = await getAllRoles();
    const filtered = roles.filter(r => r.id !== roleId);
    await saveRoles(filtered);

    const userRoles = await getUserRoles();
    for (const userId in userRoles) {
        userRoles[userId] = userRoles[userId].filter(rid => rid !== roleId);
    }
    await saveUserRoles(userRoles);

    return true;
}

async function getUserRoles() {
    await initKV();

    if (useKV && kv) {
        try {
            const data = await kv.get(KEYS.USER_ROLES);
            if (data) {
                memoryStore.userRoles = data;
                saveToLocalDB();
                return data;
            }
            return memoryStore.userRoles || {};
        } catch (error) {
            console.error('Error getting user roles from KV:', error);
            return memoryStore.userRoles || {};
        }
    }
    return memoryStore.userRoles || {};
}

async function saveUserRoles(userRoles) {
    await initKV();

    memoryStore.userRoles = userRoles;
    saveToLocalDB();

    if (useKV && kv) {
        try {
            await kv.set(KEYS.USER_ROLES, userRoles);
            return true;
        } catch (error) {
            console.error('Error saving user roles to KV:', error);
            return false;
        }
    }
    return true;
}

async function assignRoleToUser(userId, roleId) {
    const userRoles = await getUserRoles();
    if (!userRoles[userId]) {
        userRoles[userId] = [];
    }
    if (!userRoles[userId].includes(roleId)) {
        userRoles[userId].push(roleId);
        await saveUserRoles(userRoles);
    }
    return true;
}

async function removeRoleFromUser(userId, roleId) {
    const userRoles = await getUserRoles();
    if (userRoles[userId]) {
        userRoles[userId] = userRoles[userId].filter(rid => rid !== roleId);
        await saveUserRoles(userRoles);
    }
    return true;
}

async function getUserRolesList(userId) {
    const userRoles = await getUserRoles();
    const roleIds = userRoles[userId] || [];
    const allRoles = await getAllRoles();
    return allRoles.filter(r => roleIds.includes(r.id)).sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

async function getUserMainRole(userId) {
    const roles = await getUserRolesList(userId);
    return roles.length > 0 ? roles[0] : null;
}

async function updateUserPrefix(userId, prefix, prefixColor) {
    const user = await getUser(userId);
    if (!user) return false;

    user.customPrefix = prefix || null;
    user.prefixColor = prefixColor || null;
    await saveUser(user);
    return true;
}

async function getWidgetSettings() {
    await initKV();

    if (useKV && kv) {
        try {
            const settings = await kv.get(KEYS.WIDGET_SETTINGS);
            if (settings) {
                memoryStore.widgetSettings = settings;
                saveToLocalDB();
                return settings;
            }
        } catch (error) {
            console.error('Error getting widget settings from KV:', error);
        }
    }

    if (Object.keys(memoryStore.widgetSettings).length === 0) {
        memoryStore.widgetSettings = {
            theme: 'dark',
            backgroundColor: '#1a1a1a',
            textColor: '#ffffff',
            accentColor: '#6366f1',
            borderRadius: '8px',
            enableLikes: true,
            enableReplies: true,
            enableAttachments: false,
            enableGravatar: true,
            autoModeration: false,
            requirePremoderation: false,
            moderationKeywords: []
        };
        saveToLocalDB();
    }

    return memoryStore.widgetSettings;
}

async function saveWidgetSettings(settings) {
    await initKV();

    memoryStore.widgetSettings = { ...memoryStore.widgetSettings, ...settings };
    saveToLocalDB();

    if (useKV && kv) {
        try {
            await kv.set(KEYS.WIDGET_SETTINGS, memoryStore.widgetSettings);
            return true;
        } catch (error) {
            console.error('Error saving widget settings to KV:', error);
            return false;
        }
    }
    return true;
}

module.exports = {
    getComments,
    saveComments,
    addComment,
    deleteComment: deleteCommentById,
    deleteCommentById,
    getCommentsCount,

    getUser,
    saveUser,
    updateUserProfile,
    addUserIP,
    getAllUsers,
    banUser,
    unbanUser,
    isUserBanned,

    getOnlineSessions,
    saveOnlineSessions,
    updateOnlineSession,
    removeOnlineSession,
    getOnlineUsersCount,

    getAdminEmails,
    addAdminEmail,
    isAdmin,

    getAllRoles,
    saveRoles,
    createRole,
    updateRole,
    deleteRole,
    getUserRoles,
    saveUserRoles,
    assignRoleToUser,
    removeRoleFromUser,
    getUserRolesList,
    getUserMainRole,
    updateUserPrefix,
    getWidgetSettings,
    saveWidgetSettings,

    isKVEnabled: () => useKV
};

