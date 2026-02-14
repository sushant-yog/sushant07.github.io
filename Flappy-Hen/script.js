/* ===================================================
   Flappy Hen — Game Logic (v2)
   Improvements:
     - Forgiving collision hitbox (6px margin on bird)
     - Smoother, less sensitive physics
     - Background drawn with "cover" scaling (no distort)
     - Bird sized from actual image aspect ratio
     - Font: Poppins on canvas text
   =================================================== */

(function () {
  'use strict';

  /* ---------- DOM References ---------- */
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;

  // Check for saved theme
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

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const hudScore = document.getElementById('hud-score');
  const hudBest = document.getElementById('hud-best');
  const overlayStart = document.getElementById('overlay-start');
  const overlayOver = document.getElementById('overlay-gameover');
  const finalScore = document.getElementById('final-score');
  const finalBest = document.getElementById('final-best');
  const btnStart = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');
  const btnSound = document.getElementById('btn-sound');
  const bgMusic = document.getElementById('backgroundMusic');
  const goMusic = document.getElementById('gameOverMusic');

  /* ==========================================================
     GAME CONSTANTS
     —————————————————————————————————————————————————————————
     Physics values are tuned for 60 fps fixed-step feel.
     ========================================================== */

  // Internal resolution — all game logic runs at this size;
  // CSS scales the canvas visually to any screen.
  const BASE_W = 320;
  const BASE_H = 480;

  // ---- Physics (tuned for a smooth, controllable feel) ----
  const GRAVITY = 0.35;          // softer gravity for floatier feel
  const JUMP_VELOCITY = -6.5;    // gentler jump impulse
  const MAX_FALL = 8;            // lower terminal velocity — less punishing
  const PIPE_SPEED = 2.0;        // slightly slower pipes for more reaction time

  // ---- Pipe dimensions ----
  const PIPE_WIDTH = 52;         // visual width of each pipe column
  const PIPE_GAP = 130;          // vertical gap between top & bottom pipes (wider = easier)
  const PIPE_INTERVAL = 200;     // horizontal spacing between pipe pairs (more space)
  const GROUND_HEIGHT = 40;      // ground strip at bottom

  // ---- Collision margin (forgiving hitbox) ----
  // Shrinks the bird's AABB by this many pixels on each side
  // so the player doesn't die on near-misses.
  const HIT_MARGIN = 6;

  /* ---------- State ---------- */
  let gameState = 'idle';        // 'idle' | 'running' | 'over'
  let score = 0;
  let bestScore = parseInt(localStorage.getItem('flappyHenBest')) || 0;
  let soundOn = true;

  /* ---------- Bird ---------- */
  // Default size — will be recalculated from actual image once loaded
  const bird = {
    x: BASE_W * 0.28,
    y: BASE_H / 2,
    w: 38,                       // default width (overridden on image load)
    h: 28,                       // default height (overridden on image load)
    vy: 0,
    angle: 0
  };

  /* ---------- Pipes ---------- */
  let pipes = [];                // array of { x, gapY, passed }
  let nextPipeX = BASE_W + 80;

  /* ---------- Assets ---------- */
  const imgBird = new Image();
  const imgPipeTop = new Image();
  const imgPipeBot = new Image();
  const imgGround = new Image();
  const imgBg = new Image();

  imgBird.src = 'https://i.postimg.cc/1X0cmd2D/icon.png';
  imgPipeTop.src = 'https://i.postimg.cc/Fz9Vr0Db/PIPee.png';
  imgPipeBot.src = 'https://i.postimg.cc/Fz9Vr0Db/PIPee.png';
  imgGround.src = 'https://i.postimg.cc/4yG2QpTF/bottom-bar.png';
  imgBg.src = 'https://i.postimg.cc/4NbhmVd8/FH-bg.png';

  // Once the bird image loads, set bird size from its natural aspect ratio
  // so it's never stretched. Target height ~28px, width proportional.
  imgBird.addEventListener('load', function () {
    const aspectRatio = imgBird.naturalWidth / imgBird.naturalHeight;
    bird.h = 38;                               // increased size (base 480px canvas)
    bird.w = Math.round(bird.h * aspectRatio); // width preserves aspect ratio
    drawIdleFrame();
  });

  let groundOffset = 0;

  /* ---------- Responsive Canvas Sizing ---------- */
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    // Internal resolution scaled for High DPI (Retina) clarity
    canvas.width = BASE_W * dpr;
    canvas.height = BASE_H * dpr;
    // visual size controlled by CSS (already in style.css, but we can reinforce)
    ctx.scale(dpr, dpr);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  /* ---------- HUD helpers ---------- */
  function updateHUD() {
    hudScore.textContent = 'Score: ' + score;
    hudBest.textContent = 'Best: ' + bestScore;
  }

  /* =================================================
     PIPE MANAGEMENT
     ================================================= */

  /** Create a new pipe pair at the given x position */
  function spawnPipe(x) {
    // Random gap top, constrained so gap stays fully on-screen
    const minY = 60;
    const maxY = BASE_H - GROUND_HEIGHT - PIPE_GAP - 60;
    const gapY = Math.floor(Math.random() * (maxY - minY)) + minY;
    pipes.push({ x: x, gapY: gapY, passed: false });
  }

  /** Seed initial set of pipes */
  function initPipes() {
    pipes = [];
    nextPipeX = BASE_W + 100;   // first pipe appears a bit further out
    for (let i = 0; i < 4; i++) {
      spawnPipe(nextPipeX);
      nextPipeX += PIPE_INTERVAL;
    }
  }

  /** Move pipes left, remove off-screen, spawn new ones */
  function updatePipes() {
    for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= PIPE_SPEED;

      // Score: bird's left edge has cleared pipe's right edge
      if (!pipes[i].passed && pipes[i].x + PIPE_WIDTH < bird.x) {
        pipes[i].passed = true;
        score++;                  // exactly +1 per pipe pair
        updateHUD();
      }

      // Remove pipes that scroll off the left edge
      if (pipes[i].x + PIPE_WIDTH < -10) {
        pipes.splice(i, 1);
      }
    }

    // Keep spawning pipes ahead of the viewport
    const rightmost = pipes.length > 0 ? pipes[pipes.length - 1].x : 0;
    if (rightmost < BASE_W + PIPE_INTERVAL) {
      nextPipeX = rightmost + PIPE_INTERVAL;
      spawnPipe(nextPipeX);
    }
  }

  /** Draw all pipe pairs */
  function drawPipes() {
    for (const p of pipes) {
      const topPipeHeight = p.gapY;
      const botPipeY = p.gapY + PIPE_GAP;

      // Top pipe (drawn vertically flipped)
      ctx.save();
      ctx.translate(p.x + PIPE_WIDTH / 2, topPipeHeight);
      ctx.scale(1, -1);
      ctx.drawImage(imgPipeTop, -PIPE_WIDTH / 2, 0, PIPE_WIDTH, topPipeHeight + 20);
      ctx.restore();

      // Bottom pipe
      const botH = BASE_H - botPipeY;
      ctx.drawImage(imgPipeBot, p.x, botPipeY, PIPE_WIDTH, botH + 20);
    }
  }

  /* =================================================
     BIRD
     ================================================= */

  function resetBird() {
    bird.x = BASE_W * 0.28;
    bird.y = BASE_H / 2;
    bird.vy = 0;
    bird.angle = 0;
  }

  function updateBird() {
    // Apply gravity
    bird.vy += GRAVITY;
    if (bird.vy > MAX_FALL) bird.vy = MAX_FALL;
    bird.y += bird.vy;

    // Tilt: nose up when rising, gradually nose down when falling
    if (bird.vy < -1) {
      bird.angle = -20;
    } else if (bird.vy > 0 && bird.angle < 70) {
      bird.angle += 2.5;        // slower tilt-down for smoother visual
    }
  }

  /** Draw bird at its natural aspect ratio (never stretched) */
  function drawBird() {
    ctx.save();
    ctx.translate(bird.x + bird.w / 2, bird.y + bird.h / 2);
    ctx.rotate((bird.angle * Math.PI) / 180);
    // Apply filter to make chick white (grayscale + high brightness)
    ctx.filter = 'grayscale(100%) brightness(1.5)';
    ctx.drawImage(imgBird, -bird.w / 2, -bird.h / 2, bird.w, bird.h);
    ctx.filter = 'none'; // reset filter
    ctx.restore();
  }

  /* =================================================
     COLLISION DETECTION  (with forgiving hitbox margin)
     —————————————————————————————————————————————————
     The bird's collision box is shrunk by HIT_MARGIN px
     on every side so near-misses feel fair.
     ================================================= */

  function checkCollisions() {
    const groundY = BASE_H - GROUND_HEIGHT;

    // Ground collision (no margin — ground is ground)
    if (bird.y + bird.h >= groundY) {
      bird.y = groundY - bird.h;
      bird.vy = 0;
      return true;
    }

    // Ceiling collision
    if (bird.y <= 0) {
      bird.y = 0;
      bird.vy = 0;
      return true;
    }

    // Pipe collisions — use shrunken hitbox for fairness
    const bx1 = bird.x + HIT_MARGIN;           // bird left  (inset)
    const bx2 = bird.x + bird.w - HIT_MARGIN;  // bird right (inset)
    const by1 = bird.y + HIT_MARGIN;            // bird top   (inset)
    const by2 = bird.y + bird.h - HIT_MARGIN;   // bird bottom(inset)

    for (const p of pipes) {
      // Horizontal overlap check (bird inset vs pipe)
      if (bx2 <= p.x || bx1 >= p.x + PIPE_WIDTH) continue;

      // Top pipe collision
      if (by1 < p.gapY) return true;
      // Bottom pipe collision
      if (by2 > p.gapY + PIPE_GAP) return true;
    }

    return false;
  }

  /* =================================================
     GROUND SCROLLING
     ================================================= */

  function drawGround() {
    const gw = imgGround.naturalWidth || 320;
    const gh = GROUND_HEIGHT;
    const y = BASE_H - gh;

    // Tile the ground image across the bottom
    // We add +1 to width (gw + 1) to prevent hairline gaps during tiling
    for (let x = groundOffset; x < BASE_W + gw; x += gw) {
      ctx.drawImage(imgGround, x - 1, y, gw + 2, gh);
    }
  }

  function updateGround() {
    const gw = imgGround.naturalWidth || 320;
    groundOffset -= PIPE_SPEED;
    if (groundOffset <= -gw) groundOffset += gw;
  }

  /* =================================================
     BACKGROUND  — "cover" scaling (no stretch / distortion)
     Draws the background image so it covers the entire canvas
     while preserving its aspect ratio (crops edges if needed).
     ================================================= */

  function drawBackground() {
    if (imgBg.complete && imgBg.naturalWidth > 0) {
      // Stretch background to fill full canvas ("head to foot")
      ctx.drawImage(imgBg, 0, 0, BASE_W, BASE_H);
    } else {
      // Fallback sky gradient when image hasn't loaded yet
      // Fallback sky gradient when image hasn't loaded yet
      const grad = ctx.createLinearGradient(0, 0, 0, BASE_H);
      grad.addColorStop(0, '#87CEEB');
      grad.addColorStop(1, '#e0f7fa');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, BASE_W, BASE_H);
    }
  }

  /* =================================================
     SCORE on canvas (large centered number during play)
     ================================================= */

  function drawCanvasScore() {
    ctx.save();
    ctx.font = '900 42px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(score, BASE_W / 2, 55);
    ctx.fillText(score, BASE_W / 2, 55);
    ctx.restore();
  }

  /* =================================================
     SOUND MANAGEMENT
     ================================================= */

  function playBgMusic() {
    if (soundOn) {
      bgMusic.currentTime = 0;
      bgMusic.play().catch(() => { }); // catch browser autoplay block
    }
  }
  function stopBgMusic() {
    bgMusic.pause();
  }
  function playGoMusic() {
    if (soundOn) {
      goMusic.currentTime = 0;
      goMusic.play().catch(() => { });
    }
  }

  btnSound.addEventListener('click', function (e) {
    e.stopPropagation();
    soundOn = !soundOn;
    btnSound.textContent = soundOn ? '🔊' : '🔇';
    if (!soundOn) {
      bgMusic.pause();
      goMusic.pause();
    } else if (gameState === 'running') {
      bgMusic.play().catch(() => { });
    }
  });

  /* =================================================
     GAME STATE MANAGEMENT
     ================================================= */

  function startGame() {
    overlayStart.classList.add('hidden');
    overlayOver.classList.add('hidden');

    // Reset everything
    score = 0;
    updateHUD();
    resetBird();
    initPipes();
    groundOffset = 0;

    gameState = 'running';
    lastTime = 0;               // reset so first frame dt is sane
    playBgMusic();
    requestAnimationFrame(gameLoop);
  }

  function endGame() {
    gameState = 'over';
    stopBgMusic();
    playGoMusic();

    // Update best score in localStorage
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('flappyHenBest', bestScore);
    }
    updateHUD();

    // Show game-over overlay
    finalScore.textContent = 'Score: ' + score;
    finalBest.textContent = 'Best: ' + bestScore;
    overlayOver.classList.remove('hidden');
  }

  function restartGame() {
    overlayOver.classList.add('hidden');
    startGame();
  }

  /* =================================================
     INPUT HANDLING
     ================================================= */

  function handleJump(e) {
    if (gameState === 'running') {
      bird.vy = JUMP_VELOCITY;
    }
    if (e) e.preventDefault();
  }

  // Keyboard: Space or ArrowUp
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      if (gameState === 'idle') {
        startGame();
      } else {
        handleJump(e);
      }
    }
  });

  // Touch on canvas (doesn't interfere with overlay buttons)
  canvas.addEventListener('touchstart', function (e) {
    if (gameState === 'running') handleJump(e);
  }, { passive: false });

  // Mouse click on canvas
  canvas.addEventListener('mousedown', function (e) {
    if (gameState === 'running') handleJump(e);
  });

  // Overlay buttons
  btnStart.addEventListener('click', startGame);
  btnRestart.addEventListener('click', restartGame);

  /* =================================================
     MAIN GAME LOOP  (requestAnimationFrame)
     ================================================= */

  let lastTime = 0;

  function gameLoop(timestamp) {
    if (gameState !== 'running') return;

    // On very first frame, just record time and skip to avoid a big dt
    if (lastTime === 0) {
      lastTime = timestamp;
      requestAnimationFrame(gameLoop);
      return;
    }

    // Delta time capped at 3 frames to avoid huge jumps after tab switch
    const dt = Math.min((timestamp - lastTime) / (1000 / 60), 3);
    lastTime = timestamp;

    // --- Clear & draw background ---
    ctx.clearRect(0, 0, BASE_W, BASE_H);
    drawBackground();

    // --- Update ---
    updatePipes();
    updateBird();
    updateGround();

    // --- Draw ---
    drawPipes();
    drawGround();
    drawBird();
    drawCanvasScore();

    // --- Collision check ---
    if (checkCollisions()) {
      endGame();
      return;
    }

    requestAnimationFrame(gameLoop);
  }

  /* =================================================
     INITIALIZATION
     ================================================= */

  /** Draw a static idle frame (before game starts) */
  function drawIdleFrame() {
    ctx.clearRect(0, 0, BASE_W, BASE_H);
    drawBackground();
    drawGround();
    bird.angle = 0;
    drawBird();
  }

  imgBg.addEventListener('load', drawIdleFrame);
  imgGround.addEventListener('load', drawIdleFrame);

  // Set initial HUD (loads best score from localStorage)
  updateHUD();

  // Draw idle frame immediately if images are cached
  if (imgBg.complete) drawIdleFrame();

})();