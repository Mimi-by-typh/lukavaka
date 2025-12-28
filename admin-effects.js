// Admin Panel Visual Effects Generator
(function () {
    'use strict';

    // Create floating particles for admin panel
    function createAdminParticles() {
        const particleCount = 20; // Fewer for admin performance
        const body = document.body;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: fixed;
                width: ${2 + Math.random()}px;
                height: ${2 + Math.random()}px;
                background: rgba(99, 102, 241, 0.8);
                border-radius: 50%;
                pointer-events: none;
                z-index: 1;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: twinkle ${3 + Math.random() * 2}s ease-in-out infinite;
                animation-delay: ${Math.random() * 3}s;
                box-shadow: 0 0 8px 1px rgba(99, 102, 241, 0.6);
            `;

            body.appendChild(particle);
        }
    }

    // Add stat icons with animation
    function enhanceStatCards() {
        const statCards = document.querySelectorAll('.stat-card');
        const icons = ['📊', '👥', '👑'];

        statCards.forEach((card, index) => {
            const label = card.querySelector('.stat-label');
            if (label && icons[index]) {
                const icon = document.createElement('span');
                icon.textContent = icons[index];
                icon.style.cssText = `
                    font-size: 2rem;
                    margin-right: 0.5rem;
                    display: inline-block;
                `;
                label.insertBefore(icon, label.firstChild);
            }
        });
    }

    // Add smooth scroll behavior
    function enhanceSmoothScroll() {
        document.documentElement.style.scrollBehavior = 'smooth';
    }

    // Add ripple effect to buttons
    function addButtonRipples() {
        const buttons = document.querySelectorAll('.admin-btn, .btn-delete, .btn-edit, button');

        buttons.forEach(button => {
            button.addEventListener('click', function (e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;

                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.5);
                    left: ${x}px;
                    top: ${y}px;
                    pointer-events: none;
                    animation: ripple 0.6s ease-out;
                `;

                this.style.position = 'relative';
                this.style.overflow = 'hidden';
                this.appendChild(ripple);

                setTimeout(() => ripple.remove(), 600);
            });
        });
    }

    // Add entrance animations to sections
    function addEntranceAnimations() {
        const sections = document.querySelectorAll('.admin-section, .stat-card');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = `fadeInUp 0.6s ease-out ${index * 0.1}s both`;
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1
        });

        sections.forEach(section => {
            section.style.opacity = '0';
            observer.observe(section);
        });
    }

    // Initialize all enhancements
    function init() {
        console.log('🎨 Admin panel visual effects initializing...');

        createAdminParticles();
        enhanceStatCards();
        enhanceSmoothScroll();

        // Add button ripples after a small delay to ensure DOM is ready
        setTimeout(addButtonRipples, 500);

        // Add entrance animations
        setTimeout(addEntranceAnimations, 100);

        console.log('✨ Admin panel effects loaded successfully');
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
