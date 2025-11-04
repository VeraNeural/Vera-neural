// Shared Token Storage Module for Trial Authentication
// Used by both send-trial-magic-link.js and verify-trial-link.js

// In-memory token store (for development)
// TODO: For production, migrate to PostgreSQL/MongoDB
const tokenStore = {};

module.exports = {
  /**
   * Store a new token
   * @param {string} token - The unique token
   * @param {object} data - Token data { email, createdAt, expiresAt, used }
   */
  setToken(token, data) {
    tokenStore[token] = data;
    console.log(`💾 Token stored: ${token.substring(0, 8)}... for ${data.email}`);
  },

  /**
   * Retrieve token data
   * @param {string} token - The token to look up
   * @returns {object|null} Token data or null if not found
   */
  getToken(token) {
    return tokenStore[token] || null;
  },

  /**
   * Mark a token as used (one-time use)
   * @param {string} token - The token to mark
   */
  markTokenUsed(token) {
    if (tokenStore[token]) {
      tokenStore[token].used = true;
      console.log(`✅ Token marked as used: ${token.substring(0, 8)}...`);
    }
  },

  /**
   * Delete a token from storage
   * @param {string} token - The token to delete
   */
  deleteToken(token) {
    if (tokenStore[token]) {
      delete tokenStore[token];
      console.log(`🗑️ Token deleted: ${token.substring(0, 8)}...`);
    }
  },

  /**
   * Find active (unused, non-expired) token for an email
   * @param {string} email - The email to check
   * @returns {object|null} Token data if active token exists
   */
  findActiveToken(email) {
    const now = new Date();
    for (const token in tokenStore) {
      const data = tokenStore[token];
      if (
        data.email === email &&
        !data.used &&
        new Date(data.expiresAt) > now
      ) {
        return data;
      }
    }
    return null;
  },

  /**
   * Clean up expired tokens (call periodically)
   */
  cleanupExpired() {
    const now = new Date();
    let cleaned = 0;
    for (const token in tokenStore) {
      const data = tokenStore[token];
      if (new Date(data.expiresAt) < now) {
        delete tokenStore[token];
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired tokens`);
    }
  },

  /**
   * Get all active tokens (for debugging)
   */
  getStats() {
    const now = new Date();
    let active = 0;
    let used = 0;
    let expired = 0;
    
    for (const token in tokenStore) {
      const data = tokenStore[token];
      if (new Date(data.expiresAt) < now) {
        expired++;
      } else if (data.used) {
        used++;
      } else {
        active++;
      }
    }
    
    return { active, used, expired, total: Object.keys(tokenStore).length };
  }
};
