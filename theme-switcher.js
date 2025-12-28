// Theme Switcher with Dynamic Loading
(function () {
    'use strict';

    const themes = [
        { id: 'default', name: '💎 Vibrant', description: 'Яркая и насыщенная', file: 'theme-default.css' },
        { id: 'comfort', name: '👁️ Eye Comfort', description: 'Комфорт для глаз', file: 'theme-comfort.css' },
        { id: 'midnight', name: '🌙 Midnight', description: 'Глубокий синий', file: 'theme-midnight.css' },
        { id: 'sunset', name: '🌅 Sunset', description: 'Теплый закат', file: 'theme-sunset.css' },
        { id: 'ocean', name: '🌊 Ocean', description: 'Морская волна', file: 'theme-ocean.css' }
    ];

    let currentTheme = localStorage.getItem('theme') || 'default';
    let loadedThemeLink = null;

    // Dynamically load theme CSS
    function loadThemeCSS(themeId) {
        const theme = themes.find(t => t.id === themeId);
        if (!theme) return;

        // Remove old theme if exists
        if (loadedThemeLink && loadedThemeLink.parentNode) {
            loadedThemeLink.parentNode.removeChild(loadedThemeLink);
            loadedThemeLink = null;
        }

        // Load new theme (only if not default)
        if (themeId !== 'default') {
            loadedThemeLink = document.createElement('link');
            loadedThemeLink.rel = 'stylesheet';
            loadedThemeLink.href = theme.file;
            loadedThemeLink.id = 'active-theme';
            document.head.appendChild(loadedThemeLink);
        }

        // Set data attribute for additional theme-specific styles
        document.documentElement.setAttribute('data-theme', themeId);
    }

    // Apply theme
    function applyTheme(themeId) {
        loadThemeCSS(themeId);
        currentTheme = themeId;
        localStorage.setItem('theme', themeId);
        updateThemeButton();
        console.log('🎨 Theme loaded:', themeId);
    }

    // Create theme switcher UI
    function createThemeSwitcher() {
        const container = document.createElement('div');
        container.className = 'theme-switcher';
        container.innerHTML = `
            <button class="theme-button" id="themeButton" aria-label="Выбрать тему">
                <span class="theme-icon">🎨</span>
                <span class="theme-label">Тема</span>
            </button>
            <div class="theme-dropdown" id="themeDropdown" role="menu">
                <div class="theme-dropdown-header">Выберите тему</div>
                <div class="theme-options">
                    ${themes.map(theme => `
                        <button class="theme-option" data-theme="${theme.id}" role="menuitem">
                            <span class="theme-option-icon">${theme.name.split(' ')[0]}</span>
                            <div class="theme-option-info">
                                <div class="theme-option-name">${theme.name.split(' ').slice(1).join(' ')}</div>
                                <div class="theme-option-desc">${theme.description}</div>
                            </div>
                            <span class="theme-option-check">✓</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        const navAuth = document.querySelector('.nav-auth');
        if (navAuth) {
            navAuth.insertBefore(container, navAuth.firstChild);
        }

        setupEventListeners();
    }

    // Setup event listeners
    function setupEventListeners() {
        const button = document.getElementById('themeButton');
        const dropdown = document.getElementById('themeDropdown');

        if (!button || !dropdown) return;

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            dropdown.classList.remove('show');
        });

        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        const options = document.querySelectorAll('.theme-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                const themeId = option.dataset.theme;
                applyTheme(themeId);
                dropdown.classList.remove('show');
            });
        });
    }

    // Update active theme indicator
    function updateThemeButton() {
        const options = document.querySelectorAll('.theme-option');
        options.forEach(option => {
            option.classList.toggle('active', option.dataset.theme === currentTheme);
        });
    }

    // Initialize
    function init() {
        // Apply saved theme immediately
        applyTheme(currentTheme);

        // Create UI after DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createThemeSwitcher);
        } else {
            createThemeSwitcher();
        }
    }

    init();
})();
