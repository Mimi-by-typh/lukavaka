let currentUser = null;
let googleUserObject = null;
let authToken = null;
let onlineUsers = 0;
let comments = [];
let sessionId = null;
let currentPage = 1;
let hasMoreComments = true;

const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', function () {
    initializeAuth();
    initializeComments();
    initializeOnlineCounter();
    startOnlineTracking();
    initializeProfilePage();
});

window.onload = function () {
    if (typeof google === 'undefined') {
        console.error("Google Identity Services script not loaded.");
        return;
    }

    google.accounts.id.initialize({
        client_id: '763449879932-26sn2ggvn71a3ob2qh4qm69gvcp7fvdc.apps.googleusercontent.com',
        callback: handleCredentialResponse
    });

    google.accounts.id.renderButton(
        document.getElementById('googleSignInButton'),
        { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', logo_alignment: 'left' }
    );
};

async function handleCredentialResponse(response) {
    const id_token = response.credential;

    try {
        const serverResponse = await fetch(`${API_BASE}/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'google',
                idToken: id_token
            })
        });

        const data = await serverResponse.json();

        if (data.success) {
            currentUser = data.user;
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            updateAuthUI();
            showNotification(`Добро пожаловать, ${currentUser.username}!`);
        } else {
            showNotification(data.error || 'Ошибка авторизации');
            console.error('Auth error:', data);
        }
    } catch (error) {
        console.error('Error during Google auth:', error);
        showNotification('Ошибка подключения к серверу');
    }
}

function jwt_decode(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        console.error("Error decoding JWT", e);
        return null;
    }
}



function initializeAuth() {
    const logoutBtn = document.getElementById('logoutBtn');
    const promptLogin = document.getElementById('promptLogin');

    logoutBtn.addEventListener('click', logout);
    promptLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthButtons();
    });

    checkExistingSession();
}

async function logout() {
    if (authToken) {
        try {
            await fetch(`${API_BASE}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    action: 'logout',
                    token: authToken
                })
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    if (googleUserObject) {
        google.accounts.id.disableAutoSelect();
    }

    currentUser = null;
    googleUserObject = null;
    authToken = null;
    localStorage.removeItem('authToken');
    updateAuthUI();

    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
        profileModal.style.display = 'none';
    }

    showNotification('Вы вышли из системы');
}

