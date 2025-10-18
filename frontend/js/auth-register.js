/**
 * Registration Page JavaScript
 * Handles registration form validation and API integration
 */

// Import API configuration

class RegisterManager {
    constructor() {
        this.form = document.getElementById('registerForm');
        this.usernameInput = document.getElementById('username');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
        this.termsCheckbox = document.getElementById('terms');
        this.submitButton = document.getElementById('submitBtn');
        this.messageContainer = document.getElementById('messageContainer');
        this.connectionStatus = document.querySelector('#connectionStatus .status-indicator');
        
        this.isLoading = false;

        this.checkBackendConnection();
        this.initializeEventListeners();
        
    }
    
    initializeEventListeners() {
        // Form submission
        this.form.addEventListener('submit', this.handleRegister.bind(this));
        
        // Real-time validation
        this.usernameInput.addEventListener('input', this.validateUsername.bind(this));
        this.emailInput.addEventListener('input', this.validateEmail.bind(this));
        this.passwordInput.addEventListener('input', this.validatePassword.bind(this));
        this.confirmPasswordInput.addEventListener('input', this.validateConfirmPassword.bind(this));
        this.termsCheckbox.addEventListener('change', this.validateTerms.bind(this));
        
        // Password visibility toggles
        const passwordToggle = document.getElementById('passwordToggle');
        const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
        
        if (passwordToggle) {
            passwordToggle.addEventListener('click', () => this.togglePasswordVisibility('password'));
        }
        
        if (confirmPasswordToggle) {
            confirmPasswordToggle.addEventListener('click', () => this.togglePasswordVisibility('confirmPassword'));
        }
        
        // Social registration buttons
        const googleBtn = document.getElementById('googleRegister');
        const twitterBtn = document.getElementById('twitterRegister');
        
        if (googleBtn) {
            googleBtn.addEventListener('click', () => this.handleSocialRegister('google'));
        }
        
        if (twitterBtn) {
            twitterBtn.addEventListener('click', () => this.handleSocialRegister('twitter'));
        }
    }
    
