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
  // Convert prefix ¬ to postfix ' — process left to right
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


// ── Initialise ──
document.addEventListener('DOMContentLoaded', async () => {
  await loadExercises();
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
const App = {

  setRole(role) {
    currentRole = role;
    document.querySelectorAll('#role-toggle button').forEach(b => {
      b.classList.toggle('active', b.dataset.role === role);
    });
  },

  login(e) {
    e.preventDefault();
    const first = document.getElementById('first-name').value.trim();
    const last = document.getElementById('last-name').value.trim();
    if (!first || !last) return;

    const userId = `${first.toLowerCase()}_${last.toLowerCase()}`;
    currentUser = { firstName: first, lastName: last, id: userId };

    localStorage.setItem('ba_session', JSON.stringify({ user: currentUser, role: currentRole }));

    if (currentRole === 'student') {
      const existing = localStorage.getItem(`ba_progress_${userId}`);
      if (!existing) {
        const progress = { userId, firstName: first, lastName: last, exercises: {}, startedAt: new Date().toISOString() };
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

  const initials = (currentUser.firstName[0] + currentUser.lastName[0]).toUpperCase();
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

        <label class="working-label">Show your working <span class="required">* required</span></label>
        <textarea class="working-textarea" id="working-input"
          placeholder="Show each step of your simplification, naming the law used at each step.&#10;&#10;e.g.&#10;= A'.B + A.B    [De Morgan's]&#10;= B.(A' + A)      [Factorise / Distributive]&#10;= B.1                [Complement]&#10;= B                   [Identity]"
          ${exProgress?.status === 'correct' ? 'disabled' : ''}>${exProgress?.status === 'correct' && exProgress?.working ? exProgress.working : ''}</textarea>
        <div class="working-warning" id="working-warning">⚠ Please show your working before submitting your answer.</div>

        <label class="working-label">Final answer</label>
        <div class="answer-input-group">
          <input type="text" class="answer-input" id="answer-input"
            placeholder="Type your final simplified answer (e.g. A'.B + C)"
            ${exProgress?.status === 'correct' ? `value="${toCIEText(ex.answer)}" disabled` : ''}
            onkeydown="if(event.key==='Enter')Practice.checkAnswer()">
          <button class="btn btn-primary" onclick="Practice.checkAnswer()"
            ${exProgress?.status === 'correct' ? 'disabled' : ''}>Check</button>
        </div>
        <div class="exercise-actions">
          <button class="btn btn-secondary btn-sm" onclick="Practice.showHint()">💡 Hint</button>
          <button class="btn btn-secondary btn-sm" onclick="Practice.showAnswer()">👁 Show Answer</button>
        </div>
        <div id="feedback-area">${feedbackHTML}</div>
        <div style="margin-top:12px;padding:10px 14px;background:var(--bg);border-radius:var(--radius-sm);font-size:0.75rem;color:var(--text-muted);">
          <strong>How to type CIE notation:</strong> &nbsp;
          AND → type <code style="background:rgba(0,0,0,.06);padding:1px 5px;border-radius:3px;">.</code> &nbsp;
          OR → type <code style="background:rgba(0,0,0,.06);padding:1px 5px;border-radius:3px;">+</code> &nbsp;
          NOT → type <code style="background:rgba(0,0,0,.06);padding:1px 5px;border-radius:3px;">'</code> after a variable or <code style="background:rgba(0,0,0,.06);padding:1px 5px;border-radius:3px;">)</code> &nbsp;
          — the preview below will show the overbar: e.g. type <code style="background:rgba(0,0,0,.06);padding:1px 5px;border-radius:3px;">A'</code> → ${renderCIE('¬A')}, &nbsp;
          <code style="background:rgba(0,0,0,.06);padding:1px 5px;border-radius:3px;">(A+B)'</code> → ${renderCIE('¬(A+B)')}
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

    document.getElementById('streak-display').innerHTML = `🔥 ${streak} streak`;
    if (streak >= 3) document.getElementById('streak-display').classList.add('active');
    else document.getElementById('streak-display').classList.remove('active');
  },

  /* ── Answer Checker ──
     Normalises both the student's input and every acceptable answer
     into a common canonical form so notation differences don't matter.
     
     Accepted input styles:
       CIE:         A.B + C    A'.B     (A+B)'
       Symbolic:    A∧B ∨ C    ¬A∧B     ¬(A∨B)
       Words:       A AND B OR C   NOT A AND B
       Programming: A && B || C    !A && B
       Prime:       A'B + C'
  */
  checkAnswer() {
    const ex = filteredExercises[currentExerciseIndex];
    const input = document.getElementById('answer-input');
    const workingInput = document.getElementById('working-input');
    const workingWarning = document.getElementById('working-warning');
    const userAnswer = input.value.trim();
    const userWorking = workingInput.value.trim();

    if (!userAnswer) return;

    // Require working to be shown (at least 10 characters — a meaningful step)
    if (userWorking.length < 10) {
      workingWarning.classList.add('show');
      workingInput.classList.add('error');
      workingInput.focus();
      return;
    }
    workingWarning.classList.remove('show');
    workingInput.classList.remove('error');

    const normalise = s => s.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/·/g, '∧')        // middle dot → ∧
      .replace(/\./g, '∧')       // period/full stop → ∧  (CIE AND)
      .replace(/\+/g, '∨')       // plus → ∨  (CIE OR)
      .replace(/!/g, '¬')        // bang → ¬
      .replace(/not/gi, '¬')     // word NOT
      .replace(/and/gi, '∧')     // word AND
      .replace(/or/gi, '∨')      // word OR
      .replace(/'/g, '¬');        // prime → ¬  (CIE NOT)

    const normUser = normalise(userAnswer);
    const isCorrect = ex.acceptableAnswers.some(a => normalise(a) === normUser);

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
      const name = ((st.progress.firstName || '') + ' ' + (st.progress.lastName || '')).toLowerCase();
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
      const initials = ((st.progress.firstName || st.uid)[0] + (st.progress.lastName || '?')[0]).toUpperCase();
      let scoreClass = 'score-mid';
      if (st.accuracy >= 70) scoreClass = 'score-high';
      else if (st.accuracy < 40 && st.attempted > 0) scoreClass = 'score-low';
      let lastActive = '';
      if (st.progress.lastActive) {
        const mins = Math.floor((Date.now() - new Date(st.progress.lastActive).getTime()) / 60000);
        if (mins < 1) lastActive = 'just now'; else if (mins < 60) lastActive = mins + 'm ago';
        else if (mins < 1440) lastActive = Math.floor(mins / 60) + 'h ago'; else lastActive = Math.floor(mins / 1440) + 'd ago';
      }
      return `<div class="student-row ${this.selectedStudent === st.uid ? 'selected' : ''}" onclick="Teacher.selectStudent('${st.uid}')"><div class="student-avatar-sm">${initials}</div><div class="student-info"><div class="student-name">${st.progress.firstName || st.uid} ${st.progress.lastName || ''}</div><div class="student-stats-mini">${st.attempted}/${EXERCISES.length} done · ${st.correct} correct${lastActive ? ' · <span class="student-last-active">' + lastActive + '</span>' : ''}</div></div><span class="student-score-badge ${scoreClass}">${st.accuracy}%</span></div>`;
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
      ? atRiskList.map(st => `<div class="at-risk-row" onclick="Teacher.selectStudent('${st.uid}')"><span class="at-risk-name">${st.progress.firstName} ${st.progress.lastName}</span><span class="at-risk-stat">${st.accuracy}% (${st.attempted} done)</span></div>`).join('')
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
    document.getElementById('heatmap-student-name').textContent = (p?.firstName || uid) + ' ' + (p?.lastName || '');
    document.getElementById('heatmap-mode-label').textContent = 'Green = correct, red = incorrect, amber = hint used.';
    document.getElementById('suggestion-target').textContent = (p?.firstName || uid) + ' ' + (p?.lastName || '');
    document.getElementById('teacher-detail-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  deselectStudent() {
    this.selectedStudent = null;
    document.getElementById('working-viewer-card').style.display = 'none';
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

    document.getElementById('detail-card-title').innerHTML = `📊 ${progress.firstName} ${progress.lastName} <button class="btn btn-secondary btn-sm" style="margin-left:auto;font-size:0.72rem;" onclick="Teacher.deselectStudent()">← Back to Class</button>`;

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
    document.getElementById('working-viewer-name').textContent = (progress.firstName || uid) + ' ' + (progress.lastName || '');

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
    if (!confirm('Generate 8 demo students with randomised progress?')) return;
    const names = [['Emma','Watson'],['James','Liu'],['Sophie','Taylor'],['Oliver','Khan'],['Mia','Patel'],['Noah','Smith'],['Ava','Chen'],['Liam','Brown']];
    const roster = JSON.parse(localStorage.getItem('ba_roster') || '[]');
    names.forEach(([first, last]) => {
      const uid = `${first.toLowerCase()}_${last.toLowerCase()}`; if (roster.includes(uid)) return; roster.push(uid);
      const exercises = {}, num = 15 + Math.floor(Math.random() * 70);
      const shuffled = [...EXERCISES].sort(() => Math.random() - 0.5).slice(0, num);
      const strengths = {}; Object.keys(CATEGORIES).forEach(k => { strengths[k] = 0.3 + Math.random() * 0.6; });
      shuffled.forEach(ex => { const chance = strengths[ex.category] - (ex.difficulty - 1) * 0.12; const correct = Math.random() < chance; exercises[ex.id] = { status: correct ? 'correct' : 'incorrect', attempts: correct ? 1 : 1 + Math.floor(Math.random() * 3), hintUsed: !correct && Math.random() < 0.4, working: correct ? `= step [${ex.lawUsed}]\n= ${ex.answer}` : '', timestamp: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString() }; });
      localStorage.setItem(`ba_progress_${uid}`, JSON.stringify({ userId: uid, firstName: first, lastName: last, exercises, startedAt: new Date().toISOString(), lastActive: new Date(Date.now() - Math.random() * 3 * 86400000).toISOString() }));
    });
    localStorage.setItem('ba_roster', JSON.stringify(roster)); showToast('8 demo students generated.', 'success'); this.render();
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
