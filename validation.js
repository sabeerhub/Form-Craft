/**
 * validation.js — Form Validation Engine
 *
 * Pure validation functions — no DOM interaction.
 * Each function receives a value (string) and returns:
 *   { valid: boolean, message: string }
 *
 * These are consumed by ui.js which applies feedback to the DOM.
 */

const Validation = (() => {

  /* ── Helpers ──────────────────────────────────────────────── */

  /**
   * Build a result object.
   * @param {boolean} valid
   * @param {string}  [message='']
   * @returns {{ valid: boolean, message: string }}
   */
  function result(valid, message = '') {
    return { valid, message };
  }

  /* ── Primitive Rules ──────────────────────────────────────── */

  /**
   * Required — value must be non-empty after trimming.
   */
  function required(value, label = 'This field') {
    if (!value || value.trim() === '') {
      return result(false, `${label} is required.`);
    }
    return result(true);
  }

  /**
   * Minimum character length.
   */
  function minLength(value, min, label = 'This field') {
    if (value.length < min) {
      return result(false, `${label} must be at least ${min} characters.`);
    }
    return result(true);
  }

  /**
   * Maximum character length.
   */
  function maxLength(value, max, label = 'This field') {
    if (value.length > max) {
      return result(false, `${label} must be no more than ${max} characters.`);
    }
    return result(true);
  }

  /* ── Email ────────────────────────────────────────────────── */

  /**
   * Email — RFC 5322-inspired pattern.
   * Validates format: local@domain.tld
   */
  function email(value) {
    const req = required(value, 'Email');
    if (!req.valid) return req;

    // Full pattern: local part, @, domain, at least one dot + tld
    const pattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

    if (!pattern.test(value.trim())) {
      return result(false, 'Please enter a valid email address.');
    }
    return result(true, 'Looks good!');
  }

  /* ── Password ─────────────────────────────────────────────── */

  /**
   * Password — must meet:
   *   • 8+ characters
   *   • At least one uppercase letter
   *   • At least one numeric digit
   *
   * Returns granular rule status for the strength indicator.
   */
  function password(value) {
    const req = required(value, 'Password');
    if (!req.valid) return { ...req, rules: {} };

    const rules = {
      length: value.length >= 8,
      upper:  /[A-Z]/.test(value),
      number: /[0-9]/.test(value),
    };
    const allPass = rules.length && rules.upper && rules.number;

    if (!allPass) {
      return result(false, 'Password does not meet all requirements.');
    }
    return { ...result(true), rules };
  }

  /**
   * Password strength score (0–4) for the meter.
   * @param {string} value
   * @returns {{ score: number, label: string }}
   */
  function passwordStrength(value) {
    if (!value) return { score: 0, label: '' };

    let score = 0;
    if (value.length >= 8)   score++;
    if (value.length >= 12)  score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;  // Special chars bump score

    // Clamp to 4 levels
    const clamped = Math.min(score, 4);
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    return { score: clamped, label: labels[clamped] };
  }

  /**
   * Confirm Password — must match the original password.
   */
  function confirmPassword(value, original) {
    const req = required(value, 'Confirmation');
    if (!req.valid) return req;

    if (value !== original) {
      return result(false, 'Passwords do not match.');
    }
    return result(true);
  }

  /* ── Name ─────────────────────────────────────────────────── */

  function firstName(value) {
    const req = required(value, 'First name');
    if (!req.valid) return req;
    return minLength(value.trim(), 2, 'First name');
  }

  function lastName(value) {
    const req = required(value, 'Last name');
    if (!req.valid) return req;
    return minLength(value.trim(), 2, 'Last name');
  }

  /* ── Phone ────────────────────────────────────────────────── */

  /**
   * International phone validation.
   * Strips non-digit characters, then checks digit count (7–15 as per E.164).
   * @param {string} value  — raw input string
   * @param {string} countryCode — e.g. '+1', '+44'
   */
  function phone(value, countryCode = '+1') {
    const req = required(value, 'Phone number');
    if (!req.valid) return req;

    // Strip everything except digits
    const digits = value.replace(/\D/g, '');

    if (digits.length < 7) {
      return result(false, 'Phone number is too short.');
    }
    if (digits.length > 15) {
      return result(false, 'Phone number is too long.');
    }

    // US/Canada specific — 10 digits local
    if (countryCode === '+1' && digits.length !== 10) {
      return result(false, 'US/Canada numbers must be 10 digits.');
    }

    return result(true);
  }

  /* ── Date of Birth ─────────────────────────────────────────── */

  function dob(value) {
    if (!value) return result(true); // Optional field
    const date = new Date(value);
    const now  = new Date();

    if (isNaN(date.getTime())) {
      return result(false, 'Invalid date.');
    }

    // Must be in the past
    if (date >= now) {
      return result(false, 'Date of birth must be in the past.');
    }

    // Must be at least 13 years old
    const minAge = new Date();
    minAge.setFullYear(minAge.getFullYear() - 13);
    if (date > minAge) {
      return result(false, 'You must be at least 13 years old.');
    }

    return result(true);
  }

  /* ── Select ────────────────────────────────────────────────── */

  function selectRequired(value, label = 'This field') {
    if (!value || value === '') {
      return result(false, `Please select ${label}.`);
    }
    return result(true);
  }

  /* ── Checkbox ──────────────────────────────────────────────── */

  function checkboxRequired(checked, label = 'This') {
    if (!checked) {
      return result(false, `${label} is required.`);
    }
    return result(true);
  }

  /* ── OTP ───────────────────────────────────────────────────── */

  /**
   * Validate a 6-digit OTP string.
   * In a real app this would verify against a backend token.
   * For demo purposes, the valid code is '123456'.
   */
  function otp(value) {
    if (!value || value.length !== 6) {
      return result(false, 'Please enter the complete 6-digit code.');
    }
    if (!/^\d{6}$/.test(value)) {
      return result(false, 'Code must contain only digits.');
    }
    // Demo: hardcoded valid code
    if (value !== '123456') {
      return result(false, 'Incorrect code. Hint: try 123456');
    }
    return result(true);
  }

  /* ── Step-level validators ─────────────────────────────────── */

  /**
   * Validate all fields for a given step number.
   * Returns an object keyed by field name with validation results.
   * @param {number} stepNum
   * @param {Object} data  — current form state data
   * @returns {Object}  — { fieldName: { valid, message } }
   */
  function validateStep(stepNum, data) {
    const results = {};

    switch (stepNum) {
      case 1:
        results.email           = email(data.email || '');
        results.password        = password(data.password || '');
        results.confirmPassword = confirmPassword(data.confirmPassword || '', data.password || '');
        break;

      case 2:
        results.firstName = firstName(data.firstName || '');
        results.lastName  = lastName(data.lastName || '');
        results.phone     = phone(data.phone || '', data.phoneCountry || '+1');
        results.dob       = dob(data.dob || '');
        break;

      case 3:
        results.otp = otp(data.otp || '');
        break;

      case 4:
        results.role  = selectRequired(data.role || '', 'a role');
        results.terms = checkboxRequired(data.terms === true, 'You must accept the terms');
        break;

      case 5:
        // Review step — always valid (all prior steps validated)
        break;

      default:
        break;
    }

    return results;
  }

  /**
   * Check if a step's results are all passing.
   * @param {Object} stepResults — output of validateStep()
   * @returns {boolean}
   */
  function isStepValid(stepResults) {
    return Object.values(stepResults).every(r => r.valid);
  }

  // Public API
  return {
    email,
    password,
    passwordStrength,
    confirmPassword,
    firstName,
    lastName,
    phone,
    dob,
    selectRequired,
    checkboxRequired,
    otp,
    validateStep,
    isStepValid,
  };
})();
