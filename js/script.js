document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const hamburger = document.querySelector(".hamburger");
    const navMenu = document.querySelector(".nav-menu");

    if (hamburger && navMenu) {
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            navMenu.classList.toggle("active");
        });

        document.querySelectorAll(".nav-link").forEach(n => n.addEventListener("click", () => {
            hamburger.classList.remove("active");
            navMenu.classList.remove("active");
        }));
    }

    // Scroll Reveal Animation (Intersection Observer)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.service-item, .gallery-item, .section-title, .contact-item, .hero-content, .artist-content, .price-item');

    revealElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.8s ease';
        observer.observe(el);
    });

    // Gallery Filtering
    const filterBtns = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                filterBtns.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');

                const filterValue = btn.getAttribute('data-filter');

                galleryItems.forEach(item => {
                    if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
                        item.style.display = 'block';
                        // Re-trigger animation if needed, or just show
                        item.style.opacity = '1';
                        item.style.transform = 'translateY(0)';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }

    // Promo Widget Logic
    const promoBtn = document.getElementById('promo-btn');
    const promoPopup = document.getElementById('promo-popup');
    const closePromo = document.getElementById('close-promo');

    if (promoBtn && promoPopup && closePromo) {
        // Toggle on main button click
        promoBtn.addEventListener('click', () => {
            promoPopup.classList.toggle('hidden');
        });

        // Close button logic
        closePromo.addEventListener('click', () => {
            promoPopup.classList.add('hidden');
        });

        // Optional: Auto open after 3 seconds for first engagement
        setTimeout(() => {
            // Check if user hasn't closed it before? For simple usage, just open once.
            // promoPopup.classList.remove('hidden'); 
            // Commented out to avoid being annoying, user can choose to click.
        }, 3000);
    }
});
