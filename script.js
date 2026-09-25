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
    ballStartY = H * 0.80;
    goalY = H * 0.15;
    goalBandBottom = H * 0.19;
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
    popups.push({ x: ball.x, y: ball.y - 24, life: 1.2, text: "+" + pts, color: "#52c41a" });

    if (streak > 0 && streak % 5 === 0) {
      sfx.streak();
    }

    var newTier = tierOf(goals);
    if (newTier > tier) {
      tier = newTier;
      tierFlash = 1.4;
      sfx.levelup();
      popups.push({ x: W / 2, y: H * 0.38, life: 1.5, text: TIERS[tier].name, color: "#ffc53d" });
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
      if (trail.length > 14) trail.shift();

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

    // Update popups
    for (var u = popups.length - 1; u >= 0; u--) {
      popups[u].y -= 0.8 * dt * 60;
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
     8. Child-Friendly Canvas Stadium Renderer
     -------------------------------------------------------------------------- */
  function drawGoal() {
    var t = TIERS[tier];
    var gx = goalCenterX();
    var left = gx - t.halfW;
    var right = gx + t.halfW;

    ctx.save();

    // Goal Post Shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(left - 4, goalBandBottom + 2, (right - left) + 8, 6);

    // Goal Posts & Crossbar
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(left, goalY - 26); ctx.lineTo(left, goalBandBottom + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(right, goalY - 26); ctx.lineTo(right, goalBandBottom + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(left, goalY - 26); ctx.lineTo(right, goalY - 26); ctx.stroke();

    // Goal Net Grid
    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.lineWidth = 1.5;
    var cols = Math.max(4, Math.round((right - left) / 14));
    for (var i = 1; i < cols; i++) {
      var nx = left + (right - left) * i / cols;
      ctx.beginPath(); ctx.moveTo(nx, goalY - 26); ctx.lineTo(nx, goalBandBottom + 6); ctx.stroke();
    }
    var rows = 4;
    for (var j = 1; j < rows; j++) {
      var ny = (goalY - 26) + ((goalBandBottom + 6) - (goalY - 26)) * j / rows;
      ctx.beginPath(); ctx.moveTo(left, ny); ctx.lineTo(right, ny); ctx.stroke();
    }

    // Cute Goalie Bear 🐻🧤
    if (t.keeper) {
      var kOff = keeperOffsetX();
      var kx = gx + kOff;
      var ky = goalY + 12;

      ctx.save();
      ctx.translate(kx, ky);

      // Goalie Body
      ctx.fillStyle = "#ffaa00";
      ctx.beginPath(); ctx.ellipse(0, 4, 14, 18, 0, 0, Math.PI * 2); ctx.fill();

      // Goalie Jersey #1
      ctx.fillStyle = "#ff4d4f";
      ctx.beginPath(); ctx.ellipse(0, 4, 12, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 11px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("1", 0, 8);

      // Cute Bear Head
      ctx.fillStyle = "#d48806";
      ctx.beginPath(); ctx.arc(0, -14, 12, 0, Math.PI * 2); ctx.fill();

      // Ears
      ctx.beginPath(); ctx.arc(-11, -22, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(11, -22, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffadd2";
      ctx.beginPath(); ctx.arc(-11, -22, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(11, -22, 2.5, 0, Math.PI * 2); ctx.fill();

      // Muzzle & Nose
      ctx.fillStyle = "#fff1b8";
      ctx.beginPath(); ctx.ellipse(0, -10, 6, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3a1d00";
      ctx.beginPath(); ctx.arc(0, -12, 2.2, 0, Math.PI * 2); ctx.fill();

      // Goalie Gloves 🧤
      ctx.fillStyle = "#52c41a";
      ctx.beginPath(); ctx.arc(-18, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(18, 0, 6, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }

  function drawBall() {
    if (ball.state === BALL_RESULT && resultTimer < 0.35) return;

    // Tail motion trail
    for (var i = 0; i < trail.length; i++) {
      var tr = trail[i];
      ctx.globalAlpha = Math.max(0, tr.life) * 0.4;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(tr.x, tr.y, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(tclock * 6);

    // Ball Shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(0, 12, 10, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Soccer Ball Gradient
    var g = ctx.createRadialGradient(-3, -3, 1, 0, 0, 12);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#e6e6e6");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();

    // Pentagons
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    for (var k = 0; k < 5; k++) {
      var a = k * (Math.PI * 2 / 5);
      ctx.beginPath(); ctx.arc(Math.cos(a) * 7.5, Math.sin(a) * 7.5, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function renderGame() {
    var vw = canvas.width;
    var vh = canvas.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Fullscreen Stadium Field Gradient
    var bgGrad = ctx.createLinearGradient(0, 0, 0, vh);
    bgGrad.addColorStop(0, "#278003");
    bgGrad.addColorStop(1, "#0f4023");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, vw, vh);

    ctx.setTransform(
      scale, 0, 0, scale,
      offX + (Math.random() - 0.5) * shake * 12 * scale,
      offY + (Math.random() - 0.5) * shake * 12 * scale
    );

    // Grass Stripes
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (var i = 0; i < 7; i++) {
      if (i % 2 === 0) ctx.fillRect(0, H * 0.18 + i * (H * 0.75 / 7), W, H * 0.75 / 7);
    }

    // Penalty Box Lines
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 2.8;
    ctx.strokeRect(W * 0.10, goalY - 26, W * 0.80, H * 0.55);
    ctx.beginPath(); ctx.arc(W / 2, ballStartY, 50, Math.PI, 0); ctx.stroke();

    drawGoal();
    drawBall();

    // Render particles
    for (var p = 0; p < particles.length; p++) {
      var pt = particles[p];
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r * pt.life, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Render floating popups
    ctx.textAlign = "center";
    ctx.font = "700 20px Fredoka, sans-serif";
    for (var u = 0; u < popups.length; u++) {
      ctx.globalAlpha = Math.max(0, popups[u].life);
      ctx.fillStyle = popups[u].color;
      ctx.fillText(popups[u].text, popups[u].x, popups[u].y);
    }
    ctx.globalAlpha = 1;

    if (state === STATE_PLAY) {
      if (ball.state === BALL_RESULT && resultTimer > 0) {
        var a = Math.min(1, resultTimer * 3);
        ctx.globalAlpha = a;
        ctx.font = "700 36px Fredoka, sans-serif";
        ctx.fillStyle = resultText.indexOf("GOAL") >= 0 || resultText.indexOf("SCREAMER") >= 0 ? "#b7eb8f" : "#ffbb96";
        ctx.fillText(resultText, W / 2, H * 0.46);
        ctx.globalAlpha = 1;
      }

      if (tierFlash > 0) {
        ctx.globalAlpha = Math.min(1, tierFlash * 2.0);
        ctx.font = "700 26px Fredoka, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(TIERS[tier].name, W / 2, H * 0.58);
        ctx.globalAlpha = 1;
      }

      if (ball.state === BALL_READY) {
        ctx.globalAlpha = 0.75 + Math.sin(tclock * 3) * 0.15;
        ctx.font = "500 14px Fredoka, sans-serif";
        ctx.fillStyle = "#eafff0";
        ctx.fillText("👆 swipe up to kick!", W / 2, ballStartY + 45);
        ctx.globalAlpha = 1;
      }
    }

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
