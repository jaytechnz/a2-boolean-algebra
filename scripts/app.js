/* ============================================================
   Boolean Algebra Mastery — App Logic
   Cambridge A2 Computer Science 9618
   
   CIE Notation:
     AND  →  ·  (dot)
     OR   →  +  (plus)
     NOT  →  overline bar above the term
   ============================================================ */

// ── Data Store ──
let EXERCISES = [];
let currentUser = null;
let currentRole = 'student';
let currentExerciseIndex = 0;
let filteredExercises = [];
let currentFilter = 'all';
let streak = 0;

// Category metadata
const CATEGORIES = {
  de_morgan:               { name: "De Morgan's Laws",       icon: "", desc: "Breaking NOT over AND/OR" },
  distributive:            { name: "Distributive Law",        icon: "", desc: "Expanding and factoring" },
  absorption:              { name: "Absorption Law",          icon: "", desc: "Eliminating redundant terms" },
  identity_null:           { name: "Identity & Null Laws",    icon: "",  desc: "Constants 0 and 1, idempotence" },
  commutative_associative: { name: "Commutative & Associative", icon: "", desc: "Reordering and regrouping" },
  inverse_complement:      { name: "Complement Laws",         icon: "", desc: "A AND NOT A, A OR NOT A" },
  double_negation:         { name: "Double Negation",         icon: "", desc: "NOT(NOT A) = A" },
  multi_step:              { name: "Multi-step Simplification", icon: "", desc: "Combining multiple laws" },
  cie_exam:                { name: "CIE Exam Style",          icon: "", desc: "Exam-format questions" }
};

const LAWS_REFERENCE = [
  { name: "Idempotent Law", formulas: ["A + A = A", "A ∧ A = A"], desc: "Repeating an operation with the same operand gives the same operand.", images: ["assets/animations/01_idempotent_or.gif", "assets/animations//02_idempotent_and.gif"] },
  { name: "Identity Law", formulas: ["A + 0 = A", "A ∧ 1 = A"], desc: "0 is the identity for OR; 1 is the identity for AND. These elements don't change the value.", images: ["assets/animations//03_identity_or.gif", "assets/animations//04_identity_and.gif"] },
  { name: "Null (Domination) Law", formulas: ["A + 1 = 1", "A ∧ 0 = 0"], desc: "1 dominates OR; 0 dominates AND. The result is always the dominating element.", images: ["assets/animations//05_domination_or.gif", "assets/animations//06_domination_and.gif"] },
  { name: "Complement Law", formulas: ["A + ¬A = 1", "A ∧ ¬A = 0"], desc: "A variable ORed with its complement is always 1; ANDed is always 0.", images: ["assets/animations//07_complement_or.gif", "assets/animations//08_complement_and.gif"] },
  { name: "Double Negation (Involution)", formulas: ["¬(¬A) = A"], desc: "Two negations cancel out (involution law). A double overbar returns the original value.", images: ["assets/animations//09_involution.gif"] },
  { name: "Commutative Law", formulas: ["A + B = B + A", "A ∧ B = B ∧ A"], desc: "The order of operands doesn't matter for AND or OR.", images: [] },
  { name: "Associative Law", formulas: ["(A + B) + C = A + (B + C)", "(A ∧ B) ∧ C = A ∧ (B ∧ C)"], desc: "Grouping (brackets) doesn't matter for the same operation.", images: [] },
  { name: "Distributive Law", formulas: ["A ∧ (B + C) = (A∧B) + (A∧C)", "A + (B ∧ C) = (A+B) ∧ (A+C)"], desc: "AND distributes over OR (like normal algebra). In Boolean algebra, OR also distributes over AND.", images: ["assets/animations//15_distribution_and_over_or.gif", "assets/animations//14_distribution_or_over_and.gif"] },
  { name: "Absorption Law", formulas: ["A + (A ∧ B) = A", "A ∧ (A + B) = A"], desc: "A more general term absorbs a more specific one that includes it.", images: ["assets/animations//12_absorption_or.gif", "assets/animations//13_absorption_and.gif"] },
  { name: "De Morgan's First Law", formulas: ["¬(A ∧ B) = ¬A + ¬B"], desc: "The complement of a product is the sum of the complements. The overbar of a product becomes a sum of overbar terms.", images: ["assets/animations//11_demorgan_product.gif"] },
  { name: "De Morgan's Second Law", formulas: ["¬(A + B) = ¬A ∧ ¬B"], desc: "The complement of a sum is the product of the complements. The overbar of a sum becomes a product of overbar terms.", images: ["assets/animations//10_demorgan_sum.gif"] },
  { name: "Reduction Rule", formulas: ["A + (¬A ∧ B) = A + B"], desc: "When one term is A and another is NOT-A ANDed with something, the NOT-A is redundant — the second term simplifies to just B.", images: ["assets/animations//16_reduction_rule.gif"] },
  { name: "Consensus Theorem", formulas: ["(A∧B) + (¬A∧C) + (B∧C) = (A∧B) + (¬A∧C)"], desc: "The consensus term (B·C) is redundant when both (A·B) and its complement-pair are present.", images: [] }
];


/* ══════════════════════════════════════════
   CIE NOTATION RENDERER
   
   Converts internal symbolic notation to CIE display:
     ∧  →  · (dot product / AND)
     ∨  →  + (sum / OR)
     ¬X →  X with overline bar (CSS border-top)
     ¬(expr) → overline spanning the entire grouped expression
              (parentheses removed — the bar shows scope)
   ══════════════════════════════════════════ */

function renderCIE(str) {
  if (!str) return '';
  // Step 1 — convert AND/OR operators to CIE symbols
  let s = str.replace(/∧/g, '·').replace(/∨/g, '+');
  // Step 2 — convert ¬ prefix notation into <span class="ol"> overline HTML
  return processOverline(s);
}

function processOverline(s) {
  let result = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '¬') {
      i++; // consume the ¬ character
      if (i < s.length && s[i] === '(') {
        let depth = 1;
        let j = i + 1;
        while (j < s.length && depth > 0) {
          if (s[j] === '(') depth++;
          if (s[j] === ')') depth--;
          j++;
        }
        let inner = s.substring(i + 1, j - 1);
        result += '<span class="ol">' + processOverline(inner) + '</span>';
        i = j;
      } else if (i < s.length && /[A-Za-z0-9]/.test(s[i])) {
        result += '<span class="ol">' + s[i] + '</span>';
        i++;
      } else {
        // Skip stray ¬ — never output raw ¬ to the page
        result += '';
      }
    } else {
      result += s[i];
      i++;
    }
  }
  return result;
}

/**
 * Convert internal notation to CIE TYPED format (plain text for input values).
 * ∧ → .   ∨ → +   ¬A → A'   ¬(expr) → (expr)'
 * This is what students type — the live preview renders it with overbars.
 */
function toCIEText(str) {
  if (!str) return '';
  let s = str.replace(/∧/g, '.').replace(/∨/g, '+');
  let result = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '¬') {
      i++;
      if (i < s.length && s[i] === '(') {
        let depth = 1, j = i + 1;
        while (j < s.length && depth > 0) { if (s[j] === '(') depth++; if (s[j] === ')') depth--; j++; }
        result += s.substring(i, j) + "'";
        i = j;
      } else if (i < s.length && /[A-Za-z0-9]/.test(s[i])) {
        result += s[i] + "'";
        i++;
      } else {
        i++;
      }
    } else {
      result += s[i];
      i++;
    }
  }
  return result;
}


/* ══════════════════════════════════════════
   LIVE INPUT RENDERER

   Converts the student's TYPED notation into CIE display with overbars.
   Students type postfix prime: A' → overbar on A, (A+B)' → overbar spanning A+B.
   ══════════════════════════════════════════ */

function renderTypedInput(raw) {
  if (!raw || !raw.trim()) return '';

  // Escape HTML
  let s = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Convert ! prefix to ¬
  s = s.replace(/!/g, '¬');

  // Convert postfix ' to prefix ¬.
  // Only treat ' as NOT when preceded by uppercase A-Z, digit 0-9, or closing paren.
  // Process left-to-right so A'' (double NOT) nests correctly.
  let safety = 0;
  while (s.includes("'") && safety < 50) {
    safety++;
    let found = false;
    for (let i = 0; i < s.length; i++) {
      if (s[i] !== "'") continue;
      if (i > 0 && s[i - 1] === ')') {
        let depth = 1, j = i - 2;
        while (j >= 0 && depth > 0) { if (s[j] === ')') depth++; if (s[j] === '(') depth--; j--; }
        j++;
        s = s.substring(0, j) + '¬' + s.substring(j, i) + s.substring(i + 1);
        found = true; break;
      } else if (i > 0 && /[A-Z0-9]/.test(s[i - 1])) {
        s = s.substring(0, i - 1) + '¬' + s[i - 1] + s.substring(i + 1);
        found = true; break;
      }
    }
    if (!found) break;
  }

  // Convert . to · for CIE AND display
  s = s.replace(/\./g, '·');

  return processOverline(s);
}

/** Render multi-line working text — each line rendered independently */
function renderTypedWorking(raw) {
  if (!raw || !raw.trim()) return '';
  return raw.split('\n').map(line => {
    if (!line.trim()) return '<br>';
    return renderTypedInput(line);
  }).join('<br>');
}


/* ══════════════════════════════════════════
   BOOLEAN ALGEBRA INPUT SYSTEM

   Three input methods, all working together:
   1. KEYBOARD     — type directly in text fields
   2. SYMBOL STRIP — tappable buttons for operators
   3. DRAWING PAD  — draw with stylus/finger, recognised
                     via Google Cloud Vision API with
                     Boolean algebra post-processing

   The drawing pad sends the canvas image to /api/recognise
   (a Vercel serverless function) which calls Google Vision
   and returns processed Boolean text.
   ══════════════════════════════════════════ */

const BooleanInput = {
  _activeField: null,
  _pollId: null,
  _lastWorkingVal: '',
  _lastAnswerVal: '',
  _canvas: null,
  _ctx: null,
  _drawing: false,
  _hasStrokes: false,

  startPolling() {
    this.stopPolling();
    this._lastWorkingVal = '';
    this._lastAnswerVal = '';
    this._pollId = setInterval(() => {
      const working = document.getElementById('working-input');
      const answer = document.getElementById('answer-input');
      let changed = false;
      if (working && working.value !== this._lastWorkingVal) { this._lastWorkingVal = working.value; changed = true; }
      if (answer && answer.value !== this._lastAnswerVal) { this._lastAnswerVal = answer.value; changed = true; }
      if (changed && typeof Practice !== 'undefined' && Practice.updatePreviews) Practice.updatePreviews();
    }, 250);
  },

  stopPolling() {
    if (this._pollId) { clearInterval(this._pollId); this._pollId = null; }
  },

  trackFocus() {
    document.addEventListener('focusin', (e) => {
      if (e.target.id === 'working-input' || e.target.id === 'answer-input') {
        this._activeField = e.target.id;
      }
    });
  },

  insert(char) {
    const el = document.getElementById(this._activeField || 'answer-input');
    if (!el || el.disabled) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    el.value = el.value.substring(0, start) + char + el.value.substring(end);
    el.selectionStart = el.selectionEnd = start + char.length;
    el.focus();
    if (typeof Practice !== 'undefined' && Practice.updatePreviews) Practice.updatePreviews();
  },

  insertNot() {
    const el = document.getElementById(this._activeField || 'answer-input');
    if (!el || el.disabled) return;
    const pos = el.selectionStart ?? el.value.length;
    el.value = el.value.substring(0, pos) + "'" + el.value.substring(pos);
    el.selectionStart = el.selectionEnd = pos + 1;
    el.focus();
    if (typeof Practice !== 'undefined' && Practice.updatePreviews) Practice.updatePreviews();
  },

  backspace() {
    const el = document.getElementById(this._activeField || 'answer-input');
    if (!el || el.disabled) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    if (start !== end) {
      el.value = el.value.substring(0, start) + el.value.substring(end);
      el.selectionStart = el.selectionEnd = start;
    } else if (start > 0) {
      el.value = el.value.substring(0, start - 1) + el.value.substring(start);
      el.selectionStart = el.selectionEnd = start - 1;
    }
    el.focus();
    if (typeof Practice !== 'undefined' && Practice.updatePreviews) Practice.updatePreviews();
  },

  // ── Drawing Pad with API Recognition ──

  initCanvas() {
    const canvas = document.getElementById('hw-draw-canvas');
    if (!canvas) return;

    this._canvas = canvas;
    const ctx = canvas.getContext('2d');
    this._ctx = ctx;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111FA2';
    this._hasStrokes = false;

    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return { x: touch.clientX - r.left, y: touch.clientY - r.top };
    };

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this._drawing = true;
      this._hasStrokes = true;
      const p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this._drawing) return;
      e.preventDefault();
      const p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    });

    const endStroke = () => { this._drawing = false; };
    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointerleave', endStroke);
    canvas.style.touchAction = 'none';
  },

  clearCanvas() {
    if (!this._canvas || !this._ctx) return;
    const dpr = window.devicePixelRatio || 1;
    this._ctx.clearRect(0, 0, this._canvas.width / dpr, this._canvas.height / dpr);
    this._hasStrokes = false;
    const status = document.getElementById('hw-status');
    if (status) { status.textContent = ''; status.className = 'hw-status'; }
  },

  /** Send the canvas to the Vision API and insert the result */
  async recognise() {
    if (!this._canvas || !this._hasStrokes) return;

    const status = document.getElementById('hw-status');
    if (status) { status.textContent = 'Recognising...'; status.className = 'hw-status busy'; }

    try {
      // Get canvas as base64 PNG (strip the data:image/png;base64, prefix)
      const dataUrl = this._canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];

      const resp = await fetch('/api/recognise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      });

      const data = await resp.json();

      if (data.error) {
        if (status) { status.textContent = 'Error: ' + data.error; status.className = 'hw-status error'; }
        return;
      }

      const recognised = data.text || data.raw || '';
      if (recognised) {
        if (status) { status.textContent = 'Recognised: ' + recognised; status.className = 'hw-status success'; }
        this.insert(recognised);
        setTimeout(() => this.clearCanvas(), 500);
      } else {
        if (status) { status.textContent = 'Nothing recognised — try writing larger'; status.className = 'hw-status error'; }
      }
    } catch (err) {
      if (status) { status.textContent = 'Connection error — check API setup'; status.className = 'hw-status error'; }
      console.error('Recognition error:', err);
    }
  }
};


