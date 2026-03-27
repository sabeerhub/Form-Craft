/**
 * formState.js — Form State Manager
 *
 * Central source of truth for the multi-step form.
 * Manages:
 *   • Current step (1–5)
 *   • Field values (all steps combined)
 *   • Set of completed steps
 *   • Field-level dirty/touched tracking
 *
 * Persists state to localStorage via Storage module after every mutation.
 * Emits custom DOM events so ui.js can react to state changes
 * without tight coupling.
 */

const FormState = (() => {
  const TOTAL_STEPS = 5;

  /* ── Internal State ────────────────────────────────────────── */
  let _currentStep = 1;
  let _completedSteps = new Set();

  // All field values — flat map regardless of which step they belong to
  let _data = {
    // Step 1
    email: '',
    password: '',
    confirmPassword: '',

    // Step 2
    firstName: '',
    lastName: '',
    phone: '',
    phoneCountry: '+1',
    phoneFlag: '🇺🇸',
    dob: '',

    // Step 3
    otp: '',

    // Step 4
    role: '',
    notify: [],
    theme: 'light',
    terms: false,
  };

  // Track which fields the user has interacted with (for deferred validation)
  let _touchedFields = new Set();

  /* ── Emit Helper ───────────────────────────────────────────── */

  /**
   * Dispatch a namespaced custom event on document so listeners
   * in ui.js and app.js can react without polling.
   * @param {string} name
   * @param {*}      detail
   */
  function emit(name, detail = null) {
    document.dispatchEvent(new CustomEvent(`formcraft:${name}`, { detail }));
  }

  /* ── Step Navigation ───────────────────────────────────────── */

  /** Total number of steps. */
  function getTotalSteps() { return TOTAL_STEPS; }

  /** Current 1-based step index. */
  function getCurrentStep() { return _currentStep; }

  /**
   * Navigate to a specific step.
   * Validates that step is within range before changing.
   * @param {number} step
   */
  function goToStep(step) {
    if (step < 1 || step > TOTAL_STEPS) return;
    _currentStep = step;
    Storage.saveStep(_currentStep);
    emit('stepChanged', { step: _currentStep, total: TOTAL_STEPS });
  }

  /** Move forward one step. */
  function nextStep() {
    if (_currentStep < TOTAL_STEPS) {
      markStepComplete(_currentStep);
      goToStep(_currentStep + 1);
    }
  }

  /** Move backward one step. */
  function prevStep() {
    if (_currentStep > 1) {
      goToStep(_currentStep - 1);
    }
  }

  /* ── Completion Tracking ───────────────────────────────────── */

  /**
   * Mark a step as completed (adds checkmark in sidebar).
   * @param {number} step
   */
  function markStepComplete(step) {
    _completedSteps.add(step);
    Storage.saveCompleted(_completedSteps);
    emit('stepCompleted', { step });
  }

  /** Returns true if a step has been marked complete. */
  function isStepComplete(step) {
    return _completedSteps.has(step);
  }

  /** Returns a copy of the completed steps Set. */
  function getCompletedSteps() {
    return new Set(_completedSteps);
  }

  /* ── Field Data ────────────────────────────────────────────── */

  /**
   * Read a field's current value.
   * @param {string} field
   * @returns {*}
   */
  function get(field) {
    return _data[field];
  }

  /**
   * Read the entire data map (shallow copy).
   * @returns {Object}
   */
  function getAll() {
    return { ..._data };
  }

  /**
   * Update one or more fields and persist.
   * Triggers a 'dataChanged' event with the changed keys.
   * @param {string|Object} fieldOrMap  — field name, or object of field:value pairs
   * @param {*}             [value]     — value (only used when fieldOrMap is a string)
   */
  function set(fieldOrMap, value) {
    const changes = typeof fieldOrMap === 'string'
      ? { [fieldOrMap]: value }
      : fieldOrMap;

    Object.assign(_data, changes);
    Storage.saveFormData(_data);
    emit('dataChanged', { fields: Object.keys(changes) });
  }

  /**
   * Mark a field as touched (user has interacted with it at least once).
   * Touched fields show validation feedback even before submission.
   * @param {string} field
   */
  function touchField(field) {
    _touchedFields.add(field);
    emit('fieldTouched', { field });
  }

  /**
   * Check whether a field has been touched.
   * @param {string} field
   * @returns {boolean}
   */
  function isTouched(field) {
    return _touchedFields.has(field);
  }

  /* ── Hydration (restore from localStorage) ──────────────────── */

  /**
   * Restore all persisted state from localStorage.
   * Should be called once at app initialization.
   */
  function hydrate() {
    const savedData      = Storage.loadFormData();
    const savedStep      = Storage.loadStep();
    const savedCompleted = Storage.loadCompleted();

    // Merge saved data into defaults (don't overwrite keys not in save)
    Object.keys(savedData).forEach(key => {
      if (key in _data) _data[key] = savedData[key];
    });

    _completedSteps = savedCompleted;
    _currentStep = Math.min(savedStep, TOTAL_STEPS);

    emit('hydrated', { step: _currentStep });
  }

  /* ── Reset ─────────────────────────────────────────────────── */

  /**
   * Reset all state to defaults and clear persistence.
   */
  function reset() {
    _currentStep = 1;
    _completedSteps = new Set();
    _touchedFields = new Set();
    _data = {
      email: '', password: '', confirmPassword: '',
      firstName: '', lastName: '', phone: '',
      phoneCountry: '+1', phoneFlag: '🇺🇸', dob: '',
      otp: '', role: '', notify: [], theme: 'light', terms: false,
    };
    Storage.clearAll();
    emit('reset');
  }

  /* ── Computed ──────────────────────────────────────────────── */

  /**
   * Build a human-readable summary for the review step.
   * Masks sensitive fields (password, OTP).
   * @returns {Array<{ label, value, wide }>}
   */
  function getSummary() {
    const d = _data;
    const notifyMap = { email: 'Email', sms: 'SMS', push: 'Push' };
    const notifyLabels = (d.notify || []).map(v => notifyMap[v] || v).join(', ') || 'None';

    return [
      { label: 'Email',         value: d.email || '—' },
      { label: 'Password',      value: '••••••••' },
      { label: 'Full name',     value: [d.firstName, d.lastName].filter(Boolean).join(' ') || '—' },
      { label: 'Phone',         value: d.phone ? `${d.phoneCountry} ${d.phone}` : '—' },
      { label: 'Date of birth', value: d.dob ? new Date(d.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—' },
      { label: 'Role',          value: d.role || '—' },
      { label: 'Notifications', value: notifyLabels },
      { label: 'Theme',         value: d.theme ? d.theme.charAt(0).toUpperCase() + d.theme.slice(1) : '—' },
    ];
  }

  // Public API
  return {
    getTotalSteps,
    getCurrentStep,
    goToStep,
    nextStep,
    prevStep,
    markStepComplete,
    isStepComplete,
    getCompletedSteps,
    get,
    getAll,
    set,
    touchField,
    isTouched,
    hydrate,
    reset,
    getSummary,
  };
})();
