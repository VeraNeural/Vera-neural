/**
 * Saved Messages Client Library
 * Provides localStorage fallback + database sync for vera-pro.html
 * Use this to manage saved messages with automatic database persistence
 */

class SavedMessagesManager {
  constructor(email, apiBaseUrl = '') {
    this.email = email;
    this.apiBaseUrl = apiBaseUrl || window.location.origin;
    this.storageKey = 'veraUnicasSavedMessages';
    this.syncedFlag = 'veraUnicasSavedMessagesSynced';
  }

  /**
   * Get all saved messages (from localStorage, or from DB if synced)
   */
  async getAll() {
    const local = this._getLocal();
    
    // If synced to database, fetch from there
    if (this._isSynced()) {
      try {
        return await this._fetchFromDatabase();
      } catch (err) {
        console.warn('Failed to fetch from database, using localStorage:', err);
        return local;
      }
    }

    return local;
  }

  /**
   * Save a message to localStorage and optionally sync to database
   */
  async save(message, syncToDB = true) {
    // Save to localStorage first
    const messages = this._getLocal();
    const newMessage = {
      id: message.id || Date.now().toString(),
      conversationId: message.conversationId,
      messageId: message.messageId,
      content: message.content,
      role: message.role,
      savedAt: new Date().toISOString(),
      ...message
    };

    messages.push(newMessage);
    this._saveLocal(messages);

    // Sync to database if user is authenticated
    if (syncToDB && this.email) {
      try {
        await this._syncToDatabase('save', {
          messageId: message.messageId,
          conversationId: message.conversationId
        });
      } catch (err) {
        console.error('Failed to save to database, but saved to localStorage:', err);
      }
    }

    return newMessage;
  }

  /**
   * Remove a saved message
   */
  async remove(messageId) {
    const messages = this._getLocal().filter(m => m.messageId !== messageId);
    this._saveLocal(messages);

    // Also remove from database
    if (this.email) {
      try {
        await this._syncToDatabase('delete', { savedMessageId: messageId });
      } catch (err) {
        console.error('Failed to remove from database:', err);
      }
    }
  }

  /**
   * Sync all localStorage messages to database (one-time migration)
   */
  async syncToDatabase() {
    if (!this.email) {
      console.warn('Cannot sync: no email provided');
      return { success: false, reason: 'no_email' };
    }

    const localMessages = this._getLocal();
    if (localMessages.length === 0) {
      this._markSynced();
      return { success: true, synced: 0 };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/saved-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email,
          action: 'sync',
          localMessages
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      console.log(`✅ Synced ${data.synced}/${data.total} messages to database`);
      
      this._markSynced();
      return data;
    } catch (err) {
      console.error('❌ Sync to database failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Private: Get from localStorage
   */
  _getLocal() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch (err) {
      console.error('Failed to parse localStorage:', err);
      return [];
    }
  }

  /**
   * Private: Save to localStorage
   */
  _saveLocal(messages) {
    localStorage.setItem(this.storageKey, JSON.stringify(messages));
  }

  /**
   * Private: Check if synced
   */
  _isSynced() {
    return localStorage.getItem(this.syncedFlag) === 'true';
  }

  /**
   * Private: Mark as synced
   */
  _markSynced() {
    localStorage.setItem(this.syncedFlag, 'true');
  }

  /**
   * Private: Fetch from database
   */
  async _fetchFromDatabase() {
    const response = await fetch(`${this.apiBaseUrl}/api/saved-messages`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.email })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.messages || [];
  }

  /**
   * Private: Sync to database
   */
  async _syncToDatabase(action, payload) {
    const response = await fetch(`${this.apiBaseUrl}/api/saved-messages`, {
      method: action === 'delete' ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: this.email,
        action,
        ...payload
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }
}

// Export for both browser and module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SavedMessagesManager;
}
