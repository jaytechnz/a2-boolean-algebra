# Boolean Algebra Revision Hub — Setup & Deployment Guide

**Cambridge A2 Computer Science 9618**

---

## Overview

This is a single-page web application for Boolean algebra practice. It uses:

- **Firebase Authentication** — email/password login (accounts created automatically on first login)
- **Firestore** — stores user profiles, progress, and class codes
- **Vercel** — static hosting + serverless function for handwriting recognition
- **Google Cloud Vision API** — recognises handwritten Boolean expressions drawn on the canvas

There is no build step. All files are static and deployed by pushing to GitHub.

---

## File Structure

```
boolean-algebra/
├── index.html                  # Single-page app shell + login form
├── css/
│   └── styles.css              # All styling
├── scripts/
│   ├── app.js                  # All application logic
│   ├── exercises.json          # 100 Boolean algebra exercises with metadata
│   ├── kmap-exercises.json     # 20 Karnaugh Map exercises
│   └── flipflop-exercises.json # 8 Flip-Flop exercises (SR and JK)
├── assets/
│   ├── images/                 # Barry and Bernice mascot images
│   └── animations/             # Law animation GIFs
├── api/
│   └── recognise.js            # Vercel serverless function (handwriting)
├── documentation/
│   ├── README.md               # Legacy overview (pre-Firebase, for reference)
│   └── DEMO_STUDENTS.md        # Notes on demo data
├── HANDWRITING_SETUP.md        # Google Cloud Vision setup steps
└── SETUP.md                    # This file
```

---

## Which Files to Upload After Changes

| What changed | Files to upload |
|---|---|
| App logic, auth, analytics, exercises | `scripts/app.js` |
| Styling, layout, new UI components | `css/styles.css` |
| Boolean algebra exercise content | `scripts/exercises.json` |
| K-Map exercise content | `scripts/kmap-exercises.json` |
| Flip-Flop exercise content | `scripts/flipflop-exercises.json` |
| Login form, page structure, nav | `index.html` |
| Handwriting recognition logic | `api/recognise.js` |
| Any of the above together | Upload all that changed |

Assets (images, animations) only need uploading if you add or replace files.

---

## Firebase Setup

### Project Details

