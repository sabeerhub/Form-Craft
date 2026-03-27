/**
 * app.js — Application Entry Point
 *
 * Wires together FormState, Validation, UI, and Storage.
 * Sets up all event listeners using delegation where possible.
 *
 * Architecture: Event-driven, state-first.
 *   1. User interacts with DOM
 *   2. app.js captures the event, reads input value
 *   3. FormState.set() updates the model and persists
 *   4. Validation runs on the changed field
 *   5. UI.apply*() updates visual feedback
 */

/* ─── Country Data for Phone Picker ───────────────────────── */
const COUNTRIES = [
  { code: '+1',   name: 'United States',    flag: '🇺🇸' },
  { code: '+1',   name: 'Canada',           flag: '🇨🇦' },
  { code: '+44',  name: 'United Kingdom',   flag: '🇬🇧' },
  { code: '+61',  name: 'Australia',        flag: '🇦🇺' },
  { code: '+64',  name: 'New Zealand',      flag: '🇳🇿' },
  { code: '+49',  name: 'Germany',          flag: '🇩🇪' },
  { code: '+33',  name: 'France',           flag: '🇫🇷' },
  { code: '+34',  name: 'Spain',            flag: '🇪🇸' },
  { code: '+39',  name: 'Italy',            flag: '🇮🇹' },
  { code: '+31',  name: 'Netherlands',      flag: '🇳🇱' },
  { code: '+46',  name: 'Sweden',           flag: '🇸🇪' },
  { code: '+47',  name: 'Norway',           flag: '🇳🇴' },
  { code: '+45',  name: 'Denmark',          flag: '🇩🇰' },
  { code: '+41',  name: 'Switzerland',      flag: '🇨🇭' },
  { code: '+43',  name: 'Austria',          flag: '🇦🇹' },
  { code: '+32',  name: 'Belgium',          flag: '🇧🇪' },
  { code: '+351', name: 'Portugal',         flag: '🇵🇹' },
  { code: '+48',  name: 'Poland',           flag: '🇵🇱' },
  { code: '+7',   name: 'Russia',           flag: '🇷🇺' },
  { code: '+81',  name: 'Japan',            flag: '🇯🇵' },
  { code: '+82',  name: 'South Korea',      flag: '🇰🇷' },
  { code: '+86',  name: 'China',            flag: '🇨🇳' },
  { code: '+91',  name: 'India',            flag: '🇮🇳' },
  { code: '+65',  name: 'Singapore',        flag: '🇸🇬' },
  { code: '+60',  name: 'Malaysia',         flag: '🇲🇾' },
  { code: '+66',  name: 'Thailand',         flag: '🇹🇭' },
  { code: '+63',  name: 'Philippines',      flag: '🇵🇭' },
  { code: '+62',  name: 'Indonesia',        flag: '🇮🇩' },
  { code: '+84',  name: 'Vietnam',          flag: '🇻🇳' },
  { code: '+52',  name: 'Mexico',           flag: '🇲🇽' },
  { code: '+55',  name: 'Brazil',           flag: '🇧🇷' },
  { code: '+54',  name: 'Argentina',        flag: '🇦🇷' },
  { code: '+56',  name: 'Chile',            flag: '🇨🇱' },
  { code: '+57',  name: 'Colombia',         flag: '🇨🇴' },
  { code: '+27',  name: 'South Africa',     flag: '🇿🇦' },
  { code: '+234', name: 'Nigeria',          flag: '🇳🇬' },
  { code: '+254', name: 'Kenya',            flag: '🇰🇪' },
  { code: '+20',  name: 'Egypt',            flag: '🇪🇬' },
  { code: '+971', name: 'UAE',              flag: '🇦🇪' },
  { code: '+966', name: 'Saudi Arabia',     flag: '🇸🇦' },
  { code: '+972', name: 'Israel',           flag: '🇮🇱' },
  { code: '+90',  name: 'Turkey',           flag: '🇹🇷' },
];

/* ─── OTP State ────────────────────────────────────────────── */
let otpResendTimer = null;
let otpResendCountdown = 0;