    async handleRegister(event) {
        event.preventDefault();
        
        if (this.isLoading) return;
        
        // Validate form
        if (!this.validateForm()) {
            return;
        }
        
        this.setLoading(true);
        this.clearMessages();
        
        try {
            const userData = {
                username: this.usernameInput.value.trim(),
                email: this.emailInput.value.trim(),
                password: this.passwordInput.value
            };
            
            const response = await fetch(`/api/v1/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Registration successful
                this.showMessage('Registration successful! Please check your email for verification.', 'success');
                
                // Store temporary user info
                if (data.user) {
                    localStorage.setItem('tempUser', JSON.stringify(data.user));
                }
                
                // Redirect to login page after delay
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
                
            } else {
                // Registration failed
                let errorMessage = 'Registration failed. Please try again.';
                
                if (data.detail) {
                    if (typeof data.detail === 'string') {
                        errorMessage = data.detail;
                    } else if (Array.isArray(data.detail)) {
                        errorMessage = data.detail.map(err => err.msg || err.message || err).join(', ');
                    }
                }
                
                this.showMessage(errorMessage, 'error');
                this.setLoading(false);
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showMessage('Network error. Please try again.', 'error');
            this.setLoading(false);
        }
    }
    
    validateForm() {
        let isValid = true;
        
        // Validate all fields
        if (!this.validateUsername()) isValid = false;
        if (!this.validateEmail()) isValid = false;
        if (!this.validatePassword()) isValid = false;
        if (!this.validateConfirmPassword()) isValid = false;
        if (!this.validateTerms()) isValid = false;
        
        return isValid;
    }
    
    validateUsername() {
        const username = this.usernameInput.value.trim();
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        
        if (!username) {
            this.setFieldError(this.usernameInput, 'Username is required');
            return false;
        }
        
        if (username.length < 3) {
            this.setFieldError(this.usernameInput, 'Username must be at least 3 characters');
            return false;
        }
        
        if (username.length > 20) {
            this.setFieldError(this.usernameInput, 'Username must be less than 20 characters');
            return false;
        }
        
        if (!usernameRegex.test(username)) {
            this.setFieldError(this.usernameInput, 'Username can only contain letters, numbers, and underscores');
            return false;
        }
        
        this.setFieldValid(this.usernameInput);
        return true;
    }
    
    validateEmail() {
        const email = this.emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            this.setFieldError(this.emailInput, 'Email is required');
            return false;
        }
        
        if (!emailRegex.test(email)) {
            this.setFieldError(this.emailInput, 'Please enter a valid email address');
            return false;
        }
        
        this.setFieldValid(this.emailInput);
        return true;
    }
    
    validatePassword() {
        const password = this.passwordInput.value;
        
        if (!password) {
            this.setFieldError(this.passwordInput, 'Password is required');
            this.updatePasswordStrength('');
            return false;
        }
        
        if (password.length < 8) {
            this.setFieldError(this.passwordInput, 'Password must be at least 8 characters');
            this.updatePasswordStrength(password);
            return false;
        }
        
        // Check password strength
        const strength = this.calculatePasswordStrength(password);
        this.updatePasswordStrength(password);
        
        if (strength < 3) {
            this.setFieldError(this.passwordInput, 'Please use a stronger password');
            return false;
        }
        
        this.setFieldValid(this.passwordInput);
        
        // Re-validate confirm password if it has a value
        if (this.confirmPasswordInput.value) {
            this.validateConfirmPassword();
        }
        
        return true;
    }
    
    validateConfirmPassword() {
        const password = this.passwordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;
        
        if (!confirmPassword) {
            this.setFieldError(this.confirmPasswordInput, 'Please confirm your password');
            this.updatePasswordMatch(false);
            return false;
        }
        
        if (password !== confirmPassword) {
            this.setFieldError(this.confirmPasswordInput, 'Passwords do not match');
            this.updatePasswordMatch(false);
            return false;
        }
        
        this.setFieldValid(this.confirmPasswordInput);
        this.updatePasswordMatch(true);
        return true;
    }
    
    validateTerms() {
        if (!this.termsCheckbox.checked) {
            this.showMessage('Please accept the Terms of Service and Privacy Policy', 'error');
            return false;
        }
        return true;
    }
    
    calculatePasswordStrength(password) {
        let score = 0;
        
        // Length check
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        
        // Character variety checks
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        return Math.min(score, 4);
    }
    
    updatePasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');
        
        if (!password) {
            strengthBar.className = 'strength-fill';
            strengthBar.style.width = '0%';
            strengthText.textContent = '';
            return;
        }
        
        const strength = this.calculatePasswordStrength(password);
        const strengthLevels = ['weak', 'fair', 'good', 'strong'];
        const strengthTexts = ['Weak', 'Fair', 'Good', 'Strong'];
        const strengthWidths = ['25%', '50%', '75%', '100%'];
        
        if (strength > 0) {
            const level = Math.min(strength - 1, 3);
            strengthBar.className = `strength-fill ${strengthLevels[level]}`;
            strengthBar.style.width = strengthWidths[level];
            strengthText.textContent = `Password strength: ${strengthTexts[level]}`;
        }
    }
    
    updatePasswordMatch(matches) {
        const matchIcon = document.querySelector('.password-match-icon');
        
        if (matchIcon) {
            if (matches) {
                matchIcon.className = 'password-match-icon match';
            } else {
                matchIcon.className = 'password-match-icon no-match';
            }
        }
    }
    
    setFieldError(input, message) {
        input.classList.add('error');
        input.classList.remove('valid');
        
        // Show error message
        let errorElement = input.parentElement.querySelector('.input-hint');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'input-hint';
            input.parentElement.appendChild(errorElement);
        }
        errorElement.textContent = message;
        errorElement.style.color = 'var(--danger)';
    }
    
    setFieldValid(input) {
        input.classList.remove('error');
        input.classList.add('valid');
        
        // Remove error message
        const errorElement = input.parentElement.querySelector('.input-hint');
        if (errorElement) {
            errorElement.textContent = '';
        }
    }
    
    togglePasswordVisibility(fieldType) {
        let input, toggle;
        
        if (fieldType === 'password') {
            input = this.passwordInput;
            toggle = document.getElementById('passwordToggle');
        } else {
            input = this.confirmPasswordInput;
            toggle = document.getElementById('confirmPasswordToggle');
        }
        
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        
        const showIcon = toggle.querySelector('.show-icon');
        const hideIcon = toggle.querySelector('.hide-icon');
        
        if (type === 'text') {
            showIcon.classList.add('hidden');
            hideIcon.classList.remove('hidden');
        } else {
            showIcon.classList.remove('hidden');
            hideIcon.classList.add('hidden');
        }
    }
    
    handleSocialRegister(provider) {
        this.showMessage(`Redirecting to ${provider} registration...`, 'success');
        
        // Construct OAuth URL
        const oauthUrl = `/api/v1/auth/oauth/${provider}`;
        
        // Redirect to OAuth provider
        window.location.href = oauthUrl;
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        
        if (loading) {
            this.submitButton.disabled = true;
            this.submitButton.innerHTML = `
                <div class="btn-loader">
                    <div class="spinner"></div>
                </div>
                <span style="opacity: 0;">Create Account</span>
            `;
        } else {
            this.submitButton.disabled = false;
            this.submitButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Create Account
            `;
        }
    }
    
    showMessage(message, type) {
        this.messageContainer.innerHTML = `
            <div class="${type}-message">
                ${message}
            </div>
        `;
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                this.clearMessages();
            }, 5000);
        }
    }
    
    clearMessages() {
        this.messageContainer.innerHTML = '';
    }
    
    async checkBackendConnection() {
        console.log('Checking backend connection to:', `/health`);
        try {
            // Try the /health endpoint
            const response = await fetch(`/health`);

            console.log('Backend response status:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('Backend response data:', data);
                this.updateConnectionStatus('connected', 'Backend Connected');
            } else {
                console.error('Backend error:', response.status, response.statusText);
                this.updateConnectionStatus('error', 'Backend Error');
            }
        } catch (error) {
            console.error('Connection check failed:', error);
            this.updateConnectionStatus('error', 'Backend Offline');
        }
    }
    
    updateConnectionStatus(status, message) {
        const statusElement = this.connectionStatus;
        
        if (statusElement) {
            statusElement.className = `status-indicator ${status}`;
            statusElement.querySelector('span').textContent = message;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RegisterManager();
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RegisterManager;
}