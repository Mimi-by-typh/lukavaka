// Particle/Star Effects Generator
(function () {
    'use strict';

    // Generate particles
    function createParticles() {
        const particleCount = 30;
        const body = document.body;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            // Random positioning
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            const delay = Math.random() * 4;
            const duration = 3 + Math.random() * 2;

            particle.style.left = `${left}%`;
            particle.style.top = `${top}%`;
            particle.style.animationDelay = `${delay}s`;
            particle.style.animationDuration = `${duration}s`;

            // Random size variation
            const size = 2 + Math.random() * 2;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            body.appendChild(particle);
        }
    }

    // Add neon text effect to hero title
    function enhanceHeroTitle() {
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle) {
            heroTitle.classList.add('neon-text');
        }
    }

    // Add holographic effect to pricing cards
    function enhancePricingCards() {
        const pricingCards = document.querySelectorAll('.pricing-card');
        pricingCards.forEach(card => {
            card.classList.add('holographic');
        });
    }

    // Add glassmorphism enhanced effect
    function enhanceGlassPanels() {
        const glassPanels = document.querySelectorAll('.glass-panel');
        glassPanels.forEach(panel => {
            // Already enhanced in CSS, just ensuring class is present
        });
    }

    // Initialize all effects
    function init() {
        createParticles();
        enhanceHeroTitle();
        enhancePricingCards();
        enhanceGlassPanels();

        console.log('✨ Advanced visual effects initialized');
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