/* ─── App Init ─────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Restore saved state
  FormState.hydrate();

  // 2. Render initial UI from restored state
  const step = FormState.getCurrentStep();
  UI.showStep(step);
  UI.updateProgress(step, FormState.getTotalSteps());
  UI.updateStepNav(step, FormState.getCompletedSteps());
  UI.populateInputs();

  // 3. Update OTP email display
  UI.updateOtpEmailDisplay(FormState.get('email'));

  // 4. Init dynamic country list
  initCountryDropdown();

  // 5. Bind all event listeners
  bindStepNavigation();
  bindStep1();
  bindStep2();
  bindStep3();
  bindStep4();
  bindSubmit();
  bindReset();
  bindAutoFillDetection();

  // 6. Listen for FormState events → update UI
  document.addEventListener('formcraft:stepChanged', e => {
    const { step, total } = e.detail;
    UI.showStep(step);
    UI.updateProgress(step, total);
    UI.updateStepNav(step, FormState.getCompletedSteps());
    if (step === 3) UI.updateOtpEmailDisplay(FormState.get('email'));
    if (step === 5) UI.renderReview();
  });

  document.addEventListener('formcraft:hydrated', () => {
    // Re-run pw rules display if password was restored
    const pw = FormState.get('password');
    if (pw) {
      UI.updatePasswordStrength(pw);
      UI.updatePasswordRules(pw);
    }
  });
});

/* ─── Step Navigation Buttons ──────────────────────────────── */

function bindStepNavigation() {
  // "Continue" buttons — validate then advance
  document.querySelectorAll('.btn--next').forEach(btn => {
    btn.addEventListener('click', () => {
      const currentStep = FormState.getCurrentStep();
      handleStepAdvance(currentStep);
    });
  });

  // "Back" buttons — no validation needed
  document.querySelectorAll('.btn--back').forEach(btn => {
    btn.addEventListener('click', () => {
      FormState.prevStep();
    });
  });
}

/**
 * Validate current step then advance if valid.
 * Shows errors on all invalid fields if not valid.
 * @param {number} step
 */
function handleStepAdvance(step) {
  const results = Validation.validateStep(step, FormState.getAll());

  // Mark all fields touched so errors show
  Object.keys(results).forEach(f => FormState.touchField(f));

  if (!Validation.isStepValid(results)) {
    UI.applyValidationResults(results);
    // Focus first invalid field
    const firstBad = Object.keys(results).find(f => !results[f].valid);
    if (firstBad) {
      const el = document.getElementById(firstBad) || document.querySelector('.otp-input');
      if (el) el.focus();
    }
    return;
  }

  UI.applyValidationResults(results);
  FormState.nextStep();
}

/* ─── Step 1: Account Setup ────────────────────────────────── */

function bindStep1() {
  // Email
  bindInput('email', value => {
    FormState.set('email', value);
    FormState.touchField('email');
    const res = Validation.email(value);
    if (!res.valid) UI.showFieldError('email', res.message);
    else UI.showFieldSuccess('email', res.message);
  });

  // Password
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      const value = passwordInput.value;
      FormState.set('password', value);
      FormState.touchField('password');

      // Strength meter
      UI.updatePasswordStrength(value);
      UI.updatePasswordRules(value);

      // Validation
      const res = Validation.password(value);
      if (!res.valid && value.length > 0) UI.showFieldError('password', res.message);
      else if (res.valid) UI.showFieldSuccess('password');
      else UI.clearFieldState('password');

      // Re-validate confirm if already touched
      if (FormState.isTouched('confirmPassword')) {
        const confirmVal = FormState.get('confirmPassword');
        const confirmRes = Validation.confirmPassword(confirmVal, value);
        if (!confirmRes.valid) UI.showFieldError('confirmPassword', confirmRes.message);
        else UI.showFieldSuccess('confirmPassword');
      }
    });

    passwordInput.addEventListener('blur', () => {
      FormState.touchField('password');
      const res = Validation.password(passwordInput.value);
      if (!res.valid) UI.showFieldError('password', res.message);
    });
  }

  // Confirm Password
  const confirmInput = document.getElementById('confirmPassword');
  if (confirmInput) {
    confirmInput.addEventListener('input', () => {
      const value = confirmInput.value;
      FormState.set('confirmPassword', value);
      FormState.touchField('confirmPassword');
      const res = Validation.confirmPassword(value, FormState.get('password'));
      if (!res.valid) UI.showFieldError('confirmPassword', res.message);
      else UI.showFieldSuccess('confirmPassword');
    });
  }

  // Password visibility toggle
  const toggleBtn = document.getElementById('togglePassword');
  const pwInput   = document.getElementById('password');
  if (toggleBtn && pwInput) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = pwInput.type === 'password';
      pwInput.type = isPassword ? 'text' : 'password';

      const eyeOpen   = toggleBtn.querySelector('.eye-open');
      const eyeClosed = toggleBtn.querySelector('.eye-closed');
      if (eyeOpen)   eyeOpen.style.display   = isPassword ? 'none' : '';
      if (eyeClosed) eyeClosed.style.display = isPassword ? '' : 'none';

      toggleBtn.setAttribute('aria-label',
        isPassword ? 'Hide password' : 'Show password');
    });
  }
}

