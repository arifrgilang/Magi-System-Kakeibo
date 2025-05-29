// lib/sessionManager.js - Session Management
// Simple in-memory storage (use Redis in production)
const userSessions = new Map();

export class SessionManager {
  static getSession(userId) {
    return userSessions.get(userId);
  }

  static setSession(userId, sessionData) {
    userSessions.set(userId, sessionData);
  }

  static clearSession(userId) {
    userSessions.delete(userId);
  }

  static createSession(userId, type) {
    const session = {
      type,
      step: 'month',
      data: {},
      awaitingInput: false,
      createdAt: new Date()
    };
    this.setSession(userId, session);
    return session;
  }

  static updateSession(userId, updates) {
    const session = this.getSession(userId);
    if (session) {
      Object.assign(session, updates);
      this.setSession(userId, session);
    }
    return session;
  }

  static updateSessionData(userId, dataUpdates) {
    const session = this.getSession(userId);
    if (session) {
      Object.assign(session.data, dataUpdates);
      this.setSession(userId, session);
    }
    return session;
  }

  // Clean up old sessions (call periodically)
  static cleanupOldSessions() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [userId, session] of userSessions.entries()) {
      if (session.createdAt < cutoff) {
        userSessions.delete(userId);
      }
    }
  }
}
