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
  // Step 2 — convert postfix prime notation (A', (A+B)') to prefix ¬ so
  //           exercise text stored in prime form renders overbars correctly
  s = _primesToNeg(s);
  // Step 3 — convert ¬ prefix notation into <span class="ol"> overline HTML
  return processOverline(s);
}

// Convert postfix prime notation to prefix ¬  (shared by renderCIE and renderTypedInput)
function _primesToNeg(s) {
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
      } else if (i > 0 && /[A-Za-z0-9]/.test(s[i - 1])) {
        s = s.substring(0, i - 1) + '¬' + s[i - 1] + s.substring(i + 1);
        found = true; break;
      }
    }
    if (!found) break;
  }
  return s;
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

  // Normalise smart/curly apostrophes (macOS/iOS autocorrect) to plain ASCII '
  s = s.replace(/[\u2018\u2019\u02BC]/g, "'");

  // Convert ! prefix to ¬
  s = s.replace(/!/g, '¬');

  // Convert postfix ' to prefix ¬ (shared helper, also handles lowercase)
  s = _primesToNeg(s);

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
   STYLUS / HANDWRITING SUPPORT
   
   No custom canvas needed. Modern devices (iPadOS Scribble, Windows Ink,
   ChromeOS, Samsung S Pen) convert stylus strokes to text natively in
   standard <input> and <textarea> elements.
   
   This module ensures the live CIE preview always updates, regardless of
   how text enters the field: keyboard, stylus handwriting, paste, voice,
   autofill, or IME composition.
   ══════════════════════════════════════════ */

const StylusSupport = {
  _pollId: null,
  _lastWorkingVal: '',
  _lastAnswerVal: '',

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
  }
};


