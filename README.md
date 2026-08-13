# SKN SCARS Jeopardy Plastic Surgery Edition

A Jeopardy game for the SCARS Plastic & Reconstructive Surgery Club at WUM. Classic Jeopardy, 5 pre-loaded teams, image support for visual questions, end-game leaderboard with podium.

---

## Setup (one-time)

### 1. Install Node.js
Download from [nodejs.org](https://nodejs.org/) — get the LTS version (any version ≥ 18 works). Install with defaults.

Verify in cmd:
```cmd
node --version
npm --version
```

### 2. Install project dependencies
Open Command Prompt, navigate to the project folder, then:
```cmd
cd path\to\scars-jeopardy
npm install
```
This pulls React + Vite (~30 seconds, first time only).

---

## Run the game

```cmd
npm run dev
```

Browser opens automatically at **http://localhost:5173** — if not, copy-paste that URL.

To stop: press `Ctrl + C` in the terminal.

---

## How to play

1. **Splash screen** → click *Begin Game*
2. **Setup** → teams are pre-filled (Plastic Surgeons, I am a Surgeon, Brown Sugar Boba, Team 8-0, Blunt Scissors). Edit names if needed, click *Start the Game*.
3. **Board** → click any tile to open the question
4. **Question modal** → click *Reveal Answer* (or press `Space`)
5. **Award points** → click `+$X` for the team that got it right, or `−$X` for a wrong buzz-in. Click *No one — close* if nobody got it.
6. **End Game** → top-right button shows the leaderboard with podium + medals
7. **Reset** → wipes scores and answered questions, back to fresh board

### Keyboard shortcuts
- `Space` — reveal answer
- `Esc` — close question

### Scores persist
Game state auto-saves to browser localStorage, so a refresh won't lose progress.

### Audio
The game has 4 music tracks wired up:
- **Lobby music** plays on the splash, setup, and main board
- **Think music** plays while a question is open (until the answer is revealed)
- **Build-up music** plays for 22 seconds when you click "End Game · Leaderboard", with chaotic columns and a countdown ring
- **Fanfare** kicks in at the 22-second mark when the winners are revealed (with confetti)

**Mute button** is in the top-right corner of every screen.

**Autoplay note**: browsers block audio until the user interacts with the page. Click the gold "Enable sound" banner on the splash screen to unlock audio for the session.
The game has 4 music tracks wired up:
- **Lobby music** plays on the splash, setup, and main board
- **Think music** plays while a question is open (until the answer is revealed)
- **Build-up music** plays for 22 seconds when you click "End Game · Leaderboard", with animated score bars and a countdown ring
- **Fanfare** kicks in at the 22-second mark when the winners are revealed (with confetti)

**Mute button** is in the top-right corner of every screen.

**Autoplay note**: browsers block audio until the user interacts with the page. Music starts the moment you click "Begin Game" on the splash screen, so it should always work in normal play.

---

## Editing content

- **Questions/answers** → `src/questions.js`
- **Teams** → `src/teams.js`
- **Colors/typography** → top of `src/styles.css` (CSS variables)

---

## Build for production (optional)

If you want a static build to host somewhere:
```cmd
npm run build
npm run preview
```
Built files end up in `dist/`.

---

## Troubleshooting

**`npm` not recognized** → Node.js isn't installed or not on PATH. Reinstall and check "Add to PATH" during setup.

**Port 5173 already in use** → Vite will auto-pick the next free port. Watch the terminal output for the actual URL.

**Logo/images not showing** → make sure files are in `public/images/` (not `src/images/`). Filenames are case-sensitive on some systems.
