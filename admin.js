const API_BASE = '/api';
let adminToken = null;
let adminEmail = null;
let comments = [];

document.addEventListener('DOMContentLoaded', function () {
    checkAdminAuth();
    setupLoginForm();
});

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await login();
        });
    }
}

async function login() {
    const emailInput = document.getElementById('adminEmail');
    const email = emailInput.value.trim();
    const errorDiv = document.getElementById('loginError');
    const loginBtn = document.querySelector('#loginForm button');

    if (!email) {
        showError(errorDiv, 'Введите email');
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Вход...';
    hideError(errorDiv);

    try {
        const response = await fetch(`${API_BASE}/admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'login',
                email: email
            })
        });

        const data = await response.json();

        if (data.success) {
            adminToken = data.token;
            adminEmail = data.admin.email;
            localStorage.setItem('adminToken', adminToken);
            localStorage.setItem('adminEmail', adminEmail);
            showAdminPanel();
            loadAdminData();
        } else {
            showError(errorDiv, data.error || 'Ошибка входа');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError(errorDiv, 'Ошибка подключения к серверу: ' + error.message);
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Войти';
    }
}

async function checkAdminAuth() {
    const savedToken = localStorage.getItem('adminToken');
    const savedEmail = localStorage.getItem('adminEmail');

    if (!savedToken || !savedEmail) {
        showLoginForm();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin?action=check`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${savedToken}`
            }
        });

        const data = await response.json();

        if (data.success && data.isAdmin) {
            adminToken = savedToken;
            adminEmail = savedEmail;
            showAdminPanel();
            loadAdminData();
        } else {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminEmail');
            showLoginForm();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminEmail');
        showLoginForm();
    }
}

function showLoginForm() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
}

function showAdminPanel() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';

    const emailDisplay = document.getElementById('adminEmailDisplay');
    if (emailDisplay) {
        emailDisplay.textContent = adminEmail;
    }
}

function logout() {
    adminToken = null;
    adminEmail = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    showLoginForm();
}

async function loadAdminData() {
    await Promise.all([
        loadStats(),
        loadComments(),
        loadAdmins(),
        loadUsers(),
        loadRoles(),
        loadWidgetSettings()
    ]);
}

function showLoading(elementId, message = 'Загрузка...') {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML = `<div class="loading">${message}</div>`;
    }
}

function showError(element, message) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

function hideError(element) {
    if (element) {
        element.style.display = 'none';
    }
}

function showSuccess(element, message) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }
}

function hideSuccess(element) {
    if (element) {
        element.style.display = 'none';
    }
}

async function loadStats() {
    try {
        const commentsResponse = await fetch(`${API_BASE}/comments`);
        const commentsData = await commentsResponse.json();

        if (commentsData.success) {
            document.getElementById('statComments').textContent = commentsData.total || 0;
        }

        const onlineResponse = await fetch(`${API_BASE}/online`);
        const onlineData = await onlineResponse.json();

        if (onlineData.success) {
            document.getElementById('statOnline').textContent = onlineData.online || 0;
        }

        const adminsResponse = await fetch(`${API_BASE}/admin-users`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        const adminsData = await adminsResponse.json();

        if (adminsData.success) {
            document.getElementById('statAdmins').textContent = adminsData.admins?.length || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadAdmins() {
    const container = document.getElementById('adminsList');
    if (!container) return;

    showLoading('adminsList', 'Загрузка списка админов...');

    try {
        const response = await fetch(`${API_BASE}/admin-users`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            if (data.admins && data.admins.length > 0) {
                container.innerHTML = `
                    <h3 style="margin-bottom: 1rem; font-size: 1rem; color: var(--text-secondary);">Список администраторов:</h3>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        ${data.admins.map(email => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bg-alt); border-radius: 6px; border: 1px solid var(--border-color);">
                                <span style="color: var(--text-primary);">${email}</span>
                                ${email.toLowerCase() === adminEmail.toLowerCase() ? '<span style="color: var(--accent-primary); font-size: 0.85rem;">(Вы)</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                container.innerHTML = '<p style="color: var(--text-secondary);">Нет администраторов</p>';
            }
        } else {
            container.innerHTML = '<p style="color: var(--accent-red);">Ошибка загрузки списка админов</p>';
        }
    } catch (error) {
        console.error('Error loading admins:', error);
        container.innerHTML = '<p style="color: var(--accent-red);">Ошибка подключения к серверу</p>';
    }
}

async function addAdmin() {
    const input = document.getElementById('newAdminEmail');
    const email = input.value.trim();
    const errorDiv = document.getElementById('adminsError');
    const successDiv = document.getElementById('adminsSuccess');

    if (!email) {
        showError(errorDiv, 'Введите email');
        return;
    }

    hideError(errorDiv);
    hideError(successDiv); // Hide success too if previous exists

    try {
        const response = await fetch(`${API_BASE}/admin-users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.success) {
            input.value = '';
            showSuccess('adminsSuccess', 'Администратор успешно добавлен');
            loadAdmins();
        } else {
            showError(errorDiv, data.error || 'Ошибка добавления админа');
        }
    } catch (error) {
        console.error('Error adding admin:', error);
        showError(errorDiv, 'Ошибка подключения к серверу: ' + error.message);
    }
}



async function loadComments() {
    const container = document.getElementById('commentsTableContainer');
    const errorDiv = document.getElementById('commentsError');
    const successDiv = document.getElementById('commentsSuccess');

    hideError(errorDiv);
    // hideSuccess is not needed if showSuccess handles auto-hide, but let's be safe if it's used elsewhere
    if (successDiv) successDiv.style.display = 'none';

    showLoading('commentsTableContainer', 'Загрузка комментариев...');

    try {
        const statusFilter = document.getElementById('commentStatusFilter')?.value || 'all';
        const searchQuery = document.getElementById('commentSearchInput')?.value || '';

        let url = `${API_BASE}/comments`;
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (searchQuery) params.append('search', searchQuery);
        if (params.toString()) url += '?' + params.toString();

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            renderCommentsTable(data.comments);
        } else {
            showError(errorDiv, data.error || 'Ошибка загрузки комментариев');
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        showError(errorDiv, 'Ошибка подключения к серверу: ' + error.message);
    }
}

function renderCommentsTable(comments) {
    const container = document.getElementById('commentsTableContainer');

    if (!comments || comments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Нет комментариев</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'comments-table';
    table.style.width = '100%';

    const getStatusBadge = (status) => {
        const badges = {
            published: '<span style="padding: 0.25rem 0.5rem; background: rgba(34, 197, 94, 0.1); color: #22c55e; border-radius: 4px; font-size: 0.85rem;">✅ Опубликован</span>',
            pending: '<span style="padding: 0.25rem 0.5rem; background: rgba(251, 191, 36, 0.1); color: #fbbf24; border-radius: 4px; font-size: 0.85rem;">⏳ На модерации</span>',
            hidden: '<span style="padding: 0.25rem 0.5rem; background: rgba(107, 114, 128, 0.1); color: #6b7280; border-radius: 4px; font-size: 0.85rem;">👁️ Скрыт</span>',
            deleted: '<span style="padding: 0.25rem 0.5rem; background: rgba(239, 68, 68, 0.1); color: var(--accent-red); border-radius: 4px; font-size: 0.85rem;">🗑️ Удален</span>'
        };
        return badges[status] || badges.published;
    };

    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Автор</th>
                <th>Текст</th>
                <th>Дата</th>
                <th>Статус</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody>
            ${comments.map(comment => {
        const roleColor = comment.role?.color || null;
        const roleName = comment.role?.name || null;
        const customPrefix = comment.customPrefix || null;
        const prefixColor = comment.prefixColor || null;

        let prefixHTML = '';
        if (customPrefix) {
            const prefixParts = customPrefix.split(',').map(p => p.trim());
            prefixHTML = prefixParts.map(prefix => {
                return `<span style="color: ${prefixColor || 'inherit'}; font-weight: 600; margin-right: 0.25rem; font-size: 0.85rem;">[${prefix}]</span>`;
            }).join('');
        }

        let roleHTML = '';
        if (roleName) {
            roleHTML = `<span style="color: ${roleColor}; font-weight: 600; margin-left: 0.5rem; font-size: 0.85rem;">${roleName}</span>`;
        }

        return `
                <tr ${comment.isAdmin ? 'style="background: rgba(99, 102, 241, 0.1);"' : ''}>
                    <td style="font-size: 0.85rem; color: var(--text-secondary);">${comment.id}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <img src="${comment.avatar}" alt="${comment.author}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <div style="display: flex; align-items: center; flex-wrap: wrap;">
                                    ${prefixHTML}
                                    <span style="color: ${roleColor || 'inherit'};">${comment.author}</span>
                                    ${roleHTML}
                                    ${comment.isAdmin ? '<span style="color: var(--accent-primary); font-size: 0.8rem; margin-left: 0.5rem;">👑 Админ</span>' : ''}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td style="max-width: 300px; word-wrap: break-word;">${comment.text}</td>
                    <td style="font-size: 0.85rem; color: var(--text-secondary);">${formatDate(comment.date)}</td>
                    <td>${getStatusBadge(comment.status || 'published')}</td>
                    <td>
                        <div class="comment-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <button class="btn-edit" onclick="editComment(${comment.id})" style="padding: 0.4rem 0.8rem; background: rgba(99, 102, 241, 0.1); border: 1px solid var(--accent-primary); border-radius: 6px; color: var(--accent-primary); cursor: pointer; font-size: 0.85rem;">✏️</button>
                            <select onchange="changeCommentStatus(${comment.id}, this.value)" style="padding: 0.4rem; background: var(--bg-alt); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-size: 0.85rem; cursor: pointer;">
                                <option value="published" ${(comment.status || 'published') === 'published' ? 'selected' : ''}>Опубликовать</option>
                                <option value="pending" ${comment.status === 'pending' ? 'selected' : ''}>На модерацию</option>
                                <option value="hidden" ${comment.status === 'hidden' ? 'selected' : ''}>Скрыть</option>
                                <option value="deleted" ${comment.status === 'deleted' ? 'selected' : ''}>Удалить</option>
                            </select>
                            <button class="btn-delete" onclick="deleteComment(${comment.id})" style="padding: 0.4rem 0.8rem; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red); border-radius: 6px; color: var(--accent-red); cursor: pointer; font-size: 0.85rem;">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
    }).join('')}
        </tbody>
    `;

    container.innerHTML = '';
    container.appendChild(table);
}

async function editComment(commentId) {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const newText = prompt('Редактировать комментарий:', comment.text);
    if (newText === null || newText.trim() === comment.text) return;

    const errorDiv = document.getElementById('commentsError');
    const successDiv = document.getElementById('commentsSuccess');

    hideError(errorDiv);
    hideSuccess(successDiv);

    try {
        const response = await fetch(`${API_BASE}/comments`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                commentId: commentId,
                text: newText.trim()
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess(successDiv, 'Комментарий обновлен');
            loadComments();
        } else {
            showError(errorDiv, data.error || 'Ошибка обновления комментария');
        }
    } catch (error) {
        console.error('Error updating comment:', error);
        showError(errorDiv, 'Ошибка подключения к серверу');
    }
}

async function changeCommentStatus(commentId, status) {
    const errorDiv = document.getElementById('commentsError');
    const successDiv = document.getElementById('commentsSuccess');

    hideError(errorDiv);
    hideSuccess(successDiv);

    try {
        const response = await fetch(`${API_BASE}/comments`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                commentId: commentId,
                status: status
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess(successDiv, 'Статус комментария изменен');
            loadComments();
        } else {
            showError(errorDiv, data.error || 'Ошибка изменения статуса');
        }
    } catch (error) {
        console.error('Error changing comment status:', error);
        showError(errorDiv, 'Ошибка подключения к серверу');
    }
}

async function deleteComment(commentId) {
    if (!confirm('Вы уверены, что хотите удалить этот комментарий?')) {
        return;
    }

    const errorDiv = document.getElementById('commentsError');
    const successDiv = document.getElementById('commentsSuccess');

    hideError(errorDiv);
    hideSuccess(successDiv);

    try {
        const response = await fetch(`${API_BASE}/comments?commentId=${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showSuccess(successDiv, 'Комментарий успешно удален');
            loadComments();
            loadStats();
        } else {
            showError(errorDiv, data.error || 'Ошибка удаления комментария');
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        showError(errorDiv, 'Ошибка подключения к серверу');
    }
}

async function submitAdminComment() {
    const commentInput = document.getElementById('adminCommentInput');
    const text = commentInput.value.trim();
    const errorDiv = document.getElementById('commentFormError');
    const successDiv = document.getElementById('commentFormSuccess');

    hideError(errorDiv);
    hideSuccess(successDiv);

    if (!text) {
        showError(errorDiv, 'Введите текст комментария');
        return;
    }

    if (text.length > 500) {
        showError(errorDiv, 'Комментарий слишком длинный (максимум 500 символов)');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                text: text
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess(successDiv, 'Комментарий успешно добавлен');
            commentInput.value = '';
            loadComments();
            loadStats();
        } else {
            showError(errorDiv, data.error || 'Ошибка отправки комментария');
        }
    } catch (error) {
        console.error('Error submitting comment:', error);
        showError(errorDiv, 'Ошибка подключения к серверу');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}



async function exportComments() {
    try {
        const response = await fetch(`${API_BASE}/comments`);
        const data = await response.json();

        if (data.success) {
            const json = JSON.stringify(data.comments, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `comments_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            const successDiv = document.getElementById('commentsSuccess');
            showSuccess(successDiv, 'Комментарии успешно экспортированы');
        }
    } catch (error) {
        console.error('Error exporting comments:', error);
        const errorDiv = document.getElementById('commentsError');
        showError(errorDiv, 'Ошибка экспорта комментариев');
    }
}

async function exportAdmins() {
    try {
        const response = await fetch(`${API_BASE}/admin-users`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        const data = await response.json();

        if (data.success) {
            const json = JSON.stringify(data.admins, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `admins_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            const successDiv = document.getElementById('adminsSuccess');
            showSuccess(successDiv, 'Список админов успешно экспортирован');
        }
    } catch (error) {
        console.error('Error exporting admins:', error);
        const errorDiv = document.getElementById('adminsError');
        showError(errorDiv, 'Ошибка экспорта админов');
    }
}

async function loadUsers() {
    const container = document.getElementById('usersTableContainer');
    const errorDiv = document.getElementById('usersError');
    const successDiv = document.getElementById('usersSuccess');
    const searchInput = document.getElementById('userSearchInput');

    hideError(errorDiv);
    if (successDiv) successDiv.style.display = 'none';

    showLoading('usersTableContainer', 'Загрузка пользователей...');

    try {
        const response = await fetch(`${API_BASE}/admin-users?action=users`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        const data = await response.json();

        console.log('Users response:', data);

        let users = data.users || [];

        if (searchInput && searchInput.value.trim()) {
            const searchTerm = searchInput.value.toLowerCase();
            users = users.filter(user =>
                (user.username && user.username.toLowerCase().includes(searchTerm)) ||
                (user.email && user.email.toLowerCase().includes(searchTerm)) ||
                (user.id && user.id.toLowerCase().includes(searchTerm))
            );
        }

        if (data.success) {
            renderUsersTable(users);
        } else {
            showError(errorDiv, data.error || 'Ошибка загрузки пользователей');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showError(errorDiv, 'Ошибка подключения к серверу: ' + error.message);
    }
}

function renderUsersTable(users) {
    const container = document.getElementById('usersTableContainer');

    if (!users || users.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Нет зарегистрированных пользователей</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'comments-table';
    table.style.width = '100%';

    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Имя</th>
                <th>Email</th>
                <th>Провайдер</th>
                <th>IP адрес</th>
                <th>Все IP</th>
                <th>Дата регистрации</th>
                <th>Статус</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody>
            ${users.map(user => `
                <tr ${user.isBanned ? 'style="background: rgba(239, 68, 68, 0.1); opacity: 0.7;"' : ''}>
                    <td style="font-size: 0.85rem; color: var(--text-secondary);">${user.id}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            ${user.avatar ? `<img src="${user.avatar}" alt="${user.username}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">` : ''}
                            ${user.username || 'Unknown'}
                        </div>
                    </td>
                    <td>${user.email || '-'}</td>
                    <td><span style="padding: 0.25rem 0.5rem; background: var(--bg-alt); border-radius: 4px; font-size: 0.85rem;">${user.provider || 'unknown'}</span></td>
                    <td style="font-family: monospace; font-size: 0.85rem;">${user.lastIP || '-'}</td>
                    <td style="font-family: monospace; font-size: 0.75rem; max-width: 200px;">
                        ${user.ipAddresses && user.ipAddresses.length > 0
            ? `<div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">${user.ipAddresses.map(ip => `<span style="padding: 0.15rem 0.4rem; background: var(--bg-alt); border-radius: 3px;">${ip}</span>`).join('')}</div>`
            : '-'}
                    </td>
                    <td style="font-size: 0.85rem; color: var(--text-secondary);">${user.createdAt ? formatDate(user.createdAt) : '-'}</td>
                    <td>
                        ${user.isBanned
            ? '<span style="color: var(--accent-red); font-weight: 600;">🔴 Забанен</span>'
            : '<span style="color: #22c55e; font-weight: 600;">✅ Активен</span>'}
                    </td>
                    <td>
                        <div class="comment-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <button onclick="editUser('${user.id}')" style="padding: 0.4rem 0.8rem; background: rgba(99, 102, 241, 0.1); border: 1px solid var(--accent-primary); border-radius: 6px; color: var(--accent-primary); cursor: pointer; font-size: 0.85rem;">✏️ Редактировать</button>
                            ${user.isBanned
            ? `<button class="btn-unban" onclick="unbanUser('${user.id}')" style="padding: 0.4rem 0.8rem; background: rgba(34, 197, 94, 0.1); border: 1px solid #22c55e; border-radius: 6px; color: #22c55e; cursor: pointer; font-size: 0.85rem;">Разбанить</button>`
            : `<button class="btn-ban" onclick="banUser('${user.id}')" style="padding: 0.4rem 0.8rem; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red); border-radius: 6px; color: var(--accent-red); cursor: pointer; font-size: 0.85rem;">Забанить</button>`}
                        </div>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;

    container.innerHTML = '';
    container.appendChild(table);
}

async function banUser(userId) {
    if (!confirm('Вы уверены, что хотите забанить этого пользователя?')) {
        return;
    }

    const errorDiv = document.getElementById('usersError');
    const successDiv = document.getElementById('usersSuccess');

    hideError(errorDiv);
    hideSuccess(successDiv);

    try {
        const response = await fetch(`${API_BASE}/admin-users`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                userId: userId,
                action: 'ban'
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess(successDiv, 'Пользователь успешно забанен');
            loadUsers();
            loadStats();
        } else {
            showError(errorDiv, data.error || 'Ошибка бана пользователя');
        }
    } catch (error) {
        console.error('Error banning user:', error);
        showError(errorDiv, 'Ошибка подключения к серверу');
    }
}

async function unbanUser(userId) {
    if (!confirm('Вы уверены, что хотите разбанить этого пользователя?')) {
        return;
    }

    const errorDiv = document.getElementById('usersError');
    const successDiv = document.getElementById('usersSuccess');

    hideError(errorDiv);
    hideSuccess(successDiv);

    try {
        const response = await fetch(`${API_BASE}/admin-users`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                userId: userId,
                action: 'unban'
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess(successDiv, 'Пользователь успешно разбанен');
            loadUsers();
            loadStats();
        } else {
            showError(errorDiv, data.error || 'Ошибка разбана пользователя');
        }
    } catch (error) {
        console.error('Error unbanning user:', error);
        showError(errorDiv, 'Ошибка подключения к серверу');
    }
}

async function loadRoles() {
    const container = document.getElementById('rolesContainer');
    const errorDiv = document.getElementById('rolesError');
    const successDiv = document.getElementById('rolesSuccess');

    hideError(errorDiv);
    if (successDiv) successDiv.style.display = 'none';

    showLoading('rolesContainer', 'Загрузка ролей...');

    try {
        const response = await fetch(`${API_BASE}/roles`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        const data = await response.json();

        if (data.success) {
            renderRolesList(data.roles);
        } else {
            showError(errorDiv, data.error || 'Ошибка загрузки ролей');
        }
    } catch (error) {
        console.error('Error loading roles:', error);
        showError(errorDiv, 'Ошибка подключения к серверу: ' + error.message);
    }
}

function renderRolesList(roles) {
    const container = document.getElementById('rolesContainer');

    if (!roles || roles.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Нет созданных ролей</p>';
        return;
    }

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
            ${roles.map(role => `
                <div style="background: var(--bg-alt); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: ${role.color}; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            ${role.icon || '👤'}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: ${role.color};">${role.name}</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">Приоритет: ${role.priority || 0}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                        <button onclick="editRole('${role.id}')" style="flex: 1; padding: 0.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); cursor: pointer;">✏️ Редактировать</button>
                        <button onclick="deleteRoleConfirm('${role.id}')" style="flex: 1; padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red); border-radius: 6px; color: var(--accent-red); cursor: pointer;">🗑️ Удалить</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showCreateRoleModal() {
    const roleModalTitle = document.getElementById('roleModalTitle');
    const roleIdInput = document.getElementById('roleIdInput');
    const roleNameInput = document.getElementById('roleNameInput');
    const roleColorInput = document.getElementById('roleColorInput');
    const roleColorTextInput = document.getElementById('roleColorTextInput');
    const roleIconInput = document.getElementById('roleIconInput');
    const rolePriorityInput = document.getElementById('rolePriorityInput');
    const roleDisplaySeparateInput = document.getElementById('roleDisplaySeparateInput');
    const roleModal = document.getElementById('roleModal');

    if (!roleModal) {
        console.error('Role modal not found in DOM');
        return;
    }

    if (roleModalTitle) roleModalTitle.textContent = 'Создать роль';
    if (roleIdInput) roleIdInput.value = '';
    if (roleNameInput) roleNameInput.value = '';
    if (roleColorInput) roleColorInput.value = '#6366f1';
    if (roleColorTextInput) roleColorTextInput.value = '#6366f1';
    if (roleIconInput) roleIconInput.value = '';
    if (rolePriorityInput) rolePriorityInput.value = '0';
    if (roleDisplaySeparateInput) roleDisplaySeparateInput.checked = false;

    const permComment = document.getElementById('permComment');
    const permEditOwn = document.getElementById('permEditOwn');
    const permDeleteOwn = document.getElementById('permDeleteOwn');
    const permAttachMedia = document.getElementById('permAttachMedia');
    const permBypassModeration = document.getElementById('permBypassModeration');
    const permModerate = document.getElementById('permModerate');
    const permAdminPanel = document.getElementById('permAdminPanel');

    if (permComment) permComment.checked = true;
    if (permEditOwn) permEditOwn.checked = false;
    if (permDeleteOwn) permDeleteOwn.checked = false;
    if (permAttachMedia) permAttachMedia.checked = false;
    if (permBypassModeration) permBypassModeration.checked = false;
    if (permModerate) permModerate.checked = false;
    if (permAdminPanel) permAdminPanel.checked = false;

    roleModal.style.display = 'block';
}

function closeRoleModal() {
    const roleModal = document.getElementById('roleModal');
    if (roleModal) {
        roleModal.style.display = 'none';
    }
}

async function saveRole(event) {
    event.preventDefault();

    const errorDiv = document.getElementById('roleFormError');
    const successDiv = document.getElementById('roleFormSuccess');

    hideError(errorDiv);
    hideSuccess(successDiv);

    const roleId = document.getElementById('roleIdInput').value;
    const name = document.getElementById('roleNameInput').value.trim();
    const color = document.getElementById('roleColorInput').value;
    const icon = document.getElementById('roleIconInput').value.trim();
    const priority = parseInt(document.getElementById('rolePriorityInput').value) || 0;
    const isDisplaySeparate = document.getElementById('roleDisplaySeparateInput').checked;

    const permissions = {
        comment: document.getElementById('permComment').checked,
        editOwn: document.getElementById('permEditOwn').checked,
        deleteOwn: document.getElementById('permDeleteOwn').checked,
        attachMedia: document.getElementById('permAttachMedia').checked,
        bypassModeration: document.getElementById('permBypassModeration').checked,
        moderate: document.getElementById('permModerate').checked,
        adminPanel: document.getElementById('permAdminPanel').checked
    };

    try {
        let response;
        if (roleId) {
            response = await fetch(`${API_BASE}/roles`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    roleId: roleId,
                    name,
                    color,
                    icon: icon || null,
                    priority,
                    isDisplaySeparate,
                    permissions
                })
            });
        } else {
            response = await fetch(`${API_BASE}/roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    name,
                    color,
                    icon: icon || null,
                    priority,
                    isDisplaySeparate,
                    permissions
                })
            });
        }

        const data = await response.json();

        if (data.success) {
            showSuccess(successDiv, roleId ? 'Роль обновлена' : 'Роль создана');
            closeRoleModal();
            loadRoles();
        } else {
            showError(errorDiv, data.error || 'Ошибка сохранения роли');
        }
    } catch (error) {
        console.error('Error saving role:', error);
        showError(errorDiv, 'Ошибка подключения к серверу');
    }
}

async function editRole(roleId) {
    try {
        const response = await fetch(`${API_BASE}/roles`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        const data = await response.json();

        if (data.success) {
            const role = data.roles.find(r => r.id === roleId);
            if (role) {
                document.getElementById('roleModalTitle').textContent = 'Редактировать роль';
                document.getElementById('roleIdInput').value = role.id;
                document.getElementById('roleNameInput').value = role.name;
                document.getElementById('roleColorInput').value = role.color;
                document.getElementById('roleColorTextInput').value = role.color;
                document.getElementById('roleIconInput').value = role.icon || '';
                document.getElementById('rolePriorityInput').value = role.priority || 0;
                document.getElementById('roleDisplaySeparateInput').checked = role.isDisplaySeparate || false;

                const perms = role.permissions || {};
                document.getElementById('permComment').checked = perms.comment || false;
                document.getElementById('permEditOwn').checked = perms.editOwn || false;
                document.getElementById('permDeleteOwn').checked = perms.deleteOwn || false;
                document.getElementById('permAttachMedia').checked = perms.attachMedia || false;
                document.getElementById('permBypassModeration').checked = perms.bypassModeration || false;
                document.getElementById('permModerate').checked = perms.moderate || false;
                document.getElementById('permAdminPanel').checked = perms.adminPanel || false;

                document.getElementById('roleModal').style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading role:', error);
    }
}

async function deleteRoleConfirm(roleId) {
    if (!confirm('Вы уверены, что хотите удалить эту роль? Все пользователи потеряют эту роль.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/roles?roleId=${roleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            loadRoles();
            const successDiv = document.getElementById('rolesSuccess');
            showSuccess(successDiv, 'Роль удалена');
        } else {
            const errorDiv = document.getElementById('rolesError');
            showError(errorDiv, data.error || 'Ошибка удаления роли');
        }
    } catch (error) {
        console.error('Error deleting role:', error);
        const errorDiv = document.getElementById('rolesError');
        showError(errorDiv, 'Ошибка подключения к серверу');
    }
}

async function loadWidgetSettings() {
    const container = document.getElementById('widgetSettingsContainer');
    const errorDiv = document.getElementById('widgetSettingsError');
    const successDiv = document.getElementById('widgetSettingsSuccess');

    hideError(errorDiv);
    hideSuccess(successDiv);

    try {
        const response = await fetch(`${API_BASE}/widget-settings`);
        const data = await response.json();

        if (data.success) {
            renderWidgetSettings(data.settings);
        } else {
            showError(errorDiv, data.error || 'Ошибка загрузки настроек');
        }
    } catch (error) {
        console.error('Error loading widget settings:', error);
        showError(errorDiv, 'Ошибка подключения к серверу');
    }
}

function renderWidgetSettings(settings) {
    const container = document.getElementById('widgetSettingsContainer');

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div class="form-group">
                <label>Тема</label>
                <select id="widgetTheme" style="width: 100%; padding: 0.75rem; background: var(--bg-alt); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary);">
                    <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Темная</option>
                    <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Светлая</option>
                </select>
            </div>
            <div class="form-group">
                <label>Цвет фона</label>
                <input type="color" id="widgetBgColor" value="${settings.backgroundColor || '#1a1a1a'}" style="width: 100%; height: 40px; border: none; border-radius: 6px; cursor: pointer;">
            </div>
            <div class="form-group">
                <label>Цвет текста</label>
                <input type="color" id="widgetTextColor" value="${settings.textColor || '#ffffff'}" style="width: 100%; height: 40px; border: none; border-radius: 6px; cursor: pointer;">
            </div>
            <div class="form-group">
                <label>Акцентный цвет</label>
                <input type="color" id="widgetAccentColor" value="${settings.accentColor || '#6366f1'}" style="width: 100%; height: 40px; border: none; border-radius: 6px; cursor: pointer;">
            </div>
        </div>
        <div class="form-group">
            <label>Функционал:</label>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-top: 0.5rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" id="widgetEnableLikes" ${settings.enableLikes ? 'checked' : ''}>
                    Лайки
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" id="widgetEnableReplies" ${settings.enableReplies ? 'checked' : ''}>
                    Ответы на комментарии
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" id="widgetEnableAttachments" ${settings.enableAttachments ? 'checked' : ''}>
                    Вложения
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" id="widgetEnableGravatar" ${settings.enableGravatar ? 'checked' : ''}>
                    Гравитар
                </label>
            </div>
        </div>
        <div class="form-group">
            <label>Модерация:</label>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-top: 0.5rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" id="widgetAutoModeration" ${settings.autoModeration ? 'checked' : ''}>
                    Авто-модерация по ключевым словам
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" id="widgetRequirePremoderation" ${settings.requirePremoderation ? 'checked' : ''}>
                    Премодерация для новых пользователей
                </label>
            </div>
        </div>
        <div class="form-group">
            <label>Ключевые слова для модерации (через запятую)</label>
            <input type="text" id="widgetModerationKeywords" value="${(settings.moderationKeywords || []).join(', ')}" placeholder="спам, реклама, оскорбление" style="width: 100%; padding: 0.75rem; background: var(--bg-alt); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary);">
        </div>
        <button class="admin-btn" onclick="saveWidgetSettings()" style="margin-top: 1rem;">💾 Сохранить настройки</button>
    `;
}

async function saveWidgetSettings() {
    const errorDiv = document.getElementById('widgetSettingsError');
    const successDiv = document.getElementById('widgetSettingsSuccess');

    hideError(errorDiv);
    hideSuccess(successDiv);

    const keywords = document.getElementById('widgetModerationKeywords').value.split(',').map(k => k.trim()).filter(k => k);

    const settings = {
        theme: document.getElementById('widgetTheme').value,
        backgroundColor: document.getElementById('widgetBgColor').value,
        textColor: document.getElementById('widgetTextColor').value,
        accentColor: document.getElementById('widgetAccentColor').value,
        enableLikes: document.getElementById('widgetEnableLikes').checked,
        enableReplies: document.getElementById('widgetEnableReplies').checked,
        enableAttachments: document.getElementById('widgetEnableAttachments').checked,
        enableGravatar: document.getElementById('widgetEnableGravatar').checked,
        autoModeration: document.getElementById('widgetAutoModeration').checked,
        requirePremoderation: document.getElementById('widgetRequirePremoderation').checked,
        moderationKeywords: keywords
    };

    try {
        const response = await fetch(`${API_BASE}/widget-settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(settings)
        });

        const data = await response.json();

        if (data.success) {
            showSuccess(successDiv, 'Настройки сохранены');
        } else {
            showError(errorDiv, data.error || 'Ошибка сохранения настроек');
        }
    } catch (error) {
        console.error('Error saving widget settings:', error);
        showError(errorDiv, 'Ошибка подключения к серверу');
    }
}

function applyCommentFilters() {
    loadComments();
}

document.addEventListener('DOMContentLoaded', function () {
    const userSearchInput = document.getElementById('userSearchInput');
    if (userSearchInput) {
        userSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadUsers();
            }
        });
    }

    const roleColorInput = document.getElementById('roleColorInput');
    const roleColorTextInput = document.getElementById('roleColorTextInput');

    if (roleColorInput && roleColorTextInput) {
        roleColorInput.addEventListener('input', (e) => {
            roleColorTextInput.value = e.target.value;
        });

        roleColorTextInput.addEventListener('input', (e) => {
            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                roleColorInput.value = e.target.value;
            }
        });
    }
});