/* ══════════════════════════════════════════
   FIREBASE CONFIGURATION
   ★ TEACHER: Fill in your Firebase project details below ★
   (Firebase Console → Project Settings → Your Apps → SDK snippet)
   ══════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyArWdAGoIe_t2hx8Xby6dHJ7F3fluu2qbE",
  authDomain: "a2-boolean-algebra.firebaseapp.com",
  projectId: "a2-boolean-algebra",
  storageBucket: "a2-boolean-algebra.firebasestorage.app",
  messagingSenderId: "410674798434",
  appId: "1:410674798434:web:a500cac76e6de1b3b7963b"
};

firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();

// ── Firestore caches (populated async on login/navigate) ──
let progressCache = null;   // current student's progress
let studentsCache = [];     // teacher's students (loaded on teacher dashboard)
let creatingAccount = false; // prevents onAuthStateChanged firing mid-signup

async function loadStudentsCache() {
  if (!currentUser || currentUser.role !== 'teacher') return;
  try {
    const snap = await db.collection('users')
      .where('role', '==', 'student')
      .where('teacherUid', '==', currentUser.uid)
      .get();
    const results = await Promise.all(snap.docs.map(async doc => {
      const uid = doc.id;
      const userData = doc.data();
      const progressDoc = await db.collection('progress').doc(uid).get();
      const progress = progressDoc.exists
        ? progressDoc.data()
        : { exercises: {}, firstName: userData.displayName, email: userData.email, lastActive: null };
      if (!progress.exercises) progress.exercises = {};
      const exercises = progress.exercises;
      const attempted = Object.keys(exercises).length;
      const correct = Object.values(exercises).filter(e => e.status === 'correct').length;
      const hints = Object.values(exercises).filter(e => e.hintUsed).length;
      const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
      return { uid, progress, exercises, attempted, correct, hints, accuracy };
    }));
    studentsCache = results.filter(Boolean);
  } catch (e) {
    console.error('loadStudentsCache error:', e);
    studentsCache = [];
  }
}


function generateClassCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}


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
  await loadExercises();
  // Auth state listener handles session restore — no manual session check needed
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

// ── Firebase auth state listener — handles login, logout, and page reload ──
auth.onAuthStateChanged(async (user) => {
  if (creatingAccount) return; // wait until Firestore docs are written before proceeding
  if (user) {
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (!userDoc.exists) {
        // User in Auth but missing Firestore doc — sign out cleanly
        await auth.signOut();
        return;
      }
      const data = userDoc.data();
      currentUser = { uid: user.uid, email: user.email, role: data.role, displayName: data.displayName, classCode: data.classCode };
      currentRole = data.role;

      if (data.role === 'teacher') {
        // Ensure class code exists
        if (!data.classCode) {
          const classCode = generateClassCode();
          await db.collection('users').doc(user.uid).update({ classCode });
          await db.collection('classCodes').doc(classCode).set({ teacherUid: user.uid });
          currentUser.classCode = classCode;
        } else {
          await db.collection('classCodes').doc(data.classCode).set({ teacherUid: user.uid }, { merge: true });
        }
      }
      await enterApp();
    } catch (err) {
      console.error('Auth state error:', err);
      document.getElementById('login-spinner').style.display = 'none';
      const loginError = document.getElementById('login-error');
      loginError.textContent = 'Sign-in error: ' + err.message;
      loginError.classList.add('show');
    }
  } else {
    currentUser = null;
    currentRole = 'student';
    progressCache = null;
    studentsCache = [];
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('top-nav').classList.add('hidden');
    document.getElementById('login-spinner').style.display = 'none';
  }
});


// ══════════════════════════════════════════
//  APP NAMESPACE
// ══════════════════════════════════════════

function nameFromEmail(email) {
  if (!email) return 'Unknown';
  const local = email.split('@')[0];
  return local.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const App = {

  setRole(role) {
    currentRole = role;
    document.querySelectorAll('#role-toggle button').forEach(b => {
      b.classList.toggle('active', b.dataset.role === role);
    });
    const classCodeGroup = document.getElementById('class-code-group');
    const loginHint = document.getElementById('login-hint');
    if (role === 'student') {
      classCodeGroup.style.display = '';
      loginHint.textContent = "First time? Your account will be created automatically — you'll need your class code.";
    } else {
      classCodeGroup.style.display = 'none';
      loginHint.textContent = 'Enter your @cga.school email and password. First time? Your teacher account will be created automatically.';
    }
    document.getElementById('login-error').classList.remove('show');
  },

  async login(e) {
    e.preventDefault();
    const email = document.getElementById('school-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const loginError = document.getElementById('login-error');
    const spinner = document.getElementById('login-spinner');
    loginError.classList.remove('show');

    if (!email || !password) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      loginError.textContent = 'Please enter a valid email address.';
      loginError.classList.add('show');
      return;
    }
    if (password.length < 6) {
      loginError.textContent = 'Password must be at least 6 characters.';
      loginError.classList.add('show');
      return;
    }

    const STUDENT_DOMAIN = '@student.cga.school';
    const TEACHER_DOMAIN = '@cga.school';

    if (currentRole === 'student') {
      if (!email.endsWith(STUDENT_DOMAIN)) {
        loginError.textContent = 'Students must use their @student.cga.school email address.';
        loginError.classList.add('show');
        return;
      }
    } else {
      if (!email.endsWith(TEACHER_DOMAIN) || email.endsWith(STUDENT_DOMAIN)) {
        loginError.textContent = 'Teachers must use their @cga.school email address (not @student.cga.school).';
        loginError.classList.add('show');
        return;
      }
    }

    spinner.style.display = 'block';

    try {
      await auth.signInWithEmailAndPassword(email, password);
      // onAuthStateChanged handles the rest
    } catch (signInErr) {
      if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
        // New user — create account
        creatingAccount = true;
        try {
          let teacherUid = null;
          if (currentRole === 'student') {
            const code = (document.getElementById('class-code').value || '').trim().toUpperCase();
            if (!code) {
              creatingAccount = false;
              spinner.style.display = 'none';
              loginError.textContent = 'Enter your class code to create your account.';
              loginError.classList.add('show');
              return;
            }
            const codeDoc = await db.collection('classCodes').doc(code).get();
            if (!codeDoc.exists) {
              creatingAccount = false;
              spinner.style.display = 'none';
              loginError.textContent = 'Invalid class code. Ask your teacher for the correct code.';
              loginError.classList.add('show');
              return;
            }
            teacherUid = codeDoc.data().teacherUid;
          }
          const cred = await auth.createUserWithEmailAndPassword(email, password);
          const displayName = nameFromEmail(email);
          if (currentRole === 'teacher') {
            const classCode = generateClassCode();
            await db.collection('users').doc(cred.user.uid).set({
              email, role: 'teacher', displayName, classCode,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await db.collection('classCodes').doc(classCode).set({ teacherUid: cred.user.uid });
            currentUser = { uid: cred.user.uid, email, role: 'teacher', displayName, classCode };
          } else {
            await db.collection('users').doc(cred.user.uid).set({
              email, role: 'student', displayName, teacherUid,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await db.collection('progress').doc(cred.user.uid).set({
              userId: cred.user.uid, firstName: displayName, email,
              exercises: {}, startedAt: new Date().toISOString(), lastActive: new Date().toISOString()
            });
            currentUser = { uid: cred.user.uid, email, role: 'student', displayName, teacherUid };
          }
          creatingAccount = false;
          currentRole = currentUser.role;
          await enterApp();
        } catch (createErr) {
          creatingAccount = false;
          spinner.style.display = 'none';
          loginError.textContent = createErr.code === 'auth/email-already-in-use'
            ? 'Incorrect password. Please try again.'
            : createErr.message;
          loginError.classList.add('show');
        }
      } else if (signInErr.code === 'auth/wrong-password') {
        spinner.style.display = 'none';
        loginError.textContent = 'Incorrect password.';
        loginError.classList.add('show');
      } else {
        spinner.style.display = 'none';
        loginError.textContent = signInErr.message;
        loginError.classList.add('show');
      }
    }
  },

  logout() {
    auth.signOut();
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
    if (screen === 'kmap') KMap.init();
    if (screen === 'teacher') Teacher.render().catch(e => console.error('Teacher render error:', e));

    document.getElementById('nav-links').classList.remove('mobile-open');
  },

  toggleMobileNav() {
    document.getElementById('nav-links').classList.toggle('mobile-open');
  }
};


// ── Enter App after login ──
async function enterApp() {
  if (currentUser.role === 'student') {
    try {
      const progressDoc = await db.collection('progress').doc(currentUser.uid).get();
      progressCache = progressDoc.exists
        ? progressDoc.data()
        : { userId: currentUser.uid, firstName: currentUser.displayName, email: currentUser.email, exercises: {}, startedAt: new Date().toISOString(), lastActive: new Date().toISOString() };
      if (!progressCache.exercises) progressCache.exercises = {};
    } catch (e) {
      console.warn('enterApp: failed to load progress', e);
      progressCache = { exercises: {} };
    }
  }

  document.getElementById('login-screen').classList.remove('active');
  const nav = document.getElementById('top-nav');
  nav.classList.remove('hidden');

  const initials = (currentUser.displayName || currentUser.email)[0].toUpperCase();
  document.getElementById('nav-avatar').textContent = initials;
  document.getElementById('nav-username').textContent = currentUser.displayName || currentUser.email.split('@')[0];
  document.getElementById('nav-teacher-link').style.display = currentUser.role === 'teacher' ? '' : 'none';

  if (currentUser.role === 'teacher' && currentUser.classCode) {
    document.getElementById('teacher-class-code').textContent = currentUser.classCode;
  }

  App.navigate(currentUser.role === 'teacher' ? 'teacher' : 'dashboard');
}


// ── Progress Helpers ──
function getProgress(uid) {
  if (!uid || uid === currentUser?.uid) return progressCache;
  return studentsCache.find(s => s.uid === uid)?.progress || null;
}

async function saveProgress(exerciseId, result) {
  if (!currentUser) return;

  // Update local cache immediately (snappy UI)
  if (!progressCache) progressCache = { exercises: {}, firstName: currentUser.displayName, email: currentUser.email };
  if (!progressCache.exercises) progressCache.exercises = {};

  const existing = progressCache.exercises[exerciseId];
  if (existing && existing.status === 'correct' && result.status !== 'correct') return;

  progressCache.exercises[exerciseId] = {
    status: result.status,
    attempts: (existing?.attempts || 0) + 1,
    hintUsed: result.hintUsed || existing?.hintUsed || false,
    working: result.working || existing?.working || '',
    timestamp: new Date().toISOString()
  };
  progressCache.lastActive = new Date().toISOString();

  // Write to Firestore in background
  try {
    await db.collection('progress').doc(currentUser.uid).update({
      [`exercises.${exerciseId}`]: progressCache.exercises[exerciseId],
      lastActive: progressCache.lastActive
    });
  } catch (e) {
    console.warn('saveProgress Firestore error:', e);
  }
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
    document.getElementById('dashboard-greeting').textContent = `${greeting}, ${currentUser.displayName}`;

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
  },

  resetProgress() {
    if (!confirm('Reset all your progress? This will clear all exercise attempts, working, and scores so you can start fresh. This cannot be undone.')) return;
    if (!currentUser) return;
    const now = new Date().toISOString();
    if (progressCache) { progressCache.exercises = {}; progressCache.lastActive = now; }
    db.collection('progress').doc(currentUser.uid).update({ exercises: {}, lastActive: now })
      .catch(e => console.warn('resetProgress error:', e));
    showToast('Progress reset. All exercises are now unattempted.', 'info');
    this.render();
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
      console.log(e);
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
    const workingRequired = false;

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
        <div style="margin-top:12px;padding:10px 14px;background:var(--bg);border-radius:var(--radius-sm);font-size:0.75rem;color:var(--text-muted);">
          <strong>How to enter CIE notation:</strong> &nbsp;
          AND → <code style="background:rgba(0,0,0,.06);padding:1px 5px;border-radius:3px;">.</code> &nbsp;
          OR → <code style="background:rgba(0,0,0,.06);padding:1px 5px;border-radius:3px;">+</code> &nbsp;
          NOT → <code style="background:rgba(0,0,0,.06);padding:1px 5px;border-radius:3px;">'</code> after a variable or <code style="background:rgba(0,0,0,.06);padding:1px 5px;border-radius:3px;">)</code> &nbsp;
          e.g. type <code style="background:rgba(0,0,0,.06);padding:1px 5px;border-radius:3px;">A'</code> → ${renderCIE('¬A')}, &nbsp;
          <code style="background:rgba(0,0,0,.06);padding:1px 5px;border-radius:3px;">(A+B)'</code> → ${renderCIE('¬(A+B)')}
          <br>✏️ <em>You can also write directly in the text boxes with a stylus — your device will convert handwriting to text automatically.</em>
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

    // Start polling for stylus/handwriting input that may bypass oninput
    StylusSupport.startPolling();

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
    const workingRequired = false;

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

    const cat = exercise.category;
    const diff = exercise.difficulty;

    // Single-step exercises (easy difficulty or absorption): just name the law, no length minimum.
    // Multi-step exercises: require more substantial working.
    const isSingleStep = diff <= 1 || cat === 'absorption';
    const isMultiStep  = ['multi_step', 'cie_exam'].includes(cat) && diff >= 3;

    const minLines  = isMultiStep ? 2 : 1;
    const minLength = isMultiStep ? 20 : (isSingleStep ? 0 : 15);

    // 1. Must exist (single-step) or meet minimum length (multi-step)
    if (!working || (!isSingleStep && working.length < minLength)) {
      problems.push(`Your working is too short. Show your simplification step${minLines > 1 ? 's' : ''} with the law you applied.`);
      return problems;
    }
    if (!working.trim()) {
      problems.push('Show which law you applied (e.g. [De Morgan\'s], [Absorption]).');
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

  async render() {
    await loadStudentsCache();
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
    return studentsCache;
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

    const minAttempts = Math.max(1, Math.ceil(students.length * 0.25));
    const hardestEx = EXERCISES.map(ex => {
      const att = students.filter(st => st.exercises[ex.id]);
      if (att.length < minAttempts) return null;
      const cor = att.filter(st => st.exercises[ex.id]?.status === 'correct').length;
      return { ex, att: att.length, cor, rate: cor / att.length };
    }).filter(Boolean).sort((a, b) => a.rate - b.rate).slice(0, 5);
    let hardestHTML = hardestEx.length > 0
      ? hardestEx.map(d => `<div class="hard-ex-row"><span class="hard-ex-num">#${d.ex.id}</span><span class="hard-ex-title" title="${d.ex.title}">${d.ex.title}</span><span class="hard-ex-rate" style="color:${d.rate < 0.4 ? 'var(--error)' : 'var(--warning)'}">${d.cor}/${d.att} (${Math.round(d.rate*100)}%)</span></div>`).join('')
      : '<p style="font-size:0.85rem;color:var(--text-muted);">Not enough data yet.</p>';

    document.getElementById('teacher-detail-content').innerHTML = `
      <div class="class-detail-section"><h4>Topic Accuracy (Class Average)</h4>${catRows}</div>
      <div class="class-detail-section"><h4>🔴 Hardest Exercises</h4><p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px;">Lowest correct rate among attempted exercises.</p>${hardestHTML}</div>
      <div class="class-detail-section"><h4>⚠ Students Needing Support</h4><p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px;">Lowest-performing students — click to view details.</p>${atRiskHTML}</div>`;
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
    const overviewGrid = document.getElementById('class-overview-grid');
    if (suggBox && overviewGrid) overviewGrid.after(suggBox);

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

    // Law-level accuracy breakdown
    const lawGroups = {};
    EXERCISES.forEach(ex => {
      if (!lawGroups[ex.lawUsed]) lawGroups[ex.lawUsed] = [];
      lawGroups[ex.lawUsed].push(ex);
    });
    let lawBreakdown = '';
    for (const [law, exs] of Object.entries(lawGroups)) {
      const att = exs.filter(e => exercises[e.id]);
      if (att.length === 0) continue;
      const cor = att.filter(e => exercises[e.id]?.status === 'correct').length;
      const hin = att.filter(e => exercises[e.id]?.hintUsed).length;
      const pct = Math.round(cor / att.length * 100);
      const col = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--error)';
      lawBreakdown += `<div class="law-acc-row"><span class="law-acc-name">${law}</span><div class="law-acc-bar"><div class="law-acc-bar-fill" style="width:${pct}%;background:${col}"></div></div><span class="law-acc-stat" style="color:${col}">${cor}/${att.length}</span>${hin > 0 ? `<span class="law-acc-hint">${hin}H</span>` : ''}</div>`;
    }

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
        <div class="detail-section"><h4>Law-by-Law Accuracy</h4><p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px;">H = hint used. Shows which specific laws are causing difficulty.</p>${lawBreakdown || '<p style="font-size:0.85rem;color:var(--text-muted);">No exercises attempted yet.</p>'}</div>
        <div class="detail-section"><h4>Difficulty Breakdown</h4><p class="diff-breakdown">${diffBreakdown}</p></div>
        <div class="detail-section" style="margin-bottom:0;"><h4>Mastery Breakdown</h4><p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:10px;">Per topic: how many exercises were correct independently, correct only with a hint, incorrect, or not yet attempted.</p><div style="width:100%;overflow:hidden;"><canvas id="mastery-chart"></canvas></div></div>
        <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" onclick="Teacher.resetStudentProgress('${uid}')">🔄 Reset Progress</button>
          <button class="btn btn-secondary btn-sm" onclick="Teacher.removeStudent('${uid}')">🗑 Remove Student</button>
        </div>
      </div>`;
    this.drawMasteryChart(uid);
  },

  drawMasteryChart(uid) {
    const canvas = document.getElementById('mastery-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const progress = getProgress(uid);
    const exercises = progress?.exercises || {};

    const rows = Object.entries(CATEGORIES).map(([key, meta]) => {
      const ce = EXERCISES.filter(e => e.category === key);
      const correctClean = ce.filter(e => exercises[e.id]?.status === 'correct' && !exercises[e.id]?.hintUsed).length;
      const correctHint  = ce.filter(e => exercises[e.id]?.status === 'correct' &&  exercises[e.id]?.hintUsed).length;
      const incorrect    = ce.filter(e => exercises[e.id]?.status === 'incorrect').length;
      const notAttempted = ce.length - correctClean - correctHint - incorrect;
      return { label: meta.name, total: ce.length, correctClean, correctHint, incorrect, notAttempted };
    });

    const dpr = window.devicePixelRatio || 1;
    const w   = canvas.parentElement.clientWidth || 480;
    const labelW = 112, mR = 10, mT = 6, mB = 40;
    const rowH = 30, barH = 16;
    const h = mT + rows.length * rowH + mB;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const barW = w - labelW - mR;
    const COLORS     = ['#22C55E', '#F59E0B', '#EF4444', '#E2E4F0'];
    const TXT_COLORS = ['#fff',    '#fff',    '#fff',    '#9CA3AF'];

    rows.forEach((row, i) => {
      const y = mT + i * rowH + (rowH - barH) / 2;

      // Category label — truncate if needed
      ctx.font = '11px DM Sans, sans-serif';
      ctx.fillStyle = '#5A5F7A';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const lbl = row.label.length > 17 ? row.label.slice(0, 16) + '…' : row.label;
      ctx.fillText(lbl, labelW - 8, y + barH / 2);

      // Grey background track
      ctx.fillStyle = '#ECEEF6';
      ctx.beginPath();
      ctx.roundRect(labelW, y, barW, barH, 4);
      ctx.fill();

      // Clip to track shape so segments stay rounded
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(labelW, y, barW, barH, 4);
      ctx.clip();

      // Stacked segments: correct / correct+hint / incorrect / not attempted
      const counts = [row.correctClean, row.correctHint, row.incorrect, row.notAttempted];
      let xOff = labelW;
      counts.forEach((count, ci) => {
        if (count === 0) return;
        const sw = (count / row.total) * barW;
        ctx.fillStyle = COLORS[ci];
        ctx.fillRect(xOff, y, sw, barH);
        if (sw >= 18) {
          ctx.font = 'bold 9px DM Sans, sans-serif';
          ctx.fillStyle = TXT_COLORS[ci];
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(count, xOff + sw / 2, y + barH / 2);
        }
        xOff += sw;
      });

      ctx.restore();
    });

    // Legend
    const ly = mT + rows.length * rowH + 12;
    const legendItems = ['Correct', 'Correct (hint)', 'Incorrect', 'Not attempted'];
    ctx.font = '10px DM Sans, sans-serif';
    ctx.textBaseline = 'middle';
    let lx = labelW;
    legendItems.forEach((label, i) => {
      ctx.fillStyle = COLORS[i];
      ctx.fillRect(lx, ly, 10, 10);
      if (i === 3) { ctx.strokeStyle = '#D1D5E0'; ctx.lineWidth = 1; ctx.strokeRect(lx, ly, 10, 10); }
      ctx.fillStyle = '#5A5F7A';
      ctx.textAlign = 'left';
      ctx.fillText(label, lx + 13, ly + 5);
      lx += ctx.measureText(label).width + 26;
    });
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

  // ── Diagnostic Insights ──

  // Renders three labelled sections: Cognitive, Stylistic, Skills
  _renderDiagnosticSections(cognitive, stylistic, skills) {
    if (cognitive.length + stylistic.length + skills.length === 0) {
      return '<p style="color:var(--text-muted);font-size:0.9rem;">Not enough data yet.</p>';
    }
    const section = (icon, label, color, items) => items.length === 0 ? '' : `
      <div class="diag-section">
        <div class="diag-section-header" style="color:${color}">${icon} ${label}</div>
        ${items.map(t => `<div class="diag-item">${t}</div>`).join('')}
      </div>`;
    return section('🧠', 'Cognitive — Concept Understanding', 'var(--error)', cognitive)
         + section('✏️', 'Stylistic — Notation &amp; Recall', 'var(--warning)', stylistic)
         + section('🔧', 'Skills — Procedure &amp; Engagement', 'var(--blue)', skills);
  },

  renderSuggestions(uid) {
    const container = document.getElementById('suggestion-content');
    if (!container) return;

    const SINGLE_CATS = ['de_morgan','absorption','identity_null','commutative_associative','inverse_complement','double_negation'];
    const MULTI_CATS  = ['multi_step','cie_exam'];

    // ── CLASS LEVEL ──
    if (!uid) {
      document.getElementById('suggestion-target').textContent = 'Class Overview';
      const students = this._getAllStudents();
      if (students.length === 0) { container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">No data yet.</p>'; return; }

      const cognitive = [], stylistic = [], skills = [];

      for (const [key, meta] of Object.entries(CATEGORIES)) {
        const ce = EXERCISES.filter(e => e.category === key);
        let accSum = 0, hintSum = 0, n = 0;
        students.forEach(st => {
          const ca = ce.filter(e => st.exercises[e.id]).length;
          if (ca < 2) return;
          const cc = ce.filter(e => st.exercises[e.id]?.status === 'correct').length;
          const ch = ce.filter(e => st.exercises[e.id]?.hintUsed).length;
          accSum += cc / ca; hintSum += ch / ca; n++;
        });
        if (n < Math.max(1, Math.ceil(students.length * 0.25))) continue;
        const avgAcc = accSum / n, avgHint = hintSum / n;

        if (avgAcc < 0.4)
          cognitive.push(`Class average on <strong>${meta.name}</strong> is ${Math.round(avgAcc*100)}% — likely a teaching gap. Re-teach with worked examples before assigning more practice.`);
        else if (avgAcc < 0.6)
          cognitive.push(`<strong>${meta.name}</strong> partially understood across the class (${Math.round(avgAcc*100)}%). A targeted review lesson is recommended.`);

        if (avgHint > 0.55 && avgAcc >= 0.5)
          stylistic.push(`Students consistently use hints on <strong>${meta.name}</strong> (${Math.round(avgHint*100)}% of attempts). They understand the law but can't independently recall or write it — drill closed-book recall.`);
      }

      // Cognitive: multi-step gap
      let sAcc = 0, sN = 0, mAcc = 0, mN = 0;
      students.forEach(st => {
        const se = EXERCISES.filter(e => SINGLE_CATS.includes(e.category) && st.exercises[e.id]);
        if (se.length >= 3) { sAcc += se.filter(e => st.exercises[e.id]?.status === 'correct').length / se.length; sN++; }
        const me = EXERCISES.filter(e => MULTI_CATS.includes(e.category) && st.exercises[e.id]);
        if (me.length >= 2) { mAcc += me.filter(e => st.exercises[e.id]?.status === 'correct').length / me.length; mN++; }
      });
      if (sN >= 2 && mN >= 2 && (sAcc/sN) > 0.65 && (mAcc/mN) < 0.45)
        cognitive.push(`Class manages individual laws (${Math.round(sAcc/sN*100)}%) but struggles to chain them in multi-step problems (${Math.round(mAcc/mN*100)}%). Teach explicit problem decomposition strategies.`);

      // Skills
      const atRisk = students.filter(s => s.attempted >= 3 && s.accuracy < 40);
      if (atRisk.length > 0)
        skills.push(`${atRisk.length} student${atRisk.length>1?'s':''} at risk (≥3 attempts, <40% accuracy): <strong>${atRisk.map(s => s.progress.firstName).join(', ')}</strong>. Targeted 1-to-1 support recommended.`);

      const lowEng = students.filter(s => s.attempted < 5);
      if (lowEng.length > students.length * 0.4 && students.length >= 3)
        skills.push(`${lowEng.length}/${students.length} students have completed fewer than 5 exercises — low engagement. Set a minimum weekly target.`);

      const notStartedMulti = students.filter(s => MULTI_CATS.every(cat => EXERCISES.filter(e => e.category === cat).every(e => !s.exercises[e.id]))).length;
      if (notStartedMulti > students.length * 0.5 && students.length >= 3)
        skills.push(`${notStartedMulti}/${students.length} students haven't attempted any multi-step or CIE-style questions. These are high-value for exam prep.`);

      container.innerHTML = this._renderDiagnosticSections(cognitive, stylistic, skills);
      return;
    }

    // ── STUDENT LEVEL ──
    document.getElementById('suggestion-target').textContent = (getProgress(uid)?.firstName || uid);
    const progress = getProgress(uid), exercises = progress?.exercises || {};
    const cognitive = [], stylistic = [], skills = [];

    for (const [key, meta] of Object.entries(CATEGORIES)) {
      const ce = EXERCISES.filter(e => e.category === key);
      const ca = ce.filter(e => exercises[e.id]);
      if (ca.length === 0) continue;
      const cc = ca.filter(e => exercises[e.id]?.status === 'correct');
      const ch = ca.filter(e => exercises[e.id]?.hintUsed);
      const acc = cc.length / ca.length, hintRate = ch.length / ca.length;

      // Cognitive: wrong even with hints = deep confusion
      if (acc < 0.4 && hintRate >= 0.5 && ca.length >= 3)
        cognitive.push(`Deep confusion in <strong>${meta.name}</strong> — hints aren't helping (${Math.round(acc*100)}% correct despite ${ch.length} hints). Needs worked examples and concept explanation, not more practice.`);
      // Cognitive: genuinely wrong without hint crutch
      else if (acc < 0.4 && ca.length >= 3)
        cognitive.push(`Misunderstands <strong>${meta.name}</strong> (${Math.round(acc*100)}% correct, ${ch.length} hint${ch.length!==1?'s':''}). The concept itself may be unclear — try verifying with a truth table.`);
      // Cognitive: partial — something specific is wrong
      else if (acc < 0.65 && ca.length >= 2)
        cognitive.push(`Partial understanding of <strong>${meta.name}</strong> (${Math.round(acc*100)}%). Getting some right, some wrong — likely a specific misconception rather than a complete gap.`);

      // Stylistic: knows it but hint-reliant — notation/recall issue
      if (hintRate > 0.6 && acc >= 0.55)
        stylistic.push(`Hint-dependent on <strong>${meta.name}</strong> (${ch.length}/${ca.length} exercises needed a hint). Understands the law but can't independently produce the notation — practise writing answers from memory before looking.`);
    }

    // Cognitive: passes single-step but fails multi-step = chaining gap, not conceptual
    const sEx = EXERCISES.filter(e => SINGLE_CATS.includes(e.category) && exercises[e.id]);
    const mEx = EXERCISES.filter(e => MULTI_CATS.includes(e.category) && exercises[e.id]);
    if (sEx.length >= 5 && mEx.length >= 2) {
      const sA = sEx.filter(e => exercises[e.id]?.status === 'correct').length / sEx.length;
      const mA = mEx.filter(e => exercises[e.id]?.status === 'correct').length / mEx.length;
      if (sA > 0.65 && mA < 0.4)
        cognitive.push(`Applies individual laws correctly (${Math.round(sA*100)}%) but can't chain them in multi-step problems (${Math.round(mA*100)}%). This is a problem-decomposition gap — practise breaking expressions into sub-goals before simplifying.`);
    }

    // Skills: trial-and-error pattern (high average attempts)
    const allAtt = Object.values(exercises);
    if (allAtt.length >= 5) {
      const avgAttempts = allAtt.reduce((s, e) => s + (e.attempts || 1), 0) / allAtt.length;
      if (avgAttempts > 2.5)
        skills.push(`Averaging ${avgAttempts.toFixed(1)} attempts per exercise — suggests submitting guesses rather than working through the logic. Encourage writing each simplification step before submitting.`);
    }

    // Skills: ready to move up in difficulty
    const d1att = EXERCISES.filter(e => e.difficulty === 1 && exercises[e.id]);
    const d1cor = d1att.filter(e => exercises[e.id]?.status === 'correct').length;
    const d2att = EXERCISES.filter(e => e.difficulty === 2 && exercises[e.id]).length;
    if (d1att.length >= 5 && d1att.length > 0 && d1cor / d1att.length >= 0.7 && d2att < 3)
      skills.push(`Performing well on Easy questions (${Math.round(d1cor/d1att.length*100)}%) but hasn't engaged with Medium or Hard. Ready to be pushed — try difficulty 2 exercises next.`);

    // Skills: hard questions going well = ready for past papers
    const d3att = EXERCISES.filter(e => e.difficulty === 3 && exercises[e.id]);
    if (d3att.length >= 4 && d3att.filter(e => exercises[e.id]?.status === 'correct').length / d3att.length >= 0.7)
      skills.push(`Handling Hard exercises well. Ready for timed CIE past paper questions to build exam technique.`);

    // Skills: low volume
    if (allAtt.length > 0 && allAtt.length < 8)
      skills.push(`Only ${allAtt.length} exercise${allAtt.length!==1?'s':''} attempted so far. Fluency comes from volume — encourage a short daily practice habit.`);

    container.innerHTML = this._renderDiagnosticSections(cognitive, stylistic, skills);
  },

  // ── Utilities ──
  removeStudent(uid) {
    if (!confirm(`Remove ${getProgress(uid)?.firstName || uid}? Progress data will be deleted.`)) return;
    db.collection('progress').doc(uid).delete().catch(e => console.warn('removeStudent error:', e));
    studentsCache = studentsCache.filter(s => s.uid !== uid);
    this.selectedStudent = null; showToast('Student removed.', 'info'); this.render();
  },

  resetStudentProgress(uid) {
    const name = getProgress(uid)?.firstName || uid;
    if (!confirm(`Reset all progress for ${name}? This clears all their exercise attempts, working, and scores. They will start fresh.`)) return;
    const now = new Date().toISOString();
    db.collection('progress').doc(uid).update({ exercises: {}, lastActive: now })
      .catch(e => console.warn('resetStudentProgress error:', e));
    const student = studentsCache.find(s => s.uid === uid);
    if (student) {
      student.progress.exercises = {}; student.exercises = {};
      student.attempted = 0; student.correct = 0; student.hints = 0; student.accuracy = 0;
      student.progress.lastActive = now;
    }
    showToast(`${name}'s progress has been reset.`, 'info');
    this.selectStudent(uid);
  },

  async resetTeacherPassword() {
    if (!confirm(`Send a password reset email to ${currentUser.email}?`)) return;
    try {
      await auth.sendPasswordResetEmail(currentUser.email);
      showToast('Password reset email sent. Check your inbox.', 'success');
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  },

  exportAllData() {
    const allData = {};
    studentsCache.forEach(st => { if (st.progress) allData[st.uid] = st.progress; });
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
    a.download = `boolean-mastery-class-data-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url); showToast('Class data exported.', 'success');
  },

  importData(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const batch = db.batch();
        let count = 0;
        for (const [uid, progress] of Object.entries(data)) {
          batch.set(db.collection('progress').doc(uid), progress);
          count++;
        }
        await batch.commit();
        showToast(`Imported ${count} student(s).`, 'success');
        await this.render();
      } catch (err) {
        showToast('Invalid file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file); event.target.value = '';
  },

  async generateDemoData() {
    if (!confirm('Generate 10 demo students with varied progress? This showcases the full range of teacher dashboard analytics.')) return;

    const profiles = [
      { email: 'harry.potter@student.cga.school', numExercises: 85, baseAccuracy: 0.92, hintRate: 0.05, daysAgo: 0.2,
        strengths: { de_morgan: 0.95, distributive: 0.90, absorption: 0.95, identity_null: 0.98, commutative_associative: 0.97, inverse_complement: 0.96, double_negation: 0.99, multi_step: 0.85, cie_exam: 0.82 }, working: true },
      { email: 'ron.weasley@student.cga.school', numExercises: 42, baseAccuracy: 0.30, hintRate: 0.6, daysAgo: 1,
        strengths: { de_morgan: 0.18, distributive: 0.35, absorption: 0.40, identity_null: 0.55, commutative_associative: 0.50, inverse_complement: 0.45, double_negation: 0.60, multi_step: 0.12, cie_exam: 0.10 }, working: true },
      { email: 'hermione.granger@student.cga.school', numExercises: 60, baseAccuracy: 0.72, hintRate: 0.75, daysAgo: 0.5,
        strengths: { de_morgan: 0.70, distributive: 0.75, absorption: 0.80, identity_null: 0.85, commutative_associative: 0.80, inverse_complement: 0.78, double_negation: 0.90, multi_step: 0.55, cie_exam: 0.50 }, working: true },
      { email: 'severus.snape@student.cga.school', numExercises: 4, baseAccuracy: 0.50, hintRate: 0.25, daysAgo: 5, working: false,
        strengths: { de_morgan: 0.50, distributive: 0.50, absorption: 0.50, identity_null: 0.50, commutative_associative: 0.50, inverse_complement: 0.50, double_negation: 0.50, multi_step: 0.50, cie_exam: 0.50 } },
      { email: 'albus.dumbledore@student.cga.school', numExercises: 55, baseAccuracy: 0.65, hintRate: 0.3, daysAgo: 1.5,
        strengths: { de_morgan: 0.50, distributive: 0.55, absorption: 0.90, identity_null: 0.95, commutative_associative: 0.95, inverse_complement: 0.90, double_negation: 0.95, multi_step: 0.20, cie_exam: 0.15 }, working: true },
      { email: 'fred.weasley@student.cga.school', numExercises: 38, baseAccuracy: 0.55, hintRate: 0.35, daysAgo: 2,
        strengths: { de_morgan: 0.55, distributive: 0.55, absorption: 0.60, identity_null: 0.65, commutative_associative: 0.60, inverse_complement: 0.55, double_negation: 0.70, multi_step: 0.40, cie_exam: 0.35 }, working: true },
      { email: 'rubeus.hagrid@student.cga.school', numExercises: 50, baseAccuracy: 0.68, hintRate: 0.2, daysAgo: 0.3,
        strengths: { de_morgan: 0.75, distributive: 0.70, absorption: 0.80, identity_null: 0.85, commutative_associative: 0.80, inverse_complement: 0.75, double_negation: 0.90, multi_step: 0.55, cie_exam: 0.45 }, improving: true, working: true },
      { email: 'prof.sprout@student.cga.school', numExercises: 25, baseAccuracy: 0.60, hintRate: 0.3, daysAgo: 14,
        strengths: { de_morgan: 0.60, distributive: 0.55, absorption: 0.65, identity_null: 0.70, commutative_associative: 0.65, inverse_complement: 0.60, double_negation: 0.75, multi_step: 0.40, cie_exam: 0.30 }, working: true },
      { email: 'minerva.mcgonagall@student.cga.school', numExercises: 45, baseAccuracy: 0.70, hintRate: 0.15, daysAgo: 0.8,
        strengths: { de_morgan: 0.80, distributive: 0.75, absorption: 0.40, identity_null: 0.35, commutative_associative: 0.30, inverse_complement: 0.35, double_negation: 0.45, multi_step: 0.85, cie_exam: 0.82 }, skipBasics: true, working: true },
      { email: 'draco.malfoy@student.cga.school', numExercises: 18, baseAccuracy: 0.94, hintRate: 0.0, daysAgo: 3,
        strengths: { de_morgan: 0.95, distributive: 0.95, absorption: 0.95, identity_null: 0.98, commutative_associative: 0.98, inverse_complement: 0.95, double_negation: 0.99, multi_step: 0.90, cie_exam: 0.88 }, working: true }
    ];

    const batch = db.batch();
    let added = 0;

    for (const profile of profiles) {
      const email = profile.email;
      const demoUid = 'demo_' + email.replace(/[^a-z0-9]/g, '_');
      const displayName = nameFromEmail(email);

      if (studentsCache.some(s => s.uid === demoUid)) continue;

      // User doc
      batch.set(db.collection('users').doc(demoUid), {
        email, role: 'student', displayName, teacherUid: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Generate exercises
      const exercises = {};
      let selected;
      if (profile.skipBasics) {
        const hard = EXERCISES.filter(e => e.difficulty >= 2 || e.category === 'multi_step' || e.category === 'cie_exam');
        const easy = EXERCISES.filter(e => e.difficulty === 1 && e.category !== 'multi_step' && e.category !== 'cie_exam');
        selected = [...hard.sort(() => Math.random() - 0.5).slice(0, Math.min(profile.numExercises - 5, hard.length)),
                     ...easy.sort(() => Math.random() - 0.5).slice(0, 5)];
      } else {
        selected = [...EXERCISES].sort(() => Math.random() - 0.5).slice(0, profile.numExercises);
      }

      selected.forEach((ex, idx) => {
        let chance = profile.strengths[ex.category] || profile.baseAccuracy;
        chance -= (ex.difficulty - 1) * 0.1;
        if (profile.improving && idx < selected.length * 0.4) chance -= 0.3;
        chance = Math.max(0.05, Math.min(0.98, chance));
        const correct = Math.random() < chance;
        const hintUsed = !correct && Math.random() < profile.hintRate;
        let working = '';
        if (profile.working) {
          if (correct) working = `= step 1 [${ex.lawUsed}]\n= ${toCIEText(ex.answer)}`;
          else if (Math.random() < 0.6) {
            const wrongLaws = ['De Morgan', 'Distributive', 'Absorption', 'Complement', 'Identity'];
            working = `= tried [${wrongLaws[Math.floor(Math.random() * wrongLaws.length)]}]\n= stuck here`;
          }
        }
        const daySpread = Math.max(profile.daysAgo, 1);
        const exerciseTime = Date.now() - (profile.daysAgo * 86400000) - (Math.random() * daySpread * 86400000);
        exercises[ex.id] = { status: correct ? 'correct' : 'incorrect', attempts: correct ? 1 : 1 + Math.floor(Math.random() * (profile.baseAccuracy < 0.4 ? 4 : 2)), hintUsed, working, timestamp: new Date(exerciseTime).toISOString() };
      });

      const lastActiveTime = Date.now() - profile.daysAgo * 86400000;
      batch.set(db.collection('progress').doc(demoUid), {
        userId: demoUid, firstName: displayName, email, exercises,
        startedAt: new Date(lastActiveTime - 14 * 86400000).toISOString(),
        lastActive: new Date(lastActiveTime).toISOString()
      });
      added++;
    }

    try {
      await batch.commit();
      showToast(`${added} demo student(s) generated with varied progress.`, 'success');
      await this.render();
    } catch (e) {
      showToast('Error generating demo data: ' + e.message, 'error');
    }
  },

};


// ══════════════════════════════════════════
//  BOOLEAN EXPRESSION EVALUATOR
//  Used by KMap to validate student SOP entries.
// ══════════════════════════════════════════

function _normExprForEval(raw) {
  let s = raw.trim();
  s = s.replace(/[\u2018\u2019\u02BC]/g, "'");   // smart quotes
  s = s.replace(/\bAND\b/gi, '∧').replace(/\bOR\b/gi, '∨');
  s = s.replace(/\bNOT\b\s*/gi, '¬');
  s = s.replace(/·/g, '∧').replace(/\./g, '∧');
  s = s.replace(/\+/g, '∨');
  s = s.replace(/!/g, '¬');
  s = _primesToNeg(s);
  s = s.replace(/\s+/g, '');
  return s;
}

