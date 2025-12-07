// Глобальные переменные
let currentUser = null;
let googleUserObject = null; // Сохраняем объект пользователя Google
let authToken = null;
let onlineUsers = 0;
let comments = [];
let sessionId = null;

// API базовый URL
const API_BASE = '/api';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация Google Sign-In происходит в window.onload, чтобы дождаться загрузки скрипта Google
    initializeBackground();
    initializeLavaLamp();
    initializeAuth();
    initializeComments();
    initializeOnlineCounter();
    startOnlineTracking();
    initializeProfilePage();
});

// Используем window.onload, чтобы гарантировать, что скрипт Google загрузился
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

// Функция для обработки ответа от Google
async function handleCredentialResponse(response) {
    const id_token = response.credential;
    
    // Для примера декодируем токен на клиенте (В ПРОДАКШЕНЕ ЭТО НУЖНО ДЕЛАТЬ НА СЕРВЕРЕ!)
    googleUserObject = jwt_decode(id_token);

    // Здесь вы бы отправили id_token на ваш бэкенд для верификации и получения authToken
    // const serverResponse = await fetch(`${API_BASE}/auth/google`, { method: 'POST', ... });
    // const data = await serverResponse.json();
    // currentUser = data.user;
    // authToken = data.token;

    // --- Временное решение без бэкенда ---
    currentUser = {
        id: googleUserObject.sub,
        username: googleUserObject.given_name,
        avatar: googleUserObject.picture,
        email: googleUserObject.email
    };
    authToken = id_token; // Используем токен Google как временный токен авторизации
    localStorage.setItem('authToken', authToken);
    // --- Конец временного решения ---

    updateAuthUI();
    showNotification(`Добро пожаловать, ${currentUser.username}!`);
}

// Простая функция для декодирования JWT (для примера)
function jwt_decode(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        console.error("Error decoding JWT", e);
        return null;
    }
}

// Анимированный фон с хештегами
function initializeBackground() {
    const canvas = document.getElementById('backgroundCanvas');
    const hashtagText = '#клянись';
    
    // Создаем множество хештегов
    for (let i = 0; i < 15; i++) {
        createHashtag(canvas, hashtagText, i);
    }
}

function createHashtag(container, text, index) {
    const hashtag = document.createElement('div');
    hashtag.className = 'hashtag';
    hashtag.textContent = text;
    
    // Случайная начальная позиция
    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * window.innerHeight - window.innerHeight;
    
    hashtag.style.left = startX + 'px';
    hashtag.style.top = startY + 'px';
    
    // Случайная задержка анимации для разнообразия
    hashtag.style.animationDelay = (index * 1.5) + 's';
    
    // Случайная скорость
    const duration = 12 + Math.random() * 8;
    hashtag.style.animationDuration = duration + 's';
    
    container.appendChild(hashtag);
}

