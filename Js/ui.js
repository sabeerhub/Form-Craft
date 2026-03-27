/**
 * ui.js — DOM Layer / View Controller
 *
 * Responsible for all visual updates:
 *   • Showing/hiding steps with animation
 *   • Progress bar & sidebar nav updates
 *   • Inline error / success feedback
 *   • Password strength meter
 *   • OTP input behaviour
 *   • Country phone picker
 *   • Review step rendering
 *
 * Reads from FormState and Validation — never stores its own state.
 */

const UI = (() => {

  /* ── Cached DOM References ─────────────────────────────────── */
  const progressFill  = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');
  const navItems      = document.querySelectorAll('.step-nav__item');
  const formSteps     = document.querySelectorAll('.form-step');
  const formSuccess   = document.getElementById('formSuccess');
  const successMsg    = document.getElementById('successMsg');
  const reviewGrid    = document.getElementById('reviewGrid');

  /* ── Progress Bar ──────────────────────────────────────────── */

  /**
   * Update the progress bar fill and ARIA attributes.
   * @param {number} step  — 1-based current step
   * @param {number} total — total steps
   */
  function updateProgress(step, total) {
    const pct = Math.round((step / total) * 100);
    progressFill.style.width = `${pct}%`;

    const track = progressFill.parentElement;
    track.setAttribute('aria-valuenow', pct);
    progressLabel.textContent = `Step ${step} of ${total}`;
  }

  /* ── Sidebar Navigation ────────────────────────────────────── */

  /**
   * Sync sidebar step items: active state + completed checkmarks.
   * @param {number}      currentStep
   * @param {Set<number>} completedSteps
   */
  function updateStepNav(currentStep, completedSteps) {
    navItems.forEach(item => {
      const n = parseInt(item.dataset.navStep, 10);
      item.classList.toggle('active', n === currentStep);
      item.classList.toggle('completed', completedSteps.has(n));

      const btn = item.querySelector('.step-nav__btn');
      if (n === currentStep) {
        btn.setAttribute('aria-current', 'step');
      } else {
        btn.removeAttribute('aria-current');
      }
    });
  }

  /* ── Step Transitions ──────────────────────────────────────── */

  /**
   * Show the target step and hide all others.
   * Uses a CSS class + animation defined in styles.css.
   * @param {number} step
   */
  function showStep(step) {
    formSteps.forEach((el, i) => {
      const isActive = i + 1 === step;
      el.classList.toggle('active', isActive);
      el.setAttribute('aria-hidden', String(!isActive));

      if (isActive) {
        // Re-trigger animation by removing then adding class
        el.style.animation = 'none';
        el.offsetHeight; // Force reflow
        el.style.animation = '';
        // Focus first interactive element in the new step
        requestAnimationFrame(() => {
          const first = el.querySelector('input, select, button:not(.btn--back)');
          if (first && step !== 3) first.focus({ preventScroll: true });
        });
      }
    });
  }

  /* ── Field Feedback ────────────────────────────────────────── */

  /**
   * Apply error state to a field group.
   * @param {string} fieldId  — the input's id attribute
   * @param {string} message  — error text to display
   */
  function showFieldError(fieldId, message) {
    const group   = document.getElementById(`fg-${fieldId}`);
    const errorEl = document.getElementById(`${fieldId}-error`);
    const successEl = document.getElementById(`${fieldId}-success`);

    if (!group) return;

    group.classList.add('has-error');
    group.classList.remove('has-success');

    if (errorEl)   errorEl.textContent   = message;
    if (successEl) successEl.textContent = '';

    // Update status icon if present
    const icon = group.querySelector('.field-status-icon');
    if (icon) icon.textContent = '✕';
  }

  /**
   * Apply success state to a field group.
   * @param {string} fieldId
   * @param {string} [message='']
   */
  function showFieldSuccess(fieldId, message = '') {
    const group     = document.getElementById(`fg-${fieldId}`);
    const errorEl   = document.getElementById(`${fieldId}-error`);
    const successEl = document.getElementById(`${fieldId}-success`);

    if (!group) return;

    group.classList.remove('has-error');
    group.classList.add('has-success');

    if (errorEl)   errorEl.textContent   = '';
    if (successEl) successEl.textContent = message;

    const icon = group.querySelector('.field-status-icon');
    if (icon) icon.textContent = '✓';
  }

  /**
   * Clear all feedback from a field group (neutral state).
   * @param {string} fieldId
   */
  function clearFieldState(fieldId) {
    const group     = document.getElementById(`fg-${fieldId}`);
    const errorEl   = document.getElementById(`${fieldId}-error`);
    const successEl = document.getElementById(`${fieldId}-success`);

    if (!group) return;
    group.classList.remove('has-error', 'has-success');
    if (errorEl)   errorEl.textContent   = '';
    if (successEl) successEl.textContent = '';

    const icon = group.querySelector('.field-status-icon');
    if (icon) icon.textContent = '';
  }

  /**
   * Apply validation results to all fields in a step.
   * @param {Object} results  — output of Validation.validateStep()
   * @param {boolean} onlyTouched  — if true, skip fields not yet touched
   */
  function applyValidationResults(results, onlyTouched = false) {
    Object.entries(results).forEach(([field, res]) => {
      if (onlyTouched && !FormState.isTouched(field)) return;

      if (!res) return;

      if (!res.valid) {
        showFieldError(field, res.message);
      } else {
        showFieldSuccess(field, res.message || '');
      }
    });
  }

  /* ── Password Strength Meter ───────────────────────────────── */

  /**
   * Update the 4-segment password strength bar.
   * @param {string} value  — current password input value
   */
  function updatePasswordStrength(value) {
    const { score, label } = Validation.passwordStrength(value);
    const bars = document.querySelectorAll('.pw-bar');
    const labelEl = document.getElementById('pwStrengthLabel');

    const levelClass = ['', 'active-weak', 'active-fair', 'active-good', 'active-strong'][score];

    bars.forEach((bar, i) => {
      bar.className = 'pw-bar';
      if (i < score) bar.classList.add(levelClass);
    });

    if (labelEl) {
      labelEl.textContent = label;
      labelEl.style.color = {
        '': 'var(--ink-faint)',
        'Weak': 'var(--error)',
        'Fair': 'var(--warning)',
        'Good': '#7cb87c',
        'Strong': 'var(--success)',
      }[label] || 'var(--ink-faint)';
    }
  }

  /**
   * Update individual password rule indicators.
   * @param {string} value  — current password input value
   */
  function updatePasswordRules(value) {
    const rules = {
      length: value.length >= 8,
      upper:  /[A-Z]/.test(value),
      number: /[0-9]/.test(value),
    };

    Object.entries(rules).forEach(([rule, pass]) => {
      const el = document.getElementById(`rule-${rule}`);
      if (!el) return;
      el.classList.toggle('rule-pass', pass);
      const dot = el.querySelector('span');
      if (dot) dot.textContent = pass ? '●' : '○';
    });
  }

  /* ── Populate Inputs From State ────────────────────────────── */

  /**
   * Populate form inputs with values from FormState.
   * Handles text, email, password, select, checkbox, radio, date.
   */
  function populateInputs() {
    const data = FormState.getAll();

    Object.entries(data).forEach(([key, value]) => {
      const el = document.getElementById(key);
      if (!el) return;

      if (el.type === 'checkbox') {
        if (Array.isArray(value)) {
          // Multi-checkbox (notify)
          document.querySelectorAll(`[name="${el.name}"]`).forEach(cb => {
            cb.checked = value.includes(cb.value);
          });
        } else {
          el.checked = Boolean(value);
        }
      } else if (el.type === 'radio') {
        document.querySelectorAll(`[name="${el.name}"]`).forEach(radio => {
          radio.checked = radio.value === value;
        });
      } else {
        el.value = value;
      }
    });

    // Update phone flag display
    const flag = document.getElementById('selectedFlag');
    const code = document.getElementById('selectedCode');
    if (flag) flag.textContent = data.phoneFlag || '🇺🇸';
    if (code) code.textContent = data.phoneCountry || '+1';
  }

  /* ── OTP Display ───────────────────────────────────────────── */

  /**
   * Update the OTP step email display.
   * @param {string} emailValue
   */
  function updateOtpEmailDisplay(emailValue) {
    const el = document.getElementById('otpEmailDisplay');
    if (!el) return;
    el.innerHTML = emailValue
      ? `Code sent to <strong>${emailValue}</strong>`
      : 'Enter your verification code below.';
  }

  /**
   * Set the OTP error message.
   * @param {string} message  — empty string clears the error
   */
  function setOtpError(message) {
    const el = document.getElementById('otp-error');
    if (!el) return;
    el.textContent = message;

    // Also visually mark all OTP inputs
    document.querySelectorAll('.otp-input').forEach(inp => {
      inp.classList.toggle('error', !!message);
    });
  }

  /**
   * Clear all OTP input fields and reset state.
   */
  function clearOtpInputs() {
    document.querySelectorAll('.otp-input').forEach(inp => {
      inp.value = '';
      inp.classList.remove('filled', 'error');
    });
  }

  /* ── Review Step ───────────────────────────────────────────── */

  /**
   * Render the summary cards in the Review step.
   * Uses FormState.getSummary() to get the display data.
   */
  function renderReview() {
    if (!reviewGrid) return;

    const items = FormState.getSummary();
    reviewGrid.innerHTML = '';

    items.forEach(({ label, value, wide }) => {
      const card = document.createElement('div');
      card.className = 'review-card' + (wide ? ' review-card--wide' : '');
      card.innerHTML = `
        <div class="review-card__label">${escapeHtml(label)}</div>
        <div class="review-card__value">${escapeHtml(value)}</div>
      `;
      reviewGrid.appendChild(card);
    });
  }

  /* ── Submit State ──────────────────────────────────────────── */

  /**
   * Put the submit button into a loading spinner state.
   */
  function setSubmitLoading() {
    const btn = document.getElementById('submitBtn');
    if (btn) btn.classList.add('loading');
  }

  /**
   * Show the success screen, hiding the form steps.
   * @param {string} name  — user's first name for the message
   */
  function showSuccess(name) {
    formSteps.forEach(el => {
      el.classList.remove('active');
      el.setAttribute('aria-hidden', 'true');
    });

    if (formSuccess) {
      formSuccess.removeAttribute('hidden');
      if (successMsg) {
        successMsg.textContent = `Hey ${name || 'there'}! Your account has been created. We're excited to have you on board.`;
      }
    }

    // Update progress to 100%
    updateProgress(FormState.getTotalSteps(), FormState.getTotalSteps());
    updateStepNav(FormState.getTotalSteps(), FormState.getCompletedSteps());
  }

  /**
   * Reset the UI back to step 1 (called after Reset button).
   */
  function resetUI() {
    if (formSuccess) formSuccess.setAttribute('hidden', '');

    // Reset all field groups
    document.querySelectorAll('.field-group').forEach(g => {
      g.classList.remove('has-error', 'has-success');
    });
    document.querySelectorAll('.field-error, .field-success').forEach(el => {
      el.textContent = '';
    });

    // Clear pw strength bars
    document.querySelectorAll('.pw-bar').forEach(b => b.className = 'pw-bar');
    const pwLabel = document.getElementById('pwStrengthLabel');
    if (pwLabel) pwLabel.textContent = '';

    document.querySelectorAll('.pw-rule').forEach(r => r.classList.remove('rule-pass'));

    clearOtpInputs();

    // Reset submit button
    const btn = document.getElementById('submitBtn');
    if (btn) btn.classList.remove('loading');

    showStep(1);
    updateProgress(1, FormState.getTotalSteps());
    updateStepNav(1, new Set());
  }

  /* ── Utility ───────────────────────────────────────────────── */

  /**
   * Basic HTML escape to prevent XSS in dynamic content.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Public API
  return {
    updateProgress,
    updateStepNav,
    showStep,
    showFieldError,
    showFieldSuccess,
    clearFieldState,
    applyValidationResults,
    updatePasswordStrength,
    updatePasswordRules,
    populateInputs,
    updateOtpEmailDisplay,
    setOtpError,
    clearOtpInputs,
    renderReview,
    setSubmitLoading,
    showSuccess,
    resetUI,
  };
})();