- **Firebase project ID**: `a2-boolean-algebra`
- **Console**: [console.firebase.google.com](https://console.firebase.google.com) → select `a2-boolean-algebra`

The Firebase config is embedded directly in `scripts/app.js` at the top of the file. This is safe — the config is public by design and security is enforced by Firestore rules (see below).

### Services Used

| Service | Purpose |
|---|---|
| Firebase Authentication | Email/password login. Accounts are created automatically on first login. |
| Firestore | Stores user profiles (`users`), exercise progress (`progress`), and class codes (`classCodes`). |

### Firestore Collections

#### `users/{uid}`
```json
{
  "email": "alex.chen@student.cga.school",
  "role": "student",
  "displayName": "Alex Chen",
  "teacherUid": "<teacher's Firebase UID>",
  "createdAt": "<timestamp>"
}
```
Teacher docs also have a `classCode` field (6-character alphanumeric, e.g. `"X4K9PL"`).

#### `progress/{uid}`
```json
{
  "userId": "<uid>",
  "firstName": "Alex Chen",
  "email": "alex.chen@student.cga.school",
  "exercises": {
    "1": { "status": "correct", "hintUsed": false, "attempts": 1, "working": "..." },
    "7": { "status": "incorrect", "hintUsed": true, "attempts": 3, "working": "..." },
    "kmap_1": { "status": "correct", "hintUsed": false, "working": "" },
    "ff_1": { "status": "correct", "hintUsed": false }
  },
  "startedAt": "<ISO timestamp>",
  "lastActive": "<ISO timestamp>"
}
```

K-Map exercise progress is stored in the same `exercises` map using keys prefixed with `kmap_` (e.g. `kmap_1` through `kmap_20`).

Flip-Flop exercise progress uses keys prefixed with `ff_` (e.g. `ff_1` through `ff_8`). Flip-Flop exercises do not record working.

#### `classCodes/{code}`
```json
{
  "teacherUid": "<teacher's Firebase UID>"
}
```

---

## Firestore Security Rules

Go to **Firebase Console → Firestore → Rules** and set:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isTeacher() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }

    // users
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Teachers can read student docs linked to them
      allow read: if request.auth != null
                  && isTeacher()
                  && resource.data.teacherUid == request.auth.uid;

      // Teachers can create demo student docs
      allow create: if request.auth != null
                    && isTeacher()
                    && request.resource.data.teacherUid == request.auth.uid;
    }

    // progress
    match /progress/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Teachers can read and write progress for their students
      allow read, write: if request.auth != null
                         && get(/databases/$(database)/documents/users/$(userId)).data.teacherUid == request.auth.uid;
    }

    // classCodes — anyone authenticated can read (needed during student sign-up)
    match /classCodes/{code} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && isTeacher();
    }
  }
}
```

---

## Authentication Rules

| Role | Email domain required |
|---|---|
| Student | `@student.cga.school` |
| Teacher | `@cga.school` (but NOT `@student.cga.school`) |

Accounts are created automatically on first login — there is no separate registration flow. If the email already has an account, the password is used to sign in. If the password is wrong, the user sees "Incorrect password."

Students must enter a **class code** (given to them by their teacher) when creating an account. This links them to the correct teacher in Firestore.

Teachers get a class code generated for them automatically when their account is first created.

---

## Resetting a Password

### Teacher forgot password

Option 1 — from the Teacher Dashboard: click **Reset Password** in the teacher tools section. A reset email is sent to the logged-in teacher's address.

Option 2 — from Firebase Console: go to **Authentication → Users**, find the email address, click the three-dot menu → **Send password reset email**.

### Student forgot password

Go to **Firebase Console → Authentication → Users**, find the student's email, and send a password reset email from there. Students cannot reset passwords themselves within the app.

---

## Deployment (Vercel)

The site is hosted on Vercel, which also runs the handwriting recognition serverless function from `api/recognise.js`.

### Initial Setup

1. Push the repository to GitHub
2. In [vercel.com/dashboard](https://vercel.com/dashboard), create a new project → import from GitHub
3. Settings:
   - **Framework preset**: None
   - **Build command**: _(leave blank)_
   - **Output directory**: `.` (repo root)
4. Deploy

### Updating the Site

Push to GitHub — Vercel auto-deploys from the connected branch.

If you edit files locally (via VS Code / iCloud sync), commit and push to trigger a redeploy. Alternatively, you can drag-and-drop files directly in the Vercel dashboard under **Deployments → Upload**.

### Environment Variables (Vercel)

Required for handwriting recognition:

| Variable | Value |
|---|---|
| `GOOGLE_VISION_API_KEY` | Your Google Cloud Vision API key |

Set in: **Vercel Dashboard → Project → Settings → Environment Variables**

See `HANDWRITING_SETUP.md` for full Google Cloud Vision setup instructions.

---

## Teacher Dashboard Features

### Class Overview

- Summary stats: total students, average accuracy, average completion, at-risk count, excelling count, total hints used
- Topic accuracy bar chart (canvas-drawn, per category)
- Hardest exercises list — top 5 exercises with lowest correct rate among those attempted by at least 25% of students
- Students needing support — lowest-performing students, click to view details

### Individual Student View

Clicking a student shows:
- Summary stats (attempted, correct, incorrect, accuracy, hints)
- **Topic Breakdown** — accuracy per category with progress bars
- **Law-by-Law Accuracy** — finer-grained breakdown by specific law (e.g. "De Morgan's Second Law"), with hint badges (H) where hints were used
- **Difficulty Breakdown** — Easy / Medium / Hard correct counts
- **Mastery Breakdown** — stacked horizontal bar chart per category showing correct / correct-with-hint / incorrect / not-attempted counts
- **K-Map Progress** — bar chart showing completion status for each of the 20 K-Map exercises (green = correct, amber = correct with hint, red = incorrect, grey = not attempted)

### Exercise Heatmap

10×10 grid of all 100 Boolean algebra exercises. In class view: colour intensity shows proportion correct. In student view: green = correct, red = incorrect, amber = hint used, grey = not attempted.

A second smaller grid below shows the 20 K-Map exercises with the same colour coding.

### Diagnostic Insights

The suggestions panel (labelled "Diagnostic Insights") categorises issues into three sections:

| Section | What it flags |
|---|---|
| **Cognitive — Concept Understanding** | Misunderstands a law (low accuracy with or without hints); can't chain laws in multi-step problems despite single-step accuracy |
| **Stylistic — Notation & Recall** | Hint-dependent despite correct outcomes — knows the answer but can't independently write the notation |
| **Skills — Procedure & Engagement** | High average attempts (trial-and-error pattern); not progressing to harder questions; low exercise volume |

This works at both class level and individual student level.

### Student Working Viewer

Shows the step-by-step working the student typed for each exercise. Filterable by All / Correct / Incorrect / Hint used. Useful for identifying where in a simplification a student goes wrong.

### Demo Data

The teacher dashboard has a **Generate Demo Data** button that creates fake student records directly in Firestore (using `demo_` prefix UIDs). These appear in the teacher dashboard but cannot log in. Useful for testing the analytics before real students join.

---

## Adding or Editing Boolean Algebra Exercises

Edit `scripts/exercises.json`. Each exercise follows this schema:

```json
{
  "id": 101,
  "category": "de_morgan",
  "difficulty": 2,
  "type": "simplify",
  "title": "Exercise Title",
  "question": "Plain English question",
  "expression": "Formal notation expression",
  "answer": "Primary correct answer",
  "acceptableAnswers": [
    "answer variant 1",
    "answer variant 2"
  ],
  "hint": "Hint without revealing the answer",
  "lawUsed": "Name of the Boolean law",
  "explanation": "Full worked solution"
}
```

**Fields:**
- `category`: must match a key in the `CATEGORIES` object in `app.js`
- `difficulty`: `1` (Easy), `2` (Medium), `3` (Hard)
- `acceptableAnswers`: include as many notation variants as needed — the checker normalises whitespace, case, and common symbol equivalents, but exact string matching is the final step

**Working is not compulsory.** Students can submit an answer without providing working. The `workingRequired` flag is set to `false` in `app.js`.

---

## Exercise Categories

| Category key | Display name | Count |
|---|---|---|
| `de_morgan` | De Morgan's Laws | 15 |
| `distributive` | Distributive Law | 12 |
| `absorption` | Absorption Law | 10 |
| `identity_null` | Identity & Null Laws | 10 |
| `commutative_associative` | Commutative & Associative | 8 |
| `inverse_complement` | Complement Laws | 10 |
| `double_negation` | Double Negation | 5 |
| `multi_step` | Multi-step Simplification | 15 |
| `cie_exam` | CIE Exam Style | 15 |

---

## Karnaugh Maps Section

The K-Maps screen (`scripts/kmap-exercises.json`) is a separate interactive feature from the main Boolean algebra practice exercises. It has its own nav link and screen. There are 20 exercises in total.

### How It Works

Each K-Map exercise presents a 4-variable (A, B, C, D) truth table and walks students through four sequential steps. Each step must be completed correctly before the next unlocks.

| Step | What the student does | How it is validated |
|---|---|---|
| **1 — Write the SOP** | Types the unsimplified Sum of Products from the truth table. The truth table is on the left; the input field is on the right so students don't need to scroll. | Expression is evaluated for all 16 input combinations and compared against the truth table. Any logically equivalent form is accepted. |
| **2 — Fill the K-Map** | Clicks each cell of the 4×4 K-Map to enter 0 or 1 | All 16 cell values checked against the correct truth table output. |
| **3 — Draw loops** | Draws loops on the K-Map with mouse or stylus, then lists the minterms in each group | Groups are validated: all minterms must be 1-cells; each group must be a power-of-2 size; each group must form a valid K-Map rectangle (including wrap-around edges); all 1-cells must be covered. |
| **4 — Simplified SOP** | Types the simplified Sum of Products. The K-Map is on the left; the student's SOP from Step 1 and the answer input are on the right. | Checked against acceptable answers and also evaluated logically for equivalence. |

Navigation buttons (Previous / Next) appear at the top and bottom of each exercise.

### K-Map Layout

The K-Map uses the standard 4-variable layout with **AB across the top (columns)** and **CD down the side (rows)**, both in Gray code order (00, 01, 11, 10).

```
        AB
        00  01  11  10
