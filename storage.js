/**
 * storage.js — Form System LocalStorage Layer
 *
 * Provides a typed, safe interface to localStorage for persisting
 * multi-step form state between page loads / browser sessions.
 *
 * All methods are synchronous and handle JSON serialization internally.
 * Errors are caught silently so storage failures never crash the app.
 */

const Storage = (() => {
  const KEYS = {
    FORM_DATA: 'formcraft_data',      // Persisted field values
    CURRENT_STEP: 'formcraft_step',   // Last active step number
    COMPLETED: 'formcraft_completed', // Set of completed step numbers
  };

  /**
   * Save the entire form data object to localStorage.
   * @param {Object} data  — key/value map of all field values
   */
  function saveFormData(data) {
    try {
      localStorage.setItem(KEYS.FORM_DATA, JSON.stringify(data));
    } catch (e) {
      console.warn('[Storage] Could not save form data:', e);
    }
  }

  /**
   * Load persisted form data, returning an empty object if nothing saved.
   * @returns {Object}
   */
  function loadFormData() {
    try {
      const raw = localStorage.getItem(KEYS.FORM_DATA);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[Storage] Could not load form data:', e);
      return {};
    }
  }

  /**
   * Persist the current active step index (1-based).
   * @param {number} step
   */
  function saveStep(step) {
    try {
      localStorage.setItem(KEYS.CURRENT_STEP, String(step));
    } catch (e) { /* silent */ }
  }

  /**
   * Retrieve the last saved step, defaulting to 1.
   * @returns {number}
   */
  function loadStep() {
    try {
      const raw = localStorage.getItem(KEYS.CURRENT_STEP);
      const parsed = parseInt(raw, 10);
      return isNaN(parsed) ? 1 : parsed;
    } catch (e) {
      return 1;
    }
  }

  /**
   * Save the set of completed step numbers as a sorted array.
   * @param {Set<number>} completedSet
   */
  function saveCompleted(completedSet) {
    try {
      localStorage.setItem(KEYS.COMPLETED, JSON.stringify([...completedSet]));
    } catch (e) { /* silent */ }
  }

  /**
   * Restore the set of completed steps. Returns a Set<number>.
   * @returns {Set<number>}
   */
  function loadCompleted() {
    try {
      const raw = localStorage.getItem(KEYS.COMPLETED);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(arr.map(Number));
    } catch (e) {
      return new Set();
    }
  }

  /**
   * Wipe all persisted form state — called on successful submission or reset.
   */
  function clearAll() {
    try {
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    } catch (e) { /* silent */ }
  }

  // Public API
  return { saveFormData, loadFormData, saveStep, loadStep, saveCompleted, loadCompleted, clearAll };
})();
