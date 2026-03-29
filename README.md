# Formcraft — Advanced Form System

> A production-grade, multi-step form validation engine built with pure HTML, CSS, and JavaScript. No frameworks. No dependencies. Zero compromises.

**[🔗 Live Demo](https://sabeerhub.github.io/Form-Craft/)**

---

## Overview

Formcraft is a fully functional frontend form system that demonstrates mastery of form engineering, real-time validation, accessible UX, and modular JavaScript architecture — all without a single external library or framework.

Built as a recruiter-ready showcase of vanilla frontend engineering, it covers every aspect of production form design: multi-step flow, localStorage persistence, password strength analysis, international phone input, OTP verification, and full keyboard/screen-reader accessibility.

---

## Preview

| Step | Description |
|------|-------------|
| **01 — Account Setup** | Email validation, password strength meter, confirm match |
| **02 — Personal Info** | Name fields, international phone picker (40+ countries), date of birth |
| **03 — Verify Identity** | 6-digit OTP input with auto-advance, paste support, resend countdown |
| **04 — Preferences** | Role select, notification checkboxes, theme toggle, terms agreement |
| **05 — Review & Submit** | Full summary of all entered data before final submission |

---

## Features

### Multi-Step Form Flow
- 5-step wizard with animated step transitions
- Smooth progress bar that updates with each step
- Sidebar navigation with per-step completion checkmarks
- Forward/back navigation between steps
- All form data persisted to `localStorage` — survives page refresh

### Validation Engine
- Real-time, field-level validation on `input` and `blur` events
- **Email** — RFC 5322-compliant format check
- **Password** — minimum 8 characters, requires uppercase and numeric characters
- **Password confirm** — must match password field exactly
- **Phone** — E.164 digit count validation, US 10-digit enforcement, country-aware
- **Date of birth** — must be in the past, minimum age of 13
- **Select & checkboxes** — required state validation
- **OTP** — 6-digit numeric, demo code `123456`
- Clear, contextual error messages shown inline next to each field
- All fields show success state (green border) when valid

### Password Strength Meter
- 4-level indicator: Weak → Fair → Good → Strong
- Animated colour-coded bar segments
- Per-rule checklist: length, uppercase, number — updates live as you type

### OTP Verification System
- 6 individual digit inputs with auto-focus advance
- Backspace navigates to previous input
- Full clipboard paste support (paste your 6-digit code at once)
- 30-second resend countdown timer
- Error state flashes all inputs red on incorrect code

### International Phone Input
- Searchable dropdown with 40+ countries and flag emojis
- Displays dialling code alongside selected flag
- US/Canada numbers auto-formatted as `(555) 000-0000`
- Validation adjusts rules per selected country code

### Accessibility
- Semantic HTML throughout (`<main>`, `<section>`, `<fieldset>`, `<legend>`, `<nav>`, `<ol>`)
- All interactive elements keyboard-navigable (`Tab`, `Enter`, `Space`, `Escape`, `Backspace`)
- `aria-required`, `aria-describedby`, `aria-live`, `aria-current="step"`, `aria-expanded` attributes
- `role="alert"` on error messages — announced immediately by screen readers
- `role="progressbar"` with `aria-valuenow` on the progress bar
- Visible focus rings on all inputs and buttons
- Password toggle button with dynamic `aria-label`

### Auto-fill Detection
- Listens for browser autofill events (`animationstart`, `change`) on key fields
- Syncs auto-filled values into `FormState` to prevent stale state on navigation

---

## Project Structure

```
form-system/
├── index.html              # Semantic HTML — all 5 steps + success screen
├── css/
│   └── styles.css          # ~700 lines — custom properties, layout, components, responsive
└── js/
    ├── app.js              # Entry point — wires all modules, event listeners
    ├── formState.js        # State model — steps, field data, touched tracking, custom events
    ├── validation.js       # Pure validation functions — no DOM interaction
    ├── ui.js               # DOM layer — feedback, transitions, progress, review render
    └── storage.js          # localStorage adapter — save / load / clear
```

---

## Module Architecture

### `storage.js`
Type-safe localStorage wrapper. All reads/writes go through this module. Handles JSON serialization, catches storage errors silently, and exposes a clean API for the rest of the app.

```
saveFormData(data)   loadFormData()
saveStep(step)       loadStep()
saveCompleted(set)   loadCompleted()
clearAll()
```

### `validation.js`
Pure functions only — no DOM, no side effects. Each validator receives a value and returns `{ valid: boolean, message: string }`. Includes a `validateStep(stepNum, data)` helper that runs all field validators for a given step at once.

```
email()             password()          passwordStrength()
confirmPassword()   firstName()         lastName()
phone()             dob()               selectRequired()
checkboxRequired()  otp()               validateStep()
isStepValid()
```

### `formState.js`
Central source of truth. Uses the module pattern with private state and a public API. Dispatches custom DOM events (`formcraft:stepChanged`, `formcraft:dataChanged`, `formcraft:hydrated`) so `ui.js` and `app.js` can react without tight coupling.

```
get(field)          getAll()            set(field, value)
touchField(field)   isTouched(field)    getCurrentStep()
nextStep()          prevStep()          goToStep(n)
markStepComplete()  isStepComplete()    getSummary()
hydrate()           reset()
```

### `ui.js`
All DOM mutations live here. Reads from `FormState` and `Validation`, never stores its own state. Handles step animations, field error/success states, password strength meter rendering, OTP display, and the review grid.

```
showStep()              updateProgress()        updateStepNav()
showFieldError()        showFieldSuccess()      clearFieldState()
applyValidationResults() updatePasswordStrength() updatePasswordRules()
populateInputs()        updateOtpEmailDisplay() renderReview()
showSuccess()           resetUI()
```

### `app.js`
Entry point. Initialises the app after `DOMContentLoaded`, hydrates state from localStorage, binds all event listeners, wires modules together, and implements the country phone picker and OTP interaction logic.

---

## Data Flow

```
User Input
    │
    ▼
app.js (event listener)
    │  reads input value
    ▼
FormState.set()  ──────────────►  Storage.saveFormData()
    │  fires dataChanged event
    ▼
Validation.*(value)
    │  returns { valid, message }
    ▼
UI.showFieldError / showFieldSuccess()
    │  updates DOM
    ▼
User sees feedback
```

---

## Design System

The UI uses a warm, editorial aesthetic built entirely on CSS custom properties.

| Token | Value | Usage |
|-------|-------|-------|
| `--ink` | `#1a1612` | Primary text, dark elements |
| `--accent` | `#c8a96e` | Gold accent — borders, highlights |
| `--surface` | `#faf8f5` | Page background (warm white) |
| `--sidebar-bg` | `#1a1612` | Dark sidebar |
| `--font-display` | DM Serif Display | Step titles |
| `--font-body` | DM Sans | All body copy |

Responsive breakpoints at `900px` (compact sidebar) and `700px` (stacked mobile layout).

---

## Getting Started

No build step, no npm install, no configuration.

```bash
# Clone the repository
git clone https://github.com/sabeerhub/Form-Craft.git

# Open directly in your browser
open Form-Craft/index.html
```

Or simply visit the **[live demo](https://sabeerhub.github.io/Form-Craft/)**.

### Demo Credentials

| Field | Value |
|-------|-------|
| OTP verification code | `123456` |
| All other fields | Any valid input |

---

## Browser Support

Works in all modern browsers. No polyfills required.

| Chrome | Firefox | Safari | Edge |
|--------|---------|--------|------|
| ✓ | ✓ | ✓ | ✓ |

---

## What This Demonstrates

This project was built to showcase practical frontend engineering skills:

- **State management** without a framework — event-driven, module-pattern architecture
- **Form UX best practices** — deferred validation, touched state, contextual feedback
- **Accessibility engineering** — not just ARIA labels, but a fully navigable experience
- **CSS architecture** — custom properties, component-scoped selectors, no utility framework
- **Modular JavaScript** — separation of concerns across 5 files, zero global pollution
- **Progressive enhancement** — works without JavaScript for static content; JS layers on behaviour

---

## License

MIT — free to use, modify, and distribute.

---

*Built by [Sabeer](https://github.com/sabeerhub)*
