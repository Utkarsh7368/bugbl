Build a full-stack, real-time multiplayer web application similar to skribbl.io, with identical core functionality, but themed entirely for developers.

Project Name: Bugbl.io

Objective:
Create a browser-based multiplayer drawing and guessing game where players draw technical/programming-related words and others guess them in real time. The gameplay, UI flow, and mechanics should closely match skribbl.io.

----------------------------------------
CORE FEATURES (MUST MATCH SKRIBBL.IO)
----------------------------------------

1. Lobby System:
- Allow users to enter a nickname and join a game
- Option to create private rooms with shareable links
- Public rooms matchmaking (optional but preferred)
- Room settings:
  - Number of rounds
  - Draw time per round
  - Custom word list toggle

2. Game Flow:
- Each round, one player is selected as the drawer
- The drawer receives 3 random word options and selects one
- The word is hidden from other players (shown as blanks)
- Other players guess the word via chat
- Correct guesses give points based on speed
- Drawer gets points based on how many guessed correctly
- After all players draw, round increments

3. Real-Time Drawing Canvas:
- HTML5 Canvas
- Smooth drawing with mouse events
- Tools:
  - Pencil
  - Eraser
  - Color picker
  - Brush size selector
  - Clear canvas button
- Real-time sync using WebSockets (Socket.io)
- All users see drawing updates instantly

4. Chat System:
- Real-time chat for guesses
- Detect correct guesses automatically
- Replace correct guess message with "Player guessed the word!"
- Prevent showing correct word in chat
- Auto-scroll chat

5. Scoring System:
- Points based on:
  - Speed of correct guess
  - Order of correct guesses
- Leaderboard displayed live
- Final winner screen after all rounds

6. Timer System:
- Countdown timer per round
- Auto move to next turn when time ends
- Auto skip if drawer inactive

----------------------------------------
DEV-THEMED CUSTOMIZATION (IMPORTANT)
----------------------------------------

Replace all generic words with developer/tech-related words.

Word categories should include:
- Programming concepts (recursion, API, middleware, closure)
- Bugs/issues (null pointer, memory leak, race condition)
- Tools (Docker, Git, Kubernetes, Postman)
- Languages (JavaScript, Python, C++, Java)
- Dev slang (merge conflict, deploy, hotfix, rollback)
- System design terms (load balancer, cache, microservices)

Optional:
- Allow custom word list input for private rooms

----------------------------------------
UI/UX REQUIREMENTS
----------------------------------------

- Clean, minimal UI similar to skribbl.io
- Dark mode default (developer-friendly)
- Sections:
  - Top: game info + timer
  - Center: drawing canvas
  - Right: chat + players list
  - Bottom: input box for guesses
- Responsive design (desktop priority, mobile support optional)

----------------------------------------
BACKEND REQUIREMENTS
----------------------------------------

- Use Node.js + Express
- Use Socket.io for real-time communication
- Maintain game state:
  - Rooms
  - Players
  - Scores
  - Current turn
  - Current word
- Handle:
  - Player join/leave
  - Reconnection (optional bonus)
  - Turn switching
  - Game progression

----------------------------------------
FRONTEND REQUIREMENTS
----------------------------------------

- Use React (preferred) or vanilla JS
- Use Canvas API for drawing
- Use WebSockets (Socket.io client)
- State management for:
  - Game state
  - Chat messages
  - Player list
  - Scores

----------------------------------------
EXTRA FEATURES (OPTIONAL BUT HIGH VALUE)
----------------------------------------

- Sound effects for correct guesses
- Emoji reactions
- “Hint system” (reveal letters over time)
- Kick inactive players
- Anti-spam in chat

----------------------------------------
IMPORTANT CONSTRAINTS
----------------------------------------

- The app must feel and behave almost identical to skribbl.io
- Only difference: ALL content is developer/tech themed
- Ensure low latency drawing sync
- Code should be modular and production-ready

----------------------------------------
OUTPUT EXPECTATION
----------------------------------------

- Full working code (frontend + backend)
- Clear folder structure
- Instructions to run locally
- Use environment variables where needed