async function checkExistingSession() {
    const savedToken = localStorage.getItem('authToken');
    if (!savedToken) return;

    try {
        const response = await fetch(`${API_BASE}/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'verify',
                token: savedToken
            })
        });

        const data = await response.json();

        if (data.success && data.user) {
            currentUser = {
                id: data.user.id,
                username: data.user.username,
                firstName: data.user.firstName,
                lastName: data.user.lastName,
                avatar: data.user.avatar || data.user.photoUrl,
                email: data.user.email,
                provider: data.user.provider
            };
            authToken = savedToken;
            updateAuthUI();
        } else {
            localStorage.removeItem('authToken');
        }
    } catch (error) {
        console.error('Error checking session:', error);
        localStorage.removeItem('authToken');
    }
}

function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const commentForm = document.getElementById('commentForm');
    const loginPrompt = document.getElementById('loginPrompt');

    if (currentUser) {
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'flex';
            const avatar = document.getElementById('userAvatar');
            const name = document.getElementById('userName');
            if (avatar) avatar.src = currentUser.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.username || 'User');
            if (name) name.textContent = currentUser.username || currentUser.firstName || 'User';
        }
        if (commentForm) commentForm.style.display = 'block';
        if (loginPrompt) loginPrompt.style.display = 'none';
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
        if (commentForm) commentForm.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block';
    }
}

function showAuthButtons() {
    const heroSection = document.getElementById('home');
    if (heroSection) {
        heroSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function initializeProfilePage() {
    const profileLink = document.getElementById('profileLink');
    const profileModal = document.getElementById('profileModal');
    const closeModal = document.querySelector('.close-modal');
    const profileLogoutBtn = document.getElementById('profileLogoutBtn');
    const avatarInput = document.getElementById('avatarInput');
    const avatarEditBtn = document.querySelector('.avatar-edit-btn-banner');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const profileAvatarUrlInput = document.getElementById('profileAvatarUrlInput');
    const resetAvatarBtn = document.getElementById('resetAvatarBtn');

    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            showProfilePage();
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            profileModal.style.display = 'none';
        });
    }

    if (profileModal) {
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                profileModal.style.display = 'none';
            }
        });
    }

    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener('click', () => {
            logout();
            profileModal.style.display = 'none';
        });
    }

    if (avatarEditBtn) {
        avatarEditBtn.addEventListener('click', () => {
            if (avatarInput) {
                avatarInput.click();
            }
        });
    }

    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const avatarUrl = event.target.result;
                    document.getElementById('profileAvatar').src = avatarUrl;
                    if (profileAvatarUrlInput) {
                        profileAvatarUrlInput.value = avatarUrl;
                    }
                    if (saveProfileBtn) {
                        saveProfileBtn.style.display = 'inline-block';
                    }
                    if (resetAvatarBtn) {
                        resetAvatarBtn.style.display = 'inline-block';
                    }
                    if (cancelEditBtn) {
                        cancelEditBtn.style.display = 'inline-block';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (profileAvatarUrlInput) {
        profileAvatarUrlInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            if (url) {
                document.getElementById('profileAvatar').src = url;
                if (saveProfileBtn) {
                    saveProfileBtn.style.display = 'inline-block';
                }
                if (resetAvatarBtn) {
                    resetAvatarBtn.style.display = 'inline-block';
                }
                if (cancelEditBtn) {
                    cancelEditBtn.style.display = 'inline-block';
                }
            }
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            await saveUserProfile();
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            showProfilePage();
            if (saveProfileBtn) saveProfileBtn.style.display = 'none';
            if (resetAvatarBtn) resetAvatarBtn.style.display = 'none';
            cancelEditBtn.style.display = 'none';
        });
    }

    if (resetAvatarBtn) {
        resetAvatarBtn.addEventListener('click', () => {
            const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.username || 'User');
            document.getElementById('profileAvatar').src = defaultAvatar;
            if (profileAvatarUrlInput) {
                profileAvatarUrlInput.value = defaultAvatar;
            }
            if (saveProfileBtn) saveProfileBtn.style.display = 'inline-block';
        });
    }
}

function showProfilePage() {
    if (!currentUser) return;

    const profileModal = document.getElementById('profileModal');
    if (!profileModal) return;

    loadUserProfile();
    profileModal.style.display = 'block';
}

async function loadUserProfile() {
    if (!currentUser || !authToken) return;

    try {
        const response = await fetch(`${API_BASE}/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success && data.user) {
            const user = data.user;
            const avatar = user.avatar || currentUser.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username || 'User');
            const username = user.username || currentUser.username || currentUser.firstName || 'User';
            const email = user.email || currentUser.email || 'Не указан';
            const provider = user.provider || currentUser.provider || 'unknown';

            document.getElementById('profileAvatar').src = avatar;
            document.getElementById('profileName').textContent = username;
            document.getElementById('profileEmail').textContent = email;
            document.getElementById('profileUsernameInput').value = username;
            document.getElementById('profileAvatarUrlInput').value = avatar;

            const providerBadge = document.getElementById('profileProviderBadge');
            if (providerBadge) {
                providerBadge.textContent = provider === 'google' ? 'Google' : provider === 'telegram' ? 'Telegram' : 'Пользователь';
            }
        } else {
            const avatar = currentUser.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.username || 'User');
            const username = currentUser.username || currentUser.firstName || 'User';
            const email = currentUser.email || 'Не указан';
            const provider = currentUser.provider || 'unknown';

            document.getElementById('profileAvatar').src = avatar;
            document.getElementById('profileName').textContent = username;
            document.getElementById('profileEmail').textContent = email;
            document.getElementById('profileUsernameInput').value = username;
            document.getElementById('profileAvatarUrlInput').value = avatar;

            const providerBadge = document.getElementById('profileProviderBadge');
            if (providerBadge) {
                providerBadge.textContent = provider === 'google' ? 'Google' : provider === 'telegram' ? 'Telegram' : 'Пользователь';
            }
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        const avatar = currentUser.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.username || 'User');
        const username = currentUser.username || currentUser.firstName || 'User';
        const email = currentUser.email || 'Не указан';
        const provider = currentUser.provider || 'unknown';

        document.getElementById('profileAvatar').src = avatar;
        document.getElementById('profileName').textContent = username;
        document.getElementById('profileEmail').textContent = email;
        document.getElementById('profileUsernameInput').value = username;
        document.getElementById('profileAvatarUrlInput').value = avatar;

        const providerBadge = document.getElementById('profileProviderBadge');
        if (providerBadge) {
            providerBadge.textContent = provider === 'google' ? 'Google' : provider === 'telegram' ? 'Telegram' : 'Пользователь';
        }
    }
}