// Визуализация лавовой лампы
function initializeLavaLamp() {
    const canvas = document.getElementById('lavaLamp');
    const ctx = canvas.getContext('2d');
    
    // Устанавливаем размеры canvas
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Частицы для лавовой лампы
    const particles = [];
    const particleCount = 8;
    
    class Particle {
        constructor() {
            this.reset();
        }
        
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = 30 + Math.random() * 70;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.color = this.getRandomColor();
            this.life = 1;
        }
        
        getRandomColor() {
            const colors = [
                'rgba(255, 0, 0, 0.6)',
                'rgba(255, 100, 0, 0.5)',
                'rgba(200, 0, 100, 0.4)',
                'rgba(150, 0, 150, 0.5)'
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.life -= 0.002;
            
            // Гравитация и отскок от стенок
            if (this.y + this.size > canvas.height || this.y - this.size < 0) {
                this.speedY = -this.speedY * 0.8;
            }
            if (this.x + this.size > canvas.width || this.x - this.size < 0) {
                this.speedX = -this.speedX * 0.8;
            }
            
            // Восстановление частицы
            if (this.life <= 0) {
                this.reset();
            }
        }
        
        draw() {
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Создаем частицы
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    
    // Анимация
    function animate() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Система авторизации
function initializeAuth() {
    const logoutBtn = document.getElementById('logoutBtn');
    const promptLogin = document.getElementById('promptLogin');

    logoutBtn.addEventListener('click', logout);
    promptLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthButtons();
    });

    // Проверяем сохраненную сессию
    checkExistingSession();
}

async function logout() {
    if (authToken) {
        try {
            // Если у вас есть эндпоинт для выхода на бэкенде
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
    
    // "Забываем" пользователя в Google Sign-In
    if (googleUserObject) {
        google.accounts.id.disableAutoSelect();
    }

    currentUser = null;
    googleUserObject = null;
    authToken = null;
    localStorage.removeItem('authToken');
    updateAuthUI();
    // Скрываем профиль и возвращаемся на главный экран
    document.querySelector('.main-container').style.display = 'flex';
    document.getElementById('profileSection').style.display = 'none';

    showNotification('Вы вышли из системы');
}

async function checkExistingSession() {
    const savedToken = localStorage.getItem('authToken');
    if (!savedToken) return;
    
    // Используем клиентское декодирование токена для проверки сессии (без бэкенда)
    const userObject = jwt_decode(savedToken);

    // Проверяем, что токен существует и его срок действия не истек
    if (userObject && userObject.exp * 1000 > Date.now()) {
        googleUserObject = userObject;
        currentUser = {
            id: userObject.sub,
            username: userObject.given_name,
            avatar: userObject.picture,
            email: userObject.email
        };
        authToken = savedToken;
        updateAuthUI();
    } else {
        // Если токен невалиден или истек, очищаем хранилище
        localStorage.removeItem('authToken');
    }
}

function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const commentForm = document.getElementById('commentForm');
    const loginPrompt = document.getElementById('loginPrompt');
    
    if (currentUser) {
        authButtons.style.display = 'none';
        userInfo.style.display = 'flex';
        commentForm.style.display = 'block';
        loginPrompt.style.display = 'none';
        
        document.getElementById('userAvatar').src = currentUser.avatar || 'https://picsum.photos/seed/placeholder/40/40.jpg';
        document.getElementById('userName').textContent = currentUser.username;
    } else {
        authButtons.style.display = 'flex';
        userInfo.style.display = 'none';
        commentForm.style.display = 'none';
        loginPrompt.style.display = 'block';
    }
}

function showAuthButtons() {
    // Прокрутка к кнопкам авторизации
    document.querySelector('.auth-section').scrollIntoView({ behavior: 'smooth' });
}

// Логика страницы профиля
function initializeProfilePage() {
    const profileLink = document.getElementById('profileLink');
    const backToMainBtn = document.getElementById('backToMainBtn');
    const profileLogoutBtn = document.getElementById('profileLogoutBtn');

    profileLink.addEventListener('click', (e) => {
        e.preventDefault();
        showProfilePage();
    });

    backToMainBtn.addEventListener('click', () => {
        document.querySelector('.main-container').style.display = 'flex';
        document.getElementById('profileSection').style.display = 'none';
    });

    profileLogoutBtn.addEventListener('click', logout);
}

function showProfilePage() {
    if (!currentUser) return;

    document.getElementById('profileAvatar').src = currentUser.avatar || 'https://picsum.photos/seed/placeholder/100/100.jpg';
    document.getElementById('profileName').textContent = currentUser.username;
    document.getElementById('profileEmail').textContent = currentUser.email;

    document.querySelector('.main-container').style.display = 'none';
    document.getElementById('profileSection').style.display = 'block';
}

// Система комментариев
function initializeComments() {
    const submitBtn = document.getElementById('submitComment');
    const commentInput = document.getElementById('commentInput');
    
    submitBtn.addEventListener('click', submitComment);
    commentInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            submitComment();
        }
    });
    
    // Загружаем комментарии с сервера
    loadComments();
}

async function loadComments() {
    try {
        const response = await fetch(`${API_BASE}/comments`);
        const data = await response.json();
        
        if (data.success) {
            comments = data.comments;
            renderComments();
        } else {
            console.error('Failed to load comments:', data.error);
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        // Загружаем демо-комментарии при ошибке
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
            showNotification('Комментарий отправлен');
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
    
    commentsList.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <img src="${comment.avatar}" alt="${comment.author}" class="comment-avatar">
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-date">${formatDate(comment.date)}</span>
                </div>
                <div class="comment-text">${comment.text}</div>
            </div>
        </div>
    `).join('');
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

// Резервная функция для демо-комментариев
function loadInitialComments() {
    comments = [
        {
            id: 1,
            author: 'Demo User',
            avatar: 'https://picsum.photos/seed/demo1/40/40.jpg',
            text: 'Отличный сайт! Очень атмосферный дизайн.',
            date: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: 2,
            author: 'Visitor',
            avatar: 'https://picsum.photos/seed/demo2/40/40.jpg',
            text: 'Визуальные эффекты просто потрясающие!',
            date: new Date(Date.now() - 7200000).toISOString()
        }
    ];
    
    renderComments();
}

// Индикатор онлайн пользователей
function initializeOnlineCounter() {
    updateOnlineDisplay();
}

// Отслеживание активности пользователя
function startOnlineTracking() {
    // Генерируем уникальную сессию
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Отправляем активность каждые 30 секунд
    setInterval(async () => {
        await updateOnlineStatus();
    }, 30000);
    
    // Отправляем сразу при загрузке
    updateOnlineStatus();
    
    // Обновляем счетчик каждые 10 секунд
    setInterval(async () => {
        await getOnlineCount();
    }, 10000);
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
        console.error('Error updating online status:', error);
        // При ошибке используем демо-режим
        simulateOnlineUsers();
    }
}

async function getOnlineCount() {
    try {
        const response = await fetch(`${API_BASE}/online`);
        const data = await response.json();
        
        if (data.success) {
            onlineUsers = data.online;
            updateOnlineDisplay();
        }
    } catch (error) {
        console.error('Error getting online count:', error);
        // При ошибке используем демо-режим
        simulateOnlineUsers();
    }
}

function updateOnlineDisplay() {
    document.getElementById('onlineCount').textContent = onlineUsers;
}

// Демо-режим для онлайн пользователей (резервный)
function simulateOnlineUsers() {
    const change = Math.floor(Math.random() * 5) - 2;
    onlineUsers = Math.max(1, onlineUsers + change);
    updateOnlineDisplay();
}

// Уведомления
function showNotification(message) {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        border-left: 4px solid var(--accent-red);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Автоматическое удаление
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Добавляем CSS анимации для уведомлений
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