function _evalBoolAt(rawExpr, vals) {
  const s = _normExprForEval(rawExpr);
  let pos = 0;

  function parseOr() {
    let r = parseAnd();
    while (pos < s.length && s[pos] === '∨') { pos += '∨'.length; r = r | parseAnd(); }
    return r;
  }
  function parseAnd() {
    let r = parseNot();
    while (pos < s.length && s[pos] !== '∨' && s[pos] !== ')') {
      if (s.slice(pos, pos + '∧'.length) === '∧') { pos += '∧'.length; }
      // implicit AND: next char starts an atom
      else if (s[pos] === '(' || s[pos] === '¬' || /[A-D01]/i.test(s[pos])) { /* implicit */ }
      else break;
      r = r & parseNot();
    }
    return r;
  }
  function parseNot() {
    if (s[pos] === '¬') { pos++; return 1 - parseNot(); }
    return parseAtom();
  }
  function parseAtom() {
    if (s[pos] === '(') {
      pos++;
      const r = parseOr();
      if (pos < s.length && s[pos] === ')') pos++;
      return r;
    }
    if (/[A-D]/i.test(s[pos] || '')) { return vals[s[pos++].toUpperCase()]; }
    if (s[pos] === '0') { pos++; return 0; }
    if (s[pos] === '1') { pos++; return 1; }
    pos++;
    return 0;
  }

  try { return parseOr(); }
  catch { return null; }
}