async function saveUserProfile() {
    if (!currentUser || !authToken) return;

    const username = document.getElementById('profileUsernameInput').value.trim();
    const avatar = document.getElementById('profileAvatarUrlInput').value.trim();

    if (!username) {
        showNotification('Имя пользователя не может быть пустым');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                username: username,
                avatar: avatar || null
            })
        });

        const data = await response.json();

        if (data.success) {
            currentUser.username = username;
            currentUser.avatar = avatar || currentUser.avatar;
            updateAuthUI();
            showProfilePage();
            showNotification('Профиль успешно обновлен');

            const saveProfileBtn = document.getElementById('saveProfileBtn');
            const cancelEditBtn = document.getElementById('cancelEditBtn');
            const resetAvatarBtn = document.getElementById('resetAvatarBtn');
            if (saveProfileBtn) saveProfileBtn.style.display = 'none';
            if (cancelEditBtn) cancelEditBtn.style.display = 'none';
            if (resetAvatarBtn) resetAvatarBtn.style.display = 'none';
        } else {
            showNotification(data.error || 'Ошибка обновления профиля');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification('Ошибка подключения к серверу');
    }
}

function initializeComments() {
    const submitBtn = document.getElementById('submitComment');
    const commentInput = document.getElementById('commentInput');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    if (submitBtn) {
        submitBtn.addEventListener('click', submitComment);
    }

    if (commentInput) {
        commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                submitComment();
            }
        });

        commentInput.addEventListener('input', (e) => {
            const charCount = document.getElementById('charCount');
            if (charCount) {
                const length = e.target.value.length;
                charCount.textContent = `${length}/500`;
                if (length > 500) {
                    charCount.style.color = 'var(--accent-red)';
                } else {
                    charCount.style.color = 'var(--text-muted)';
                }
            }
        });
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreComments);
    }

    loadComments();
}

async function loadMoreComments() {
    if (!hasMoreComments) return;

    currentPage++;
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Загрузка...';
    }

    try {
        const response = await fetch(`${API_BASE}/comments?page=${currentPage}&limit=10&status=published`);
        const data = await response.json();

        if (data.success && data.comments.length > 0) {
            const publishedComments = data.comments.filter(c => c.status === 'published' || !c.status);
            comments = [...comments, ...publishedComments];
            renderComments();

            if (data.page >= data.totalPages) {
                hasMoreComments = false;
                const container = document.getElementById('loadMoreContainer');
                if (container) container.style.display = 'none';
            }
        } else {
            hasMoreComments = false;
            const container = document.getElementById('loadMoreContainer');
            if (container) container.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading more comments:', error);
    } finally {
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = 'Загрузить еще';
        }
    }
}

async function loadComments() {
    try {
        currentPage = 1;
        const response = await fetch(`${API_BASE}/comments?page=1&limit=10`);
        const data = await response.json();

        if (data.success) {
            comments = data.comments;
            renderComments();

            // Показываем кнопку "Загрузить еще" если есть еще страницы
            const loadMoreContainer = document.getElementById('loadMoreContainer');
            if (loadMoreContainer) {
                if (data.totalPages > 1) {
                    loadMoreContainer.style.display = 'block';
                    hasMoreComments = true;
                } else {
                    loadMoreContainer.style.display = 'none';
                    hasMoreComments = false;
                }
            }
        } else {
            console.error('Failed to load comments:', data.error);
            loadInitialComments();
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        loadInitialComments();
    }
}

async function submitComment() {
    if (!currentUser || !authToken) {
        showNotification('Для отправки комментария необходимо войти');
        return;
    }

    const commentInput = document.getElementById('commentInput');
    const text = commentInput.value.trim();

    if (!text) {
        showNotification('Введите текст комментария');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                text: text
            })
        });

        const data = await response.json();

        if (data.success) {
            comments.unshift(data.comment);
            renderComments();
            commentInput.value = '';
            const charCount = document.getElementById('charCount');
            if (charCount) charCount.textContent = '0/500';
            showNotification('Комментарий отправлен');
            currentPage = 1;
        } else {
            showNotification(data.error || 'Ошибка отправки комментария');
        }
    } catch (error) {
        console.error('Error submitting comment:', error);
        showNotification('Ошибка подключения к серверу');
    }
}

