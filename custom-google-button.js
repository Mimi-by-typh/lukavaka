// Custom Google Sign-In Button Handler - Simple Version
(function () {
    'use strict';

    function initCustomGoogleButton() {
        const authContainer = document.querySelector('.nav-auth');
        if (!authContainer) {
            setTimeout(initCustomGoogleButton, 100);
            return;
        }

        // Find original Google button
        const originalButton = document.getElementById('googleSignInButton');
        if (!originalButton) {
            setTimeout(initCustomGoogleButton, 100);
            return;
        }

        // Check if custom button already exists
        if (document.querySelector('.custom-google-btn')) {
            return;
        }

        // Create custom button
        const customBtn = document.createElement('button');
        customBtn.className = 'custom-google-btn';
        customBtn.id = 'customGoogleSignIn';
        customBtn.type = 'button';
        customBtn.innerHTML = `
            <svg class="google-icon-custom" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span class="google-btn-text">Войти через Google</span>
        `;

        // Insert our button before the original
        originalButton.parentNode.insertBefore(customBtn, originalButton);

        // Hide original but keep it functional (opacity: 0, pointer-events: none)
        originalButton.style.cssText = 'position: absolute !important; opacity: 0 !important; pointer-events: none !important; width: 1px !important; height: 1px !important; overflow: hidden !important;';

        // Click handler - trigger click on original button
        customBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            // Find the actual clickable element inside Google's iframe or div
            const googleDiv = originalButton.querySelector('div[role="button"]');
            const googleIframe = originalButton.querySelector('iframe');

            if (googleDiv) {
                googleDiv.click();
            } else if (googleIframe) {
                // Can't click inside iframe due to cross-origin, so show the original button temporarily
                originalButton.style.cssText = '';
                originalButton.style.position = 'absolute';
                originalButton.style.top = customBtn.offsetTop + 'px';
                originalButton.style.left = customBtn.offsetLeft + 'px';
                originalButton.style.zIndex = '9999';

                // Hide after a short delay
                setTimeout(() => {
                    originalButton.style.cssText = 'position: absolute !important; opacity: 0 !important; pointer-events: none !important; width: 1px !important; height: 1px !important; overflow: hidden !important;';
                }, 5000);
            }
        });

        console.log('✨ Custom Google button ready');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initCustomGoogleButton, 500));
    } else {
        setTimeout(initCustomGoogleButton, 500);
    }
})();
