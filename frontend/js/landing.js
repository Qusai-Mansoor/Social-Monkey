// Function to check backend health
async function checkBackendHealth() {
    const statusIndicator = document.getElementById('backend-status');
    try {
        const response = await fetch(`/health`);
        if (response.ok) {
            updateBackendStatus(true);
        } else {
            updateBackendStatus(false);
        }
    } catch (error) {
        updateBackendStatus(false);
    }
}

// Update UI to show backend connection status
function updateBackendStatus(isConnected) {
    let statusIndicator = document.getElementById('backend-status');
    if (!statusIndicator) {
        statusIndicator = document.createElement('div');
        statusIndicator.id = 'backend-status';
        statusIndicator.style.position = 'fixed';
        statusIndicator.style.bottom = '20px';
        statusIndicator.style.right = '20px';
        statusIndicator.style.padding = '8px 16px';
        statusIndicator.style.borderRadius = '6px';
        statusIndicator.style.fontWeight = 'bold';
        statusIndicator.style.zIndex = '9999';
        statusIndicator.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
        document.body.appendChild(statusIndicator);
    }
    if (isConnected) {
        statusIndicator.textContent = "Backend Connected";
        statusIndicator.style.background = "#d4edda";
        statusIndicator.style.color = "#155724";
        statusIndicator.style.border = "1px solid #c3e6cb";
    } else {
        statusIndicator.textContent = "Backend Disconnected";
        statusIndicator.style.background = "#f8d7da";
        statusIndicator.style.color = "#721c24";
        statusIndicator.style.border = "1px solid #f5c6cb";
    }
}

//Run health check on page load and every 10 seconds
// document.addEventListener('DOMContentLoaded', function() {
//     checkBackendHealth();
//     setInterval(checkBackendHealth, 10000);
// });


document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeAnimations();
    initializeScrollEffects();
});

function initializeNavigation() {
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.getBoundingClientRect().top + window.pageYOffset - 100;
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
                
                // Update active nav link
                navLinks.forEach(nl => nl.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
    
    // Update active nav link on scroll
    window.addEventListener('scroll', updateActiveNavLink);
}

function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    const scrollY = window.pageYOffset;
    
    sections.forEach(section => {
        const sectionTop = section.getBoundingClientRect().top + scrollY - 150;
        const sectionBottom = sectionTop + section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollY >= sectionTop && scrollY < sectionBottom) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

function initializeAnimations() {
    // Animate chart bars in experience card
    const chartBars = document.querySelectorAll('.chart-bar');
    
    const observerOptions = {
        threshold: 0.5
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                chartBars.forEach((bar, index) => {
                    setTimeout(() => {
                        bar.style.transform = 'scaleY(1)';
                        bar.style.opacity = '1';
                    }, index * 100);
                });
            }
        });
    }, observerOptions);
    
    const experienceCard = document.querySelector('.experience-card');
    if (experienceCard) {
        // Initially hide bars
        chartBars.forEach(bar => {
            bar.style.transformOrigin = 'bottom';
            bar.style.transform = 'scaleY(0)';
            bar.style.opacity = '0';
            bar.style.transition = 'all 0.6s ease';
        });
        
        observer.observe(experienceCard);
    }
}

function initializeScrollEffects() {
    // Parallax effect for hero background
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.hero-bg-gradient');
        
        parallaxElements.forEach(element => {
            const speed = 0.5;
            element.style.transform = `translateY(${scrolled * speed}px)`;
        });
    });
    
    // Fade in animations for sections
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Apply fade effect to sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'all 0.8s ease';
        fadeObserver.observe(section);
    });
}

// Button interactions
document.addEventListener('click', function(e) {
    if (e.target.closest('.btn')) {
        const button = e.target.closest('.btn');
        
        // Add click effect
        button.style.transform = 'scale(0.98)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }
});

// Portfolio item hover effects
const portfolioItems = document.querySelectorAll('.portfolio-item');
portfolioItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px)';
    });
    
    item.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});

// Mobile menu toggle (if needed)
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('mobile-open');
}

// Add mobile styles if screen is small
function checkMobile() {
    if (window.innerWidth <= 768) {
        document.body.classList.add('mobile');
    } else {
        document.body.classList.remove('mobile');
    }
}

window.addEventListener('resize', checkMobile);
checkMobile();



// Sign In Button Handler
const signInBtn = document.getElementById('btn btn-nav');

if (signInBtn) {
    signInBtn.addEventListener('click', () => {
        window.location.href = 'signin.html';
    });
}