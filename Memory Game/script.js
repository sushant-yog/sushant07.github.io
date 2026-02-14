/**
 * Memory Match - Pro Edition
 * Features: 3D Flip, Emoji Categories, 3 Game Modes, Slight Dark Theme.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- Theme Toggle ---
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    body.classList.add('light-theme');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      body.classList.toggle('light-theme');
      const theme = body.classList.contains('light-theme') ? 'light' : 'dark';
      localStorage.setItem('theme', theme);
    });
  }

  // --- State Management ---
  const state = {
    difficulty: 'easy',
    mode: 'time',
    theme: 'mix',
    grid: { rows: 4, cols: 4 },
    cardValues: [],
    flippedCards: [],
    matchedPairs: 0,
    totalPairs: 0,
    stats: {
      moves: 0,
      timeLeft: 0,
      moveLimit: 0
    },
    timerInterval: null,
    isLocked: false,
    isGameStarted: false
  };

  // --- Emoji Libraries ---
  const emojiSets = {
    fruits: ['🍎', '🍌', '🍒', '🍇', '🍉', '🥝', '🍍', '🍑', '🍓', '🥑', '🍋', '🍐'],
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'],
    food: ['🍔', '🍕', '🍟', '🍣', '🍦', '🍩', '🍪', '🍫', '🍿', '🥤', '🌮', '🥨'],
    vehicles: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚜', '🛵'],
    vegetables: ['🍆', '🥕', '🍅', '🥔', '🌽', '🥦', '🥬', '🥒', '🍄', '🥜', '🫑', '🧅'],
    mix: [] // Populated dynamically
  };
  emojiSets.mix = [...emojiSets.fruits, ...emojiSets.animals, ...emojiSets.food, ...emojiSets.vehicles, ...emojiSets.vegetables];

  // --- DOM Elements ---
  const UI = {
    setup: document.getElementById('setup-screen'),
    game: document.getElementById('game-screen'),
    board: document.getElementById('game-board'),
    timerBox: document.getElementById('timer-box'),
    timerLabel: document.getElementById('timer-label'),
    timerVal: document.getElementById('timer-val'),
    movesBox: document.getElementById('moves-box'),
    movesVal: document.getElementById('moves-count'),
    pairsVal: document.getElementById('match-count'),
    overlay: document.getElementById('modal-overlay'),
    modalTitle: document.getElementById('modal-title'),
    modalMsg: document.getElementById('modal-message'),
    startBtn: document.getElementById('start-btn'),
    resetBtn: document.getElementById('reset-btn'),
    backBtn: document.getElementById('back-to-menu'),
    menuBtn: document.getElementById('modal-home-btn'),
    restartBtn: document.getElementById('modal-restart-btn'),
    difficultyBtns: document.querySelectorAll('#difficulty-selector .choice'),
    themeBtns: document.querySelectorAll('#theme-selector .choice'),
    modeBtns: document.querySelectorAll('#mode-selector .choice'),
    timeLimit: document.getElementById('time-limit-select')
  };

  // --- Initialization & Listeners ---

  function init() {
    UI.difficultyBtns.forEach(btn => btn.onclick = () => selectChoice(UI.difficultyBtns, btn, 'difficulty'));
    UI.themeBtns.forEach(btn => btn.onclick = () => selectChoice(UI.themeBtns, btn, 'theme'));
    UI.modeBtns.forEach(btn => btn.onclick = () => {
      selectChoice(UI.modeBtns, btn, 'mode');
      document.getElementById('time-options').classList.toggle('hidden', state.mode !== 'time');
    });

    UI.startBtn.onclick = startGame;
    UI.resetBtn.onclick = resetGame;
    UI.backBtn.onclick = goToMenu;
    UI.menuBtn.onclick = goToMenu;
    UI.restartBtn.onclick = resetGame;
  }

  function selectChoice(group, btn, key) {
    group.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state[key] = btn.dataset[key] || btn.dataset.theme || btn.dataset.difficulty || btn.dataset.mode;
  }

  // --- Game Logic ---

  function startGame() {
    // Setup Grid
    if (state.difficulty === 'easy') state.grid = { rows: 4, cols: 4 };
    else if (state.difficulty === 'medium') state.grid = { rows: 4, cols: 5 };
    else state.grid = { rows: 6, cols: 6 };

    const totalCards = state.grid.rows * state.grid.cols;
    state.totalPairs = totalCards / 2;
    state.matchedPairs = 0;
    state.stats.moves = 0;
    state.flippedCards = []; // Using this array to store revealed cards
    state.isLocked = false;
    state.isGameStarted = false;

    // UI Prep
    UI.setup.classList.add('hidden');
    UI.game.classList.remove('hidden');
    UI.overlay.classList.add('hidden');
    UI.board.className = state.difficulty;

    // Mode Config
    if (state.mode === 'time') {
      state.stats.timeLeft = parseInt(UI.timeLimit.value);
      UI.timerBox.style.display = 'flex';
      UI.movesBox.style.display = 'none';
      UI.timerLabel.textContent = "Time";
      updateTimerUI();
    } else if (state.mode === 'moves') {
      state.stats.moveLimit = Math.floor(state.totalPairs * 2.5);
      UI.timerBox.style.display = 'flex';
      UI.movesBox.style.display = 'flex';
      UI.timerLabel.textContent = "Limit";
      updateStatsUI();
    } else {
      UI.timerBox.style.display = 'none';
      UI.movesBox.style.display = 'flex';
    }

    buildBoard();
    updateStatsUI();
  }

  function buildBoard() {
    UI.board.innerHTML = '';
    const pool = [...emojiSets[state.theme]];
    const selected = [];

    for (let i = 0; i < state.totalPairs; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const emoji = pool.splice(idx, 1)[0];
      selected.push(emoji, emoji);
    }

    // Shuffle
    for (let i = selected.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selected[i], selected[j]] = [selected[j], selected[i]];
    }

    selected.forEach(val => {
      const card = document.createElement('div');
      card.className = 'memory-card';
      card.dataset.val = val;
      card.innerHTML = `<span class="emoji">${val}</span>`;
      card.onclick = () => handleCardClick(card);
      UI.board.appendChild(card);
    });
  }

  function handleCardClick(card) {
    if (state.isLocked || card.classList.contains('revealed') || card.classList.contains('matched')) return;

    if (!state.isGameStarted) {
      state.isGameStarted = true;
      if (state.mode === 'time' && state.stats.timeLeft < 900000) {
        startTimer();
      }
    }

    card.classList.add('revealed');
    state.flippedCards.push(card);

    if (state.flippedCards.length === 2) {
      state.stats.moves++;
      updateStatsUI();
      checkMatch();
    }
  }

  function checkMatch() {
    const [c1, c2] = state.flippedCards;
    const match = c1.dataset.val === c2.dataset.val;

    state.isLocked = true;

    if (match) {
      c1.classList.add('matched');
      c2.classList.add('matched');
      c1.classList.remove('revealed');
      c2.classList.remove('revealed');
      state.matchedPairs++;
      state.flippedCards = [];
      state.isLocked = false;
      updateStatsUI();

      if (state.matchedPairs === state.totalPairs) conclude(true);
    } else {
      setTimeout(() => {
        c1.classList.remove('revealed');
        c2.classList.remove('revealed');
        state.flippedCards = [];
        state.isLocked = false;

        if (state.mode === 'moves' && state.stats.moves >= state.stats.moveLimit) {
          conclude(false, "No moves left!");
        }
      }, 800);
    }
  }

  function startTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      state.stats.timeLeft--;
      updateTimerUI();
      if (state.stats.timeLeft <= 0) conclude(false, "Out of time!");
    }, 1000);
  }

  function updateStatsUI() {
    UI.pairsVal.textContent = `${state.matchedPairs}/${state.totalPairs}`;
    UI.movesVal.textContent = state.stats.moves;
    if (state.mode === 'moves') {
      UI.timerVal.textContent = `${state.stats.moves}/${state.stats.moveLimit}`;
      UI.timerVal.style.color = state.stats.moves >= state.stats.moveLimit - 3 ? 'var(--danger)' : 'white';
    }
  }

  function updateTimerUI() {
    if (state.stats.timeLeft > 900000) {
      UI.timerVal.textContent = "∞";
      UI.timerVal.style.color = 'white';
      return;
    }
    const m = Math.floor(state.stats.timeLeft / 60);
    const s = state.stats.timeLeft % 60;
    UI.timerVal.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    if (state.stats.timeLeft <= 10) UI.timerVal.style.color = 'var(--danger)';
    else UI.timerVal.style.color = 'white';
  }

  function conclude(victory, msg = "") {
    clearInterval(state.timerInterval);
    state.isLocked = true;

    setTimeout(() => {
      UI.overlay.classList.remove('hidden');
      UI.modalTitle.textContent = victory ? "🏆 Victory!" : "⌛ Game Over";
      UI.modalTitle.style.color = victory ? "var(--accent-teal)" : "var(--danger)";
      UI.modalMsg.textContent = victory
        ? `Well done! You matched all pairs in ${state.stats.moves} moves.`
        : `${msg} Better luck next time!`;
    }, 500);
  }

  function resetGame() {
    clearInterval(state.timerInterval);
    startGame();
  }

  function goToMenu() {
    clearInterval(state.timerInterval);
    UI.game.classList.add('hidden');
    UI.overlay.classList.add('hidden');
    UI.setup.classList.remove('hidden');
  }

  init();
});
