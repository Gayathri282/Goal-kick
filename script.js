/**
 * Goal Kick! - Child Friendly Fullscreen Web Game Engine
 * Features:
 * - Dual Mobile & Desktop Responsive Engine (100% Viewport Fill)
 * - Web Audio Synthesizer with BGM loop & event SFX tones
 * - Super child-friendly characters (Cute Goalie Bear & Shiny Soccer Ball)
 * - Auto-pause on tab switch / window blur / window close
 * - Streak multiplier, Screamer power shots, and level progression
 */

(function () {
  "use strict";

  /* --------------------------------------------------------------------------
     1. DOM Elements Setup
     -------------------------------------------------------------------------- */
  var canvas = document.getElementById("gameCanvas");
  var ctx = canvas.getContext("2d");

  // HUD Elements
  var hudEl = document.getElementById("hud");
  var scoreText = document.getElementById("scoreText");
  var tierNameText = document.getElementById("tierNameText");
  var streakText = document.getElementById("streakText");
  var livesContainer = document.getElementById("livesContainer");
  var bestHudText = document.getElementById("bestHudText");

  // Screen Overlays
  var titleScreen = document.getElementById("titleScreen");
  var gameOverScreen = document.getElementById("gameOverScreen");
  var pauseScreen = document.getElementById("pauseScreen");

  // Action Buttons
  var startBtn = document.getElementById("startBtn");
  var againBtn = document.getElementById("againBtn");
  var resumeBtn = document.getElementById("resumeBtn");

  // End Screen Stats
  var finalScoreText = document.getElementById("finalScoreText");
  var goalsText = document.getElementById("goalsText");
  var bestStreakText = document.getElementById("bestStreakText");
  var bestScoreText = document.getElementById("bestScoreText");
  var overTitle = document.getElementById("overTitle");
  var overReasonText = document.getElementById("overReasonText");

  /* --------------------------------------------------------------------------
     2. Dual Mobile & Desktop Responsive Layout Engine
     -------------------------------------------------------------------------- */
  var W = 400, H = 700, scale = 1, offX = 0, offY = 0, dpr = 1;
  var ballStartX, ballStartY, goalY, goalBandBottom;

  function resize() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);

    var aspect = vw / vh;

    if (aspect < 0.85) {
      // MOBILE PORTRAIT LAYOUT: Fill 100% of viewport screen
      W = 400;
      H = Math.max(540, Math.min(1000, Math.round(W / aspect)));
      scale = (vw * dpr) / W;
      offX = 0;
      offY = 0;
    } else {
      // DESKTOP / TABLET / LANDSCAPE: Center stage arcade presentation
      H = 700;
      W = 420;
      var targetH = Math.min(vh * dpr * 0.92, H * 1.15 * dpr);
      var targetW = targetH * (W / H);

      if (targetW > vw * dpr * 0.92) {
        targetW = vw * dpr * 0.92;
        targetH = targetW * (H / W);
      }

      scale = targetW / W;
      offX = (vw * dpr - targetW) / 2;
      offY = (vh * dpr - targetH) / 2;
    }

    ballStartX = W / 2;
    ballStartY = H * 0.82;
    goalY = H * 0.25;
    goalBandBottom = H * 0.29;
  }

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", function () {
    setTimeout(resize, 120);
  });

  /* --------------------------------------------------------------------------
     3. Web Audio Synthesizer (Engaging BGM & Event Tones)
     -------------------------------------------------------------------------- */
  var actx = null;
  var masterGain = null;
  var bgmGain = null;
  var bgmInterval = null;
  var isBgmPlaying = false;
  var bgmNoteStep = 0;

  var BGM_MELODY = [
    523.25, 659.25, 783.99, 1046.50,  783.99, 659.25, 523.25, 659.25,
    587.33, 698.46, 880.00, 1174.66,  880.00, 698.46, 587.33, 698.46,
    659.25, 783.99, 987.77, 1318.51,  987.77, 783.99, 659.25, 783.99,
    698.46, 880.00, 1046.50, 1318.51, 1174.66, 1046.50, 880.00, 783.99
  ];

  var BGM_BASS = [
    261.63, 261.63, 329.63, 392.00,
    293.66, 293.66, 349.23, 440.00,
    329.63, 329.63, 392.00, 493.88,
    349.23, 349.23, 440.00, 523.25
  ];

  function initAudio() {
    if (!actx) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        actx = new AC();

        masterGain = actx.createGain();
        masterGain.gain.value = 0.5;
        masterGain.connect(actx.destination);

        bgmGain = actx.createGain();
        bgmGain.gain.value = 0.08;
        bgmGain.connect(masterGain);
      } catch (e) {
        actx = null;
      }
    }
    if (actx && actx.state === "suspended") {
      actx.resume();
    }
  }

  function startBgm() {
    initAudio();
    if (!actx || isBgmPlaying) return;
    isBgmPlaying = true;
    bgmNoteStep = 0;

    bgmInterval = setInterval(function () {
      if (!actx || !isBgmPlaying) return;

      var note = BGM_MELODY[bgmNoteStep % BGM_MELODY.length];
      var bassNote = BGM_BASS[(bgmNoteStep / 2 | 0) % BGM_BASS.length];
      bgmNoteStep++;

      try {
        var t0 = actx.currentTime;

        var osc = actx.createOscillator();
        var g = actx.createGain();
        osc.type = (bgmNoteStep % 4 === 0) ? "triangle" : "sine";
        osc.frequency.setValueAtTime(note, t0);
        g.gain.setValueAtTime(0.001, t0);
        g.gain.linearRampToValueAtTime(0.12, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);

        osc.connect(g);
        g.connect(bgmGain);
        osc.start(t0);
        osc.stop(t0 + 0.18);

        if (bgmNoteStep % 2 === 0) {
          var bassOsc = actx.createOscillator();
          var bassG = actx.createGain();
          bassOsc.type = "triangle";
          bassOsc.frequency.setValueAtTime(bassNote / 2, t0);
          bassG.gain.setValueAtTime(0.001, t0);
          bassG.gain.linearRampToValueAtTime(0.1, t0 + 0.03);
          bassG.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);

          bassOsc.connect(bassG);
          bassG.connect(bgmGain);
          bassOsc.start(t0);
          bassOsc.stop(t0 + 0.3);
        }
      } catch (e) {}
    }, 160);
  }

  function stopBgm() {
    isBgmPlaying = false;
    if (bgmInterval) {
      clearInterval(bgmInterval);
      bgmInterval = null;
    }
  }

  function playTone(o) {
    if (!actx) return;
    try {
      var t0 = actx.currentTime + (o.delay || 0);
      var osc = actx.createOscillator();
      var g = actx.createGain();

      osc.type = o.type || "sine";
      osc.frequency.setValueAtTime(o.from, t0);
      if (o.to) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + o.dur);
      }

      g.gain.setValueAtTime(0.001, t0);
      g.gain.exponentialRampToValueAtTime(o.vol || 0.18, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + o.dur);

      osc.connect(g);
      g.connect(masterGain);

      osc.start(t0);
      osc.stop(t0 + o.dur + 0.02);
    } catch (e) {}
  }

  function playNoise(dur, vol, freq) {
    if (!actx) return;
    try {
      var n = Math.floor(actx.sampleRate * dur);
      var buf = actx.createBuffer(1, n, actx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);

      var src = actx.createBufferSource();
      src.buffer = buf;
      var f = actx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = freq || 900;
      f.Q.value = 1.2;

      var g = actx.createGain();
      g.gain.value = vol;

      src.connect(f);
      f.connect(g);
      g.connect(masterGain);
      src.start();
    } catch (e) {}
  }

  var sfx = {
    kick: function () {
      playNoise(0.06, 0.1, 750);
      playTone({ from: 180, to: 90, dur: 0.08, type: "triangle", vol: 0.12 });
    },
    goal: function () {
      var notes = [523.25, 659.25, 783.99, 1046.50];
      for (var i = 0; i < notes.length; i++) {
        playTone({ from: notes[i], dur: 0.2, type: "triangle", vol: 0.18, delay: i * 0.06 });
      }
    },
    screamer: function () {
      var notes = [659.25, 783.99, 1046.50, 1318.51];
      for (var i = 0; i < notes.length; i++) {
        playTone({ from: notes[i], dur: 0.22, type: "sine", vol: 0.22, delay: i * 0.05 });
      }
    },
    miss: function () {
      playTone({ from: 280, to: 140, dur: 0.22, type: "sawtooth", vol: 0.12 });
      playNoise(0.08, 0.08, 450);
    },
    streak: function () {
      var notes = [659.25, 880.00, 1174.66];
      for (var i = 0; i < notes.length; i++) {
        playTone({ from: notes[i], dur: 0.14, type: "triangle", vol: 0.16, delay: i * 0.05 });
      }
    },
    levelup: function () {
      var notes = [392.00, 523.25, 659.25, 783.99, 1046.50];
      for (var i = 0; i < notes.length; i++) {
        playTone({ from: notes[i], dur: 0.2, type: "triangle", vol: 0.2, delay: i * 0.06 });
      }
    },
    gameOver: function () {
      playTone({ from: 440, to: 349.23, dur: 0.2, type: "triangle", vol: 0.16 });
      playTone({ from: 349.23, to: 261.63, dur: 0.25, type: "triangle", vol: 0.16, delay: 0.18 });
      playTone({ from: 261.63, to: 174.61, dur: 0.4, type: "sine", vol: 0.2, delay: 0.38 });
    }
  };

  /* --------------------------------------------------------------------------
     4. Physics Tuning & Tiers
     -------------------------------------------------------------------------- */
  var GRAVITY = 550;
  var SENS_X = 2.6, SENS_Y = 3.1;
  var VY_MIN = 300, VY_MAX = 950;
  var VX_MAX = 360;

  var TIERS = [
    { g: 0,  name: "Practice Shots 🌱", amp: 38,  spd: 0.65, halfW: 58, keeper: false },
    { g: 3,  name: "Warming Up ⚡",     amp: 66,  spd: 0.85, halfW: 52, keeper: false },
    { g: 7,  name: "Keeper's In 🐻",    amp: 92,  spd: 1.05, halfW: 48, keeper: true, kRange: 24, kSpd: 1.5 },
    { g: 13, name: "Under Pressure 🔥", amp: 112, spd: 1.30, halfW: 44, keeper: true, kRange: 32, kSpd: 1.9 },
    { g: 20, name: "Cup Final 🏆",      amp: 128, spd: 1.55, halfW: 40, keeper: true, kRange: 38, kSpd: 2.3 }
  ];

  function tierOf(goals) {
    var idx = 0;
    for (var k = 0; k < TIERS.length; k++) {
      if (goals >= TIERS[k].g) idx = k;
    }
    return idx;
  }

  /* --------------------------------------------------------------------------
     5. Game State & Logic Variables
     -------------------------------------------------------------------------- */
  var STATE_TITLE = 0;
  var STATE_PLAY = 1;
  var STATE_PAUSED = 2;
  var STATE_OVER = 3;

  var state = STATE_TITLE;

  var BALL_READY = 0;
  var BALL_FLIGHT = 1;
  var BALL_RESULT = 2;

  var ball, particles, popups, resultText, resultTimer, trail;
  var score = 0, lives = 3, goals = 0, streak = 0, bestStreak = 0, tier = 0, tierFlash = 0, best = 0;
  var alive = true, tclock = 0, shake = 0;
  var goalPhase = 0, keeperPhase = 0;

  try {
    best = parseInt(localStorage.getItem("goalkick_best") || "0", 10) || 0;
  } catch (e) {}

  function resetGame() {
    ball = { state: BALL_READY, x: ballStartX, y: ballStartY, vx: 0, vy: 0, spin: 0, power: 0 };
    particles = [];
    popups = [];
    trail = [];

    score = 0;
    lives = 3;
    goals = 0;
    streak = 0;
    bestStreak = 0;
    tier = 0;
    tierFlash = 1.2;
    alive = true;
    tclock = 0;
    shake = 0;

    resultText = "";
    resultTimer = 0;
    goalPhase = Math.random() * Math.PI * 2;
    keeperPhase = Math.random() * Math.PI * 2;

    renderHeartsUI();
    updateHUDUI();
  }

  function renderHeartsUI() {
    livesContainer.innerHTML = "";
    for (var i = 0; i < 3; i++) {
      var heart = document.createElement("span");
      heart.className = "heart-icon" + (i < lives ? "" : " lost");
      heart.textContent = "❤️";
      livesContainer.appendChild(heart);
    }
  }

  function updateHUDUI() {
    var t = TIERS[tier];
    scoreText.textContent = score;
    tierNameText.textContent = t.name;
    streakText.textContent = streak > 1 ? ("STREAK x" + streak) : (goals + " Goals");
    bestHudText.textContent = best;
  }

  function burstParticles(x, y, n, color, spread, power) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = Math.random() * power;
      particles.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.6,
        r: 2 + Math.random() * 4,
        life: 1,
        decay: 0.02 + Math.random() * 0.025,
        color: color
      });
    }
  }

  function goalCenterX() {
    var t = TIERS[tier];
    return W / 2 + Math.sin(tclock * t.spd + goalPhase) * t.amp;
  }

  function keeperOffsetX() {
    var t = TIERS[tier];
    if (!t.keeper) return null;
    return Math.sin(tclock * t.kSpd + keeperPhase) * t.kRange;
  }

  /* --------------------------------------------------------------------------
     6. Swipe Input & Shot Physics
     -------------------------------------------------------------------------- */
  var swipeStart = null;

  function beginSwipe(x, y) {
    if (state !== STATE_PLAY || !alive || ball.state !== BALL_READY) return;
    swipeStart = { x: x, y: y, t: performance.now() };
  }

  function endSwipe(x, y) {
    if (!swipeStart) return;
    var dx = x - swipeStart.x;
    var dy = y - swipeStart.y;
    var dt_ms = Math.max(16, performance.now() - swipeStart.t);
    swipeStart = null;

    if (state !== STATE_PLAY || !alive || ball.state !== BALL_READY) return;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 24 || dy > -12) return; // Too short or not an upward swipe

    var speedFactor = Math.max(0.6, Math.min(2.2, 400 / dt_ms));
    var vy0 = -Math.max(VY_MIN, Math.min(VY_MAX, Math.abs(dy) * SENS_Y * speedFactor));
    var vx0 = Math.max(-VX_MAX, Math.min(VX_MAX, dx * SENS_X * speedFactor));

    ball.state = BALL_FLIGHT;
    ball.x = ballStartX;
    ball.y = ballStartY;
    ball.vx = vx0;
    ball.vy = vy0;
    ball.power = Math.abs(vy0);
    trail = [];

    sfx.kick();
  }

  /* --------------------------------------------------------------------------
     7. Goal Resolution & Game Step
     -------------------------------------------------------------------------- */
  function resolveGoal() {
    ball.state = BALL_RESULT;
    resultTimer = 0.75;
    goals++;
    streak++;
    bestStreak = Math.max(bestStreak, streak);

    var bonus = Math.min(10, Math.floor(streak / 5) * 2);
    var screamer = ball.power > 820;
    var pts = 1 + bonus + (screamer ? 2 : 0);
    score += pts;

    if (screamer) {
      resultText = "SCREAMER! 🚀";
      sfx.screamer();
    } else {
      resultText = "GOAL! ⚽";
      sfx.goal();
    }

    shake = Math.max(shake, 0.4);
    burstParticles(ball.x, ball.y, 30, "#52c41a", 32, 4.0);

    // CRITICAL REQUIREMENT: Notifications regarding points MUST be displayed strictly ABOVE the goal post!
    popups.push({ x: W / 2, y: goalY - 48, life: 1.2, text: "+" + pts + " PTS!", color: "#ffeb3b" });

    if (streak > 0 && streak % 5 === 0) {
      sfx.streak();
    }

    var newTier = tierOf(goals);
    if (newTier > tier) {
      tier = newTier;
      tierFlash = 1.4;
      sfx.levelup();
      popups.push({ x: W / 2, y: goalY - 72, life: 1.5, text: TIERS[tier].name, color: "#73d13d" });
    }

    updateHUDUI();
  }

  function resolveMiss(kind) {
    ball.state = BALL_RESULT;
    resultTimer = 0.75;
    streak = 0;
    lives--;

    resultText = kind === "wide" ? "WIDE! 💨" : (kind === "short" ? "TOO SOFT! 💨" : (kind === "saved" ? "SAVED! 🧤" : "MISS!"));
    sfx.miss();
    shake = Math.max(shake, 0.35);
    burstParticles(ball.x, ball.y, 16, "#ff4d4f", 24, 3.0);

    renderHeartsUI();
    updateHUDUI();

    if (lives <= 0) {
      resultTimer = 0.9;
    }
  }

  function stepGame(dt) {
    tclock += dt;

    if (ball.state === BALL_FLIGHT) {
      trail.push({ x: ball.x, y: ball.y, life: 1 });
      if (trail.length > 16) trail.shift();

      var prevY = ball.y;
      ball.vy += GRAVITY * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x < -30 || ball.x > W + 30) {
        resolveMiss("wide");
      } else if (prevY > goalBandBottom && ball.y <= goalBandBottom) {
        var t = TIERS[tier];
        var gCenter = goalCenterX();
        var inGoal = Math.abs(ball.x - gCenter) <= t.halfW;

        if (!inGoal) {
          resolveMiss("wide");
        } else if (t.keeper) {
          var kOff = keeperOffsetX();
          var keeperX = gCenter + kOff;
          if (Math.abs(ball.x - keeperX) < 18) {
            resolveMiss("saved");
          } else {
            resolveGoal();
          }
        } else {
          resolveGoal();
        }
      } else if (ball.vy > 0 && ball.y >= ballStartY - 4) {
        resolveMiss("short");
      } else if (ball.y > H + 60) {
        resolveMiss("short");
      }
    } else if (ball.state === BALL_RESULT) {
      resultTimer -= dt;
      if (resultTimer <= 0) {
        if (lives <= 0) return triggerGameOver();
        ball.state = BALL_READY;
        ball.x = ballStartX;
        ball.y = ballStartY;
        trail = [];
      }
    }

    // Update particles
    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.x += pt.vx * dt * 60;
      pt.y += pt.vy * dt * 60;
      pt.vy += 0.2 * dt * 60;
      pt.life -= pt.decay * dt * 60;
      if (pt.life <= 0) particles.splice(p, 1);
    }

    // Update popups (float UPWARDS strictly above goal post)
    for (var u = popups.length - 1; u >= 0; u--) {
      popups[u].y -= 0.9 * dt * 60;
      popups[u].life -= 0.022 * dt * 60;
      if (popups[u].life <= 0) popups.splice(u, 1);
    }

    for (var tr = trail.length - 1; tr >= 0; tr--) {
      trail[tr].life -= 1.8 * dt;
      if (trail[tr].life <= 0) trail.splice(tr, 1);
    }

    if (shake > 0) shake = Math.max(0, shake - 2.5 * dt);
    if (tierFlash > 0) tierFlash = Math.max(0, tierFlash - 0.5 * dt);
  }

  function ambientStep(dt) {
    tclock += dt;
    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.x += pt.vx * dt * 60;
      pt.y += pt.vy * dt * 60;
      pt.life -= pt.decay * dt * 60;
      if (pt.life <= 0) particles.splice(p, 1);
    }
    if (shake > 0) shake = Math.max(0, shake - 2.5 * dt);
  }

  function triggerGameOver() {
    alive = false;
    shake = 0.8;
    sfx.gameOver();
    setTimeout(showGameOverScreen, 400);
  }

  /* --------------------------------------------------------------------------
     8. Child-Friendly Canvas Stadium Renderer (Matching Image)
     -------------------------------------------------------------------------- */

  function drawRoundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  }

  function drawPlaygroundBushesAndTrees() {
    ctx.save();

    // 1. Far Left Playground Tree
    ctx.fillStyle = "#5d4037"; // Tree Trunk
    ctx.fillRect(8, goalY - 85, 14, 55);
    // Tree Leaves (puffy green circles)
    ctx.fillStyle = "#2e7d32";
    ctx.beginPath(); ctx.arc(15, goalY - 95, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#43a047";
    ctx.beginPath(); ctx.arc(10, goalY - 100, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#66bb6a";
    ctx.beginPath(); ctx.arc(22, goalY - 105, 16, 0, Math.PI * 2); ctx.fill();

    // 2. Far Right Playground Tree
    ctx.fillStyle = "#5d4037"; // Tree Trunk
    ctx.fillRect(W - 22, goalY - 85, 14, 55);
    // Tree Leaves
    ctx.fillStyle = "#2e7d32";
    ctx.beginPath(); ctx.arc(W - 15, goalY - 95, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#43a047";
    ctx.beginPath(); ctx.arc(W - 10, goalY - 100, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#66bb6a";
    ctx.beginPath(); ctx.arc(W - 22, goalY - 105, 16, 0, Math.PI * 2); ctx.fill();

    // 3. Continuous Lush Green Bushes Hedge behind goal line (Matches image bushes!)
    var bushY = goalY - 26;
    var bushColors = ["#1b5e20", "#2e7d32", "#388e3c", "#4caf50"];
    
    // Bottom Layer Bushes (Dark Green)
    for (var b1 = -10; b1 < W + 20; b1 += 32) {
      ctx.fillStyle = bushColors[0];
      ctx.beginPath(); ctx.arc(b1, bushY, 26, 0, Math.PI * 2); ctx.fill();
    }

    // Mid Layer Bushes (Medium Green)
    for (var b2 = 5; b2 < W + 20; b2 += 28) {
      ctx.fillStyle = bushColors[1];
      ctx.beginPath(); ctx.arc(b2, bushY - 5, 22, 0, Math.PI * 2); ctx.fill();
    }

    // Top Layer Bushes (Bright Green)
    for (var b3 = 18; b3 < W; b3 += 35) {
      ctx.fillStyle = bushColors[2];
      ctx.beginPath(); ctx.arc(b3, bushY - 10, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = bushColors[3];
      ctx.beginPath(); ctx.arc(b3 - 4, bushY - 14, 12, 0, Math.PI * 2); ctx.fill();

      // Flower blossoms 🌼 on playground bushes
      if (b3 % 3 === 0) {
        ctx.fillStyle = "#ffeb3b";
        ctx.beginPath(); ctx.arc(b3, bushY - 18, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(b3 - 3, bushY - 18, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(b3 + 3, bushY - 18, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(b3, bushY - 21, 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawForegroundPlaygroundGrass() {
    ctx.save();
    
    // Bottom Left Corner Bush & Grass Blades
    ctx.fillStyle = "#2e7d32";
    ctx.beginPath(); ctx.arc(-10, H + 10, 50, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4caf50";
    ctx.beginPath(); ctx.arc(-5, H + 5, 38, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#81c784";
    ctx.beginPath(); ctx.arc(-2, H, 26, 0, Math.PI * 2); ctx.fill();

    // Grass blades pointing up on bottom left
    ctx.fillStyle = "#66bb6a";
    ctx.beginPath(); ctx.moveTo(10, H); ctx.lineTo(16, H - 25); ctx.lineTo(24, H); ctx.fill();
    ctx.beginPath(); ctx.moveTo(22, H); ctx.lineTo(30, H - 32); ctx.lineTo(38, H); ctx.fill();

    // Bottom Right Corner Bush & Grass Blades
    ctx.fillStyle = "#2e7d32";
    ctx.beginPath(); ctx.arc(W + 10, H + 10, 50, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4caf50";
    ctx.beginPath(); ctx.arc(W + 5, H + 5, 38, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#81c784";
    ctx.beginPath(); ctx.arc(W + 2, H, 26, 0, Math.PI * 2); ctx.fill();

    // Grass blades pointing up on bottom right
    ctx.fillStyle = "#66bb6a";
    ctx.beginPath(); ctx.moveTo(W - 38, H); ctx.lineTo(W - 30, H - 32); ctx.lineTo(W - 22, H); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W - 24, H); ctx.lineTo(W - 16, H - 25); ctx.lineTo(W - 10, H); ctx.fill();

    ctx.restore();
  }

  function drawStadiumBackground() {
    // 1. Sky Gradient (Sunny Sky behind goal)
    var skyGrad = ctx.createLinearGradient(0, 0, 0, goalY);
    skyGrad.addColorStop(0, "#1e90ff");
    skyGrad.addColorStop(0.6, "#70e0ff");
    skyGrad.addColorStop(1, "#b3f0ff");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, goalY);

    // 2. Fluffy White Sky Clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.beginPath(); ctx.arc(40, 30, 22, 0, Math.PI * 2); ctx.arc(65, 25, 28, 0, Math.PI * 2); ctx.arc(90, 32, 20, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W - 80, 35, 20, 0, Math.PI * 2); ctx.arc(W - 55, 28, 25, 0, Math.PI * 2); ctx.arc(W - 30, 36, 18, 0, Math.PI * 2); ctx.fill();

    // 3. Stadium Floodlight Towers (Matches Image)
    ctx.fillStyle = "#a6b9d0";
    ctx.fillRect(18, 12, 6, 65);
    ctx.fillRect(W - 24, 12, 6, 65);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(21, 12, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W - 21, 12, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffeb3b";
    ctx.beginPath(); ctx.arc(21, 12, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W - 21, 12, 6, 0, Math.PI * 2); ctx.fill();

    // 4. Stadium Stand & Spectator Crowd Wall
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(0, goalY - 55, W, 25);
    
    // Colorful spectator crowd dots & flags
    var crowdColors = ["#ff4d4f", "#4096ff", "#ffc53d", "#73d13d", "#ff85c0", "#9254de"];
    for (var c = 10; c < W; c += 14) {
      ctx.fillStyle = crowdColors[(c / 14 | 0) % crowdColors.length];
      ctx.beginPath(); ctx.arc(c, goalY - 45, 3.5, 0, Math.PI * 2); ctx.fill();
    }

    // 5. Lush Playground Bushes & Trees Layer
    drawPlaygroundBushesAndTrees();

    // 6. Pitch Field & Grass Stripes
    var pitchGrad = ctx.createLinearGradient(0, goalY, 0, H);
    pitchGrad.addColorStop(0, "#43a047");
    pitchGrad.addColorStop(0.5, "#2e7d32");
    pitchGrad.addColorStop(1, "#1b5e20");
    ctx.fillStyle = pitchGrad;
    ctx.fillRect(0, goalY, W, H - goalY);

    ctx.fillStyle = "rgba(255,255,255,0.07)";
    for (var i = 0; i < 7; i++) {
      if (i % 2 === 0) ctx.fillRect(0, goalY + i * ((H - goalY) / 7), W, (H - goalY) / 7);
    }

    // 7. White Penalty Box Lines & Arc
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 3;
    ctx.strokeRect(W * 0.12, goalY - 28, W * 0.76, H * 0.54);
    ctx.beginPath(); ctx.arc(W / 2, ballStartY, 52, Math.PI, 0); ctx.stroke();
    
    // Penalty Spot Dot
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(W / 2, ballStartY, 4, 0, Math.PI * 2); ctx.fill();
  }


  function drawGoal() {
    var t = TIERS[tier];
    var gx = goalCenterX();
    var left = gx - t.halfW;
    var right = gx + t.halfW;

    ctx.save();

    // Goal Post Shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    drawRoundRect(ctx, left - 4, goalBandBottom + 2, (right - left) + 8, 6, 3);
    ctx.fill();

    // Metallic Goal Posts & Top Crossbar (Crossbar top at goalY - 32)
    ctx.strokeStyle = "#e8ecef";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(left, goalY - 32); ctx.lineTo(left, goalBandBottom + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(right, goalY - 32); ctx.lineTo(right, goalBandBottom + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(left, goalY - 32); ctx.lineTo(right, goalY - 32); ctx.stroke();

    // Inner Post Highlight
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(left - 1, goalY - 32); ctx.lineTo(left - 1, goalBandBottom + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(right + 1, goalY - 32); ctx.lineTo(right + 1, goalBandBottom + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(left, goalY - 33); ctx.lineTo(right, goalY - 33); ctx.stroke();

    // Rainbow Accent Bar on top of Crossbar (Matches Image)
    var barY = goalY - 39;
    var barH = 5;
    var rColors = ["#ff4d4f", "#ff9c6e", "#ffec3d", "#73d13d", "#4096ff", "#9254de"];
    var segW = (right - left) / rColors.length;
    for (var c = 0; c < rColors.length; c++) {
      ctx.fillStyle = rColors[c];
      ctx.fillRect(left + c * segW, barY, segW, barH);
    }

    // White Net Grid Pattern
    ctx.strokeStyle = "rgba(255,255,255,0.38)";
    ctx.lineWidth = 1.5;
    var cols = Math.max(5, Math.round((right - left) / 14));
    for (var i = 1; i < cols; i++) {
      var nx = left + (right - left) * i / cols;
      ctx.beginPath(); ctx.moveTo(nx, goalY - 32); ctx.lineTo(nx, goalBandBottom + 6); ctx.stroke();
    }
    var rows = 5;
    for (var j = 1; j < rows; j++) {
      var ny = (goalY - 32) + ((goalBandBottom + 6) - (goalY - 32)) * j / rows;
      ctx.beginPath(); ctx.moveTo(left, ny); ctx.lineTo(right, ny); ctx.stroke();
    }

    // Goalkeeper Kid inside Goal 👦🧤 (Matches Image Right Character)
    if (t.keeper) {
      var kOff = keeperOffsetX();
      var kx = gx + kOff;
      var ky = goalY + 8;
      drawHumanKeeper(kx, ky);
    }

    ctx.restore();
  }

  function drawHumanKeeper(kx, ky) {
    ctx.save();
    ctx.translate(kx, ky);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(0, 18, 12, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Goalie Legs & Cleats
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-8, 10, 5, 10);
    ctx.fillRect(3, 10, 5, 10);
    ctx.fillStyle = "#2e7d32";
    ctx.fillRect(-9, 17, 7, 4);
    ctx.fillRect(2, 17, 7, 4);

    // Goalie Shorts
    ctx.fillStyle = "#1b5e20";
    ctx.fillRect(-10, 4, 20, 8);

    // Goalie Green Jersey #1 (Matches Image Right Goalie)
    ctx.fillStyle = "#2e7d32";
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 14, 0, 0, Math.PI * 2); ctx.fill();
    
    // Barcelona style chest crest badge
    ctx.fillStyle = "#ffeb3b";
    ctx.beginPath(); ctx.arc(0, -2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2e7d32";
    ctx.font = "700 8px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("1", 0, 1);

    var wasSaved = ball.state === BALL_RESULT && resultText.indexOf("SAVED") >= 0;
    var wasScored = ball.state === BALL_RESULT && (resultText.indexOf("GOAL") >= 0 || resultText.indexOf("SCREAMER") >= 0);

    // Goalie Arms & Patterned Gloves (Matches Image)
    if (wasSaved) {
      // Cheerful Goalie Save pose (Hands up high!) 🧤🎉
      ctx.fillStyle = "#2e7d32";
      ctx.fillRect(-16, -14, 5, 12);
      ctx.fillRect(11, -14, 5, 12);

      // Patterned Gloves (Green with Orange & Yellow Grip Pads)
      ctx.fillStyle = "#73d13d";
      ctx.beginPath(); ctx.arc(-14, -16, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(14, -16, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ff7a45";
      ctx.beginPath(); ctx.arc(-14, -16, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(14, -16, 3.5, 0, Math.PI * 2); ctx.fill();
    } else {
      var armWave = Math.sin(tclock * 6) * 3;
      ctx.fillStyle = "#2e7d32";
      ctx.fillRect(-16, -6, 5, 10);
      ctx.fillRect(11, -6, 5, 10);

      // Patterned Gloves
      ctx.fillStyle = "#73d13d";
      ctx.beginPath(); ctx.arc(-15, 6 + armWave, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(15, 6 - armWave, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffc53d";
      ctx.beginPath(); ctx.arc(-15, 6 + armWave, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(15, 6 - armWave, 3, 0, Math.PI * 2); ctx.fill();
    }

    // Goalie Head & Skin
    ctx.fillStyle = "#ffe0c2";
    ctx.beginPath(); ctx.arc(0, -15, 11, 0, Math.PI * 2); ctx.fill();

    // Brown Hair
    ctx.fillStyle = "#4a2c11";
    ctx.beginPath(); ctx.arc(0, -18, 11.5, Math.PI, 0); ctx.fill();
    ctx.fillRect(-11, -21, 22, 6);

    // Goalie Face Expressions
    if (wasScored) {
      // Surprised / Dizzy Eyes when Goal is conceded (Matches image goalie expression!)
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(-4, -14, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -14, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111111";
      ctx.beginPath(); ctx.arc(-4, -14, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -14, 1.2, 0, Math.PI * 2); ctx.fill();

      // Wide open surprised mouth! 😮
      ctx.fillStyle = "#262626";
      ctx.beginPath(); ctx.arc(0, -8, 3.5, 0, Math.PI * 2); ctx.fill();
    } else if (wasSaved) {
      // Big Cheerful Save Smile!
      ctx.fillStyle = "#262626";
      ctx.beginPath(); ctx.arc(-4, -14, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -14, 2, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = "#278003";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, -10, 4, 0.1, Math.PI - 0.1);
      ctx.stroke();
    } else {
      // Cheerful Normal Eyes
      ctx.fillStyle = "#262626";
      ctx.beginPath(); ctx.arc(-4, -14, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -14, 2, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(-4.8, -14.8, 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3.2, -14.8, 0.8, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = "#8c4d15";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, -10, 3.5, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }

    // Rosy Cheeks
    ctx.fillStyle = "rgba(255, 120, 117, 0.6)";
    ctx.beginPath(); ctx.arc(-7, -11, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -11, 2.5, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  function drawHumanKicker() {
    ctx.save();

    var isGoalScored = ball.state === BALL_RESULT && (resultText.indexOf("GOAL") >= 0 || resultText.indexOf("SCREAMER") >= 0);
    var isGoalLost = ball.state === BALL_RESULT && !isGoalScored;

    // Position kicker behind/beside penalty spot (Left Kid Striker matching image)
    var kx = ballStartX - 28;
    var ky = ballStartY + 8;
    var kickSwing = 0;

    if (ball.state === BALL_FLIGHT) {
      // Follow through pose during shot flight
      kickSwing = Math.min(1, (performance.now() - (swipeStart ? swipeStart.t : 0)) / 200);
      kx = ballStartX - 18 + kickSwing * 14;
      ky = ballStartY + 4 - kickSwing * 6;
    } else if (isGoalScored) {
      // Cheering stance after Goal
      kx = ballStartX - 18;
      ky = ballStartY + 2;
    } else if (isGoalLost) {
      // Sad stance
      kx = ballStartX - 24;
      ky = ballStartY + 10;
    }

    ctx.translate(kx, ky);

    // Kicker Shadow
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.beginPath(); ctx.ellipse(0, 16, 12, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Kicking Leg & Standing Leg
    ctx.strokeStyle = "#ffd8b8";
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";

    if (ball.state === BALL_FLIGHT) {
      ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(-8, 16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(14, 10); ctx.stroke();

      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(-12, 14, 7, 4);
      ctx.fillRect(12, 8, 7, 4);
    } else {
      ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(-6, 16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(6, 16); ctx.stroke();

      // Black Cleats
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(-10, 14, 7, 4);
      ctx.fillRect(2, 14, 7, 4);
    }

    // Red & Blue Striped FC Barcelona Jersey (Matches Left Kid in Image)
    ctx.fillStyle = "#1565c0"; // Blue Jersey base
    ctx.beginPath(); ctx.ellipse(0, -6, 12, 14, 0, 0, Math.PI * 2); ctx.fill();

    // Red Vertical Stripes (#c62828)
    ctx.fillStyle = "#c62828";
    ctx.fillRect(-8, -18, 4, 24);
    ctx.fillRect(4, -18, 4, 24);

    // Yellow #7 on Chest
    ctx.fillStyle = "#ffeb3b";
    ctx.font = "900 10px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("7", 0, -3);

    // Blue Shorts
    ctx.fillStyle = "#1565c0";
    ctx.fillRect(-9, 1, 18, 7);

    // Arms Stance
    ctx.fillStyle = "#c62828";
    if (isGoalScored) {
      ctx.fillRect(-14, -18, 4, 10);
      ctx.fillRect(10, -18, 4, 10);
      ctx.fillStyle = "#ffd8b8";
      ctx.beginPath(); ctx.arc(-12, -19, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(12, -19, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillRect(-15, -10, 4, 9);
      ctx.fillRect(11, -10, 4, 9);
      ctx.fillStyle = "#ffd8b8";
      ctx.beginPath(); ctx.arc(-13, -1, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(13, -1, 3, 0, Math.PI * 2); ctx.fill();
    }

    // Head Position
    var headY = isGoalLost ? -18 : -20;
    ctx.fillStyle = "#ffd8b8";
    ctx.beginPath(); ctx.arc(0, headY, 11, 0, Math.PI * 2); ctx.fill();

    // Messy Brown Anime Hair (Matches Image Striker Kid)
    ctx.fillStyle = "#5d3a1a";
    ctx.beginPath(); ctx.arc(0, headY - 2, 11.5, Math.PI, 0); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-11, headY - 4); ctx.lineTo(-6, headY - 10); ctx.lineTo(-1, headY - 5); ctx.lineTo(4, headY - 10); ctx.lineTo(10, headY - 4);
    ctx.fill();

    // Kicker Face Expression
    if (isGoalLost) {
      ctx.strokeStyle = "#3a1d00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, headY - 2); ctx.lineTo(-2, headY); ctx.lineTo(-6, headY + 2);
      ctx.moveTo(6, headY - 2); ctx.lineTo(2, headY); ctx.lineTo(6, headY + 2);
      ctx.stroke();

      ctx.strokeStyle = "#8c1515";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, headY + 7, 3.5, Math.PI + 0.2, Math.PI * 2 - 0.2);
      ctx.stroke();
    } else {
      // Big Cheerful Smile
      ctx.fillStyle = "#262626";
      ctx.beginPath(); ctx.arc(-3.5, headY + 1, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3.5, headY + 1, 1.8, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(-4.2, headY + 0.4, 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(2.7, headY + 0.4, 0.7, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = "#a05010";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, headY + 4, 3.5, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }

    // Rosy Cheeks
    ctx.fillStyle = "rgba(255, 120, 117, 0.6)";
    ctx.beginPath(); ctx.arc(-6, headY + 3, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, headY + 3, 2.5, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  function drawBall() {
    if (ball.state === BALL_RESULT && resultTimer < 0.35) return;

    // Rainbow energy trail with stars (Matches Image)
    var rainbowColors = ["#ff4d4f", "#ff9c6e", "#ffec3d", "#73d13d", "#4096ff", "#9254de"];
    for (var i = 0; i < trail.length; i++) {
      var tr = trail[i];
      var col = rainbowColors[i % rainbowColors.length];
      ctx.globalAlpha = Math.max(0, tr.life) * 0.75;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, 8 * (i / trail.length) + 3, 0, Math.PI * 2);
      ctx.fill();

      // Star sparkle on rainbow trail
      if (i % 3 === 0) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px Fredoka, sans-serif";
        ctx.fillText("⭐", tr.x + (Math.sin(i) * 6), tr.y + (Math.cos(i) * 6));
      }
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(tclock * 6);

    // Ball Shadow
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.beginPath(); ctx.ellipse(0, 13, 11, 4.5, 0, 0, Math.PI * 2); ctx.fill();

    // Soccer Ball Gradient
    var g = ctx.createRadialGradient(-3, -3, 1, 0, 0, 12);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#e6e6e6");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();

    // Black Pentagons
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath(); ctx.arc(0, 0, 3.8, 0, Math.PI * 2); ctx.fill();
    for (var k = 0; k < 5; k++) {
      var a = k * (Math.PI * 2 / 5);
      ctx.beginPath(); ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function renderGame() {
    var vw = canvas.width;
    var vh = canvas.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.setTransform(
      scale, 0, 0, scale,
      offX + (Math.random() - 0.5) * shake * 12 * scale,
      offY + (Math.random() - 0.5) * shake * 12 * scale
    );

    drawStadiumBackground();
    drawGoal();
    drawHumanKicker();
    drawBall();

    // Render particles
    for (var p = 0; p < particles.length; p++) {
      var pt = particles[p];
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r * pt.life, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Render floating popups (Strictly floating UPWARDS above goal post!)
    ctx.textAlign = "center";
    ctx.font = "900 20px Fredoka, sans-serif";
    for (var u = 0; u < popups.length; u++) {
      ctx.globalAlpha = Math.max(0, popups[u].life);
      ctx.fillStyle = popups[u].color;
      ctx.fillText(popups[u].text, popups[u].x, popups[u].y);
    }
    ctx.globalAlpha = 1;

    /* --------------------------------------------------------------------------
       CRITICAL NOTIFICATION REQUIREMENT:
       All point notifications & game feedback MUST be displayed STRICTLY ABOVE
       the goal post crossbar (goalY - 32) and NEVER overlay the goal post!
       -------------------------------------------------------------------------- */
    if (state === STATE_PLAY) {
      if (ball.state === BALL_RESULT && resultTimer > 0) {
        var a = Math.min(1, resultTimer * 3);
        var notifY = goalY - 55; // STRICTLY ABOVE GOAL CROSSBAR (goalY - 32)
        
        ctx.save();
        ctx.globalAlpha = a;

        // Stylish Arcade Notification Badge Pill
        var badgeW = 210;
        var badgeH = 42;
        var isGoal = resultText.indexOf("GOAL") >= 0 || resultText.indexOf("SCREAMER") >= 0;
        
        ctx.fillStyle = isGoal ? "rgba(16, 50, 24, 0.94)" : "rgba(60, 16, 16, 0.94)";
        ctx.strokeStyle = isGoal ? "#ffeb3b" : "#ff7a45";
        ctx.lineWidth = 3;

        drawRoundRect(ctx, W / 2 - badgeW / 2, notifY - badgeH / 2, badgeW, badgeH, 21);
        ctx.fill();
        ctx.stroke();

        ctx.font = "900 22px Fredoka, sans-serif";
        ctx.fillStyle = isGoal ? "#ffeb3b" : "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(resultText, W / 2, notifY);
        ctx.restore();
      }

      if (tierFlash > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, tierFlash * 2.0);
        ctx.font = "900 24px Fredoka, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(TIERS[tier].name, W / 2, goalY - 75); // STRICTLY ABOVE GOAL POST
        ctx.restore();
      }

      if (ball.state === BALL_READY) {
        ctx.globalAlpha = 0.75 + Math.sin(tclock * 3) * 0.15;
        ctx.font = "600 15px Fredoka, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText("👆 swipe up to kick!", W / 2, ballStartY + 46);
        ctx.globalAlpha = 1;
      }
    }

    drawForegroundPlaygroundGrass();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }



  /* --------------------------------------------------------------------------
     9. Main RequestAnimationFrame Loop
     -------------------------------------------------------------------------- */
  var lastTs = 0;
  function gameLoop(ts) {
    requestAnimationFrame(gameLoop);
    if (!lastTs) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    if (state === STATE_PLAY) {
      stepGame(dt);
    } else {
      ambientStep(dt);
    }

    renderGame();
  }

  /* --------------------------------------------------------------------------
     10. UI & Flow State Management
     -------------------------------------------------------------------------- */
  function startGame() {
    initAudio();
    startBgm();
    resetGame();
    state = STATE_PLAY;

    titleScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    pauseScreen.classList.add("hidden");
    hudEl.classList.remove("hidden");
    lastTs = 0;
  }

  function showGameOverScreen() {
    state = STATE_OVER;
    stopBgm();

    if (score > best) {
      best = score;
      try {
        localStorage.setItem("goalkick_best", String(best));
      } catch (e) {}
      bestScoreText.textContent = best + " (NEW RECORD!) 🎉";
    } else {
      bestScoreText.textContent = String(best);
    }

    var lines = ["Full Time! 🎉", "Great Effort! 🌟", "Final Whistle! ⚽", "Bench Time! 👍"];
    overTitle.textContent = lines[(Math.random() * lines.length) | 0];
    overReasonText.textContent = "Out of lives!";
    finalScoreText.textContent = score;
    goalsText.textContent = goals + " Goals";
    bestStreakText.textContent = "Best Streak " + bestStreak;

    hudEl.classList.add("hidden");
    gameOverScreen.classList.remove("hidden");
  }

  function pauseGame() {
    if (state !== STATE_PLAY) return;
    state = STATE_PAUSED;
    stopBgm();
    pauseScreen.classList.remove("hidden");
  }

  function resumeGame() {
    if (state !== STATE_PAUSED) return;
    state = STATE_PLAY;
    startBgm();
    pauseScreen.classList.add("hidden");
    lastTs = 0;
  }

  startBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    startGame();
  });

  againBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    startGame();
  });

  resumeBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    resumeGame();
  });

  /* --------------------------------------------------------------------------
     11. Touch & Pointer Swipe Handling
     -------------------------------------------------------------------------- */
  function toWorld(e) {
    var r = canvas.getBoundingClientRect();
    var clientX = e.clientX;
    var clientY = e.clientY;

    if (typeof clientX !== "number" && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    return {
      x: (((clientX - r.left) * dpr) - offX) / scale,
      y: (((clientY - r.top) * dpr) - offY) / scale
    };
  }

  canvas.addEventListener("pointerdown", function (e) {
    if (state !== STATE_PLAY) {
      initAudio();
      return;
    }
    var w = toWorld(e);
    beginSwipe(w.x, w.y);
    if (canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
    e.preventDefault();
  });

  canvas.addEventListener("pointerup", function (e) {
    if (state !== STATE_PLAY) return;
    var w = toWorld(e);
    endSwipe(w.x, w.y);
    e.preventDefault();
  });

  canvas.addEventListener("pointercancel", function () {
    swipeStart = null;
  });

  window.addEventListener("keydown", function (e) {
    if ((e.key === " " || e.key === "Enter") && state !== STATE_PLAY && state !== STATE_PAUSED) {
      startGame();
    } else if (e.key === "Escape" || e.key === "p" || e.key === "P") {
      if (state === STATE_PLAY) pauseGame();
      else if (state === STATE_PAUSED) resumeGame();
    }
  });

  /* --------------------------------------------------------------------------
     12. Auto-Pause on Window Blur / Tab Close / Visibility Change
     -------------------------------------------------------------------------- */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && state === STATE_PLAY) {
      pauseGame();
    }
  });

  window.addEventListener("blur", function () {
    if (state === STATE_PLAY) {
      pauseGame();
    }
  });

  window.addEventListener("pagehide", function () {
    if (state === STATE_PLAY) {
      pauseGame();
    }
  });

  window.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });

  /* --------------------------------------------------------------------------
     13. Engine Boot
     -------------------------------------------------------------------------- */
  resize();
  resetGame();
  requestAnimationFrame(gameLoop);

})();