/* ══════════════════════════════════════════
   SHARED WHITELIST

   The approved email list is stored in data/whitelist.json
   in the GitHub repo, so every device reads the same list.

   On load, the app fetches this file and caches it.
   Teachers can also add emails locally (stored in localStorage)
   for immediate use before committing to the repo.

   The "Export for GitHub" button generates the exact
   whitelist.json file the teacher should commit.
   ══════════════════════════════════════════ */

const Whitelist = {
  _serverEmails: [],
  _loaded: false,

  async load() {
    try {
      const resp = await fetch('data/whitelist.json?t=' + Date.now());
      if (resp.ok) {
        const data = await resp.json();
        this._serverEmails = (data.emails || []).map(e => e.trim().toLowerCase()).filter(Boolean);
      }
    } catch (e) {
      console.warn('Could not load shared whitelist:', e);
    }
    this._loaded = true;
  },

  /** Get locally-tracked removals */
  _getRemovals() {
    return JSON.parse(localStorage.getItem('ba_email_removals') || '[]');
  },

  /** Get the combined active list: (server + local additions) minus removals */
  getAll() {
    const local = JSON.parse(localStorage.getItem('ba_email_whitelist') || '[]');
    const removals = new Set(this._getRemovals());
    const combined = new Set([...this._serverEmails, ...local]);
    return [...combined].filter(e => !removals.has(e)).sort();
  },

  /** Check if an email is currently approved (not removed) */
  isApproved(email) {
    const removals = this._getRemovals();
    if (removals.includes(email)) return false;
    const local = JSON.parse(localStorage.getItem('ba_email_whitelist') || '[]');
    return this._serverEmails.includes(email) || local.includes(email);
  },

  isFromServer(email) {
    return this._serverEmails.includes(email);
  },

  /** Remove an email — works on both server and local emails */
  remove(email) {
    // Remove from local additions if present
    const local = JSON.parse(localStorage.getItem('ba_email_whitelist') || '[]');
    localStorage.setItem('ba_email_whitelist', JSON.stringify(local.filter(e => e !== email)));

    // If it's a server email, track the removal so it stays removed until re-added
    if (this._serverEmails.includes(email)) {
      const removals = this._getRemovals();
      if (!removals.includes(email)) {
        removals.push(email);
        localStorage.setItem('ba_email_removals', JSON.stringify(removals));
      }
    }
  },

  /** Re-approve a previously removed server email */
  restore(email) {
    const removals = this._getRemovals();
    localStorage.setItem('ba_email_removals', JSON.stringify(removals.filter(e => e !== email)));
  },

  /** Get emails that were removed from the server list (for display) */
  getRemovedServerEmails() {
    const removals = this._getRemovals();
    return removals.filter(e => this._serverEmails.includes(e));
  }
};


/* ══════════════════════════════════════════
   COMMUTATIVE EQUIVALENCE CHECKER

   Checks if two normalised Boolean expressions are equivalent
   under commutativity of AND and OR.

   Strategy:
     1. Split on top-level OR (∨) → get terms
     2. For each term, split on top-level AND (∧) → get factors
     3. Sort both sets and compare
     4. Also handles single-variable answers and constants
   ══════════════════════════════════════════ */

function areCommutativelyEqual(a, b) {
  if (a === b) return true;

  // Split expression into top-level terms by a given operator,
  // respecting parenthesis depth
  function splitTopLevel(expr, op) {
    const parts = [];
    let depth = 0, start = 0;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') depth++;
      else if (expr[i] === ')') depth--;
      else if (depth === 0 && expr[i] === op) {
        parts.push(expr.substring(start, i));
        start = i + 1;
      }
    }
    parts.push(expr.substring(start));
    return parts.filter(p => p.length > 0);
  }

  // Normalise a single term: split by AND, sort factors
  function normaliseTerm(term) {
    const factors = splitTopLevel(term, '∧');
    return factors.map(f => {
      // Recursively normalise parenthesised sub-expressions
      if (f.startsWith('(') && f.endsWith(')')) {
        return '(' + normaliseExpr(f.substring(1, f.length - 1)) + ')';
      }
      // Handle ¬(expr) — normalise inside
      if (f.startsWith('¬(') && f.endsWith(')')) {
        return '¬(' + normaliseExpr(f.substring(2, f.length - 1)) + ')';
      }
      return f;
    }).sort().join('∧');
  }

  // Normalise a full expression: split by OR, normalise each term, sort terms
  function normaliseExpr(expr) {
    const terms = splitTopLevel(expr, '∨');
    return terms.map(t => normaliseTerm(t)).sort().join('∨');
  }

  return normaliseExpr(a) === normaliseExpr(b);
}


// ── Initialise ──
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadExercises(), Whitelist.load()]);
  checkExistingSession();
});

async function loadExercises() {
  try {
    const resp = await fetch('scripts/exercises.json');
    const data = await resp.json();
    EXERCISES = data.exercises;
  } catch (e) {
    console.error('Failed to load exercises:', e);
    showToast('Could not load exercises. Please refresh.', 'error');
  }
}

function checkExistingSession() {
  const saved = localStorage.getItem('ba_session');
  if (saved) {
    const session = JSON.parse(saved);
    currentUser = session.user;
    currentRole = session.role;
    enterApp();
  }
}


// ══════════════════════════════════════════
//  APP NAMESPACE
// ══════════════════════════════════════════

/** Derive a display name from an email address.
 *  e.g. "alex.chen@student.cga.school" → "Alex Chen"
 *       "j.smith@cga.school" → "J Smith"
 */
function nameFromEmail(email) {
  if (!email) return 'Unknown';
  const local = email.split('@')[0]; // "alex.chen"
  return local.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Hash a password string using SHA-256 (async, returns hex string) */
async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const App = {

  setRole(role) {
    currentRole = role;
    document.querySelectorAll('#role-toggle button').forEach(b => {
      b.classList.toggle('active', b.dataset.role === role);
    });

    const pwGroup = document.getElementById('password-group');
    const pwConfirmGroup = document.getElementById('password-confirm-group');
    const loginHint = document.getElementById('login-hint');
    const loginError = document.getElementById('login-error');

    if (role === 'teacher') {
      pwGroup.style.display = '';
      document.getElementById('teacher-password').required = true;
      // Check if this teacher email is already registered
      this._updateTeacherFields();
    } else {
      pwGroup.style.display = 'none';
      pwConfirmGroup.style.display = 'none';
      document.getElementById('teacher-password').required = false;
      document.getElementById('teacher-password-confirm').required = false;
      loginHint.classList.remove('show');
    }
    loginError.classList.remove('show');
  },

  /** Check email field and show appropriate teacher UI (new vs existing account) */
  _updateTeacherFields() {
    if (currentRole !== 'teacher') return;

    const email = (document.getElementById('school-email').value || '').trim().toLowerCase();
    const pwConfirmGroup = document.getElementById('password-confirm-group');
    const pwConfirm = document.getElementById('teacher-password-confirm');
    const loginHint = document.getElementById('login-hint');
    const pwLabel = document.getElementById('password-label');

    if (!email || !email.endsWith('@cga.school') || email.endsWith('@student.cga.school')) {
      pwConfirmGroup.style.display = 'none';
      pwConfirm.required = false;
      loginHint.classList.remove('show');
      return;
    }

    const teacherPasswords = JSON.parse(localStorage.getItem('ba_teacher_passwords') || '{}');
    const emailKey = email.replace(/[^a-z0-9]/g, '_');

    if (teacherPasswords[emailKey]) {
      // Existing teacher
      pwLabel.textContent = 'Password';
      pwConfirmGroup.style.display = 'none';
      pwConfirm.required = false;
      loginHint.className = 'login-hint show existing-account';
      loginHint.textContent = 'Welcome back. Enter your password to sign in.';
    } else {
      // New teacher — show confirm password
      pwLabel.textContent = 'Create a Password';
      pwConfirmGroup.style.display = '';
      pwConfirm.required = true;
      loginHint.className = 'login-hint show new-account';
      loginHint.textContent = 'First time? Create a password to set up your teacher account.';
    }
  },

  async login(e) {
    e.preventDefault();
    const email = document.getElementById('school-email').value.trim().toLowerCase();
    const loginError = document.getElementById('login-error');
    loginError.classList.remove('show');

    if (!email) return;

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      loginError.textContent = 'Please enter a valid email address.';
      loginError.classList.add('show');
      return;
    }

    // ── Domain enforcement ──
    const STUDENT_DOMAIN = '@student.cga.school';
    const TEACHER_DOMAIN = '@cga.school';

    if (currentRole === 'student') {
      if (!email.endsWith(STUDENT_DOMAIN)) {
        loginError.textContent = 'Students must use their @student.cga.school email address.';
        loginError.classList.add('show');
        return;
      }
      // Whitelist check — server file + localStorage
      if (!Whitelist.isApproved(email)) {
        loginError.textContent = 'Your email has not been approved by your teacher. Please contact your teacher to request access.';
        loginError.classList.add('show');
        return;
      }
    } else if (currentRole === 'teacher') {
      if (!email.endsWith(TEACHER_DOMAIN) || email.endsWith(STUDENT_DOMAIN)) {
        loginError.textContent = 'Teachers must use their @cga.school email address (not @student.cga.school).';
        loginError.classList.add('show');
        return;
      }

      // ── Teacher password ──
      const password = document.getElementById('teacher-password').value;
      if (!password) {
        loginError.textContent = 'Please enter your password.';
        loginError.classList.add('show');
        return;
      }

      if (password.length < 4) {
        loginError.textContent = 'Password must be at least 4 characters.';
        loginError.classList.add('show');
        return;
      }

      const teacherPasswords = JSON.parse(localStorage.getItem('ba_teacher_passwords') || '{}');
      const emailKey = email.replace(/[^a-z0-9]/g, '_');
      const pwHash = await hashPassword(password);

      if (teacherPasswords[emailKey]) {
        // Existing teacher — verify
        if (teacherPasswords[emailKey] !== pwHash) {
          loginError.textContent = 'Incorrect password.';
          loginError.classList.add('show');
          return;
        }
      } else {
        // New teacher — check confirm password matches
        const confirmPw = document.getElementById('teacher-password-confirm').value;
        if (password !== confirmPw) {
          loginError.textContent = 'Passwords do not match. Please re-enter.';
          loginError.classList.add('show');
          return;
        }
        // Register
        teacherPasswords[emailKey] = pwHash;
        localStorage.setItem('ba_teacher_passwords', JSON.stringify(teacherPasswords));
        showToast('Teacher account created successfully.', 'success');
      }
    }

    // Derive display name from email
    const displayName = nameFromEmail(email);
    const userId = email.replace(/[^a-z0-9]/g, '_');
    currentUser = { firstName: displayName, email: email, id: userId };

    localStorage.setItem('ba_session', JSON.stringify({ user: currentUser, role: currentRole }));

    if (currentRole === 'student') {
      const existing = localStorage.getItem(`ba_progress_${userId}`);
      if (!existing) {
        const progress = { userId, firstName: displayName, email: email, exercises: {}, startedAt: new Date().toISOString() };
        localStorage.setItem(`ba_progress_${userId}`, JSON.stringify(progress));
      }
      const roster = JSON.parse(localStorage.getItem('ba_roster') || '[]');
      if (!roster.includes(userId)) {
        roster.push(userId);
        localStorage.setItem('ba_roster', JSON.stringify(roster));
      }
    }

    enterApp();
  },

  logout() {
    localStorage.removeItem('ba_session');
    currentUser = null;
    location.reload();
  },

  navigate(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const el = document.getElementById(`${screen}-screen`);
    if (el) {
      el.classList.add('active');
      el.style.animation = 'none';
      el.offsetHeight;
      el.style.animation = '';
    }

    const navLink = document.querySelector(`.nav-link[data-screen="${screen}"]`);
    if (navLink) navLink.classList.add('active');

    if (screen === 'dashboard') Dashboard.render();
    if (screen === 'learn') Learn.render();
    if (screen === 'practice') Practice.init();
    if (screen === 'teacher') Teacher.render();

    document.getElementById('nav-links').classList.remove('mobile-open');
  },

  toggleMobileNav() {
    document.getElementById('nav-links').classList.toggle('mobile-open');
  }
};