function renderComments() {
    const commentsList = document.getElementById('commentsList');

    if (comments.length === 0) {
        commentsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Пока нет комментариев</p>';
        return;
    }

    commentsList.innerHTML = comments.map(comment => {
        if (comment.status === 'hidden' || comment.status === 'deleted') {
            return '';
        }

        const roleColor = comment.role?.color || null;
        const roleName = comment.role?.name || null;
        const roleIcon = comment.role?.icon || null;
        const isDisplaySeparate = comment.role?.isDisplaySeparate || false;
        const customPrefix = comment.customPrefix || null;
        const prefixColor = comment.prefixColor || null;

        let prefixHTML = '';
        if (customPrefix) {
            const prefixParts = customPrefix.split(',').map(p => p.trim());
            prefixHTML = prefixParts.map(prefix => {
                return `<span style="color: ${prefixColor || 'inherit'}; font-weight: 600; margin-right: 0.25rem;">[${prefix}]</span>`;
            }).join('');
        }

        let roleHTML = '';
        if (roleName) {
            const roleDisplay = roleIcon ? `${roleIcon} ${roleName}` : roleName;
            roleHTML = `<span style="color: ${roleColor}; font-weight: 600; margin-left: 0.5rem;">${roleDisplay}</span>`;
        }

        const authorStyle = roleColor ? `color: ${roleColor};` : '';
        const borderStyle = roleColor && isDisplaySeparate ? `border-left: 4px solid ${roleColor};` : (comment.isAdmin ? 'border-left: 3px solid var(--accent-primary);' : '');

        return `
        <div class="comment-item" style="${borderStyle}">
            ${isDisplaySeparate && roleColor ? `<div style="height: 3px; background: ${roleColor}; margin-bottom: 0.5rem; border-radius: 2px;"></div>` : ''}
            <img src="${comment.avatar}" alt="${comment.author}" class="comment-avatar">
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author" style="${authorStyle}">
                        ${prefixHTML}
                        ${comment.author}
                        ${roleHTML}
                        ${comment.isAdmin ? '<span style="color: var(--accent-primary); font-size: 0.85rem; margin-left: 0.5rem;">👑 Админ</span>' : ''}
                    </span>
                    <span class="comment-date">${formatDate(comment.date)}</span>
                </div>
                <div class="comment-text">${comment.text}</div>
            </div>
        </div>
        `;
    }).filter(html => html !== '').join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'только что';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' мин назад';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' ч назад';

    return date.toLocaleDateString('ru-RU');
}

function loadInitialComments() {
    comments = [];
    renderComments();
}

function initializeOnlineCounter() {
    // Получаем или создаём sessionId (один на браузер)
    sessionId = localStorage.getItem('lf_session');
    if (!sessionId) {
        sessionId = 'ses_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        localStorage.setItem('lf_session', sessionId);
    }
    updateOnlineDisplay();
}

function startOnlineTracking() {
    // Сразу отправляем heartbeat
    updateOnlineStatus();
    
    // Heartbeat каждые 5 секунд чтобы сессия не истекала
    setInterval(() => {
        updateOnlineStatus();
    }, 5000);
}

async function updateOnlineStatus() {
    try {
        const response = await fetch(`${API_BASE}/online`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-ID': sessionId
            },
            body: JSON.stringify({
                userId: currentUser?.id || null
            })
        });

        const data = await response.json();
        if (data.success) {
            onlineUsers = data.online;
            updateOnlineDisplay();
        }
    } catch (error) {
        // Тихо игнорируем ошибки
    }
}

function updateOnlineDisplay() {
    const el = document.getElementById('onlineCount');
    if (el) {
        el.textContent = onlineUsers || 1;
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #1a1a1a;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        border: 1px solid #27272a;
        border-left: 4px solid #6366f1;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