/* ─── Step 2: Personal Info ────────────────────────────────── */

function bindStep2() {
  bindValidatedInput('firstName', v => Validation.firstName(v));
  bindValidatedInput('lastName',  v => Validation.lastName(v));

  // Phone — re-validates when country changes too
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      FormState.set('phone', phoneInput.value);
      FormState.touchField('phone');
      revalidatePhone();
    });
    phoneInput.addEventListener('blur', () => {
      FormState.touchField('phone');
      revalidatePhone();
    });

    // Auto-format US phone as (555) 000-0000
    phoneInput.addEventListener('keyup', () => {
      const country = FormState.get('phoneCountry');
      if (country === '+1') {
        phoneInput.value = formatUSPhone(phoneInput.value);
      }
    });
  }

  // Date of birth
  bindValidatedInput('dob', v => Validation.dob(v));
}

function revalidatePhone() {
  const res = Validation.phone(
    FormState.get('phone'),
    FormState.get('phoneCountry')
  );
  if (!res.valid) UI.showFieldError('phone', res.message);
  else UI.showFieldSuccess('phone');
}

/**
 * Format a phone number string as (NXX) NXX-XXXX for US numbers.
 * @param {string} value
 * @returns {string}
 */
function formatUSPhone(value) {
  const digits = value.replace(/\D/g, '').substring(0, 10);
  if (digits.length === 0) return '';
  if (digits.length < 4)  return `(${digits}`;
  if (digits.length < 7)  return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
}

/* ─── Country Phone Dropdown ───────────────────────────────── */

function initCountryDropdown() {
  renderCountryList(COUNTRIES);

  const btn      = document.getElementById('phoneCountryBtn');
  const dropdown = document.getElementById('phoneDropdown');
  const search   = document.getElementById('countrySearch');

  if (!btn || !dropdown) return;

  // Open / close
  btn.addEventListener('click', toggleDropdown);
  btn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDropdown(); }
    if (e.key === 'Escape') closeDropdown();
  });

  // Filter on search
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase();
      const filtered = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(q) || c.code.includes(q)
      );
      renderCountryList(filtered);
    });
  }

  // Close when clicking outside
  document.addEventListener('click', e => {
    if (dropdown && !dropdown.hidden && !btn.contains(e.target) && !dropdown.contains(e.target)) {
      closeDropdown();
    }
  });

  function toggleDropdown() {
    if (dropdown.hidden) openDropdown(); else closeDropdown();
  }
  function openDropdown() {
    dropdown.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    if (search) { search.value = ''; renderCountryList(COUNTRIES); search.focus(); }
  }
  function closeDropdown() {
    dropdown.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }
}

/**
 * Render the country list items.
 * @param {Array} countries
 */
function renderCountryList(countries) {
  const list = document.getElementById('countryList');
  if (!list) return;

  list.innerHTML = '';
  countries.forEach(country => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-label', `${country.name} ${country.code}`);
    li.innerHTML = `
      <span class="flag">${country.flag}</span>
      <span class="country-name">${country.name}</span>
      <span class="country-code">${country.code}</span>
    `;
    li.addEventListener('click', () => {
      selectCountry(country);
    });
    li.addEventListener('keydown', e => {
      if (e.key === 'Enter') selectCountry(country);
    });
    list.appendChild(li);
  });
}