CD  00 | m0 | m4 | m12 | m8  |
    01 | m1 | m5 | m13 | m9  |
    11 | m3 | m7 | m15 | m11 |
    10 | m2 | m6 | m14 | m10 |
```

Wrap-around adjacency: the top row (CD=00) and bottom row (CD=10) are adjacent, as are the leftmost column (AB=00) and rightmost column (AB=10).

### Adding or Editing K-Map Exercises

Edit `scripts/kmap-exercises.json`. Each exercise follows this schema:

```json
{
  "id": 1,
  "title": "Exercise title",
  "difficulty": 1,
  "minterms": [1, 3, 5, 7, 9, 11, 13, 15],
  "simplifiedSOP": "D",
  "simplifiedAcceptable": ["D"],
  "hint": "Hint for Step 3 loop drawing",
  "explanation": "Full explanation shown on completion",
  "groupDesc": "Description of the correct groupings (shown after Step 3 is passed)"
}
```

**Fields:**
- `minterms`: array of integers 0–15 — the rows where the truth table output is 1
- `simplifiedSOP`: the canonical simplified answer in internal notation (`¬`, `∧`, `∨`)
- `simplifiedAcceptable`: all notation variants accepted for the final answer (CIE dot/plus/prime notation, word notation, etc.)
- `groupDesc`: plain-English description of the optimal groupings, shown to students after Step 3 passes

**Step 3 group validation rules** (enforced automatically):
- Each group must contain only 1-cells (minterms in the `minterms` array)
- Each group's size must be a power of 2 (1, 2, 4, or 8)
- Each group must form a valid K-Map rectangle, including wrap-around edges (top↔bottom, left↔right)
- Every 1-cell must be covered by at least one group

### Current K-Map Exercises

Exercise titles describe the structure of the K-Map, not the answer, so as not to spoil the exercise for students.

| ID | Title | Minterms | Simplified answer | Difficulty |
|---|---|---|---|---|
| 1 | Single Group of 8 | 1,3,5,7,9,11,13,15 | D | Easy |
| 2 | Single Group of 8 — Left Columns | 0,1,2,3,4,5,6,7 | A' | Easy |
| 3 | Wrap-Around Group of 8 — Even Rows | 0,2,4,6,8,10,12,14 | D' | Easy |
| 4 | Single Group of 8 — Middle Columns | 4,5,6,7,12,13,14,15 | B | Easy |
| 5 | Single Group of 4 — One Full Row | 3,7,11,15 | C·D | Easy |
| 6 | Single Group of 4 — Corner Block | 0,1,4,5 | A'·C' | Medium |
| 7 | Wrap-Around Group of 8 — Outer Columns | 0,1,2,3,8,9,10,11 | B' | Medium |
| 8 | Single Group of 4 — Centre Block | 5,7,13,15 | B·D | Medium |
| 9 | Two Groups of 4 | 1,3,5,7,8,9,10,11 | A'D + AB' | Hard |
| 10 | Two Groups — Wrap-Around + Corner | 0,2,4,6,10,11,14,15 | A'D' + AC | Hard |
| 11 | Two Overlapping Groups | 0,1,4,5,6,7 | A'C' + A'B | Medium |
| 12 | Isolated Cell + Group of 4 | 0,5,7,13,15 | A'B'C'D' + BD | Medium |
| 13 | Another Isolated Cell | 2,4,5,12,13 | A'B'CD' + BC' | Medium |
| 14 | Three Overlapping Groups | 1,2,3,4,5,6,7 | A'B + A'C + A'D | Medium |
| 15 | Isolated Cell + Wrap-Around Group | 6,9,11,13,15 | A'BCD' + AD | Hard |
| 16 | Double Wrap-Around Group | 0,2,3,8,10,11 | B'D' + B'C | Hard |
| 17 | Two Disjoint Wrap-Around Groups | 0,2,5,7,8,10,13,15 | B'D' + BD | Hard |
| 18 | Overlapping Wrap-Around Groups | 1,3,5,9,11,13 | B'D + C'D | Hard |
| 19 | Three Groups — Two Overlapping Pairs | 4,5,6,7,10,11,13,14,15 | A'B + AC + BD | Hard |
| 20 | Three Groups with Double Wrap-Around | 0,2,3,6,7,8,9,10,11 | A'C + AB' + B'D' | Hard |

---

## Flip-Flops Section

The Flip-Flops screen (`scripts/flipflop-exercises.json`) covers SR and JK flip-flops as required by Cambridge A2 Computer Science 9618. It has its own nav link and screen.

### How It Works

Each exercise presents an interactive table. Students select an answer for each row using labelled buttons, then click **Check** to validate. Correct/incorrect cells are highlighted immediately. On full completion the exercise is saved to Firestore.

Two exercise types:

| Type | What the student does |
|---|---|
| **Truth table** | Fill in the Q(n+1) output for each combination of inputs (S/R or J/K). |
| **Timing diagram** | Given a sequence of clock pulses with input values, track Q(n) → Q(n+1) through each pulse in order. |

A **reference card** (SR or JK) is shown side-by-side with the exercise table as a visual aid.

### Answer Values

| Value | Meaning | Button colour |
|---|---|---|
| `0` | Output forced to 0 (Reset) | Grey |
| `1` | Output forced to 1 (Set) | Green |
| `Q` | No change — Q holds its current value | Blue |
| `X` | Forbidden / invalid state (SR only) | Red |
| `¬Q` | Toggle — output flips to its complement (JK only) | Purple |

### Adding or Editing Flip-Flop Exercises

Edit `scripts/flipflop-exercises.json`.

**Truth table format:**
```json
{
  "id": 1,
  "type": "sr_truth_table",
  "title": "SR Flip-Flop — Truth Table",
  "difficulty": 1,
  "rows": [
    { "in1": 0, "in2": 0, "answer": "Q" },
    { "in1": 0, "in2": 1, "answer": "0" },
    { "in1": 1, "in2": 0, "answer": "1" },
    { "in1": 1, "in2": 1, "answer": "X" }
  ],
  "hint": "...",
  "explanation": "..."
}
```

**Timing diagram format:**
```json
{
  "id": 3,
  "type": "sr_timing",
  "title": "SR Flip-Flop — Timing Diagram",
  "difficulty": 1,
  "initialQ": 0,
  "pulses": [
    { "in1": 1, "in2": 0, "answer": "1" },
    { "in1": 0, "in2": 0, "answer": "1" }
  ],
  "hint": "...",
  "explanation": "..."
}
```

- `type`: `sr_truth_table`, `jk_truth_table`, `sr_timing`, or `jk_timing`
- `initialQ`: starting state for timing diagram exercises (0 or 1)
- `in1`/`in2`: for SR exercises, `in1` = S and `in2` = R; for JK exercises, `in1` = J and `in2` = K
- `answer`: one of `"0"`, `"1"`, `"Q"`, `"X"` (SR only), `"¬Q"` (JK only)

### Current Flip-Flop Exercises

| ID | Title | Type | Difficulty |
|---|---|---|---|
| 1 | SR Flip-Flop — Truth Table | sr_truth_table | Easy |
| 2 | JK Flip-Flop — Truth Table | jk_truth_table | Easy |
| 3 | SR Flip-Flop — Timing Diagram | sr_timing | Easy |
| 4 | JK Flip-Flop — Timing Diagram | jk_timing | Easy |
| 5 | SR Flip-Flop — Forbidden State | sr_timing | Medium |
| 6 | JK Flip-Flop — Toggle | jk_timing | Medium |
| 7 | SR Flip-Flop — Extended Sequence (8 pulses, Q₀=1) | sr_timing | Hard |
| 8 | JK Flip-Flop — Extended Sequence (8 pulses, multiple toggles, Q₀=1) | jk_timing | Hard |

---

## Notation Accepted by the Answer Checker

| Style | AND | OR | NOT |
|---|---|---|---|
| Symbolic | `∧` | `∨` | `¬` |
| Word | `AND` | `OR` | `NOT` |
| Programming | `·` | `+` | `!` |
| Prime / textbook | `AB` or `A.B` | `A+B` | `A'` or `Ā` |

Students can mix notations freely. Parentheses are optional where operator precedence makes them unambiguous (AND binds before OR).

The K-Map SOP checker (Steps 1 and 4) uses a full Boolean expression evaluator — it evaluates the student's expression for all 16 input combinations and compares the result to the truth table, so any logically equivalent expression is accepted.

---

## Browser Compatibility

Requires JavaScript enabled. Tested on Chrome, Firefox, Safari, Edge (modern versions). Uses CSS custom properties, CSS Grid, Canvas API, and ES2017+ syntax. No polyfills are included.

The K-Map loop drawing canvas supports mouse, trackpad, and stylus input (including Apple Pencil on iPad).

---

## Fonts (loaded via Google Fonts)

- **Fraunces** — display headings
- **DM Sans** — body text
- **JetBrains Mono** — Boolean expressions and code

---

## Known Linter Warnings

`app.js` references `firebase`, `auth`, and `db` as globals (loaded from Firebase CDN scripts in `index.html`). Linters may flag these as undefined. They are false positives — the variables are available at runtime.
