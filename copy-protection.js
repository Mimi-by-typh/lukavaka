// Copy Protection Script - Ultra-Compatible Version
(function () {
    'use strict';

    console.log('🔒 Initializing copy protection...');

    // Disable text selection (with broad exceptions)
    document.addEventListener('selectstart', function (e) {
        // Allow selection in form elements and browser extensions
        if (e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.isContentEditable ||
            e.target.closest('[contenteditable="true"]')) {
            return true;
        }

        // Gracefully prevent default
        try {
            e.preventDefault();
        } catch (err) {
            // Silently fail if preventDefault causes issues
        }
        return false;
    }, { passive: false });

    // Disable right-click context menu (with exceptions)
    document.addEventListener('contextmenu', function (e) {
        // Allow context menu on input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return true;
        }

        try {
            e.preventDefault();
        } catch (err) {
            // Silently fail
        }
        return false;
    }, { passive: false });

    // Disable common copy keyboard shortcuts (with exceptions)
    document.addEventListener('keydown', function (e) {
        // Allow shortcuts in input fields
        if (e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.isContentEditable) {
            return true;
        }

        // Ctrl+C, Ctrl+X, Ctrl+A, Ctrl+S, Ctrl+U (view source)
        if ((e.ctrlKey || e.metaKey) && (
            e.keyCode === 67 || // C
            e.keyCode === 88 || // X
            e.keyCode === 65 || // A
            e.keyCode === 83 || // S
            e.keyCode === 85    // U
        )) {
            try {
                e.preventDefault();
            } catch (err) {
                // Silently fail
            }
            return false;
        }
    });

    // Disable drag and drop (safe version)
    document.addEventListener('dragstart', function (e) {
        if (e.target.tagName === 'IMG') {
            try {
                e.preventDefault();
            } catch (err) {
                // Silently fail
            }
            return false;
        }
    });

    // Prevent image context menu (safe version)
    setTimeout(() => {
        try {
            document.querySelectorAll('img').forEach(function (img) {
                img.addEventListener('contextmenu', function (e) {
                    e.preventDefault();
                    return false;
                });
                img.setAttribute('draggable', 'false');
            });
        } catch (err) {
            console.warn('Image protection setup:', err.message);
        }
    }, 500);

    // Add CSS user-select: none to body (safe version)
    setTimeout(() => {
        try {
            if (document.body) {
                document.body.style.userSelect = 'none';
                document.body.style.webkitUserSelect = 'none';
                document.body.style.msUserSelect = 'none';
                document.body.style.mozUserSelect = 'none';
            }
        } catch (err) {
            console.warn('User-select protection:', err.message);
        }
    }, 100);

    // Disable copy event (safe version with better error handling)
    document.addEventListener('copy', function (e) {
        // Allow copy in input fields
        if (e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.isContentEditable) {
            return true;
        }

        try {
            e.preventDefault();
            if (e.clipboardData && e.clipboardData.setData) {
                e.clipboardData.setData('text/plain', 'Копирование запрещено | Lika Frizz © 2024');
            }
        } catch (err) {
            // Completely silent - don't even log to avoid console spam
        }
        return false;
    });

    // Disable cut event (safe version)
    document.addEventListener('cut', function (e) {
        if (e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.isContentEditable) {
            return true;
        }

        try {
            e.preventDefault();
        } catch (err) {
            // Silently fail
        }
        return false;
    });

    // Add watermark (safe version)
    function addWatermark() {
        try {
            if (!document.body) {
                setTimeout(addWatermark, 100);
                return;
            }

            const watermark = document.createElement('div');
            watermark.textContent = 'Lika Frizz © 2024';
            watermark.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 5rem;
                color: rgba(255, 255, 255, 0.02);
                pointer-events: none;
                z-index: 9999;
                user-select: none;
                font-weight: bold;
                white-space: nowrap;
            `;
            document.body.appendChild(watermark);
        } catch (err) {
            // Silently fail if watermark can't be added
        }
    }

    // Initialize after DOM is fully ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addWatermark);
    } else {
        addWatermark();
    }

    // Console warnings (simple version)
    console.log('%c⚠️ Стоп!', 'color: #f59e0b; font-size: 20px; font-weight: bold;');
    console.log('%cЭто браузерная консоль для разработчиков.', 'font-size: 12px; color: #6b7280;');
    console.log('✅ Copy protection enabled');
})();
