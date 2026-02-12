# MCE Quiz App

A real-time, code-based debugging quiz platform for classroom batches (~30 students per session).

The platform resembles a Kahoot-style experience, but questions (especially code) are displayed directly on students’ mobile screens.

---

# 1. Core Purpose

A real-time quiz system designed specifically for:

* Code debugging questions
* Program output prediction
* Concept-based technical questions

The system prioritizes:

* Secure answer validation (server-side only)
* Real-time leaderboard updates
* Anti-cheating mechanisms
* Batch-based execution

---

# 2. User Roles

## 2.1 Student (No Account Required)

Students join using:

* Username
* Class (Allowed: `E27 | E29 | E37A | E37B`)
* Unique Quiz Code

No login/password system.

### Student Rules

* Cannot rejoin after dropping out.
* If student switches tabs (ALT+TAB), their:

  * Score resets to 0
  * They are permanently locked from rejoining that quiz.
* Score persists if they disconnect.
* No correct answers ever sent to client.
* Server validates correctness and timing.

---

## 2.2 Admin

Full dashboard access with control over:

### Question Management

* Add questions
* Edit questions
* Delete questions
* Filter by category
* Generate questions via LLM (based on topic + difficulty)

### Quiz Management

* Start quiz
* Stop quiz
* Preview quiz as student
* Generate unique quiz code
* Import quiz from CSV/Excel
* Export results as:

  * CSV
  * Excel
  * PDF
  * DOCX

### Monitoring

* View real-time leaderboard
* View active users count
* View quiz questions
* View recently started quizzes

---

# 3. Question Structure

Each question contains:

1. Question Text
2. Options (max 5)
3. Correct Option (stored server-side only)
4. Time Limit (10 seconds – 3 minutes)
5. Question Type
6. Category (optional)
7. Code Snippet (optional; required for type 1 & 2)

### Question Types

1. Program Output Based
2. Code Correction Based
3. Knowledge Based

---

# 4. Leaderboard Logic

Leaderboard updates in real-time.

Ranking Rules:

1. Higher total score ranks higher.
2. If same score:

   * Earlier correct answer ranks higher.
3. If same score and same answer timestamp:

   * Higher average correct answers ranks higher.
4. If still tied:

   * Lower total time spent ranks higher.

All scoring and timing logic must be handled server-side.

---

# 5. Quiz Execution Flow

1. Admin creates/selects quiz.
2. Admin generates unique quiz code.
3. Students join using:

   * Name
   * Class
   * Quiz code
4. Admin previews quiz (optional).
5. Admin starts quiz.
6. Questions are pushed to students in real-time.
7. Leaderboard updates dynamically.
8. Admin stops quiz.
9. Results available for export.

Batch size: ~30 students.

---

# 6. Security & Anti-Cheating Rules

* Correct answers NEVER sent to client.
* Server determines:

  * Correctness
  * Time validity
* Tab switching detection:

  * If detected → score reset + permanent disqualification.
* No rejoining after disconnect or disqualification.
* No answer manipulation from client side.
* Timing controlled and verified by server.

---

# 7. Admin Dashboard Requirements

Dashboard must show:

* Recently started quizzes
* Active users count (real-time)
* Pie chart showing:

  * Correct answers
  * Incorrect answers
  * Timed-out answers

Must support live updates.

---

# 8. LLM Integration

Admin can:

* Select topic
* Select difficulty
* Auto-generate questions

Generated question must include:

* Question text
* 4–5 options
* Correct answer (stored server-side only)
* Type classification
* Optional code snippet (formatted)

---

# 9. Code Display Requirements

If code is included:

* Proper formatting
* Syntax highlighting
* Clean indentation
* Monospace font
* Scrollable container (if long)

---

# 10. UI & Design System

## Styling

* Tailwind CSS
* shadcn/ui components
* lucide-react icons

## Theme

* System theme support (light/dark)
* Accent color: `#23388D`

### Light Mode

| Token            | Color     | Usage                                      |
| ---------------- | --------- | ------------------------------------------ |
| `background`     | `#FAFAFA` | Main app background                        |
| `surface`        | `#FFFCFC` | Cards, panels, containers                  |
| `surface-muted`  | `#F2F2F2` | Subtle sections, grouped areas             |
| `surface-subtle` | `#F1F0F0` | Input backgrounds, dividers, soft contrast |

#### Text colors
| Token           | Color     | Usage                                              |
| --------------- | --------- | -------------------------------------------------- |
| `text-primary`  | `#262626` | Main dark cards / nav areas                        |
| `text-secondary` | `#3D3D3D` | Borders, separators, subtle elevation in dark mode |


### Dark Mode

| Token            | Color     | Usage                                      |
| ---------------- | --------- | ------------------------------------------ |
| `background`     | `#1A1A1A` | Main app background                        |
| `surface`        | `#262626` | Cards, panels, containers                  |
| `surface-muted`  | `#333333` | Subtle sections, grouped areas             |
| `surface-subtle` | `#3D3D3D` | Input backgrounds, dividers, soft contrast |

#### Text colors
| Token           | Color     | Usage                                              |
| --------------- | --------- | -------------------------------------------------- |
| `text-primary`  | `#FAFAFA` | Main dark cards / nav areas                        |
| `text-secondary` | `#F2F2F2` | Borders, separators, subtle elevation in dark mode |


### Accent Colors
| Token     | Color     | Usage                                     |
| --------- | --------- | ----------------------------------------- |
| `primary` | `#28388D` | Buttons, active states, links, highlights |


### Status Colors

* Red: `#FD2323`
* Green: `#23FD23`
* Yellow: `#FDFD23`
* Blue: `#2323FD`
  (Variants allowed but must remain distinct, consistent and aligned with rest of the design.)

## UX Principles

* Professional yet playful
* Minimal glow and shadow effects
* Subtle animations
* Clean layout
* Responsive mobile-first design

---

# 11. Performance Requirements

* Real-time leaderboard updates (WebSockets recommended)
* Smooth question transitions
* Low latency validation
* Stable handling for ~30 concurrent users per batch