/** Returns true if exprStr is logically equivalent to the given minterms list (0–15). */
function _matchesMinterms(exprStr, minterms) {
  const set = new Set(minterms);
  for (let m = 0; m < 16; m++) {
    const result = _evalBoolAt(exprStr, {
      A: (m >> 3) & 1, B: (m >> 2) & 1, C: (m >> 1) & 1, D: m & 1
    });
    if (result === null) return false;
    if (result !== (set.has(m) ? 1 : 0)) return false;
  }
  return true;
}

/** Returns the minterm number for K-Map cell (row r, col c).
 *  Layout: AB across the top (columns), CD down the side (rows). */
function _kmapCellMinterm(r, c) {
  const colAB = [0, 1, 3, 2]; // AB Gray: 00,01,11,10
  const rowCD = [0, 1, 3, 2]; // CD Gray: 00,01,11,10
  const ab = colAB[c], cd = rowCD[r];
  return ((ab >> 1) & 1) * 8 + (ab & 1) * 4 + ((cd >> 1) & 1) * 2 + (cd & 1);
}

/** Normalise a simplified SOP answer for string matching (mirrors Practice.checkAnswer normalise). */
function _normSOP(s) {
  return s.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/·/g, '∧').replace(/\./g, '∧')
    .replace(/\+/g, '∨')
    .replace(/!/g, '¬').replace(/not/gi, '¬')
    .replace(/and/gi, '∧').replace(/or/gi, '∨')
    .replace(/'/g, '¬');
}