// ── Enter App after login ──
function enterApp() {
  document.getElementById('login-screen').classList.remove('active');
  const nav = document.getElementById('top-nav');
  nav.classList.remove('hidden');

  const initials = currentUser.firstName[0].toUpperCase();
  document.getElementById('nav-avatar').textContent = initials;
  document.getElementById('nav-username').textContent = currentUser.firstName;

  document.getElementById('nav-teacher-link').style.display = currentRole === 'teacher' ? '' : 'none';

  App.navigate(currentRole === 'teacher' ? 'teacher' : 'dashboard');
}


// ── Progress Helpers ──
function getProgress(userId) {
  const uid = userId || currentUser?.id;
  if (!uid) return null;
  const raw = localStorage.getItem(`ba_progress_${uid}`);
  return raw ? JSON.parse(raw) : null;
}

function saveProgress(exerciseId, result) {
  if (!currentUser) return;
  const key = `ba_progress_${currentUser.id}`;
  const progress = JSON.parse(localStorage.getItem(key) || '{}');
  if (!progress.exercises) progress.exercises = {};

  const existing = progress.exercises[exerciseId];
  if (existing && existing.status === 'correct' && result.status !== 'correct') return;

  progress.exercises[exerciseId] = {
    status: result.status,
    attempts: (existing?.attempts || 0) + 1,
    hintUsed: result.hintUsed || existing?.hintUsed || false,
    working: result.working || existing?.working || '',
    timestamp: new Date().toISOString()
  };

  progress.lastActive = new Date().toISOString();
  localStorage.setItem(key, JSON.stringify(progress));
}


