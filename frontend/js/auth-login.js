/**
 * Login Page JavaScript
 * Handles login form validation and API integration
 */

// Import API configuration
class LoginManager {
  constructor() {
    this.form = document.getElementById("loginForm");
    this.emailInput = document.getElementById("email");
    this.passwordInput = document.getElementById("password");
    this.rememberCheckbox = document.getElementById("remember");
    this.submitButton = document.getElementById("submitBtn");
    this.messageContainer = document.getElementById("messageContainer");
    this.connectionStatus = document.querySelector(
      "#connectionStatus .status-indicator"
    );

    this.isLoading = false;

    this.initializeEventListeners();
    this.checkBackendConnection();
    this.loadRememberedCredentials();
  }

  initializeEventListeners() {
    // Form submission
    this.form.addEventListener("submit", this.handleLogin.bind(this));

    // Real-time validation
    this.emailInput.addEventListener("input", this.validateEmail.bind(this));
    this.passwordInput.addEventListener(
      "input",
      this.validatePassword.bind(this)
    );

    // Password visibility toggle
    const passwordToggle = document.getElementById("passwordToggle");
    if (passwordToggle) {
      passwordToggle.addEventListener(
        "click",
        this.togglePasswordVisibility.bind(this)
      );
    }

    // Social login buttons
    const googleBtn = document.getElementById("googleLogin");
    const twitterBtn = document.getElementById("twitterLogin");

    if (googleBtn) {
      googleBtn.addEventListener("click", () =>
        this.handleSocialLogin("google")
      );
    }

    if (twitterBtn) {
      twitterBtn.addEventListener("click", () =>
        this.handleSocialLogin("twitter")
      );
    }

    // Remember me functionality
    if (this.rememberCheckbox) {
      this.rememberCheckbox.addEventListener(
        "change",
        this.handleRememberMe.bind(this)
      );
    }
  }

  async handleLogin(event) {
    event.preventDefault();

    console.log("Login form submitted");

    if (this.isLoading) return;

    // Validate form
    if (!this.validateForm()) {
      console.log("Form validation failed");
      return;
    }

    console.log("Form validation passed, attempting login");
    this.setLoading(true);
    this.clearMessages();

    try {
      const loginUrl = `/api/v1/auth/login`;
      console.log("Sending login request to:", loginUrl);

      const payload = {
        email: this.emailInput.value.trim(),
        password: this.passwordInput.value,
      };

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("Login response status:", response.status);
      const data = await response.json();
      console.log("Login response data:", data);

      if (response.ok) {
        // Login successful
        this.showMessage("Login successful! Redirecting...", "success");

        // Store authentication token
        if (data.access_token) {
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("tokenType", data.token_type || "bearer");
        }

        // Store user information
        if (data.user) {
          console.log("Storing user data:", data.user);
          const userJson = JSON.stringify(data.user);
          localStorage.setItem("user", userJson);
          console.log("User data stored in localStorage");
          const verification = localStorage.getItem("user");
          console.log("Verification - reading back:", verification);

          if (!verification) {
            console.error("CRITICAL ERROR: localStorage.setItem failed!");
            alert("Failed to save user data. Please try again.");
            return;
          }

          // Clear any stale navigation data to ensure fresh login goes to overview
          localStorage.removeItem("lastVisitedPage");
          console.log("Cleared lastVisitedPage to ensure redirect to overview");
        } else {
          console.error("ERROR: Backend did not return user object!");
          console.log("Full response:", data);
        }

        // Handle remember me
        if (this.rememberCheckbox.checked) {
          this.saveCredentials();
        } else {
          this.clearSavedCredentials();
        }

        // Final check before redirect
        console.log("=== FINAL VERIFICATION BEFORE REDIRECT ===");
        console.log("access_token:", localStorage.getItem("access_token"));
        console.log("user:", localStorage.getItem("user"));
        console.log("==========================================");

        // Redirect to dashboard overview after short delay
        setTimeout(() => {
          console.log("Redirecting to dashboard#overview");
          window.location.href = "/dashboard#overview";
        }, 1500);
      } else {
        // Login failed
        this.showMessage(
          data.detail || "Login failed. Please check your credentials.",
          "error"
        );
        this.setLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      this.showMessage("Network error. Please try again.", "error");
      this.setLoading(false);
    }
  }

  validateForm() {
    let isValid = true;

    // Validate email
    if (!this.validateEmail()) {
      isValid = false;
    }

    // Validate password
    if (!this.validatePassword()) {
      isValid = false;
    }

    return isValid;
  }

  validateEmail() {
    const email = this.emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      this.setFieldError(this.emailInput, "Email is required");
      return false;
    }

    if (!emailRegex.test(email)) {
      this.setFieldError(this.emailInput, "Please enter a valid email address");
      return false;
    }

    this.setFieldValid(this.emailInput);
    return true;
  }