/**
 * Select a country from the dropdown.
 * @param {{ code, name, flag }} country
 */
function selectCountry(country) {
  FormState.set({ phoneCountry: country.code, phoneFlag: country.flag });

  const flagEl = document.getElementById('selectedFlag');
  const codeEl = document.getElementById('selectedCode');
  if (flagEl) flagEl.textContent = country.flag;
  if (codeEl) codeEl.textContent = country.code;

  // Close dropdown
  const dropdown = document.getElementById('phoneDropdown');
  const btn      = document.getElementById('phoneCountryBtn');
  if (dropdown) dropdown.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');

  // Clear and re-focus phone input
  const phoneInput = document.getElementById('phone');
  if (phoneInput) { phoneInput.value = ''; FormState.set('phone', ''); phoneInput.focus(); }

  revalidatePhone();
}

/* ─── Step 3: OTP ──────────────────────────────────────────── */

function bindStep3() {
  const inputs = document.querySelectorAll('.otp-input');

  inputs.forEach((input, index) => {
    // Only digits allowed
    input.addEventListener('keydown', e => {
      const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (!allowed.includes(e.key) && !/^[0-9]$/.test(e.key)) {
        e.preventDefault();
      }
    });

    input.addEventListener('input', e => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val.slice(0, 1);

      if (val) {
        input.classList.add('filled');
        // Auto-advance to next
        if (index < inputs.length - 1) {
          inputs[index + 1].focus();
        } else {
          // Last digit entered — collect and store
          input.blur();
        }
      } else {
        input.classList.remove('filled');
      }

      // Store combined OTP
      collectOtp();
      UI.setOtpError('');
    });

    // Backspace on empty → go back
    input.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        inputs[index - 1].focus();
        inputs[index - 1].value = '';
        inputs[index - 1].classList.remove('filled');
        collectOtp();
      }
    });

    // Allow paste across all cells
    input.addEventListener('paste', e => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      [...pasted].slice(0, 6).forEach((char, i) => {
        if (inputs[i]) {
          inputs[i].value = char;
          inputs[i].classList.add('filled');
        }
      });
      collectOtp();
      // Focus last filled or last
      const lastFilled = Math.min(pasted.length, inputs.length) - 1;
      if (inputs[lastFilled]) inputs[lastFilled].focus();
    });
  });

  // Resend button + countdown timer
  initOtpResend();
}

/**
 * Collect all OTP digits into state.
 */
function collectOtp() {
  const inputs = document.querySelectorAll('.otp-input');
  const code = [...inputs].map(i => i.value).join('');
  FormState.set('otp', code);
  FormState.touchField('otp');
}

/**
 * Initialize OTP resend button with 30s countdown.
 */
function initOtpResend() {
  const resendBtn = document.getElementById('otpResend');
  const timerEl   = document.getElementById('otpTimer');

  startOtpTimer(30, resendBtn, timerEl);

  if (resendBtn) {
    resendBtn.addEventListener('click', () => {
      if (resendBtn.disabled) return;
      UI.clearOtpInputs();
      UI.setOtpError('');
      FormState.set('otp', '');
      startOtpTimer(30, resendBtn, timerEl);
      // In a real app, you'd call an API here
    });
  }
}

/**
 * Start countdown, disabling the resend button until done.
 * @param {number} seconds
 * @param {HTMLElement} btn
 * @param {HTMLElement} timerEl
 */
function startOtpTimer(seconds, btn, timerEl) {
  if (otpResendTimer) clearInterval(otpResendTimer);
  otpResendCountdown = seconds;

  if (btn) btn.disabled = true;

  otpResendTimer = setInterval(() => {
    otpResendCountdown--;
    if (timerEl) timerEl.textContent = `(${otpResendCountdown}s)`;

    if (otpResendCountdown <= 0) {
      clearInterval(otpResendTimer);
      if (btn)    btn.disabled = false;
      if (timerEl) timerEl.textContent = '';
    }
  }, 1000);
}

/* ─── Step 4: Preferences ──────────────────────────────────── */