// ══════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════
const Dashboard = {
  render() {
    const progress = getProgress();
    const exercises = progress?.exercises || {};

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    document.getElementById('dashboard-greeting').textContent = `${greeting}, ${currentUser.firstName}`;

    const total = EXERCISES.length;
    const attempted = Object.keys(exercises).length;
    const correct = Object.values(exercises).filter(e => e.status === 'correct').length;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const hintsUsed = Object.values(exercises).filter(e => e.hintUsed).length;

    document.getElementById('stat-grid').innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Completed</div>
        <div class="stat-value">${attempted} <span class="stat-unit">/ ${total}</span></div>
        <div class="stat-bar"><div class="stat-bar-fill yellow" style="width:${(attempted/total)*100}%"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Correct</div>
        <div class="stat-value">${correct} <span class="stat-unit">/ ${attempted || '—'}</span></div>
        <div class="stat-bar"><div class="stat-bar-fill sky" style="width:${attempted ? (correct/attempted)*100 : 0}%"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Accuracy</div>
        <div class="stat-value">${accuracy}<span class="stat-unit">%</span></div>
        <div class="stat-bar"><div class="stat-bar-fill blue" style="width:${accuracy}%"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Hints Used</div>
        <div class="stat-value">${hintsUsed}</div>
        <div class="stat-bar"><div class="stat-bar-fill navy" style="width:${attempted ? (hintsUsed/attempted)*100 : 0}%"></div></div>
      </div>
    `;

    const catGrid = document.getElementById('category-grid');
    catGrid.innerHTML = '';
    for (const [key, meta] of Object.entries(CATEGORIES)) {
      const catExercises = EXERCISES.filter(e => e.category === key);
      const catDone = catExercises.filter(e => exercises[e.id]?.status === 'correct').length;
      const pct = catExercises.length > 0 ? Math.round((catDone / catExercises.length) * 100) : 0;

      const difficulties = [...new Set(catExercises.map(e => e.difficulty))];
      let badgeClass = 'mixed';
      if (difficulties.length === 1) badgeClass = difficulties[0] === 1 ? 'easy' : difficulties[0] === 2 ? 'medium' : 'hard';

      catGrid.innerHTML += `
        <div class="category-card" data-cat="${key}" onclick="App.navigate('practice'); Practice.filterByCategory('${key}');">
          <div class="cat-header">
            <span class="cat-icon">${meta.icon}</span>
            <span class="cat-badge ${badgeClass}">${catExercises.length} exercises</span>
          </div>
          <div class="cat-name">${meta.name}</div>
          <div class="cat-desc">${meta.desc}</div>
          <div class="cat-progress">
            <div class="cat-progress-bar"><div class="cat-progress-fill" style="width:${pct}%"></div></div>
            <div class="cat-progress-text">${pct}%</div>
          </div>
        </div>
      `;
    }
  }
};


// ══════════════════════════════════════════
//  LEARN — laws displayed in CIE notation
// ══════════════════════════════════════════
const Learn = {
  // Track which animation is currently playing so we can auto-stop it
  _activeAnim: null,

  render() {
    const container = document.getElementById('law-cards');
    container.innerHTML = `
      <div class="learn-mascots">
        <div class="mascot-card">
          <img src="assets/images/barry-boolean-mascot.png" alt="Barry Boolean" class="mascot-img" onerror="this.parentElement.classList.add('placeholder')">
          <div class="mascot-label">Barry</div>
        </div>
        <div class="mascot-speech">
          <p><strong>Barry &amp; Bernice say:</strong> "Master these laws and you'll simplify any Boolean expression the exam throws at you!"</p>
        </div>
        <div class="mascot-card">
          <img src="assets/images/bernice-boolean-mascot.png" alt="Bernice Boolean" class="mascot-img" onerror="this.parentElement.classList.add('placeholder')">
          <div class="mascot-label">Bernice</div>
        </div>
      </div>
    ` + LAWS_REFERENCE.map((law, lawIdx) => {
      // Build animation containers — GIFs are NOT loaded until the student clicks Play
      const imagesHTML = law.images && law.images.length > 0
        ? `<div class="law-images">${law.images.map((src, imgIdx) => {
            const uid = `anim-${lawIdx}-${imgIdx}`;
            return `
              <div class="anim-container" id="${uid}-wrap">
                <div class="anim-placeholder" id="${uid}-ph">
                  <span class="anim-ph-icon">▶</span>
                  <span class="anim-ph-label">Play animation</span>
                </div>
                <img src="" alt="${law.name} diagram" class="law-img anim-img" id="${uid}-img"
                     data-gif="${src}" style="display:none;" loading="lazy">
                <button class="btn-anim btn-anim-play" id="${uid}-btn"
                        onclick="Learn.toggleAnim('${uid}')">
                  ▶ Play
                </button>
              </div>`;
          }).join('')}</div>`
        : '';

      return `
        <div class="law-card">
          <div class="law-name">📘 ${law.name}</div>
          ${imagesHTML}
          <div class="law-formula">${law.formulas.map(f => renderCIE(f)).join('<br>')}</div>
          <div class="law-description">${renderCIE(law.desc)}</div>
        </div>
      `;
    }).join('');
  },

  toggleAnim(uid) {
    const img = document.getElementById(`${uid}-img`);
    const btn = document.getElementById(`${uid}-btn`);
    const ph = document.getElementById(`${uid}-ph`);
    if (!img || !btn) return;

    const isPlaying = img.style.display !== 'none';

    if (isPlaying) {
      // Stop this animation
      this._stopAnim(uid);
    } else {
      // Stop any other playing animation first
      if (this._activeAnim && this._activeAnim !== uid) {
        this._stopAnim(this._activeAnim);
      }
      // Play this one — load the GIF (cache-bust to restart from frame 1)
      const gifSrc = img.dataset.gif;
      img.src = gifSrc + (gifSrc.includes('?') ? '&' : '?') + 't=' + Date.now();
      img.style.display = 'block';
      ph.style.display = 'none';
      btn.innerHTML = '⏹ Stop';
      btn.classList.remove('btn-anim-play');
      btn.classList.add('btn-anim-stop');
      this._activeAnim = uid;
    }
  },

  _stopAnim(uid) {
    const img = document.getElementById(`${uid}-img`);
    const btn = document.getElementById(`${uid}-btn`);
    const ph = document.getElementById(`${uid}-ph`);
    if (!img) return;

    // Freeze on the current frame by capturing to a canvas data URL
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 400;
      canvas.height = img.naturalHeight || img.height || 300;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      img.src = canvas.toDataURL();
      // Show the frozen frame, hide the placeholder
      img.style.display = 'block';
      if (ph) ph.style.display = 'none';
    } catch (e) {
      // If canvas capture fails (e.g. CORS), just hide back to placeholder
      img.src = '';
      img.style.display = 'none';
      if (ph) ph.style.display = 'flex';
    }

    if (btn) {
      btn.innerHTML = '▶ Play';
      btn.classList.remove('btn-anim-stop');
      btn.classList.add('btn-anim-play');
    }

    if (this._activeAnim === uid) this._activeAnim = null;
  }
};


// ══════════════════════════════════════════
//  PRACTICE — all notation rendered as CIE
// ══════════════════════════════════════════
const Practice = {
  init() {
    this.renderFilters();
    this.applyFilter(currentFilter);
  },

  renderFilters() {
    const container = document.getElementById('practice-filters');
    let html = `<button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" onclick="Practice.applyFilter('all')">All</button>`;
    html += `<button class="filter-btn ${currentFilter === 'unattempted' ? 'active' : ''}" onclick="Practice.applyFilter('unattempted')">Unattempted</button>`;
    html += `<button class="filter-btn ${currentFilter === 'incorrect' ? 'active' : ''}" onclick="Practice.applyFilter('incorrect')">Review Mistakes</button>`;

    for (const [key, meta] of Object.entries(CATEGORIES)) {
      html += `<button class="filter-btn ${currentFilter === key ? 'active' : ''}" onclick="Practice.applyFilter('${key}')">${meta.icon} ${meta.name}</button>`;
    }
    container.innerHTML = html;
  },

  applyFilter(filter) {
    currentFilter = filter;
    const progress = getProgress()?.exercises || {};

    if (filter === 'all') {
      filteredExercises = [...EXERCISES];
    } else if (filter === 'unattempted') {
      filteredExercises = EXERCISES.filter(e => !progress[e.id]);
    } else if (filter === 'incorrect') {
      filteredExercises = EXERCISES.filter(e => progress[e.id]?.status === 'incorrect');
    } else {
      filteredExercises = EXERCISES.filter(e => e.category === filter);
    }

    currentExerciseIndex = 0;
    this.renderFilters();
    this.renderExercise();

    const label = filter === 'all' ? 'All exercises' :
                  filter === 'unattempted' ? 'Unattempted' :
                  filter === 'incorrect' ? 'Review mistakes' :
                  CATEGORIES[filter]?.name || filter;
    document.getElementById('practice-filter-label').textContent = `${label} (${filteredExercises.length})`;
  },

  filterByCategory(cat) {
    this.applyFilter(cat);
  },

  renderExercise() {
    const area = document.getElementById('exercise-area');

    if (filteredExercises.length === 0) {
      area.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎉</div>
          <h3>No exercises here</h3>
          <p>${currentFilter === 'incorrect' ? 'No mistakes to review — great work!' : currentFilter === 'unattempted' ? 'You\'ve attempted all exercises!' : 'No exercises match this filter.'}</p>
          <button class="btn btn-primary" style="margin-top:16px;" onclick="Practice.applyFilter('all')">Show All Exercises</button>
        </div>`;
      return;
    }

    const ex = filteredExercises[currentExerciseIndex];
    const progress = getProgress()?.exercises || {};
    const exProgress = progress[ex.id];
    const diffLabel = ex.difficulty === 1 ? 'Easy' : ex.difficulty === 2 ? 'Medium' : 'Hard';
    const catMeta = CATEGORIES[ex.category] || {};
    const progressPct = ((currentExerciseIndex + 1) / filteredExercises.length) * 100;

    let feedbackHTML = '';
    if (exProgress?.status === 'correct') {
      feedbackHTML = `
        <div class="feedback-box correct">
          <strong>✓ Previously answered correctly</strong>
          ${renderCIE(ex.explanation)}
          <span class="law-tag">${ex.lawUsed}</span>
        </div>`;
    }

    // Determine if working is required for this exercise
    const WORKING_EXEMPT = ['identity_null', 'commutative_associative', 'inverse_complement', 'double_negation'];
    const workingRequired = !WORKING_EXEMPT.includes(ex.category) && ex.type !== 'identify';

    area.innerHTML = `
      <div class="exercise-progress-bar">
        <div class="exercise-progress-fill" style="width:${progressPct}%"></div>
      </div>
      <div class="exercise-card">
        <div class="exercise-meta">
          <span class="exercise-number">#${ex.id}</span>
          <span class="exercise-difficulty ${diffLabel.toLowerCase()}">${diffLabel}</span>
          <span class="exercise-category-tag">${catMeta.icon || ''} ${catMeta.name || ex.category}</span>
        </div>
        <div class="exercise-title">${ex.title}</div>
        <div class="exercise-question">${renderCIE(ex.question)}</div>
        <div class="exercise-expression">${renderCIE(ex.expression)}</div>

        <label class="working-label">Show your working ${workingRequired
            ? '<span class="required">* required</span>'
            : '<span style="color:var(--text-muted);font-size:0.7rem;text-transform:none;letter-spacing:0;">(optional for this type of question)</span>'}</label>
        <textarea class="working-textarea" id="working-input"
          oninput="Practice.updatePreviews()"
          data-required="${workingRequired}"
          placeholder="${workingRequired
            ? 'Show each step, naming the law at each step.\n\ne.g.\n= A\x27.B + A.B    [De Morgan\x27s]\n= B.(A\x27 + A)      [Distributive]\n= B.1                [Complement]\n= B                   [Identity]'
            : 'Working is optional for this question, but you can still show your reasoning here.'}"
          ${exProgress?.status === 'correct' ? 'disabled' : ''}>${exProgress?.status === 'correct' && exProgress?.working ? exProgress.working : ''}</textarea>
        <div class="live-preview" id="working-preview">
          <div class="live-preview-label">CIE Notation Preview</div>
          <div class="live-preview-content" id="working-preview-content"></div>
        </div>
        <div class="working-warning" id="working-warning"></div>

        <label class="working-label">Final answer</label>
        <div class="answer-input-group">
          <input type="text" class="answer-input" id="answer-input"
            placeholder="Type your final simplified answer (e.g. A'.B + C)"
            oninput="Practice.updatePreviews()"
            ${exProgress?.status === 'correct' ? `value="${toCIEText(ex.answer)}" disabled` : ''}
            onkeydown="if(event.key==='Enter')Practice.checkAnswer()">
          <button class="btn btn-primary" onclick="Practice.checkAnswer()"
            ${exProgress?.status === 'correct' ? 'disabled' : ''}>Check</button>
        </div>
        <div class="live-preview live-preview-inline" id="answer-preview">
          <div class="live-preview-label">CIE Notation Preview</div>
          <div class="live-preview-content live-preview-answer" id="answer-preview-content"></div>
        </div>
        <div class="exercise-actions">
          <button class="btn btn-secondary btn-sm" onclick="Practice.showHint()">💡 Hint</button>
          <button class="btn btn-secondary btn-sm" onclick="Practice.showAnswer()">👁 Show Answer</button>
        </div>
        <div id="feedback-area">${feedbackHTML}</div>

        <div class="bool-input-strip" id="bool-input-strip">
          <div class="bool-strip-info">Type with keyboard for text. Use buttons or drawing pad for Boolean operators and symbols:</div>
          <div class="bool-strip-row">
            <span class="bool-strip-label">Variables</span>
            <button class="bool-btn" onclick="BooleanInput.insert('A')">A</button>
            <button class="bool-btn" onclick="BooleanInput.insert('B')">B</button>
            <button class="bool-btn" onclick="BooleanInput.insert('C')">C</button>
            <button class="bool-btn" onclick="BooleanInput.insert('D')">D</button>
            <button class="bool-btn" onclick="BooleanInput.insert('E')">E</button>
            <span class="bool-strip-sep"></span>
            <button class="bool-btn" onclick="BooleanInput.insert('0')">0</button>
            <button class="bool-btn" onclick="BooleanInput.insert('1')">1</button>
          </div>
          <div class="bool-strip-row">
            <span class="bool-strip-label">Operators</span>
            <button class="bool-btn op" onclick="BooleanInput.insert('+')">+ <small>OR</small></button>
            <button class="bool-btn op" onclick="BooleanInput.insert('.')">· <small>AND</small></button>
            <button class="bool-btn op not" onclick="BooleanInput.insertNot()">' <small>NOT</small></button>
            <span class="bool-strip-sep"></span>
            <button class="bool-btn" onclick="BooleanInput.insert('(')">(</button>
            <button class="bool-btn" onclick="BooleanInput.insert(')')">)</button>
            <button class="bool-btn" onclick="BooleanInput.insert('=')"> = </button>
            <button class="bool-btn" onclick="BooleanInput.insert('[')"> [ </button>
            <button class="bool-btn" onclick="BooleanInput.insert(']')"> ] </button>
            <span class="bool-strip-sep"></span>
            <button class="bool-btn util" onclick="BooleanInput.insert(' ')">␣</button>
            <button class="bool-btn util" onclick="BooleanInput.insert('\\n')">↵</button>
            <button class="bool-btn util" onclick="BooleanInput.backspace()">⌫</button>
          </div>
        </div>

        <div class="hw-draw-section">
          <div class="hw-draw-header">
            <span class="hw-draw-title">✏️ Draw here (stylus or finger)</span>
            <span class="hw-status" id="hw-status"></span>
          </div>
          <canvas id="hw-draw-canvas" class="hw-draw-canvas"></canvas>
          <div class="hw-draw-actions">
            <button class="btn btn-primary btn-sm" onclick="BooleanInput.recognise()">Recognise →</button>
            <button class="btn btn-secondary btn-sm" onclick="BooleanInput.clearCanvas()">Clear</button>
            <span class="hw-draw-hint">Write expressions, letters, operators, or draw an overbar above text for NOT</span>
          </div>
        </div>
      </div>
      <div class="exercise-nav">
        <button class="btn btn-secondary btn-sm" onclick="Practice.prev()" ${currentExerciseIndex === 0 ? 'disabled' : ''}>← Previous</button>
        <span class="exercise-counter">${currentExerciseIndex + 1} of ${filteredExercises.length}</span>
        <button class="btn btn-primary btn-sm" onclick="Practice.next()" ${currentExerciseIndex >= filteredExercises.length - 1 ? 'disabled' : ''}>Next →</button>
      </div>
    `;

    const inp = document.getElementById('answer-input');
    if (inp && !inp.disabled) setTimeout(() => inp.focus(), 100);

    // Trigger initial preview render
    this.updatePreviews();

    // Start input polling + track focus + init drawing canvas
    BooleanInput.startPolling();
    BooleanInput.trackFocus();
    BooleanInput.initCanvas();

    document.getElementById('streak-display').innerHTML = `🔥 ${streak} streak`;
    if (streak >= 3) document.getElementById('streak-display').classList.add('active');
    else document.getElementById('streak-display').classList.remove('active');
  },

  /** Live-update CIE notation previews as the student types */
  updatePreviews() {
    const answerInput = document.getElementById('answer-input');
    const answerPreview = document.getElementById('answer-preview-content');
    const answerWrap = document.getElementById('answer-preview');
    if (answerInput && answerPreview && answerWrap) {
      const val = answerInput.value.trim();
      if (val) {
        answerPreview.innerHTML = renderTypedInput(val);
        answerWrap.classList.add('visible');
      } else {
        answerPreview.innerHTML = '';
        answerWrap.classList.remove('visible');
      }
    }

    const workingInput = document.getElementById('working-input');
    const workingPreview = document.getElementById('working-preview-content');
    const workingWrap = document.getElementById('working-preview');
    if (workingInput && workingPreview && workingWrap) {
      const val = workingInput.value.trim();
      if (val) {
        workingPreview.innerHTML = renderTypedWorking(val);
        workingWrap.classList.add('visible');
      } else {
        workingPreview.innerHTML = '';
        workingWrap.classList.remove('visible');
      }
    }
  },

  /* ── Answer Checker with Working Validation ──
     For categories that require working, the validator checks:
       1. Minimum length (20+ chars)
       2. Contains at least one recognised Boolean law name
       3. Contains at least 2 step-lines (lines starting with = or containing →)
       4. Contains at least one variable (A-Z) from the exercise
       5. Not repetitive gibberish (no single char repeated 10+ times)
     
     Categories exempt from working: identity_null, commutative_associative, 
     inverse_complement, double_negation. Also exempt: identify-type questions.
  */
  checkAnswer() {
    const ex = filteredExercises[currentExerciseIndex];
    const input = document.getElementById('answer-input');
    const workingInput = document.getElementById('working-input');
    const workingWarning = document.getElementById('working-warning');
    const userAnswer = input.value.trim();
    const userWorking = workingInput.value.trim();

    if (!userAnswer) return;

    // Determine if working is required
    const WORKING_EXEMPT = ['identity_null', 'commutative_associative', 'inverse_complement', 'double_negation'];
    const workingRequired = !WORKING_EXEMPT.includes(ex.category) && ex.type !== 'identify';

    // ── Validate working if required ──
    if (workingRequired) {
      const problems = this._validateWorking(userWorking, ex);
      if (problems.length > 0) {
        workingWarning.innerHTML = '⚠ ' + problems[0];
        workingWarning.classList.add('show');
        workingInput.classList.add('error');
        workingInput.focus();
        return;
      }
    }
    workingWarning.classList.remove('show');
    workingInput.classList.remove('error');

    // ── Normalise and check answer ──
    const normalise = s => s.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/·/g, '∧').replace(/\./g, '∧')
      .replace(/\+/g, '∨')
      .replace(/!/g, '¬').replace(/not/gi, '¬')
      .replace(/and/gi, '∧').replace(/or/gi, '∨')
      .replace(/'/g, '¬');

    const normUser = normalise(userAnswer);

    // Check exact match first, then commutative equivalence
    const isCorrect = ex.acceptableAnswers.some(a => {
      const normA = normalise(a);
      if (normA === normUser) return true;
      // Check commutative equivalence: split on top-level ∨ (OR) and ∧ (AND)
      // and compare as sets of terms
      return areCommutativelyEqual(normA, normUser);
    });

    const feedbackArea = document.getElementById('feedback-area');

    if (isCorrect) {
      input.classList.add('correct');
      input.classList.remove('incorrect');
      input.disabled = true;
      workingInput.disabled = true;
      streak++;
      saveProgress(ex.id, { status: 'correct', hintUsed: false, working: userWorking });
      feedbackArea.innerHTML = `
        <div class="feedback-box correct">
          <strong>✓ Correct! Well done!</strong>
          ${renderCIE(ex.explanation)}
          <span class="law-tag">${ex.lawUsed}</span>
        </div>`;
      if (streak >= 5) showToast(`🔥 ${streak} in a row! You're on fire!`, 'success');
    } else {
      input.classList.add('incorrect');
      input.classList.remove('correct');
      streak = 0;
      saveProgress(ex.id, { status: 'incorrect', hintUsed: false, working: userWorking });
      feedbackArea.innerHTML = `
        <div class="feedback-box incorrect">
          <strong>✗ Not quite right.</strong>
          Check your working and try again. Type <code>.</code> for AND, <code>+</code> for OR, and <code>'</code> after a variable for NOT (the preview will show the overbar).
        </div>`;
    }

    document.getElementById('streak-display').innerHTML = `🔥 ${streak} streak`;
  },

  /** Validate the student's working — returns array of problem messages (empty = valid) */
  _validateWorking(working, exercise) {
    const problems = [];

    // ── Determine minimum requirements based on category + difficulty ──
    // Simple single-law applications need less working than multi-step chains.
    const cat = exercise.category;
    const diff = exercise.difficulty;

    // Minimum line counts by category
    //   absorption, de_morgan (easy): 1 line is enough — just state the law + result
    //   distributive, de_morgan (medium+): 2 lines
    //   multi_step, cie_exam: 2 lines minimum (hard = 3)
    let minLines, minLength;
    if (['absorption'].includes(cat)) {
      minLines = 1; minLength = 12;
    } else if (cat === 'de_morgan' && diff <= 1) {
      minLines = 1; minLength = 12;
    } else if (['distributive', 'de_morgan'].includes(cat) && diff <= 2) {
      minLines = 1; minLength = 15;
    } else if (['multi_step', 'cie_exam'].includes(cat) && diff >= 3) {
      minLines = 2; minLength = 20;
    } else {
      minLines = 1; minLength = 15;
    }

    // 1. Must exist and meet minimum length
    if (!working || working.length < minLength) {
      problems.push(`Your working is too short. Show your simplification step${minLines > 1 ? 's' : ''} with the law you applied.`);
      return problems;
    }

    // 2. Reject repetitive gibberish (same char repeated 10+ times)
    if (/(.)\1{9,}/.test(working)) {
      problems.push('Your working appears to contain repeated characters. Please show genuine simplification steps.');
      return problems;
    }
    const uniqueChars = new Set(working.replace(/\s/g, '').split('')).size;
    if (uniqueChars < 4) {
      problems.push('Your working needs to contain actual Boolean expressions and law names, not placeholder text.');
      return problems;
    }

    // 3. Must contain at least one recognised Boolean law name
    const lawNames = [
      /de\s*morgan/i, /distributiv/i, /absorption/i, /identity/i, /null/i, /domination/i,
      /idempotent/i, /complement/i, /involution/i, /double\s*neg/i, /commutativ/i,
      /associativ/i, /consensus/i, /reduction/i, /factoris/i, /expand/i, /simplif/i
    ];
    const hasLaw = lawNames.some(rx => rx.test(working));
    if (!hasLaw) {
      problems.push('Name the Boolean law you applied (e.g. [Absorption], [De Morgan\'s], [Distributive]).');
      return problems;
    }

    // 4. Check line count against minimum for this category/difficulty
    const lines = working.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < minLines) {
      problems.push(`Show at least ${minLines} step${minLines > 1 ? 's' : ''} — the intermediate expression and the law applied.`);
      return problems;
    }

    // 5. Must reference at least one variable from the exercise
    const exprVars = (exercise.expression || '').match(/[A-Z]/g) || [];
    const workingUpper = working.toUpperCase();
    const hasVar = exprVars.some(v => workingUpper.includes(v));
    if (exprVars.length > 0 && !hasVar) {
      problems.push('Your working should reference the variables from the question (e.g. ' + [...new Set(exprVars)].join(', ') + ').');
      return problems;
    }

    return problems; // Empty = all checks passed
  },

  showHint() {
    const ex = filteredExercises[currentExerciseIndex];
    const workingInput = document.getElementById('working-input');
    const userWorking = workingInput ? workingInput.value.trim() : '';
    saveProgress(ex.id, { status: 'hint_used', hintUsed: true, working: userWorking });
    document.getElementById('feedback-area').innerHTML = `
      <div class="feedback-box hint">
        <strong>💡 Hint</strong>
        ${renderCIE(ex.hint)}
      </div>`;
  },

  showAnswer() {
    const ex = filteredExercises[currentExerciseIndex];
    const progress = getProgress()?.exercises || {};
    if (!progress[ex.id] || progress[ex.id].status !== 'correct') {
      const workingInput = document.getElementById('working-input');
      const userWorking = workingInput ? workingInput.value.trim() : '';
      saveProgress(ex.id, { status: 'incorrect', hintUsed: true, working: userWorking });
    }
    document.getElementById('feedback-area').innerHTML = `
      <div class="feedback-box hint">
        <strong>Answer: ${renderCIE(ex.answer)}</strong>
        ${renderCIE(ex.explanation)}
        <span class="law-tag">${ex.lawUsed}</span>
      </div>`;
    const input = document.getElementById('answer-input');
    if (input) { input.value = toCIEText(ex.answer); input.disabled = true; }
    const workingInput = document.getElementById('working-input');
    if (workingInput) workingInput.disabled = true;
  },

  next() {
    if (currentExerciseIndex < filteredExercises.length - 1) {
      currentExerciseIndex++;
      this.renderExercise();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  prev() {
    if (currentExerciseIndex > 0) {
      currentExerciseIndex--;
      this.renderExercise();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
};



// ══════════════════════════════════════════
//  TEACHER DASHBOARD — Full Analytics
// ══════════════════════════════════════════
const Teacher = {

  selectedStudent: null,
  workingFilter: 'all',

  render() {
    this.renderEmailList();
    this.renderClassOverview();
    this.renderClassBarChart();
    this.renderStudentList();
    if (this.selectedStudent) {
      this.selectStudent(this.selectedStudent);
    } else {
      this.renderClassDetailPanel();
      this.renderHeatmapAggregate();
      this.renderSuggestions();
    }
  },

  _getAllStudents() {
    const roster = JSON.parse(localStorage.getItem('ba_roster') || '[]');
    return roster.map(uid => {
      const progress = getProgress(uid);
      if (!progress) return null;
      const exercises = progress.exercises || {};
      const attempted = Object.keys(exercises).length;
      const correct = Object.values(exercises).filter(e => e.status === 'correct').length;
      const hints = Object.values(exercises).filter(e => e.hintUsed).length;
      const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
      return { uid, progress, exercises, attempted, correct, hints, accuracy };
    }).filter(Boolean);
  },

  // ── Class Overview Stats ──
  renderClassOverview() {
    const students = this._getAllStudents();
    const total = students.length;
    const grid = document.getElementById('class-overview-grid');
    if (!grid) return;

    if (total === 0) {
      grid.innerHTML = '<div class="stat-card" style="grid-column:1/-1;text-align:center;padding:40px;"><div style="font-size:2rem;margin-bottom:12px;">📭</div><div style="font-size:1rem;font-weight:600;color:var(--text-secondary);">No student data yet</div><p style="font-size:0.85rem;color:var(--text-muted);margin-top:6px;">Students will appear once they log in and attempt exercises. You can also generate demo data.</p></div>';
      return;
    }

    const avgAccuracy = Math.round(students.reduce((s, st) => s + st.accuracy, 0) / total);
    const avgAttempted = Math.round(students.reduce((s, st) => s + st.attempted, 0) / total);
    const atRisk = students.filter(s => s.attempted >= 3 && s.accuracy < 40).length;
    const strong = students.filter(s => s.attempted >= 10 && s.accuracy >= 80).length;
    const totalHints = students.reduce((s, st) => s + st.hints, 0);

    grid.innerHTML = `
      <div class="stat-card"><div class="stat-label">Students</div><div class="stat-value">${total}</div></div>
      <div class="stat-card"><div class="stat-label">Avg. Accuracy</div><div class="stat-value">${avgAccuracy}<span class="stat-unit">%</span></div><div class="stat-bar"><div class="stat-bar-fill blue" style="width:${avgAccuracy}%"></div></div></div>
      <div class="stat-card"><div class="stat-label">Avg. Completed</div><div class="stat-value">${avgAttempted} <span class="stat-unit">/ ${EXERCISES.length}</span></div><div class="stat-bar"><div class="stat-bar-fill sky" style="width:${(avgAttempted/EXERCISES.length)*100}%"></div></div></div>
      <div class="stat-card"><div class="stat-label">At Risk</div><div class="stat-value" style="color:${atRisk > 0 ? 'var(--error)' : 'var(--success)'}">${atRisk}</div><div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px;">&lt;40% accuracy, 3+ attempts</div></div>
      <div class="stat-card"><div class="stat-label">Excelling</div><div class="stat-value" style="color:var(--success)">${strong}</div><div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px;">≥80% accuracy, 10+ attempts</div></div>
      <div class="stat-card"><div class="stat-label">Total Hints Used</div><div class="stat-value">${totalHints}</div></div>`;
  },

  // ── Class Bar Chart ──
  renderClassBarChart() {
    const canvas = document.getElementById('class-bar-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const students = this._getAllStudents();
    const categories = Object.entries(CATEGORIES);

    const barData = categories.map(([key, meta]) => {
      const catExercises = EXERCISES.filter(e => e.category === key);
      if (students.length === 0 || catExercises.length === 0) return { label: meta.name, pct: 0, count: 0 };
      let totalPct = 0, count = 0;
      students.forEach(st => {
        const cc = catExercises.filter(e => st.exercises[e.id]?.status === 'correct').length;
        const ca = catExercises.filter(e => st.exercises[e.id]).length;
        if (ca > 0) { totalPct += (cc / ca) * 100; count++; }
      });
      return { label: meta.name, pct: count > 0 ? Math.round(totalPct / count) : 0, count };
    });

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement.clientWidth || 700;
    const h = 280;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);

    const mL = 40, mR = 20, mT = 20, mB = 60;
    const cW = w - mL - mR, cH = h - mT - mB;
    const gap = 8, barW = Math.min(50, (cW - gap * (barData.length - 1)) / barData.length);
    const totalBW = barW * barData.length + gap * (barData.length - 1);
    const offX = mL + (cW - totalBW) / 2;

    ctx.strokeStyle = '#E2E4F0'; ctx.lineWidth = 1;
    ctx.font = '11px DM Sans, sans-serif'; ctx.fillStyle = '#8B8FA8'; ctx.textAlign = 'right';
    for (let p = 0; p <= 100; p += 25) {
      const y = mT + cH - (p / 100) * cH;
      ctx.beginPath(); ctx.moveTo(mL, y); ctx.lineTo(w - mR, y); ctx.stroke();
      ctx.fillText(p + '%', mL - 6, y + 4);
    }

    barData.forEach((d, i) => {
      const x = offX + i * (barW + gap), barH = (d.pct / 100) * cH, y = mT + cH - barH;
      let color = d.pct >= 70 ? '#22C55E' : d.pct >= 40 ? '#F59E0B' : '#EF4444';
      if (d.count === 0) color = '#E2E4F0';
      ctx.fillStyle = color;
      ctx.beginPath();
      const rad = 4;
      ctx.moveTo(x + rad, y); ctx.lineTo(x + barW - rad, y); ctx.quadraticCurveTo(x + barW, y, x + barW, y + rad);
      ctx.lineTo(x + barW, mT + cH); ctx.lineTo(x, mT + cH); ctx.lineTo(x, y + rad); ctx.quadraticCurveTo(x, y, x + rad, y);
      ctx.fill();
      ctx.fillStyle = '#0D1033'; ctx.textAlign = 'center'; ctx.font = 'bold 11px DM Sans, sans-serif';
      ctx.fillText(d.pct + '%', x + barW / 2, y - 6);
      ctx.font = '10px DM Sans, sans-serif'; ctx.fillStyle = '#8B8FA8';
      const shortLabel = d.label.split(' ')[0].substring(0, 8);
      ctx.save(); ctx.translate(x + barW / 2, mT + cH + 12); ctx.rotate(-0.4); ctx.textAlign = 'right'; ctx.fillText(shortLabel, 0, 0); ctx.restore();
    });
  },

  // ── Student List ──
  renderStudentList() {
    const students = this._getAllStudents();
    const container = document.getElementById('student-list');
    const badge = document.getElementById('student-count-badge');
    if (badge) badge.textContent = students.length;

    if (students.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:32px 16px;"><div class="empty-icon">📭</div><h3>No students yet</h3><p>Students appear once they log in and attempt exercises.</p></div>';
      return;
    }

    const searchTerm = (document.getElementById('student-search')?.value || '').toLowerCase();
    let filtered = students.filter(st => {
      const name = ((st.progress.firstName || '') + ' ' + (st.progress.email || '')).toLowerCase();
      return name.includes(searchTerm);
    });

    const sortBy = document.getElementById('student-sort')?.value || 'name';
    filtered.sort((a, b) => {
      if (sortBy === 'name') return (a.progress.firstName || '').localeCompare(b.progress.firstName || '');
      if (sortBy === 'accuracy-desc') return b.accuracy - a.accuracy;
      if (sortBy === 'accuracy-asc') return a.accuracy - b.accuracy;
      if (sortBy === 'attempted-desc') return b.attempted - a.attempted;
      if (sortBy === 'recent') return (b.progress.lastActive || '').localeCompare(a.progress.lastActive || '');
      return 0;
    });

    container.innerHTML = filtered.map(st => {
      const initials = (st.progress.firstName || st.uid)[0].toUpperCase();
      let scoreClass = 'score-mid';
      if (st.accuracy >= 70) scoreClass = 'score-high';
      else if (st.accuracy < 40 && st.attempted > 0) scoreClass = 'score-low';
      let lastActive = '';
      if (st.progress.lastActive) {
        const mins = Math.floor((Date.now() - new Date(st.progress.lastActive).getTime()) / 60000);
        if (mins < 1) lastActive = 'just now'; else if (mins < 60) lastActive = mins + 'm ago';
        else if (mins < 1440) lastActive = Math.floor(mins / 60) + 'h ago'; else lastActive = Math.floor(mins / 1440) + 'd ago';
      }
      return `<div class="student-row ${this.selectedStudent === st.uid ? 'selected' : ''}" onclick="Teacher.selectStudent('${st.uid}')"><div class="student-avatar-sm">${initials}</div><div class="student-info"><div class="student-name">${st.progress.firstName || st.uid} <span class="student-email">${st.progress.email || ''}</span></div><div class="student-stats-mini">${st.attempted}/${EXERCISES.length} done · ${st.correct} correct${lastActive ? ' · <span class="student-last-active">' + lastActive + '</span>' : ''}</div></div><span class="student-score-badge ${scoreClass}">${st.accuracy}%</span></div>`;
    }).join('');
  },

  filterStudents() { this.renderStudentList(); },

  // ── Class Detail Panel ──
  renderClassDetailPanel() {
    document.getElementById('detail-card-title').innerHTML = '📊 Class Overview';
    const students = this._getAllStudents();
    if (students.length === 0) {
      document.getElementById('teacher-detail-content').innerHTML = '<div class="empty-state" style="padding:24px 16px;"><div class="empty-icon">📊</div><h3>No data yet</h3><p>Analytics will appear once students begin practising.</p></div>';
      return;
    }

    let catRows = '';
    for (const [key, meta] of Object.entries(CATEGORIES)) {
      const catEx = EXERCISES.filter(e => e.category === key);
      let tp = 0, c = 0;
      students.forEach(st => { const ca = catEx.filter(e => st.exercises[e.id]).length; const cc = catEx.filter(e => st.exercises[e.id]?.status === 'correct').length; if (ca > 0) { tp += (cc / ca) * 100; c++; } });
      const avg = c > 0 ? Math.round(tp / c) : 0;
      const bc = avg >= 70 ? 'var(--success)' : avg >= 40 ? 'var(--warning)' : 'var(--error)';
      catRows += `<div class="class-cat-row"><span class="class-cat-icon">${meta.icon}</span><span class="class-cat-name">${meta.name}</span><div class="class-cat-bar"><div class="class-cat-bar-fill" style="width:${avg}%;background:${bc};"></div></div><span class="class-cat-pct">${avg}%</span></div>`;
    }

    const sorted = [...students].sort((a, b) => a.accuracy - b.accuracy);
    const atRiskList = sorted.filter(s => s.attempted >= 2).slice(0, 5);
    let atRiskHTML = atRiskList.length > 0
      ? atRiskList.map(st => `<div class="at-risk-row" onclick="Teacher.selectStudent('${st.uid}')"><span class="at-risk-name">${st.progress.firstName}</span><span class="at-risk-stat">${st.accuracy}% (${st.attempted} done)</span></div>`).join('')
      : '<p style="font-size:0.85rem;color:var(--text-muted);">No at-risk students identified yet.</p>';

    document.getElementById('teacher-detail-content').innerHTML = `<div class="class-detail-section"><h4>Topic Accuracy (Class Average)</h4>${catRows}</div><div class="class-detail-section"><h4>⚠ Students Needing Support</h4><p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px;">Lowest-performing students — click to view details.</p>${atRiskHTML}</div>`;
  },

  // ── Select / Deselect Student ──
  selectStudent(uid) {
    this.selectedStudent = uid;
    this.renderStudentList();
    this.renderStudentDetail(uid);
    this.renderHeatmapStudent(uid);
    this.renderWorkingViewer(uid);
    this.renderSuggestions(uid);
    const p = getProgress(uid);
    document.getElementById('heatmap-student-name').textContent = (p?.firstName || uid);
    document.getElementById('heatmap-mode-label').textContent = 'Green = correct, red = incorrect, amber = hint used.';
    document.getElementById('suggestion-target').textContent = (p?.firstName || uid);

    // Move suggestions above the working viewer
    const suggBox = document.getElementById('suggestion-box');
    const anchor = document.getElementById('student-suggestion-anchor');
    if (suggBox && anchor) anchor.after(suggBox);

    document.getElementById('teacher-detail-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  deselectStudent() {
    this.selectedStudent = null;
    document.getElementById('working-viewer-card').style.display = 'none';

    // Move suggestions back above class topic performance
    const suggBox = document.getElementById('suggestion-box');
    const anchor = document.getElementById('class-suggestion-anchor');
    if (suggBox && anchor) {
      // Insert after class-overview-grid (before class topic performance)
      const overviewGrid = document.getElementById('class-overview-grid');
      if (overviewGrid) overviewGrid.after(suggBox);
    }

    this.render();
    document.getElementById('heatmap-mode-label').textContent = 'Colour intensity shows how many students answered correctly.';
    document.getElementById('suggestion-target').textContent = 'Class Overview';
  },

  // ── Student Detail ──
  renderStudentDetail(uid) {
    const progress = getProgress(uid);
    if (!progress) return;
    const exercises = progress.exercises || {};
    const attempted = Object.keys(exercises).length;
    const correct = Object.values(exercises).filter(e => e.status === 'correct').length;
    const hintCount = Object.values(exercises).filter(e => e.hintUsed).length;
    const incorrect = Object.values(exercises).filter(e => e.status === 'incorrect').length;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

    let catBreakdown = '';
    for (const [key, meta] of Object.entries(CATEGORIES)) {
      const catEx = EXERCISES.filter(e => e.category === key);
      const cc = catEx.filter(e => exercises[e.id]?.status === 'correct').length;
      const ca = catEx.filter(e => exercises[e.id]).length;
      const cp = ca > 0 ? Math.round((cc / ca) * 100) : 0;
      const bc = cp >= 70 ? 'var(--success)' : cp >= 40 ? 'var(--warning)' : ca === 0 ? 'var(--border)' : 'var(--error)';
      catBreakdown += `<div class="class-cat-row"><span class="class-cat-icon">${meta.icon}</span><span class="class-cat-name">${meta.name}</span><div class="class-cat-bar"><div class="class-cat-bar-fill" style="width:${ca > 0 ? cp : 0}%;background:${bc};"></div></div><span class="class-cat-pct">${cc}/${catEx.length}</span></div>`;
    }

    const diffBreakdown = [1,2,3].map(d => {
      const label = d === 1 ? 'Easy' : d === 2 ? 'Medium' : 'Hard';
      const dE = EXERCISES.filter(e => e.difficulty === d);
      const dC = dE.filter(e => exercises[e.id]?.status === 'correct').length;
      return `<span><strong>${label}:</strong> ${dC}/${dE.length} (${dE.length > 0 ? Math.round((dC / dE.length) * 100) : 0}%)</span>`;
    }).join(' &nbsp;·&nbsp; ');

    let lastActive = 'Never';
    if (progress.lastActive) lastActive = new Date(progress.lastActive).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    document.getElementById('detail-card-title').innerHTML = `📊 ${progress.firstName} <span style="font-weight:400;font-size:0.78rem;color:var(--text-muted);">${progress.email || ''}</span> <button class="btn btn-secondary btn-sm" style="margin-left:auto;font-size:0.72rem;" onclick="Teacher.deselectStudent()">← Back to Class</button>`;

    document.getElementById('teacher-detail-content').innerHTML = `
      <div class="student-detail">
        <div class="student-detail-stats">
          <div class="sd-stat"><div class="sd-stat-val" style="color:var(--navy);">${attempted}</div><div class="sd-stat-label">Attempted</div></div>
          <div class="sd-stat"><div class="sd-stat-val" style="color:var(--success);">${correct}</div><div class="sd-stat-label">Correct</div></div>
          <div class="sd-stat"><div class="sd-stat-val" style="color:var(--error);">${incorrect}</div><div class="sd-stat-label">Incorrect</div></div>
          <div class="sd-stat"><div class="sd-stat-val" style="color:var(--blue);">${accuracy}%</div><div class="sd-stat-label">Accuracy</div></div>
          <div class="sd-stat"><div class="sd-stat-val" style="color:var(--warning);">${hintCount}</div><div class="sd-stat-label">Hints</div></div>
        </div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:16px;">Last active: ${lastActive}</div>
        <div class="detail-section"><h4>Topic Breakdown</h4>${catBreakdown}</div>
        <div class="detail-section"><h4>Difficulty Breakdown</h4><p class="diff-breakdown">${diffBreakdown}</p></div>
        <div class="detail-section" style="margin-bottom:0;"><h4>Understanding Radar</h4><div class="chart-container"><canvas id="radar-chart"></canvas></div></div>
        <div style="margin-top:16px;"><button class="btn btn-secondary btn-sm" onclick="Teacher.removeStudent('${uid}')">🗑 Remove Student</button></div>
      </div>`;
    this.drawRadarChart(uid);
  },

  drawRadarChart(uid) {
    const canvas = document.getElementById('radar-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const progress = getProgress(uid);
    const exercises = progress?.exercises || {};
    const labels = [], data = [];
    for (const [key, meta] of Object.entries(CATEGORIES)) {
      labels.push(meta.name.split(' ')[0]);
      const ce = EXERCISES.filter(e => e.category === key);
      const cc = ce.filter(e => exercises[e.id]?.status === 'correct').length;
      data.push(ce.length > 0 ? (cc / ce.length) * 100 : 0);
    }
    const size = 320, dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);
    const cx = size / 2, cy = size / 2, r = 120, n = labels.length;
    const step = (Math.PI * 2) / n, start = -Math.PI / 2;
    ctx.clearRect(0, 0, size, size);
    for (let ring = 1; ring <= 4; ring++) { const rr = (r * ring) / 4; ctx.beginPath(); for (let i = 0; i <= n; i++) { const a = start + step * i, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.closePath(); ctx.strokeStyle = '#E2E4F0'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.font = '10px DM Sans, sans-serif'; ctx.fillStyle = '#8B8FA8'; ctx.textAlign = 'center';
    for (let i = 0; i < n; i++) { const a = start + step * i; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.strokeStyle = '#E2E4F0'; ctx.stroke(); ctx.fillText(labels[i], cx + Math.cos(a) * (r + 18), cy + Math.sin(a) * (r + 18) + 3); }
    ctx.beginPath(); for (let i = 0; i < n; i++) { const a = start + step * i, v = data[i] / 100; const x = cx + Math.cos(a) * r * v, y = cy + Math.sin(a) * r * v; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.closePath(); ctx.fillStyle = 'rgba(84,120,255,0.18)'; ctx.fill(); ctx.strokeStyle = '#5478FF'; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < n; i++) { const a = start + step * i, v = data[i] / 100; const x = cx + Math.cos(a) * r * v, y = cy + Math.sin(a) * r * v; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = '#5478FF'; ctx.fill(); ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2; ctx.stroke(); }
  },

  // ── Working Viewer ──
  renderWorkingViewer(uid) {
    const card = document.getElementById('working-viewer-card');
    const list = document.getElementById('working-viewer-list');
    if (!card || !list) return;
    const progress = getProgress(uid);
    if (!progress) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    document.getElementById('working-viewer-name').textContent = (progress.firstName || uid);

    const exercises = progress.exercises || {};
    const attempted = Object.entries(exercises).map(([id, d]) => ({ id: parseInt(id), ...d, exercise: EXERCISES.find(e => e.id === parseInt(id)) })).filter(e => e.exercise).sort((a, b) => a.id - b.id);

    let filtered = attempted;
    if (this.workingFilter === 'correct') filtered = attempted.filter(e => e.status === 'correct');
    else if (this.workingFilter === 'incorrect') filtered = attempted.filter(e => e.status === 'incorrect');
    else if (this.workingFilter === 'hint') filtered = attempted.filter(e => e.hintUsed);

    if (filtered.length === 0) { list.innerHTML = '<p style="padding:16px;color:var(--text-muted);font-size:0.88rem;">No exercises match this filter.</p>'; return; }

    list.innerHTML = filtered.map(e => {
      const si = e.status === 'correct' ? '✓' : '✗';
      const sc = e.status === 'correct' ? 'correct' : 'incorrect';
      const wHTML = e.working ? '<div class="wv-working">' + renderTypedWorking(e.working) + '</div>' : '<div class="wv-no-working">No working recorded</div>';
      return `<div class="wv-item"><div class="wv-header"><span class="wv-status ${sc}">${si}</span><span class="wv-title">#${e.id}: ${e.exercise.title}</span>${e.hintUsed ? '<span class="wv-hint-tag">hint used</span>' : ''}<span class="wv-attempts">${e.attempts || 1} attempt${(e.attempts || 1) > 1 ? 's' : ''}</span></div><div class="wv-expression">${renderCIE(e.exercise.expression)}</div>${wHTML}<div class="wv-answer">Expected: <strong>${renderCIE(e.exercise.answer)}</strong></div></div>`;
    }).join('');
  },

  filterWorking(filter) {
    this.workingFilter = filter;
    document.querySelectorAll('#working-viewer-card .filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    if (this.selectedStudent) this.renderWorkingViewer(this.selectedStudent);
  },

  // ── Heatmap ──
  renderHeatmapAggregate() {
    const grid = document.getElementById('heatmap-grid');
    if (!grid) return;
    const students = this._getAllStudents();
    const total = students.length;
    document.getElementById('heatmap-student-name').textContent = 'Class Aggregate';
    grid.innerHTML = '';
    for (let i = 1; i <= 100; i++) {
      const ex = EXERCISES.find(e => e.id === i);
      let cc = 0, ac = 0;
      students.forEach(st => { if (st.exercises[i]) { ac++; if (st.exercises[i].status === 'correct') cc++; } });
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      if (total === 0 || ac === 0) { cell.classList.add('not-attempted'); cell.title = ex ? `#${i}: ${ex.title} — not attempted` : `#${i}`; }
      else { const p = cc / total; cell.style.background = `rgb(${Math.round(239 - p * 205)},${Math.round(68 + p * 129)},${Math.round(68 + p * 26)})`; cell.title = ex ? `#${i}: ${ex.title} — ${cc}/${total} correct (${Math.round(p*100)}%)` : `#${i}`; }
      cell.addEventListener('mouseenter', () => { const t = document.getElementById('tooltip'); t.textContent = cell.title; t.classList.add('show'); const rect = cell.getBoundingClientRect(); t.style.left = rect.left + rect.width/2 - t.offsetWidth/2 + 'px'; t.style.top = rect.top - t.offsetHeight - 8 + 'px'; });
      cell.addEventListener('mouseleave', () => { document.getElementById('tooltip').classList.remove('show'); });
      grid.appendChild(cell);
    }
  },

  renderHeatmapStudent(uid) {
    const grid = document.getElementById('heatmap-grid');
    if (!grid) return;
    const exercises = getProgress(uid)?.exercises || {};
    grid.innerHTML = '';
    for (let i = 1; i <= 100; i++) {
      const ex = EXERCISES.find(e => e.id === i);
      const exP = exercises[i];
      let cls = 'not-attempted';
      if (exP) { cls = exP.status === 'correct' ? 'correct' : exP.hintUsed ? 'hint-used' : 'incorrect'; }
      const cell = document.createElement('div');
      cell.className = `heatmap-cell ${cls}`;
      cell.title = ex ? `#${i}: ${ex.title} (${cls.replace('_',' ')})` : `#${i}`;
      cell.addEventListener('mouseenter', () => { const t = document.getElementById('tooltip'); t.textContent = cell.title; t.classList.add('show'); const rect = cell.getBoundingClientRect(); t.style.left = rect.left + rect.width/2 - t.offsetWidth/2 + 'px'; t.style.top = rect.top - t.offsetHeight - 8 + 'px'; });
      cell.addEventListener('mouseleave', () => { document.getElementById('tooltip').classList.remove('show'); });
      grid.appendChild(cell);
    }
  },

  // ── Suggestions ──
  renderSuggestions(uid) {
    const container = document.getElementById('suggestion-content');
    if (!container) return;
    if (!uid) {
      document.getElementById('suggestion-target').textContent = 'Class Overview';
      const students = this._getAllStudents();
      if (students.length === 0) { container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">No data yet.</p>'; return; }
      const suggestions = [];
      for (const [key, meta] of Object.entries(CATEGORIES)) {
        const ce = EXERCISES.filter(e => e.category === key);
        let tp = 0, c = 0;
        students.forEach(st => { const ca = ce.filter(e => st.exercises[e.id]).length; const cc = ce.filter(e => st.exercises[e.id]?.status === 'correct').length; if (ca > 0) { tp += (cc / ca) * 100; c++; } });
        const avg = c > 0 ? Math.round(tp / c) : -1;
        if (avg >= 0 && avg < 40) suggestions.push({ priority: 'high', text: `Class struggling with <strong>${meta.name}</strong> (${avg}% avg). Re-teach with worked examples.` });
        else if (avg >= 40 && avg < 60) suggestions.push({ priority: 'medium', text: `<strong>${meta.name}</strong> moderate (${avg}%). Revision session recommended.` });
        const notStarted = students.filter(st => ce.every(e => !st.exercises[e.id])).length;
        if (notStarted > students.length * 0.5 && students.length >= 3) suggestions.push({ priority: 'medium', text: `${notStarted}/${students.length} haven't started <strong>${meta.name}</strong>. Assign as homework.` });
      }
      const atRisk = students.filter(s => s.attempted >= 3 && s.accuracy < 40);
      if (atRisk.length > 0) suggestions.push({ priority: 'high', text: `<strong>${atRisk.length} at-risk student${atRisk.length > 1 ? 's' : ''}</strong>: ${atRisk.map(s => s.progress.firstName).join(', ')}. Consider targeted intervention.` });
      const lowEng = students.filter(s => s.attempted < 5);
      if (lowEng.length > students.length * 0.4 && students.length >= 3) suggestions.push({ priority: 'medium', text: `${lowEng.length} students completed &lt;5 exercises. Set minimum weekly targets.` });
      suggestions.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]));
      container.innerHTML = suggestions.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;">No class concerns. Select a student for individual analysis.</p>' : suggestions.map(s => `<div class="suggestion-item"><span class="priority ${s.priority}">${s.priority}</span> ${s.text}</div>`).join('');
      return;
    }
    document.getElementById('suggestion-target').textContent = (getProgress(uid)?.firstName || uid);
    const progress = getProgress(uid), exercises = progress?.exercises || {}, name = progress?.firstName || uid;
    const suggestions = [];
    for (const [key, meta] of Object.entries(CATEGORIES)) {
      const ce = EXERCISES.filter(e => e.category === key), ca = ce.filter(e => exercises[e.id]), cc = ce.filter(e => exercises[e.id]?.status === 'correct'), ch = ce.filter(e => exercises[e.id]?.hintUsed);
      const p = ca.length > 0 ? (cc.length / ca.length) * 100 : -1, comp = (ca.length / ce.length) * 100;
      if (ca.length === 0) { suggestions.push({ priority: 'medium', text: `${name} hasn't started <strong>${meta.name}</strong>.` }); continue; }
      if (p < 40 && ca.length >= 3) suggestions.push({ priority: 'high', text: `${name} struggling with <strong>${meta.name}</strong> (${Math.round(p)}%). Truth-table review needed.` });
      else if (p < 65 && ca.length >= 2) suggestions.push({ priority: 'medium', text: `${name} partial on <strong>${meta.name}</strong> (${Math.round(p)}%). Conceptual or notational?` });
      if (ch.length > ca.length * 0.6 && ca.length >= 3) suggestions.push({ priority: 'medium', text: `${name} hint-reliant on <strong>${meta.name}</strong> (${ch.length}/${ca.length}). Scaffolded practice.` });
      if (p >= 80 && comp >= 60) suggestions.push({ priority: 'low', text: `${name} strong in <strong>${meta.name}</strong> (${Math.round(p)}%). Extend or peer tutor.` });
    }
    [1,2,3].forEach(d => { const l = d === 1 ? 'Easy' : d === 2 ? 'Medium' : 'Hard'; const de = EXERCISES.filter(e => e.difficulty === d), da = de.filter(e => exercises[e.id]), dc = de.filter(e => exercises[e.id]?.status === 'correct'); const p = da.length > 0 ? (dc.length / da.length) * 100 : -1; if (d === 1 && p >= 0 && p < 50 && da.length >= 3) suggestions.push({ priority: 'high', text: `${name} struggles with <strong>${l}</strong> (${Math.round(p)}%). Foundations needed.` }); if (d === 3 && p >= 70 && da.length >= 5) suggestions.push({ priority: 'low', text: `${name} handles <strong>Hard</strong> well (${Math.round(p)}%). Ready for past papers.` }); });
    const ta = Object.keys(exercises).length, tc = Object.values(exercises).filter(e => e.status === 'correct').length;
    if (ta >= 20 && (tc / ta) >= 0.8) suggestions.push({ priority: 'low', text: `Overall strong (${Math.round((tc/ta)*100)}%). Timed CIE practice.` });
    if (ta > 0 && ta < 10) suggestions.push({ priority: 'medium', text: `${name} only ${ta} exercises attempted. Encourage regular practice.` });
    suggestions.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]));
    container.innerHTML = suggestions.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;">Not enough data yet.</p>' : suggestions.map(s => `<div class="suggestion-item"><span class="priority ${s.priority}">${s.priority}</span> ${s.text}</div>`).join('');
  },

  // ── Utilities ──
  removeStudent(uid) {
    if (!confirm(`Remove ${getProgress(uid)?.firstName || uid}? Progress data will be deleted.`)) return;
    localStorage.removeItem(`ba_progress_${uid}`);
    const roster = JSON.parse(localStorage.getItem('ba_roster') || '[]');
    localStorage.setItem('ba_roster', JSON.stringify(roster.filter(u => u !== uid)));
    this.selectedStudent = null; showToast('Student removed.', 'info'); this.render();
  },

  async resetTeacherPassword() {
    const newPw = prompt('Enter your new teacher password:');
    if (!newPw || newPw.length < 4) {
      showToast('Password must be at least 4 characters.', 'error');
      return;
    }
    const confirm2 = prompt('Confirm your new password:');
    if (newPw !== confirm2) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    const teacherPasswords = JSON.parse(localStorage.getItem('ba_teacher_passwords') || '{}');
    const emailKey = currentUser.email.replace(/[^a-z0-9]/g, '_');
    teacherPasswords[emailKey] = await hashPassword(newPw);
    localStorage.setItem('ba_teacher_passwords', JSON.stringify(teacherPasswords));
    showToast('Password updated successfully.', 'success');
  },

  exportAllData() {
    const roster = JSON.parse(localStorage.getItem('ba_roster') || '[]');
    const allData = {}; roster.forEach(uid => { const p = getProgress(uid); if (p) allData[uid] = p; });
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
    a.download = `boolean-mastery-class-data-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url); showToast('Class data exported.', 'success');
  },

  importData(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { try { const data = JSON.parse(e.target.result); const roster = JSON.parse(localStorage.getItem('ba_roster') || '[]'); let count = 0; for (const [uid, progress] of Object.entries(data)) { localStorage.setItem(`ba_progress_${uid}`, JSON.stringify(progress)); if (!roster.includes(uid)) roster.push(uid); count++; } localStorage.setItem('ba_roster', JSON.stringify(roster)); showToast(`Imported ${count} student(s).`, 'success'); this.render(); } catch (err) { showToast('Invalid file.', 'error'); } };
    reader.readAsText(file); event.target.value = '';
  },

  generateDemoData() {
    if (!confirm('Generate 10 demo students with varied progress? This showcases the full range of teacher dashboard analytics.')) return;

    /* ── Student Profiles ──
       Each student has a distinct learning profile so the teacher
       dashboard shows the full scope of analytics:
       - At-risk students (low accuracy, many attempts)
       - Excelling students (high accuracy, many completed)
       - New / low engagement students (very few exercises)
       - Hint-reliant students
       - Students strong in some topics, weak in others
       - Recently active vs inactive students
    */
    const profiles = [
      {
        email: 'emma.watson@student.cga.school',
        // TOP PERFORMER — high accuracy across all topics, many completed, rarely uses hints
        numExercises: 85, baseAccuracy: 0.92, hintRate: 0.05, daysAgo: 0.2,
        strengths: { de_morgan: 0.95, distributive: 0.90, absorption: 0.95, identity_null: 0.98,
          commutative_associative: 0.97, inverse_complement: 0.96, double_negation: 0.99, multi_step: 0.85, cie_exam: 0.82 },
        working: true
      },
      {
        email: 'james.liu@student.cga.school',
        // AT RISK — low accuracy, struggles especially with De Morgan and multi-step
        numExercises: 42, baseAccuracy: 0.30, hintRate: 0.6, daysAgo: 1,
        strengths: { de_morgan: 0.18, distributive: 0.35, absorption: 0.40, identity_null: 0.55,
          commutative_associative: 0.50, inverse_complement: 0.45, double_negation: 0.60, multi_step: 0.12, cie_exam: 0.10 },
        working: true
      },
      {
        email: 'sophie.taylor@student.cga.school',
        // GOOD BUT HINT-RELIANT — decent accuracy but uses hints on almost everything
        numExercises: 60, baseAccuracy: 0.72, hintRate: 0.75, daysAgo: 0.5,
        strengths: { de_morgan: 0.70, distributive: 0.75, absorption: 0.80, identity_null: 0.85,
          commutative_associative: 0.80, inverse_complement: 0.78, double_negation: 0.90, multi_step: 0.55, cie_exam: 0.50 },
        working: true
      },
      {
        email: 'oliver.khan@student.cga.school',
        // BARELY STARTED — very low engagement, only 4 exercises done
        numExercises: 4, baseAccuracy: 0.50, hintRate: 0.25, daysAgo: 5,
        strengths: { de_morgan: 0.50, distributive: 0.50, absorption: 0.50, identity_null: 0.50,
          commutative_associative: 0.50, inverse_complement: 0.50, double_negation: 0.50, multi_step: 0.50, cie_exam: 0.50 },
        working: false
      },
      {
        email: 'mia.patel@student.cga.school',
        // STRONG ON BASICS, WEAK ON ADVANCED — great at simple laws, collapses on multi-step/exam
        numExercises: 55, baseAccuracy: 0.65, hintRate: 0.3, daysAgo: 1.5,
        strengths: { de_morgan: 0.50, distributive: 0.55, absorption: 0.90, identity_null: 0.95,
          commutative_associative: 0.95, inverse_complement: 0.90, double_negation: 0.95, multi_step: 0.20, cie_exam: 0.15 },
        working: true
      },
      {
        email: 'noah.smith@student.cga.school',
        // AVERAGE STUDENT — middle of the road on everything
        numExercises: 38, baseAccuracy: 0.55, hintRate: 0.35, daysAgo: 2,
        strengths: { de_morgan: 0.55, distributive: 0.55, absorption: 0.60, identity_null: 0.65,
          commutative_associative: 0.60, inverse_complement: 0.55, double_negation: 0.70, multi_step: 0.40, cie_exam: 0.35 },
        working: true
      },
      {
        email: 'ava.chen@student.cga.school',
        // RAPID IMPROVER — started weak but recent exercises are mostly correct
        // Simulated by making early exercises wrong, later ones right
        numExercises: 50, baseAccuracy: 0.68, hintRate: 0.2, daysAgo: 0.3,
        strengths: { de_morgan: 0.75, distributive: 0.70, absorption: 0.80, identity_null: 0.85,
          commutative_associative: 0.80, inverse_complement: 0.75, double_negation: 0.90, multi_step: 0.55, cie_exam: 0.45 },
        improving: true, working: true
      },
      {
        email: 'liam.brown@student.cga.school',
        // INACTIVE — hasn't logged in for 2 weeks, moderate progress before that
        numExercises: 25, baseAccuracy: 0.60, hintRate: 0.3, daysAgo: 14,
        strengths: { de_morgan: 0.60, distributive: 0.55, absorption: 0.65, identity_null: 0.70,
          commutative_associative: 0.65, inverse_complement: 0.60, double_negation: 0.75, multi_step: 0.40, cie_exam: 0.30 },
        working: true
      },
      {
        email: 'zara.ahmed@student.cga.school',
        // EXAM SPECIALIST — strong on CIE exam and multi-step but skips basic topics
        numExercises: 45, baseAccuracy: 0.70, hintRate: 0.15, daysAgo: 0.8,
        strengths: { de_morgan: 0.80, distributive: 0.75, absorption: 0.40, identity_null: 0.35,
          commutative_associative: 0.30, inverse_complement: 0.35, double_negation: 0.45, multi_step: 0.85, cie_exam: 0.82 },
        skipBasics: true, working: true
      },
      {
        email: 'finn.oconnor@student.cga.school',
        // PERFECTIONIST — only attempts exercises they're sure about, very high accuracy on few exercises
        numExercises: 18, baseAccuracy: 0.94, hintRate: 0.0, daysAgo: 3,
        strengths: { de_morgan: 0.95, distributive: 0.95, absorption: 0.95, identity_null: 0.98,
          commutative_associative: 0.98, inverse_complement: 0.95, double_negation: 0.99, multi_step: 0.90, cie_exam: 0.88 },
        working: true
      }
    ];

    const roster = JSON.parse(localStorage.getItem('ba_roster') || '[]');
    const whitelist = JSON.parse(localStorage.getItem('ba_email_whitelist') || '[]');

    profiles.forEach(profile => {
      const email = profile.email;
      const uid = email.replace(/[^a-z0-9]/g, '_');
      const displayName = nameFromEmail(email);

      if (!Whitelist.isApproved(email) && !whitelist.includes(email)) whitelist.push(email);
      if (roster.includes(uid)) return;
      roster.push(uid);

      const exercises = {};

      // Select which exercises this student attempts
      let selected;
      if (profile.skipBasics) {
        // Exam specialist — mostly picks hard/multi-step/CIE, few basics
        const hard = EXERCISES.filter(e => e.difficulty >= 2 || e.category === 'multi_step' || e.category === 'cie_exam');
        const easy = EXERCISES.filter(e => e.difficulty === 1 && e.category !== 'multi_step' && e.category !== 'cie_exam');
        selected = [...hard.sort(() => Math.random() - 0.5).slice(0, Math.min(profile.numExercises - 5, hard.length)),
                     ...easy.sort(() => Math.random() - 0.5).slice(0, 5)];
      } else {
        selected = [...EXERCISES].sort(() => Math.random() - 0.5).slice(0, profile.numExercises);
      }

      selected.forEach((ex, idx) => {
        let chance = profile.strengths[ex.category] || profile.baseAccuracy;

        // Difficulty penalty
        chance -= (ex.difficulty - 1) * 0.1;

        // Improving student: first half of exercises have lower accuracy
        if (profile.improving && idx < selected.length * 0.4) {
          chance -= 0.3;
        }

        chance = Math.max(0.05, Math.min(0.98, chance));
        const correct = Math.random() < chance;
        const hintUsed = !correct && Math.random() < profile.hintRate;

        // Generate working text
        let working = '';
        if (profile.working) {
          if (correct) {
            working = `= step 1 [${ex.lawUsed}]\n= ${toCIEText(ex.answer)}`;
          } else if (Math.random() < 0.6) {
            // Incorrect students sometimes still write working
            const wrongLaws = ['De Morgan', 'Distributive', 'Absorption', 'Complement', 'Identity'];
            working = `= tried [${wrongLaws[Math.floor(Math.random() * wrongLaws.length)]}]\n= stuck here`;
          }
        }

        // Timestamps spread across the student's activity period
        const daySpread = Math.max(profile.daysAgo, 1);
        const exerciseTime = Date.now() - (profile.daysAgo * 86400000) - (Math.random() * daySpread * 86400000);

        exercises[ex.id] = {
          status: correct ? 'correct' : 'incorrect',
          attempts: correct ? 1 : 1 + Math.floor(Math.random() * (profile.baseAccuracy < 0.4 ? 4 : 2)),
          hintUsed,
          working,
          timestamp: new Date(exerciseTime).toISOString()
        };
      });

      const lastActiveTime = Date.now() - profile.daysAgo * 86400000;

      localStorage.setItem(`ba_progress_${uid}`, JSON.stringify({
        userId: uid,
        firstName: displayName,
        email: email,
        exercises,
        startedAt: new Date(lastActiveTime - 14 * 86400000).toISOString(),
        lastActive: new Date(lastActiveTime).toISOString()
      }));
    });

    localStorage.setItem('ba_roster', JSON.stringify(roster));
    localStorage.setItem('ba_email_whitelist', JSON.stringify(whitelist));
    showToast('10 demo students generated with varied progress.', 'success');
    this.render();
  },

  // ══════════════════════════════════════════
  //  EMAIL WHITELIST MANAGEMENT
  // ══════════════════════════════════════════

  renderEmailList() {
    const allEmails = Whitelist.getAll();
    const badge = document.getElementById('email-count-badge');
    const list = document.getElementById('email-list');
    if (!badge || !list) return;

    badge.textContent = allEmails.length;

    if (allEmails.length === 0) {
      list.innerHTML = '<div class="email-empty">No approved emails yet. Add emails above, or commit a <code>data/whitelist.json</code> file to your GitHub repo.</div>';
      return;
    }

    const roster = JSON.parse(localStorage.getItem('ba_roster') || '[]');
    const activeUids = new Set(roster);

    list.innerHTML = allEmails.map(email => {
      const uid = email.replace(/[^a-z0-9]/g, '_');
      const isActive = activeUids.has(uid);
      const isServer = Whitelist.isFromServer(email);
      const sourceTag = isServer
        ? '<span class="email-source server" title="From data/whitelist.json on GitHub">shared</span>'
        : '<span class="email-source local" title="Added locally on this device only">local</span>';

      return `<div class="email-row">
        <span>${email}</span>
        <div class="email-row-actions">
          ${sourceTag}
          <span class="email-status ${isActive ? 'active' : 'pending'}">${isActive ? 'active' : 'pending'}</span>
          <button class="email-remove-btn" onclick="Teacher.removeEmail('${email}')" title="Remove student access">✕</button>
        </div>
      </div>`;
    }).join('');

    // Show removed server emails with restore option
    const removed = Whitelist.getRemovedServerEmails();
    if (removed.length > 0) {
      list.innerHTML += `<div class="email-removed-section"><div class="email-removed-label">Removed (from shared list):</div>` +
        removed.map(email => `<div class="email-row removed">
          <span>${email}</span>
          <div class="email-row-actions">
            <span class="email-source removed">removed</span>
            <button class="email-remove-btn restore" onclick="Teacher.restoreEmail('${email}')" title="Restore access">↩</button>
          </div>
        </div>`).join('') + '</div>';
    }
  },

  addEmail() {
    const input = document.getElementById('email-add-input');
    const email = (input.value || '').trim().toLowerCase();
    if (!email) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Invalid email format.', 'error');
      return;
    }

    if (!email.endsWith('@student.cga.school')) {
      showToast('Only @student.cga.school email addresses can be approved.', 'error');
      return;
    }

    if (Whitelist.isApproved(email)) {
      showToast('This email is already approved.', 'info');
      input.value = '';
      return;
    }

    // Clear any prior removal (restores server-sourced emails)
    Whitelist.restore(email);

    // Add to local list if not already a server email
    if (!Whitelist.isFromServer(email)) {
      const whitelist = JSON.parse(localStorage.getItem('ba_email_whitelist') || '[]');
      if (!whitelist.includes(email)) {
        whitelist.push(email);
        localStorage.setItem('ba_email_whitelist', JSON.stringify(whitelist));
      }
    }

    input.value = '';
    showToast(`${email} approved.`, 'success');
    this.renderEmailList();
  },

  removeEmail(email) {
    if (!confirm(`Remove ${email}? This student will no longer be able to log in.`)) return;
    Whitelist.remove(email);
    showToast(`${email} removed. Export whitelist.json to make this permanent.`, 'info');
    this.renderEmailList();
  },

  restoreEmail(email) {
    Whitelist.restore(email);
    showToast(`${email} restored.`, 'success');
    this.renderEmailList();
  },

  uploadEmails(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const allLines = text.replace(/,/g, '\n').split('\n').map(l => l.trim().toLowerCase()).filter(l => l.length > 0);
      const validEmails = allLines.filter(l => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l) && l.endsWith('@student.cga.school'));
      const rejected = allLines.length - validEmails.length;

      if (validEmails.length === 0) {
        showToast(`No valid @student.cga.school emails found.${rejected > 0 ? ` ${rejected} rejected.` : ''}`, 'error');
        return;
      }

      const whitelist = JSON.parse(localStorage.getItem('ba_email_whitelist') || '[]');
      let added = 0;
      validEmails.forEach(em => {
        if (!Whitelist.isApproved(em) && !whitelist.includes(em)) { whitelist.push(em); added++; }
      });

      localStorage.setItem('ba_email_whitelist', JSON.stringify(whitelist));
      let msg = `${added} new email${added !== 1 ? 's' : ''} approved (local).`;
      if (validEmails.length - added > 0) msg += ` ${validEmails.length - added} already existed.`;
      if (rejected > 0) msg += ` ${rejected} rejected (wrong domain).`;
      showToast(msg, 'success');
      this.renderEmailList();
    };
    reader.readAsText(file);
    event.target.value = '';
  },

  /** Export the FULL combined whitelist as data/whitelist.json — ready to commit to GitHub */
  exportEmails() {
    const allEmails = Whitelist.getAll();
    if (allEmails.length === 0) {
      showToast('No emails to export.', 'info');
      return;
    }

    const jsonContent = JSON.stringify({ emails: allEmails }, null, 2) + '\n';
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whitelist.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded whitelist.json — upload this to data/ in your GitHub repo to share across all devices.', 'success');
  }
};


// ── Toast Helper ──
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
  toast.innerHTML = `<span style="font-size:1.1rem;">${icon}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
}