  validatePassword() {
    const password = this.passwordInput.value;

    if (!password) {
      this.setFieldError(this.passwordInput, "Password is required");
      return false;
    }

    if (password.length < 6) {
      this.setFieldError(
        this.passwordInput,
        "Password must be at least 6 characters"
      );
      return false;
    }

    this.setFieldValid(this.passwordInput);
    return true;
  }

  setFieldError(input, message) {
    input.classList.add("error");
    input.classList.remove("valid");

    // Show error message
    let errorElement = input.parentElement.querySelector(".input-hint");
    if (!errorElement) {
      errorElement = document.createElement("div");
      errorElement.className = "input-hint";
      input.parentElement.appendChild(errorElement);
    }
    errorElement.textContent = message;
    errorElement.style.color = "var(--danger)";
  }

  setFieldValid(input) {
    input.classList.remove("error");
    input.classList.add("valid");

    // Remove error message
    const errorElement = input.parentElement.querySelector(".input-hint");
    if (errorElement) {
      errorElement.textContent = "";
    }
  }

  togglePasswordVisibility() {
    const type =
      this.passwordInput.getAttribute("type") === "password"
        ? "text"
        : "password";
    this.passwordInput.setAttribute("type", type);

    const toggle = document.getElementById("passwordToggle");
    const showIcon = toggle.querySelector(".eye-icon");
    const hideIcon = toggle.querySelector(".eye-off-icon");

    if (type === "text") {
      showIcon.classList.add("hidden");
      hideIcon.classList.remove("hidden");
    } else {
      showIcon.classList.remove("hidden");
      hideIcon.classList.add("hidden");
    }
  }

  handleSocialLogin(provider) {
    this.showMessage(`Redirecting to ${provider} login...`, "success");

    // Construct OAuth URL
    const oauthUrl = `/api/v1/auth/oauth/${provider}`;

    // Redirect to OAuth provider
    window.location.href = oauthUrl;
  }

  handleRememberMe() {
    if (this.rememberCheckbox.checked) {
      // Save current credentials if form is valid
      if (this.emailInput.value && this.passwordInput.value) {
        this.saveCredentials();
      }
    } else {
      // Clear saved credentials
      this.clearSavedCredentials();
    }
  }

  saveCredentials() {
    const credentials = {
      email: this.emailInput.value,
      remember: true,
    };

    localStorage.setItem("rememberedCredentials", JSON.stringify(credentials));
  }

  loadRememberedCredentials() {
    try {
      const saved = localStorage.getItem("rememberedCredentials");
      if (saved) {
        const credentials = JSON.parse(saved);
        if (credentials.remember && credentials.email) {
          this.emailInput.value = credentials.email;
          this.rememberCheckbox.checked = true;
        }
      }
    } catch (error) {
      console.error("Error loading remembered credentials:", error);
    }
  }

  clearSavedCredentials() {
    localStorage.removeItem("rememberedCredentials");
  }

  setLoading(loading) {
    this.isLoading = loading;

    if (loading) {
      this.submitButton.disabled = true;
      this.submitButton.innerHTML = `
                <div class="btn-loader">
                    <div class="spinner"></div>
                </div>
                <span style="opacity: 0;">Sign In</span>
            `;
    } else {
      this.submitButton.disabled = false;
      this.submitButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Sign In
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
    if (type === "success") {
      setTimeout(() => {
        this.clearMessages();
      }, 3000);
    }
  }

  clearMessages() {
    this.messageContainer.innerHTML = "";
  }

  async checkBackendConnection() {
    console.log("Checking backend connection to:", `/health`);
    try {
      // Try the /health endpoint
      const response = await fetch(`/health`);

      console.log("Backend response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("Backend response data:", data);
        this.updateConnectionStatus("connected", "Backend Connected");
      } else {
        console.error("Backend error:", response.status, response.statusText);
        this.updateConnectionStatus("error", "Backend Error");
      }
    } catch (error) {
      console.error("Connection check failed:", error);
      this.updateConnectionStatus("error", "Backend Offline");
    }
  }

  updateConnectionStatus(status, message) {
    const statusElement = this.connectionStatus;

    if (statusElement) {
      statusElement.className = `status-indicator ${status}`;
      statusElement.querySelector("span").textContent = message;
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new LoginManager();
});

// Export for testing purposes
if (typeof module !== "undefined" && module.exports) {
  module.exports = LoginManager;
}