function bindStep4() {
  // Role select
  const roleSelect = document.getElementById('role');
  if (roleSelect) {
    roleSelect.addEventListener('change', () => {
      FormState.set('role', roleSelect.value);
      FormState.touchField('role');
      const res = Validation.selectRequired(roleSelect.value, 'a role');
      if (!res.valid) UI.showFieldError('role', res.message);
      else UI.showFieldSuccess('role');
    });
  }

  // Notification checkboxes
  document.querySelectorAll('[name="notify"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = [...document.querySelectorAll('[name="notify"]:checked')].map(c => c.value);
      FormState.set('notify', checked);
    });
  });

  // Theme radio
  document.querySelectorAll('[name="theme"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) FormState.set('theme', radio.value);
    });
  });

  // Terms checkbox
  const termsCheck = document.getElementById('terms');
  if (termsCheck) {
    termsCheck.addEventListener('change', () => {
      FormState.set('terms', termsCheck.checked);
      FormState.touchField('terms');
      const res = Validation.checkboxRequired(termsCheck.checked, 'Accepting terms');
      if (!res.valid) UI.showFieldError('terms', res.message);
      else UI.clearFieldState('terms');
    });
  }
}

/* ─── Submit ────────────────────────────────────────────────── */

function bindSubmit() {
  const submitBtn = document.getElementById('submitBtn');
  if (!submitBtn) return;

  submitBtn.addEventListener('click', () => {
    // Final validation of all steps
    let allValid = true;
    for (let step = 1; step <= 4; step++) {
      const results = Validation.validateStep(step, FormState.getAll());
      if (!Validation.isStepValid(results)) { allValid = false; break; }
    }

    if (!allValid) {
      alert('Please complete all required fields before submitting.');
      return;
    }

    // Show loading state
    UI.setSubmitLoading();

    // Simulate API call
    setTimeout(() => {
      const data = FormState.getAll();
      FormState.markStepComplete(5);
      Storage.clearAll();
      UI.showSuccess(data.firstName);
    }, 1800);
  });
}

/* ─── Reset ─────────────────────────────────────────────────── */

function bindReset() {
  const resetBtn = document.getElementById('resetBtn');
  if (!resetBtn) return;

  resetBtn.addEventListener('click', () => {
    FormState.reset();
    UI.resetUI();
    UI.populateInputs();
    UI.updateOtpEmailDisplay('');
  });
}

/* ─── Auto-fill Detection ──────────────────────────────────── */

/**
 * Detect browser auto-fill events (animationstart fires on webkit
 * auto-filled inputs). Syncs auto-filled values to FormState.
 */
function bindAutoFillDetection() {
  const fieldsToWatch = ['email', 'firstName', 'lastName', 'phone'];

  fieldsToWatch.forEach(fieldId => {
    const el = document.getElementById(fieldId);
    if (!el) return;

    // animationstart fires when Chrome auto-fills (webkit-autofill)
    el.addEventListener('animationstart', e => {
      if (e.animationName === 'onAutoFillStart') {
        FormState.set(fieldId, el.value);
      }
    });

    // Also watch for change events from auto-fill
    el.addEventListener('change', () => {
      FormState.set(fieldId, el.value);
    });
  });
}

/* ─── Helpers ───────────────────────────────────────────────── */

/**
 * Bind a simple input event to update state and validate.
 * @param {string}   fieldId
 * @param {Function} onChange  — receives new value string
 */
function bindInput(fieldId, onChange) {
  const el = document.getElementById(fieldId);
  if (!el) return;

  el.addEventListener('input', () => onChange(el.value));
  el.addEventListener('blur', () => {
    FormState.touchField(fieldId);
    onChange(el.value);
  });
}

/**
 * Bind an input that runs a single validator and shows results.
 * @param {string}   fieldId
 * @param {Function} validator — receives value, returns { valid, message }
 */
function bindValidatedInput(fieldId, validator) {
  const el = document.getElementById(fieldId);
  if (!el) return;

  const update = () => {
    const value = el.value;
    FormState.set(fieldId, value);
    if (FormState.isTouched(fieldId)) {
      const res = validator(value);
      if (!res.valid) UI.showFieldError(fieldId, res.message);
      else UI.showFieldSuccess(fieldId);
    }
  };

  el.addEventListener('input', update);
  el.addEventListener('blur', () => {
    FormState.touchField(fieldId);
    update();
  });
}
