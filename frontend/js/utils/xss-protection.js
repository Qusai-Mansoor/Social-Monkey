/**
 * XSS Protection and Input Sanitization Utilities
 * Prevents Cross-Site Scripting attacks by sanitizing user input
 */

class XSSProtection {
  /**
   * HTML entity encoding to prevent XSS
   * Converts special characters to HTML entities
   */
  static escapeHtml(text) {
    if (typeof text !== "string") {
      return text;
    }

    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "/": "&#x2F;",
      "`": "&#x60;",
      "=": "&#x3D;",
    };

    return text.replace(/[&<>"'`=\/]/g, (char) => map[char]);
  }

  /**
   * Sanitize text content before displaying in DOM
   */
  static sanitizeText(text) {
    if (typeof text !== "string") {
      return "";
    }

    // Remove any script tags
    let sanitized = text.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ""
    );

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");

    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, "");

    // Remove data: protocol (can be used for XSS)
    sanitized = sanitized.replace(/data:text\/html/gi, "");

    return sanitized;
  }

  /**
   * Create safe text node (recommended for user-generated content)
   */
  static createSafeTextNode(text) {
    return document.createTextNode(this.sanitizeText(text));
  }

  /**
   * Safely set text content
   */
  static setTextContent(element, text) {
    if (!element) return;
    element.textContent = this.sanitizeText(text);
  }

  /**
   * Safely append text
   */
  static appendSafeText(element, text) {
    if (!element) return;
    const textNode = this.createSafeTextNode(text);
    element.appendChild(textNode);
  }

  /**
   * Validate and sanitize URL
   */
  static sanitizeUrl(url) {
    if (typeof url !== "string") {
      return "";
    }

    // Only allow http and https protocols
    const urlPattern = /^https?:\/\//i;

    if (!urlPattern.test(url)) {
      return "";
    }

    // Remove javascript: and data: protocols
    const cleaned = url.replace(/javascript:/gi, "").replace(/data:/gi, "");

    return cleaned;
  }

  /**
   * Sanitize object for JSON transmission
   * Prevents injection through JSON
   */
  static sanitizeObject(obj) {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        sanitized[key] = this.sanitizeText(value);
      } else if (typeof value === "object") {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Safe innerHTML replacement
   * Use this instead of directly setting innerHTML
   */
  static setInnerHTML(element, html) {
    if (!element) return;

    // Create a temporary div to parse HTML
    const temp = document.createElement("div");
    temp.textContent = html; // This escapes HTML
    element.innerHTML = temp.innerHTML;
  }

  /**
   * Validate email format (prevents injection)
   */
  static isValidEmail(email) {
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Validate username (alphanumeric + underscore only)
   */
  static isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  }

  /**
   * Strip HTML tags completely
   */
  static stripHtml(html) {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  }

  /**
   * Sanitize search query
   */
  static sanitizeSearchQuery(query) {
    if (typeof query !== "string") {
      return "";
    }

    // Remove SQL injection patterns
    let sanitized = query.replace(
      /('|(--)|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union)/gi,
      ""
    );

    // Remove script tags and event handlers
    sanitized = this.sanitizeText(sanitized);

    // Limit length
    return sanitized.substring(0, 100);
  }

  /**
   * Content Security Policy compliant event handler
   * Use this instead of inline onclick, etc.
   */
  static addSecureEventListener(element, event, handler) {
    if (!element || typeof handler !== "function") return;

    element.addEventListener(event, (e) => {
      // Prevent default if needed
      if (event === "submit") {
        e.preventDefault();
      }
      handler(e);
    });
  }

  /**
   * Validate file upload
   */
  static isValidFileType(filename, allowedExtensions = []) {
    if (!filename || typeof filename !== "string") {
      return false;
    }

    const extension = filename.split(".").pop().toLowerCase();
    return allowedExtensions.includes(extension);
  }

  /**
   * Generate secure random token (for CSRF protection)
   */
  static generateSecureToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = XSSProtection;
}

// Make available globally
window.XSSProtection = XSSProtection;
