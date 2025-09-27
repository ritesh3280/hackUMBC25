import Dexie from 'dexie';

const db = new Dexie('FocusFlowDB');

db.version(1).stores({
  sessions: 'id, startedAt, endedAt, intervals, presets'
});

export default db;

/**
 * Save a session to IndexedDB
 * @param {Object} session - Session object with id, startedAt, endedAt, intervals, presets
 */
export const saveSession = async (session) => {
  try {
    await db.sessions.put(session);
    console.log('Session saved:', session.id);
  } catch (error) {
    console.error('Error saving session:', error);
  }
};

/**
 * Get all sessions from IndexedDB
 * @returns {Array} Array of session objects
 */
export const getAllSessions = async () => {
  try {
    const sessions = await db.sessions.orderBy('startedAt').reverse().toArray();
    return sessions;
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
};

/**
 * Get a specific session by ID
 * @param {string} sessionId - Session ID
 * @returns {Object|null} Session object or null if not found
 */
export const getSession = async (sessionId) => {
  try {
    const session = await db.sessions.get(sessionId);
    return session || null;
  } catch (error) {
    console.error('Error loading session:', error);
    return null;
  }
};

/**
 * Delete a session by ID
 * @param {string} sessionId - Session ID
 */
export const deleteSession = async (sessionId) => {
  try {
    await db.sessions.delete(sessionId);
    console.log('Session deleted:', sessionId);
  } catch (error) {
    console.error('Error deleting session:', error);
  }
};

/**
 * Clear all sessions
 */
export const clearAllSessions = async () => {
  try {
    await db.sessions.clear();
    console.log('All sessions cleared');
  } catch (error) {
    console.error('Error clearing sessions:', error);
  }
};