// ══════════════════════════════════════════
//  KARNAUGH MAPS MODULE
// ══════════════════════════════════════════

const KMap = {
  exercises: [],
  currentIndex: 0,

  // Per-exercise UI state (reset on navigation)
  _state: null,

  // Canvas drawing state
  _drawing: false,
  _currentColor: 0,
  _loopColors: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12'],
  _hasDrawing: false,

  async init() {
    if (this.exercises.length === 0) {
      try {
        const resp = await fetch('scripts/kmap-exercises.json');
        this.exercises = (await resp.json()).exercises;
      } catch {
        document.getElementById('kmap-exercise-area').innerHTML =
          '<div class="empty-state"><p>Could not load K-Map exercises.</p></div>';
        return;
      }
    }
    // Restore index from previous visit if valid
    if (this.currentIndex >= this.exercises.length) this.currentIndex = 0;
    this._resetState();
    this._render();
  },

  _resetState() {
    this._state = { step1: 'active', step2: 'locked', step3: 'locked', step4: 'locked', step1Answer: '' };
    this._cellValues = Array.from({ length: 4 }, () => Array(4).fill(0));
    this._hasDrawing = false;
    this._currentColor = 0;
  },

  _ex() { return this.exercises[this.currentIndex]; },

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this._resetState();
      this._render();
    }
  },

  next() {
    if (this.currentIndex < this.exercises.length - 1) {
      this.currentIndex++;
      this._resetState();
      this._render();
    }
  },

  _render() {
    const ex = this._ex();
    const area = document.getElementById('kmap-exercise-area');
    const diffLabel = ex.difficulty === 1 ? 'Easy' : ex.difficulty === 2 ? 'Medium' : 'Hard';
    const s = this._state;

    area.innerHTML = `
      <div class="kmap-nav">
        <button class="btn btn-secondary btn-sm" onclick="KMap.prev()" ${this.currentIndex === 0 ? 'disabled' : ''}>← Previous</button>
        <span class="kmap-counter">${this.currentIndex + 1} of ${this.exercises.length} &nbsp;·&nbsp;
          <span class="exercise-difficulty ${diffLabel.toLowerCase()}">${diffLabel}</span></span>
        <button class="btn btn-primary btn-sm" onclick="KMap.next()" ${this.currentIndex >= this.exercises.length - 1 ? 'disabled' : ''}>Next →</button>
      </div>
      <div class="exercise-card" style="margin-bottom:16px;">
        <div class="exercise-title">${ex.title}</div>
      </div>
      ${this._renderStep1(ex, s.step1)}
      ${this._renderStep2(ex, s.step2)}
      ${this._renderStep3(ex, s.step3)}
      ${this._renderStep4(ex, s.step4)}
      ${s.step4 === 'correct' ? this._renderComplete(ex) : ''}
    `;

    this._attachStep2Events();
    this._attachCanvasEvents();
    this._attachInputEvents();
  },

  // ── Step 1: Truth table → write SOP ──
  _renderStep1(ex, status) {
    const locked = status === 'locked';
    const done   = status === 'correct';
    const ttHTML = this._truthTableHTML(ex.minterms);

    return `
      <div class="kmap-step ${locked ? 'locked' : ''} ${done ? 'step-complete' : ''}">
        <div class="kmap-step-header">
          <div class="kmap-step-num">1</div>
          <div class="kmap-step-title">Write the Sum of Products (SOP) from the truth table</div>
          ${done ? '<span class="kmap-step-badge correct-badge">✓ Correct</span>' : locked ? '<span class="kmap-step-badge locked-badge">Locked</span>' : ''}
        </div>
        ${ttHTML}
        <div class="kmap-sop-hint">
          <strong>How to write SOP:</strong> For each row where Q=1, write a term with all 4 variables
          (use <code>'</code> for NOT, e.g. <code>${this._sampleMintermCIE(ex.minterms[0])}</code>).
          Join all terms with <code>+</code>.
        </div>
        <div class="kmap-answer-row">
          <input type="text" class="kmap-answer-input ${done ? 'correct' : ''}" id="kmap-sop-input"
            placeholder="e.g. A'B'C'D + A'B'CD + ..."
            ${done ? `value="${this._state.step1Answer}" disabled` : ''}
            oninput="KMap._updatePreview('kmap-sop-preview','kmap-sop-input')"
            onkeydown="if(event.key==='Enter')KMap.checkStep1()">
          <button class="btn btn-primary" onclick="KMap.checkStep1()" ${done ? 'disabled' : ''}>Check SOP</button>
        </div>
        ${done
          ? `<div class="live-preview live-preview-inline visible" style="margin-bottom:8px;">
              <div class="live-preview-label">CIE Notation Preview</div>
              <div class="live-preview-content">${renderTypedInput(this._state.step1Answer)}</div>
             </div>`
          : `<div class="live-preview live-preview-inline" id="kmap-sop-preview" style="margin-bottom:8px;">
              <div class="live-preview-label">CIE Notation Preview</div>
              <div class="live-preview-content" id="kmap-sop-preview-content"></div>
             </div>`
        }
        <div id="kmap-step1-feedback"></div>
      </div>`;
  },

  // ── Step 2: Fill K-Map cells ──
  _renderStep2(ex, status) {
    const locked = status === 'locked';
    const done   = status === 'correct';
    const gridHTML = this._kmapGridHTML(ex.minterms, done ? 'values' : 'fill');

    return `
      <div class="kmap-step ${locked ? 'locked' : ''} ${done ? 'step-complete' : ''}">
        <div class="kmap-step-header">
          <div class="kmap-step-num">2</div>
          <div class="kmap-step-title">Fill in the K-Map — click each cell to enter 0 or 1</div>
          ${done ? '<span class="kmap-step-badge correct-badge">✓ Correct</span>' : locked ? '<span class="kmap-step-badge locked-badge">Locked</span>' : ''}
        </div>
        <div class="kmap-grid-outer">
          ${gridHTML}
        </div>
        <button class="btn btn-primary" onclick="KMap.checkStep2()" ${done || locked ? 'disabled' : ''}>Check K-Map</button>
        <div id="kmap-step2-feedback"></div>
      </div>`;
  },

  // ── Step 3: Draw loops on canvas ──
  _renderStep3(ex, status) {
    const locked = status === 'locked';
    const done   = status === 'done';
    const gridHTML = this._kmapGridHTML(ex.minterms, 'values');

    const swatches = this._loopColors.map((c, i) =>
      `<div class="kmap-loop-swatch ${i === this._currentColor ? 'active' : ''}"
        style="background:${c}" onclick="KMap._selectColor(${i})" title="Loop colour ${i+1}"></div>`
    ).join('');

    return `
      <div class="kmap-step ${locked ? 'locked' : ''} ${done ? 'step-complete' : ''}">
        <div class="kmap-step-header">
          <div class="kmap-step-num">3</div>
          <div class="kmap-step-title">Draw loops to group the 1s — use mouse or stylus</div>
          ${done ? '<span class="kmap-step-badge correct-badge">✓ Done</span>' : locked ? '<span class="kmap-step-badge locked-badge">Locked</span>' : ''}
        </div>
        <p style="font-size:0.83rem;color:var(--text-muted);margin-bottom:10px;">
          Draw ellipses or rectangles over groups of 1s. Groups must be powers of 2 (1,2,4,8). The K-Map wraps — top/bottom and left/right edges are adjacent.
          ${done ? '<br><strong style="color:var(--success);">Group hint: ' + ex.groupDesc + '</strong>' : ''}
        </p>
        <div class="kmap-loop-colors">
          ${swatches}
          <button class="btn btn-secondary btn-sm" onclick="KMap._clearCanvas()" style="margin-left:4px;">Clear</button>
        </div>
        <div class="kmap-grid-outer">
          <div class="kmap-draw-wrap" id="kmap-draw-wrap">
            ${gridHTML}
            <canvas id="kmap-draw-canvas" class="kmap-draw-canvas"></canvas>
          </div>
        </div>
        <button class="btn btn-primary" onclick="KMap.confirmStep3()" ${done || locked ? 'disabled' : ''} style="margin-top:10px;">
          I've drawn my groups →
        </button>
        <div id="kmap-step3-feedback"></div>
      </div>`;
  },

  // ── Step 4: Write simplified SOP ──
  _renderStep4(ex, status) {
    const locked = status === 'locked';
    const done   = status === 'correct';

    return `
      <div class="kmap-step ${locked ? 'locked' : ''} ${done ? 'step-complete' : ''}">
        <div class="kmap-step-header">
          <div class="kmap-step-num">4</div>
          <div class="kmap-step-title">Write the simplified Sum of Products</div>
          ${done ? '<span class="kmap-step-badge correct-badge">✓ Correct</span>' : locked ? '<span class="kmap-step-badge locked-badge">Locked</span>' : ''}
        </div>
        <div class="kmap-answer-row">
          <input type="text" class="kmap-answer-input" id="kmap-simp-input"
            placeholder="Simplified expression (e.g. A'B + C)"
            ${done ? `value="${toCIEText(ex.simplifiedSOP)}" disabled` : ''}
            oninput="KMap._updatePreview('kmap-simp-preview','kmap-simp-input')"
            onkeydown="if(event.key==='Enter')KMap.checkStep4()">
          <button class="btn btn-primary" onclick="KMap.checkStep4()" ${done || locked ? 'disabled' : ''}>Check Answer</button>
        </div>
        <div class="live-preview live-preview-inline" id="kmap-simp-preview" style="margin-bottom:8px;">
          <div class="live-preview-label">CIE Notation Preview</div>
          <div class="live-preview-content" id="kmap-simp-preview-content"></div>
        </div>
        <div id="kmap-step4-feedback"></div>
      </div>`;
  },

  _renderComplete(ex) {
    return `
      <div class="kmap-complete-banner">
        <h3>Exercise complete!</h3>
        <p>${renderCIE(ex.explanation)}</p>
      </div>`;
  },

  // ── Step checkers ──

  checkStep1() {
    const input = document.getElementById('kmap-sop-input');
    if (!input || !input.value.trim()) return;
    const ex = this._ex();
    const fb = document.getElementById('kmap-step1-feedback');
    const val = input.value.trim();

    if (_matchesMinterms(val, ex.minterms)) {
      input.classList.add('correct');
      input.disabled = true;
      this._state.step1 = 'correct';
      this._state.step1Answer = val;
      this._state.step2 = 'active';
      fb.innerHTML = '<div class="kmap-feedback correct">Correct! Your SOP matches the truth table. Now fill in the K-Map.</div>';
      // Re-render step 2 as unlocked
      this._refreshSteps();
    } else {
      input.classList.add('incorrect');
      fb.innerHTML = '<div class="kmap-feedback incorrect">That SOP doesn\'t match the truth table — check which rows have Q=1 and write a term for each.</div>';
    }
  },

  checkStep2() {
    const ex = this._ex();
    const mintermSet = new Set(ex.minterms);
    let allCorrect = true;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = document.querySelector(`.kmap-cell[data-r="${r}"][data-c="${c}"]`);
        if (!cell) continue;
        const mt = _kmapCellMinterm(r, c);
        const expected = mintermSet.has(mt) ? 1 : 0;
        const filled   = this._cellValues[r][c];
        if (filled !== expected) {
          allCorrect = false;
          cell.classList.add('cell-wrong');
          cell.classList.remove('cell-correct');
        } else {
          cell.classList.add('cell-correct');
          cell.classList.remove('cell-wrong');
        }
      }
    }

    const fb = document.getElementById('kmap-step2-feedback');
    if (allCorrect) {
      this._state.step2 = 'correct';
      this._state.step3 = 'active';
      fb.innerHTML = '<div class="kmap-feedback correct">K-Map filled correctly! Now draw loops around the groups of 1s.</div>';
      this._refreshSteps();
    } else {
      fb.innerHTML = '<div class="kmap-feedback incorrect">Some cells are wrong — red cells don\'t match the truth table. Check again.</div>';
    }
  },

  confirmStep3() {
    if (!this._hasDrawing) {
      document.getElementById('kmap-step3-feedback').innerHTML =
        '<div class="kmap-feedback info">Draw at least one loop on the K-Map before continuing.</div>';
      return;
    }
    this._state.step3 = 'done';
    this._state.step4 = 'active';
    document.getElementById('kmap-step3-feedback').innerHTML =
      '<div class="kmap-feedback correct">Loops recorded. Now write the simplified SOP from your groupings.</div>';
    this._refreshSteps();
  },

  checkStep4() {
    const input = document.getElementById('kmap-simp-input');
    if (!input || !input.value.trim()) return;
    const ex = this._ex();
    const fb = document.getElementById('kmap-step4-feedback');
    const val = input.value.trim();
    const normVal = _normSOP(val);

    const isCorrect = ex.simplifiedAcceptable.some(a => _normSOP(a) === normVal)
      || _matchesMinterms(val, ex.minterms);

    if (isCorrect) {
      input.classList.add('correct');
      input.disabled = true;
      this._state.step4 = 'correct';
      fb.innerHTML = '<div class="kmap-feedback correct">Correct! All four steps complete.</div>';
      saveProgress('kmap_' + ex.id, { status: 'correct', hintUsed: false, working: '' });
      this._refreshSteps();
    } else {
      input.classList.add('incorrect');
      fb.innerHTML = '<div class="kmap-feedback incorrect">Not quite — check your loop groupings and derive each term from the variables that stay constant within the loop.</div>';
    }
  },

  // ── Helpers ──

  _refreshSteps() {
    // Re-render only step sections without destroying the whole area.
    // For simplicity, just re-render everything (inputs are read before this call).
    const ex = this._ex();
    const s = this._state;
    const area = document.getElementById('kmap-exercise-area');
    // Replace step divs only
    const steps = area.querySelectorAll('.kmap-step');
    const newHTML = [
      this._renderStep1(ex, s.step1),
      this._renderStep2(ex, s.step2),
      this._renderStep3(ex, s.step3),
      this._renderStep4(ex, s.step4),
    ];
    newHTML.forEach((html, i) => {
      if (steps[i]) steps[i].outerHTML = html; // replaced in DOM
    });

    // Re-render complete banner if needed
    const existing = area.querySelector('.kmap-complete-banner');
    if (s.step4 === 'correct' && !existing) {
      area.insertAdjacentHTML('beforeend', this._renderComplete(ex));
    }

    // Re-attach events
    this._attachStep2Events();
    this._attachCanvasEvents();
    this._attachInputEvents();
  },

  _attachStep2Events() {
    document.querySelectorAll('.kmap-cell.fillable').forEach(cell => {
      cell.onclick = () => {
        const r = +cell.dataset.r, c = +cell.dataset.c;
        this._cellValues[r][c] = 1 - this._cellValues[r][c];
        const v = this._cellValues[r][c];
        cell.classList.toggle('filled-one', v === 1);
        cell.classList.toggle('filled-zero', v === 0);
        cell.querySelector('.cell-val').textContent = v;
      };
    });
  },

  _attachCanvasEvents() {
    const canvas = document.getElementById('kmap-draw-canvas');
    const wrap   = document.getElementById('kmap-draw-wrap');
    if (!canvas || !wrap) return;

    // Size canvas to cover the cell area (4×56 × 4×52)
    const cellW = 56, cellH = 52;
    canvas.width  = 4 * cellW;
    canvas.height = 4 * cellH;
    canvas.style.width  = (4 * cellW) + 'px';
    canvas.style.height = (4 * cellH) + 'px';

    const ctx = canvas.getContext('2d');

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    };

    const startDraw = (e) => {
      e.preventDefault();
      this._drawing = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = this._loopColors[this._currentColor];
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };
    const moveDraw = (e) => {
      if (!this._drawing) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      this._hasDrawing = true;
    };
    const stopDraw = () => { this._drawing = false; };

    canvas.addEventListener('mousedown',  startDraw);
    canvas.addEventListener('mousemove',  moveDraw);
    canvas.addEventListener('mouseup',    stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove',  moveDraw,  { passive: false });
    canvas.addEventListener('touchend',   stopDraw);
  },

  _attachInputEvents() {
    // Restore cursor to SOP input if step 1 is active
    const sopInput = document.getElementById('kmap-sop-input');
    if (sopInput && !sopInput.disabled) setTimeout(() => sopInput.focus(), 80);
  },

  _selectColor(i) {
    this._currentColor = i;
    document.querySelectorAll('.kmap-loop-swatch').forEach((s, idx) =>
      s.classList.toggle('active', idx === i));
  },

  _clearCanvas() {
    const canvas = document.getElementById('kmap-draw-canvas');
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    this._hasDrawing = false;
  },

  _updatePreview(wrapId, inputId) {
    const input = document.getElementById(inputId);
    const wrap  = document.getElementById(wrapId);
    const content = document.getElementById(wrapId + '-content');
    if (!input || !wrap || !content) return;
    const val = input.value.trim();
    if (val) {
      content.innerHTML = renderTypedInput(val);
      wrap.classList.add('visible');
    } else {
      content.innerHTML = '';
      wrap.classList.remove('visible');
    }
  },

  // ── HTML builders ──

  _truthTableHTML(minterms) {
    const mintSet = new Set(minterms);
    let rows = '';
    for (let m = 0; m < 16; m++) {
      const A = (m >> 3) & 1, B = (m >> 2) & 1, C = (m >> 1) & 1, D = m & 1;
      const Q = mintSet.has(m) ? 1 : 0;
      rows += `<tr class="${Q ? 'minterm-row' : ''}">
        <td>${A}</td><td>${B}</td><td>${C}</td><td>${D}</td>
        <td class="${Q ? 'output-one' : 'output-zero'}">${Q}</td>
      </tr>`;
    }
    return `<div style="overflow-x:auto;margin-bottom:12px;">
      <table class="kmap-truth-table">
        <thead><tr><th>A</th><th>B</th><th>C</th><th>D</th><th>Q</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  },

  _kmapGridHTML(minterms, mode) {
    // mode: 'fill' (student fills step 2) | 'values' (show correct values, read-only)
    // Layout: AB across the top (columns), CD down the side (rows)
    const mintSet = new Set(minterms);
    const colLabels = ['00', '01', '11', '10']; // AB values
    const rowLabels = ['00', '01', '11', '10']; // CD values

    let cells = `
      <div class="kmap-corner">CD \\ AB</div>
      <div class="kmap-col-hdr">${colLabels[0]}</div>
      <div class="kmap-col-hdr">${colLabels[1]}</div>
      <div class="kmap-col-hdr">${colLabels[2]}</div>
      <div class="kmap-col-hdr">${colLabels[3]}</div>`;

    for (let r = 0; r < 4; r++) {
      cells += `<div class="kmap-row-hdr">${rowLabels[r]}</div>`;
      for (let c = 0; c < 4; c++) {
        const mt = _kmapCellMinterm(r, c);
        const val = mintSet.has(mt) ? 1 : 0;
        if (mode === 'values') {
          cells += `<div class="kmap-cell ${val ? 'cell-one' : 'cell-zero'}" data-r="${r}" data-c="${c}">
            <span class="cell-mt">${mt}</span>
            <span class="cell-val">${val}</span>
          </div>`;
        } else {
          // fillable: default 0, student clicks to toggle
          const sv = this._cellValues[r][c];
          cells += `<div class="kmap-cell fillable ${sv ? 'filled-one' : 'filled-zero'}" data-r="${r}" data-c="${c}">
            <span class="cell-mt">${mt}</span>
            <span class="cell-val">${sv}</span>
          </div>`;
        }
      }
    }
    return `<div class="kmap-grid">${cells}</div>`;
  },

  /** Returns a sample single-minterm term (the first minterm) as CIE text for the hint. */
  _sampleMintermCIE(m) {
    const A = (m >> 3) & 1, B = (m >> 2) & 1, C = (m >> 1) & 1, D = m & 1;
    return [
      A ? 'A' : "A'",
      B ? 'B' : "B'",
      C ? 'C' : "C'",
      D ? 'D' : "D'"
    ].join('');
  },

  _sampleMintermTerm(m) {
    const A = (m >> 3) & 1, B = (m >> 2) & 1, C = (m >> 1) & 1, D = m & 1;
    return [A ? 'A' : '¬A', B ? 'B' : '¬B', C ? 'C' : '¬C', D ? 'D' : '¬D'].join('∧');
  },

  _sopPlaceholder(ex) {
    return ex.minterms.map(m => this._sampleMintermCIE(m)).join(' + ');
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
