/**
 * Session Manager Client Library
 * Handles session creation, validation, and renewal for vera-pro.html
 */

class SessionManager {
  constructor(email, apiBaseUrl = '') {
    this.email = email;
    this.apiBaseUrl = apiBaseUrl || window.location.origin;
    this.storageKey = 'veraSessionToken';
    this.emailStorageKey = 'userEmail';
  }

  /**
   * Create a session after successful authentication
   * Called after magic link verification
   */
  async createSession() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/auth/validate-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email,
          action: 'create'
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      if (data.success && data.sessionToken) {
        // Store session token
        this._storeSession(data.sessionToken);
        console.log(`✅ Session created, expires in ${data.expiresIn / 1000 / 60 / 60 / 24} days`);
        return data;
      }
      
      throw new Error(data.error || 'Failed to create session');
    } catch (err) {
      console.error('❌ Failed to create session:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Validate current session is still active
   */
  async validateSession() {
    const token = this._getStoredToken();
    
    if (!token) {
      console.warn('⚠️  No session token found in localStorage');
      return { valid: false, reason: 'no_token' };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/auth/validate-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email,
          sessionToken: token,
          action: 'validate'
        })
      });

      if (!response.ok) {
        this._clearSession();
        return { valid: false, reason: 'validation_failed' };
      }

      const data = await response.json();
      
      if (data.valid) {
        console.log(`✅ Session is valid for ${this.email}`);
        return data;
      } else {
        this._clearSession();
        console.warn('⚠️  Session validation failed:', data.error);
        return data;
      }
    } catch (err) {
      console.error('❌ Error validating session:', err);
      return { valid: false, error: err.message };
    }
  }

  /**
   * Revoke/logout the current session
   */
  async revokeSession() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/auth/validate-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email,
          action: 'revoke'
        })
      });

      if (response.ok) {
        this._clearSession();
        console.log(`✅ Session revoked for ${this.email}`);
        return { success: true };
      }
    } catch (err) {
      console.error('❌ Error revoking session:', err);
    }

    // Clear locally even if API fails
    this._clearSession();
    return { success: true };
  }

  /**
   * Check if a valid session exists (without calling API)
   */
  isAuthenticated() {
    return !!this._getStoredToken();
  }

  /**
   * Get stored session token
   */
  getSessionToken() {
    return this._getStoredToken();
  }

  /**
   * Private: Store session token in localStorage
   */
  _storeSession(token) {
    localStorage.setItem(this.storageKey, token);
    localStorage.setItem(this.emailStorageKey, this.email);
  }

  /**
   * Private: Get stored session token
   */
  _getStoredToken() {
    return localStorage.getItem(this.storageKey);
  }

  /**
   * Private: Clear session from localStorage
   */
  _clearSession() {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.emailStorageKey);
  }
}

// Export for both browser and module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionManager;
}
