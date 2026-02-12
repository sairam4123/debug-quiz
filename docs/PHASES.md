# Debug Quiz App - Implementation Phases

## Phase 1: Foundation & MVP Loop
**Goal:** A working quiz loop where students can join, see questions, and get results.
- **Database:** Set up Prisma schema (User, Quiz, Question, Option, Answer, Session).
- **Real-time:** Implement WebSocket/tRPC subscriptions for game state (Waiting -> Question -> Result).
- **Admin:** 
    - Create Quiz (Basic Form + CSV Import).
    - Start/Stop Session.
    - View active player count.
- **Student:** 
    - Join Screen (Name, Class, Code).
    - Real-time Question View.
    - Result View (Score).

## Phase 2: Advanced Gameplay & Code Execution
**Goal:** Enhance the quiz experience with code-specific features.
- **Question Types:** Implement "Program Output" and "Code Correction" types.
- **Code Rendering:** Syntax highlighting and formatting for code snippets.
- **Validation:** Server-side validation improvement.
- **Timer:** Robust server-side timer with synchronization.

## Phase 3: Analytics, Security & Polish
**Goal:** Make it production-ready and secure.
- **Security:** Anti-cheating module (Tab-switch detection & locking).
- **Leaderboard:** Real-time leaderboard with tie-breaking logic.
- **Polish:** Full UI/UX Implementation using Tailwind/Shadcn (Dark/Light mode).
- **Export:** Export results to CSV/PDF.

## Phase 4: AI Integration
**Goal:** Automate content creation.
- **LLM:** Integrate generic LLM API for question generation.
- **Refinement:** "Explain this code" feature for students after the quiz (optional).
