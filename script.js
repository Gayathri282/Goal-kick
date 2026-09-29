/**
 * Whack It! - Child Friendly Fullscreen Web Game Engine
 * Features:
 * - 100% Fullscreen playgrid layout on all devices (No letterboxing)
 * - Engaging Web Audio synthesizer with BGM loop & event tones
 * - Super child-friendly characters (Hamster, Golden Bunny, Cheeky Raccoon, Party Kitty)
 * - Auto-pause on tab switch / window blur / window close
 * - Level countdown timer, consecutive miss tracking & target goals
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
  var levelNameText = document.getElementById("levelNameText");
  var timerText = document.getElementById("timerText");
  var timerPill = document.getElementById("timerPill");
  var goalText = document.getElementById("goalText");
  var livesContainer = document.getElementById("livesContainer");
  var missText = document.getElementById("missText");
  var helpBtn = document.getElementById("helpBtn");

  // Screen Overlays
  var titleScreen = document.getElementById("titleScreen");
  var gameOverScreen = document.getElementById("gameOverScreen");
  var pauseScreen = document.getElementById("pauseScreen");
  var helpScreen = document.getElementById("helpScreen");

  // Action Buttons
  var startBtn = document.getElementById("startBtn");
  var againBtn = document.getElementById("againBtn");
  var resumeBtn = document.getElementById("resumeBtn");
  var closeHelpBtn = document.getElementById("closeHelpBtn");
  var gotItBtn = document.getElementById("gotItBtn");

  // End Screen Stats
  var finalScoreText = document.getElementById("finalScoreText");
  var whackedText = document.getElementById("whackedText");
  var bestStreakText = document.getElementById("bestStreakText");
  var bestScoreText = document.getElementById("bestScoreText");
  var overTitle = document.getElementById("overTitle");
  var overReasonText = document.getElementById("overReasonText");

  /* --------------------------------------------------------------------------
     2. Dual Mobile & Desktop Responsive Layout Engine
     -------------------------------------------------------------------------- */
  var W = 600, H = 900, scale = 1, offX = 0, offY = 0, dpr = 1;
  var GRID_R = 3, GRID_C = 3;
  var gridTop = 100, gridBot = 800, cellW = 200, cellH = 220;

  function resize() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);

    var aspect = vw / vh;

    if (aspect < 0.85) {
      // MOBILE PORTRAIT LAYOUT: 100% Fullscreen Viewport Fill
      W = 600;
      H = Math.round(W / aspect);
      scale = (vw * dpr) / W;
      offX = 0;
      offY = 0;
      gridTop = Math.max(90, H * 0.12);
      gridBot = H * 0.94;
    } else {
      // DESKTOP / TABLET / LANDSCAPE WIDESCREEN:
      // Center stage with natural round hole proportions while canvas fills 100% monitor
      H = 800;
      W = 540;
      var targetH = Math.min(vh * dpr * 0.92, H * 1.15 * dpr);
      var targetW = targetH * (W / H);

      if (targetW > vw * dpr * 0.92) {
        targetW = vw * dpr * 0.92;
        targetH = targetW * (H / W);
      }

      scale = targetW / W;
      offX = (vw * dpr - targetW) / 2;
      offY = (vh * dpr - targetH) / 2;
      gridTop = H * 0.12;
      gridBot = H * 0.93;
    }

    cellW = W / GRID_C;
    cellH = (gridBot - gridTop) / GRID_R;
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

  // Upbeat, engaging, child-friendly melody & bassline
  var BGM_MELODY = [
    523.25, 659.25, 783.99, 659.25, 783.99, 1046.50, 783.99, 659.25,
    587.33, 698.46, 880.00, 698.46, 880.00, 1174.66, 880.00, 698.46,
    659.25, 783.99, 987.77, 783.99, 987.77, 1318.51, 987.77, 783.99,
    698.46, 880.00, 1046.50, 880.00, 1174.66, 1318.51, 1046.50, 783.99
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
        bgmGain.gain.value = 0.09;
        bgmGain.connect(masterGain);
      } catch (e) {
        actx = null;
      }
    }
    if (actx && actx.state === "suspended") {
      actx.resume().catch(function () { });
    }
  }

  function resumeAudioContext() {
    initAudio();
    if (actx && actx.state === "suspended") {
      actx.resume().catch(function () { });
    }
    if (state === STATE_PLAY && !isBgmPlaying && actx && actx.state === "running") {
      startBgm();
    }
  }

  // Register interaction listeners for robust mobile & desktop Web Audio unlock/resume
  var interactionEvents = ["pointerdown", "touchstart", "touchend", "mousedown", "keydown", "click"];
  interactionEvents.forEach(function (evt) {
    window.addEventListener(evt, resumeAudioContext, { capture: true, passive: true });
  });

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

        // Lead Melody Synth
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

        // Warm Bassline
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
      } catch (e) { }
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
      g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + o.dur);

      osc.connect(g);
      g.connect(masterGain);

      osc.start(t0);
      osc.stop(t0 + o.dur + 0.02);
    } catch (e) { }
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
      f.frequency.value = freq || 1200;
      f.Q.value = 1.2;

      var g = actx.createGain();
      g.gain.value = vol;

      src.connect(f);
      f.connect(g);
      g.connect(masterGain);
      src.start();
    } catch (e) { }
  }

  var sfx = {
    whack: function () {
      playNoise(0.04, 0.12, 1600);
      playTone({ from: 400, to: 200, dur: 0.08, type: "triangle", vol: 0.22 });
      playTone({ from: 659.25, dur: 0.12, type: "sine", vol: 0.18, delay: 0.02 });
    },
    gold: function () {
      playTone({ from: 783.99, dur: 0.1, type: "triangle", vol: 0.22 });
      playTone({ from: 1046.50, dur: 0.14, type: "sine", vol: 0.24, delay: 0.06 });
      playTone({ from: 1318.51, dur: 0.22, type: "sine", vol: 0.22, delay: 0.12 });
    },
    bad: function () {
      playTone({ from: 280, to: 110, dur: 0.28, type: "sawtooth", vol: 0.18 });
      playTone({ from: 160, to: 80, dur: 0.32, type: "triangle", vol: 0.2, delay: 0.05 });
    },
    miss: function () {
      playTone({ from: 240, to: 150, dur: 0.12, type: "sine", vol: 0.12 });
    },
    streak: function () {
      var notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      for (var i = 0; i < notes.length; i++) {
        playTone({ from: notes[i], dur: 0.14, type: "sine", vol: 0.18, delay: i * 0.05 });
      }
    },
    levelUp: function () {
      var notes = [392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51];
      for (var i = 0; i < notes.length; i++) {
        playTone({ from: notes[i], dur: 0.22, type: "triangle", vol: 0.24, delay: i * 0.06 });
      }
    },
    gameOver: function () {
      playTone({ from: 523.25, to: 392, dur: 0.2, type: "triangle", vol: 0.18 });
      playTone({ from: 392, to: 293.66, dur: 0.25, type: "triangle", vol: 0.18, delay: 0.18 });
      playTone({ from: 293.66, to: 196, dur: 0.45, type: "sine", vol: 0.22, delay: 0.38 });
    }
  };

  /* --------------------------------------------------------------------------
     4. Level Tiers & Goals
     -------------------------------------------------------------------------- */
  var TIERS = [
    { lvl: 1, name: "Sunny Meadow 🌱", target: 12, timeLimit: 45, maxConsecutiveMisses: 3, gap: [0.80, 1.2], up: [1.1, 1.4], maxC: 1, bad: 0.10, gold: 0.14 },
    { lvl: 2, name: "Bouncy Burrow 🐰", target: 20, timeLimit: 40, maxConsecutiveMisses: 3, gap: [0.62, 0.98], up: [0.90, 1.2], maxC: 2, bad: 0.14, gold: 0.15 },
    { lvl: 3, name: "Starry Park ⭐", target: 28, timeLimit: 35, maxConsecutiveMisses: 3, gap: [0.48, 0.80], up: [0.72, 0.98], maxC: 2, bad: 0.18, gold: 0.16 },
    { lvl: 4, name: "Rainbow Rush 🌈", target: 36, timeLimit: 30, maxConsecutiveMisses: 3, gap: [0.38, 0.65], up: [0.58, 0.82], maxC: 3, bad: 0.22, gold: 0.18 },
    { lvl: 5, name: "Super Whack! ⚡", target: 45, timeLimit: 25, maxConsecutiveMisses: 3, gap: [0.28, 0.50], up: [0.45, 0.68], maxC: 3, bad: 0.25, gold: 0.20 }
  ];

  /* --------------------------------------------------------------------------
     5. Game State & Logic Variables
     -------------------------------------------------------------------------- */
  var STATE_TITLE = 0;
  var STATE_PLAY = 1;
  var STATE_PAUSED = 2;
  var STATE_OVER = 3;

  var state = STATE_TITLE;

  var holes = [];
  var particles = [];
  var popups = [];

  var score = 0;
  var lives = 3;
  var whacked = 0;
  var streak = 0;
  var bestStreak = 0;
  var tier = 0;
  var tierFlash = 0;
  var bestScore = 0;
  var alive = true;
  var tclock = 0;
  var shake = 0;
  var flashRed = 0;
  var spawnTimer = 0;

  var levelTimer = 45;
  var levelWhacked = 0;
  var consecutiveMisses = 0;
  var gameOverReason = "Out of hearts! 💔";

  try {
    bestScore = parseInt(localStorage.getItem("whack_best_score") || "0", 10) || 0;
  } catch (e) { }

  function holeXY(i) {
    var r = (i / GRID_C) | 0;
    var c = i % GRID_C;
    return {
      x: cellW * (c + 0.5),
      y: gridTop + cellH * (r + 0.5)
    };
  }

  function resetGame() {
    holes = [];
    for (var i = 0; i < GRID_R * GRID_C; i++) {
      var p = holeXY(i);
      holes.push({
        x: p.x,
        y: p.y,
        state: "empty",
        type: null,
        t: 0,
        upDur: 1,
        wasHit: false,
        phase: Math.random() * Math.PI * 2
      });
    }

    particles = [];
    popups = [];
    score = 0;
    lives = 3;
    whacked = 0;
    streak = 0;
    bestStreak = 0;
    tier = 0;
    tierFlash = 1.2;
    alive = true;
    tclock = 0;
    shake = 0;
    flashRed = 0;
    spawnTimer = 0.5;

    levelWhacked = 0;
    consecutiveMisses = 0;
    levelTimer = TIERS[0].timeLimit;

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
    levelNameText.textContent = "LVL " + t.lvl;

    var secondsLeft = Math.max(0, Math.ceil(levelTimer));
    timerText.textContent = secondsLeft + "s";
    if (secondsLeft <= 8) {
      timerPill.classList.add("warning");
    } else {
      timerPill.classList.remove("warning");
    }

    goalText.textContent = levelWhacked + " / " + t.target;
    missText.textContent = consecutiveMisses + " / " + t.maxConsecutiveMisses + " 💨";
  }

  function burstParticles(x, y, n, color, spread, power) {
    for (var i = 0; i < n; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = Math.random() * power;
      particles.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        r: 3 + Math.random() * 5,
        life: 1,
        decay: 0.02 + Math.random() * 0.025,
        color: color
      });
    }
  }

  function pickType(t) {
    var r = Math.random();
    if (r < t.bad) return "bad";
    if (r < t.bad + t.gold) return "gold";
    if (r < t.bad + t.gold + 0.15) return "kitty";
    return "normal";
  }

  /* --------------------------------------------------------------------------
     6. High-Precision Touch & Hit Detection
     -------------------------------------------------------------------------- */
  function creatureRise(h) {
    var rise;
    if (h.state === "rising") rise = h.t / 0.12;
    else if (h.state === "up") rise = 1;
    else if (h.state === "ducking") rise = 1 - h.t / 0.12;
    else rise = Math.max(0, 1 - h.t / 0.30);
    return Math.max(0, Math.min(1, rise));
  }

  function creatureCenter(h) {
    var rise = creatureRise(h);
    var popH = cellH * 0.55 * rise;
    return {
      x: h.x,
      y: h.y - popH * 0.5
    };
  }

  function tapAt(x, y) {
    if (state !== STATE_PLAY || !alive) return;

    var hitTarget = null;
    var minDist = Infinity;

    for (var i = 0; i < holes.length; i++) {
      var h = holes[i];

      if (h.state !== "up" && h.state !== "rising" && h.state !== "ducking") continue;
      if (h.state === "ducking" && h.t > 0.08) continue;

      var cPos = creatureCenter(h);
      var dx = x - cPos.x;
      var dy = y - cPos.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      var hitRadius = Math.min(cellW, cellH) * 0.48;

      if (dist < hitRadius && dist < minDist) {
        minDist = dist;
        hitTarget = h;
      }
    }

    if (!hitTarget) return;

    hitTarget.state = "hit";
    hitTarget.t = 0;
    hitTarget.wasHit = true;

    if (hitTarget.type === "bad") {
      lives--;
      streak = 0;
      sfx.bad();
      shake = Math.max(shake, 0.6);
      flashRed = 1;
      burstParticles(hitTarget.x, hitTarget.y, 18, "#ff4d4f", 24, 3.8);
      popups.push({ x: hitTarget.x, y: hitTarget.y - 30, life: 1, text: "-1 Heart 💔", color: "#ff4d4f" });

      renderHeartsUI();
      updateHUDUI();

      if (lives <= 0) {
        gameOverReason = "Ouch! Sneaky Raccoon bit you! 🦝";
        triggerGameOver();
      }
    } else {
      whacked++;
      levelWhacked++;
      streak++;
      bestStreak = Math.max(bestStreak, streak);

      // RESET CONSECUTIVE MISS STREAK ON SUCCESSFUL HIT
      consecutiveMisses = 0;

      var bonus = Math.floor(streak / 5) * 2;
      if (hitTarget.type === "gold") {
        var addedGold = 5 + bonus;
        score += addedGold;
        sfx.gold();
        burstParticles(hitTarget.x, hitTarget.y, 24, "#ffc53d", 32, 4.5);
        popups.push({ x: hitTarget.x, y: hitTarget.y - 30, life: 1.2, text: "+" + addedGold + " 🐰⭐", color: "#faad14" });
      } else if (hitTarget.type === "kitty") {
        var addedKitty = 3 + bonus;
        score += addedKitty;
        sfx.gold();
        burstParticles(hitTarget.x, hitTarget.y, 20, "#ff85c0", 28, 4.0);
        popups.push({ x: hitTarget.x, y: hitTarget.y - 30, life: 1.2, text: "+" + addedKitty + " 🐱💖", color: "#ff85c0" });
      } else {
        var addedNormal = 1 + bonus;
        score += addedNormal;
        sfx.whack();
        burstParticles(hitTarget.x, hitTarget.y, 14, "#73d13d", 22, 3.2);
        popups.push({ x: hitTarget.x, y: hitTarget.y - 30, life: 1.0, text: "+" + addedNormal, color: "#52c41a" });
      }

      if (streak > 0 && streak % 5 === 0) {
        sfx.streak();
        shake = Math.max(shake, 0.28);
      }

      var t = TIERS[tier];
      if (levelWhacked >= t.target) {
        advanceLevel();
      } else {
        updateHUDUI();
      }
    }
  }

  function advanceLevel() {
    if (tier < TIERS.length - 1) {
      tier++;
    }
    var newT = TIERS[tier];
    levelWhacked = 0;
    consecutiveMisses = 0;
    levelTimer = newT.timeLimit;
    tierFlash = 1.4;
    shake = Math.max(shake, 0.45);
    sfx.levelUp();
    burstParticles(W / 2, H * 0.4, 36, "#ffc53d", 70, 5.5);
    popups.push({ x: W / 2, y: H * 0.35, life: 1.5, text: "LEVEL CLEARED! 🌟", color: "#73d13d" });

    renderHeartsUI();
    updateHUDUI();
  }

  function triggerGameOver() {
    alive = false;
    shake = 0.8;
    sfx.gameOver();

    setTimeout(function () {
      showGameOverScreen();
    }, 400);
  }

  /* --------------------------------------------------------------------------
     7. Game Loop & Physics Update
     -------------------------------------------------------------------------- */
  function activeCount() {
    var count = 0;
    for (var i = 0; i < holes.length; i++) {
      if (holes[i].state !== "empty") count++;
    }
    return count;
  }

  function stepGame(dt) {
    tclock += dt;
    var t = TIERS[tier];

    // Countdown Level Timer
    levelTimer -= dt;
    if (levelTimer <= 0) {
      levelTimer = 0;
      if (levelWhacked >= t.target) {
        advanceLevel();
      } else {
        gameOverReason = "Time's Up! Missed level goal! ⏱️";
        triggerGameOver();
        return;
      }
    }
    updateHUDUI();

    // Spawn cute animals
    spawnTimer -= dt;
    if (spawnTimer <= 0 && activeCount() < t.maxC) {
      var empties = [];
      for (var i = 0; i < holes.length; i++) {
        if (holes[i].state === "empty") empties.push(holes[i]);
      }
      if (empties.length > 0) {
        var pickHole = empties[(Math.random() * empties.length) | 0];
        pickHole.state = "rising";
        pickHole.t = 0;
        pickHole.wasHit = false;
        pickHole.type = pickType(t);
        pickHole.upDur = t.up[0] + Math.random() * (t.up[1] - t.up[0]);
        spawnTimer = t.gap[0] + Math.random() * (t.gap[1] - t.gap[0]);
      } else {
        spawnTimer = 0.15;
      }
    }

    // Update hole animals & track 3 CONSECUTIVE misses
    for (var j = 0; j < holes.length; j++) {
      var h = holes[j];
      h.t += dt;

      if (h.state === "rising" && h.t >= 0.12) {
        h.state = "up";
        h.t = 0;
      } else if (h.state === "up" && h.t >= h.upDur) {
        h.state = "ducking";
        h.t = 0;
      } else if (h.state === "ducking" && h.t >= 0.12) {
        // Check if a friendly animal escaped unhit
        if (!h.wasHit && h.type !== "bad") {
          consecutiveMisses++;
          sfx.miss();
          popups.push({ x: h.x, y: h.y - 24, life: 0.8, text: "Missed! (" + consecutiveMisses + "/3) 💨", color: "#ff7a45" });

          // 3 CONSECUTIVE MISSES PENALTY
          if (consecutiveMisses >= t.maxConsecutiveMisses) {
            lives--;
            consecutiveMisses = 0;
            shake = Math.max(shake, 0.6);
            flashRed = 1;
            sfx.bad();
            popups.push({ x: h.x, y: h.y - 42, life: 1.2, text: "3 Misses in a row! -1 Heart 💔", color: "#ff4d4f" });
            renderHeartsUI();

            if (lives <= 0) {
              gameOverReason = "3 Consecutive Misses! 💨";
              triggerGameOver();
              return;
            }
          }
        }
        h.state = "empty";
        h.type = null;
      } else if (h.state === "hit" && h.t >= 0.30) {
        h.state = "empty";
        h.type = null;
      }
    }

    // Update particles
    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.x += pt.vx * dt * 60;
      pt.y += pt.vy * dt * 60;
      pt.vy += 0.22 * dt * 60;
      pt.life -= pt.decay * dt * 60;
      if (pt.life <= 0) particles.splice(p, 1);
    }

    // Update floating popups
    for (var u = popups.length - 1; u >= 0; u--) {
      popups[u].y -= 0.8 * dt * 60;
      popups[u].life -= 0.022 * dt * 60;
      if (popups[u].life <= 0) popups.splice(u, 1);
    }

    if (shake > 0) shake = Math.max(0, shake - 2.5 * dt);
    if (flashRed > 0) flashRed = Math.max(0, flashRed - 2 * dt);
    if (tierFlash > 0) tierFlash = Math.max(0, tierFlash - 0.6 * dt);
  }

  function ambientStep(dt) {
    tclock += dt;
    spawnTimer -= dt;
    if (spawnTimer <= 0 && activeCount() < 1) {
      var empties = [];
      for (var i = 0; i < holes.length; i++) if (holes[i].state === "empty") empties.push(holes[i]);
      if (empties.length > 0) {
        var h = empties[(Math.random() * empties.length) | 0];
        h.state = "rising";
        h.t = 0;
        h.type = (Math.random() > 0.4) ? "gold" : "normal";
        h.upDur = 1.2;
        spawnTimer = 1.0;
      }
    }
    for (var j = 0; j < holes.length; j++) {
      var hh = holes[j];
      hh.t += dt;
      if (hh.state === "rising" && hh.t >= 0.12) { hh.state = "up"; hh.t = 0; }
      else if (hh.state === "up" && hh.t >= hh.upDur) { hh.state = "ducking"; hh.t = 0; }
      else if (hh.state === "ducking" && hh.t >= 0.12) { hh.state = "empty"; hh.type = null; }
    }
  }

  /* --------------------------------------------------------------------------
     8. Child-Friendly Canvas Rendering Engine
     -------------------------------------------------------------------------- */
  function drawHole(h) {
    var hw = cellW * 0.42;
    var hh = cellH * 0.22;

    // Ground Hole Outer Shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(h.x, h.y + cellH * 0.10, hw * 1.05, hh * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();

    // Earthy Burrow Rim
    var g = ctx.createRadialGradient(h.x, h.y, 4, h.x, h.y, hw);
    g.addColorStop(0, "#8c532b");
    g.addColorStop(0.7, "#5e3619");
    g.addColorStop(1, "#3d220f");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(h.x, h.y, hw, hh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark Inner Hole Depth
    ctx.fillStyle = "#1c0d05";
    ctx.beginPath();
    ctx.ellipse(h.x, h.y, hw * 0.76, hh * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCreature(h) {
    if (h.state === "empty") return;

    var rise = creatureRise(h);
    var popH = cellH * 0.58 * rise;
    var cx = h.x;
    var cy = h.y - popH * 0.5;
    var squish = h.state === "hit" ? Math.min(1, h.t / 0.15) : 0;

    ctx.save();
    // Clip character inside the hole bounds
    ctx.beginPath();
    ctx.rect(h.x - cellW * 0.5, h.y - cellH * 0.75, cellW, cellH * 0.75 + 3);
    ctx.clip();

    ctx.translate(cx, cy);
    ctx.scale(1 + squish * 0.35, 1 - squish * 0.5);

    var bob = h.state === "up" ? Math.sin(tclock * 6 + h.phase) * 3 : 0;
    ctx.translate(0, bob);

    var r = Math.min(cellW, cellH) * 0.28;
    var isBad = h.type === "bad";
    var isGold = h.type === "gold";
    var isKitty = h.type === "kitty";

    // ------------------- EARS -------------------
    if (isBad) {
      // Cheeky Raccoon ears
      ctx.fillStyle = "#434343";
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.5); ctx.lineTo(-r * 0.95, -r * 1.15); ctx.lineTo(-r * 0.2, -r * 0.8);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.6, -r * 0.5); ctx.lineTo(r * 0.95, -r * 1.15); ctx.lineTo(r * 0.2, -r * 0.8);
      ctx.fill();

      ctx.fillStyle = "#ffadd2";
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.55); ctx.lineTo(-r * 0.85, -r * 1.05); ctx.lineTo(-r * 0.25, -r * 0.75);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.55, -r * 0.55); ctx.lineTo(r * 0.85, -r * 1.05); ctx.lineTo(r * 0.25, -r * 0.75);
      ctx.fill();
    } else if (isGold) {
      // Golden Bunny Tall Ears
      ctx.fillStyle = "#ffc53d";
      ctx.beginPath();
      ctx.ellipse(-r * 0.45, -r * 1.1, r * 0.22, r * 0.55, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(r * 0.45, -r * 1.1, r * 0.22, r * 0.55, 0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffadd2";
      ctx.beginPath();
      ctx.ellipse(-r * 0.45, -r * 1.1, r * 0.12, r * 0.4, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(r * 0.45, -r * 1.1, r * 0.12, r * 0.4, 0.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (isKitty) {
      // Cute Kitty Ears
      ctx.fillStyle = "#ff85c0";
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.5); ctx.lineTo(-r * 0.85, -r * 1.1); ctx.lineTo(-r * 0.15, -r * 0.8);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.5, -r * 0.5); ctx.lineTo(r * 0.85, -r * 1.1); ctx.lineTo(r * 0.15, -r * 0.8);
      ctx.fill();
    } else {
      // Happy Hamster Ears
      ctx.fillStyle = "#fa8c16";
      ctx.beginPath(); ctx.arc(-r * 0.75, -r * 0.65, r * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.75, -r * 0.65, r * 0.32, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = "#ffadd2";
      ctx.beginPath(); ctx.arc(-r * 0.75, -r * 0.65, r * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.75, -r * 0.65, r * 0.18, 0, Math.PI * 2); ctx.fill();
    }

    // ------------------- HEAD -------------------
    var headGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r * 1.1);
    if (isBad) {
      headGrad.addColorStop(0, "#a6a6a6");
      headGrad.addColorStop(1, "#595959");
    } else if (isGold) {
      headGrad.addColorStop(0, "#fff1b8");
      headGrad.addColorStop(1, "#ffc53d");
    } else if (isKitty) {
      headGrad.addColorStop(0, "#ffd6e7");
      headGrad.addColorStop(1, "#ff85c0");
    } else {
      headGrad.addColorStop(0, "#ffe7ba");
      headGrad.addColorStop(1, "#fa8c16");
    }
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // ------------------- CHEEKS / MASK -------------------
    if (isBad) {
      // Raccoon Bandit Mask
      ctx.fillStyle = "#262626";
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.08, r * 0.85, r * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Cute Muzzle / Belly
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(0, r * 0.28, r * 0.65, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rosy Pink Cheeks
      ctx.fillStyle = "rgba(255, 120, 117, 0.65)";
      ctx.beginPath(); ctx.arc(-r * 0.58, r * 0.15, r * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.58, r * 0.15, r * 0.2, 0, Math.PI * 2); ctx.fill();
    }

    // ------------------- EYES -------------------
    if (squish > 0.3) {
      // Dizzy star/X eyes when whacked
      ctx.strokeStyle = isBad ? "#ff4d4f" : "#262626";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.25); ctx.lineTo(-r * 0.2, -r * 0.05);
      ctx.moveTo(-r * 0.2, -r * 0.25); ctx.lineTo(-r * 0.45, -r * 0.05);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(r * 0.2, -r * 0.25); ctx.lineTo(r * 0.45, -r * 0.05);
      ctx.moveTo(r * 0.45, -r * 0.25); ctx.lineTo(r * 0.2, -r * 0.05);
      ctx.stroke();
    } else {
      // Big expressive anime eyes
      ctx.fillStyle = isBad ? "#ff4d4f" : "#1f1f1f";
      ctx.beginPath(); ctx.arc(-r * 0.34, -r * 0.12, r * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.34, -r * 0.12, r * 0.18, 0, Math.PI * 2); ctx.fill();

      // Eye Sparkle Highlights
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(-r * 0.38, -r * 0.18, r * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.30, -r * 0.18, r * 0.07, 0, Math.PI * 2); ctx.fill();
    }

    // ------------------- NOSE & MOUTH -------------------
    ctx.fillStyle = isBad ? "#000000" : "#ff85c0";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.16, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cute Smile
    ctx.strokeStyle = "#595959";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-r * 0.1, r * 0.25, r * 0.12, 0.1, Math.PI - 0.2);
    ctx.arc(r * 0.1, r * 0.25, r * 0.12, 0.2, Math.PI - 0.1);
    ctx.stroke();

    // Crown / Star on Gold Bunny
    if (isGold) {
      ctx.fillStyle = "#fff0f6";
      ctx.font = (r * 0.85) + "px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("👑", 0, -r * 0.85);
    }

    ctx.restore();
  }

  function renderGame() {
    var vw = canvas.width;
    var vh = canvas.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Fullscreen Grass Meadow Background Gradient
    var bgGrad = ctx.createLinearGradient(0, 0, 0, vh);
    bgGrad.addColorStop(0, "#91d5ff");
    bgGrad.addColorStop(0.22, "#bae7ff");
    bgGrad.addColorStop(0.25, "#73d13d");
    bgGrad.addColorStop(1, "#278003");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, vw, vh);

    ctx.setTransform(
      scale, 0, 0, scale,
      offX + (Math.random() - 0.5) * shake * 12 * scale,
      offY + (Math.random() - 0.5) * shake * 12 * scale
    );

    // Decorative Playground Lawn Mat
    ctx.fillStyle = "#432b16";
    roundRectPath(W * 0.03, gridTop - 30, W * 0.94, (gridBot - gridTop) + 60, 28);
    ctx.fill();

    ctx.fillStyle = "#5c3c1e";
    roundRectPath(W * 0.04, gridTop - 24, W * 0.92, (gridBot - gridTop) + 48, 24);
    ctx.fill();

    // Render holes and creatures
    for (var i = 0; i < holes.length; i++) drawHole(holes[i]);
    for (var j = 0; j < holes.length; j++) drawCreature(holes[j]);

    // Render sparkles & particles
    for (var p = 0; p < particles.length; p++) {
      var pt = particles[p];
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * pt.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Render Floating Score Popups
    ctx.textAlign = "center";
    ctx.font = "700 22px Fredoka, sans-serif";
    for (var u = 0; u < popups.length; u++) {
      ctx.globalAlpha = Math.max(0, popups[u].life);
      ctx.fillStyle = popups[u].color;
      ctx.fillText(popups[u].text, popups[u].x, popups[u].y);
    }
    ctx.globalAlpha = 1;

    // Screen Flash on Hit Penalty
    if (flashRed > 0) {
      ctx.fillStyle = "rgba(255,77,79," + (flashRed * 0.35) + ")";
      ctx.fillRect(0, 0, W, H);
    }

    // Level Announcement Banner
    if (tierFlash > 0) {
      ctx.globalAlpha = Math.min(1, tierFlash * 1.8);
      ctx.font = "700 30px Fredoka, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#278003";
      ctx.lineWidth = 5;
      var tierName = TIERS[tier].name;
      ctx.strokeText(tierName, W / 2, H * 0.09);
      ctx.fillText(tierName, W / 2, H * 0.09);
      ctx.globalAlpha = 1;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function roundRectPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
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
    } else if (state === STATE_TITLE) {
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

    if (score > bestScore) {
      bestScore = score;
      try {
        localStorage.setItem("whack_best_score", String(bestScore));
      } catch (e) { }
      bestScoreText.textContent = bestScore + " (NEW RECORD!) 🎉";
    } else {
      bestScoreText.textContent = String(bestScore);
    }

    var lines = ["Awesome Job! 🎉", "Super Effort! 🌟", "So Close! 👍", "Great Run! ⭐"];
    overTitle.textContent = lines[(Math.random() * lines.length) | 0];
    overReasonText.textContent = gameOverReason;
    finalScoreText.textContent = score;
    whackedText.textContent = whacked + " Whacked";
    bestStreakText.textContent = "Streak " + bestStreak;

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

  function getCanvasCoords(e) {
    var rect = canvas.getBoundingClientRect();
    var clientX = e.clientX;
    var clientY = e.clientY;

    if (typeof clientX !== "number" && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    var cssX = clientX - rect.left;
    var cssY = clientY - rect.top;

    return {
      x: (((cssX * dpr) - offX) / scale),
      y: (((cssY * dpr) - offY) / scale)
    };
  }

  if (window.PointerEvent) {
    canvas.addEventListener("pointerdown", function (e) {
      if (state !== STATE_PLAY) {
        initAudio();
        return;
      }
      var coords = getCanvasCoords(e);
      tapAt(coords.x, coords.y);
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
  } else {
    canvas.addEventListener("touchstart", function (e) {
      if (state !== STATE_PLAY) {
        initAudio();
        return;
      }
      if (e.changedTouches) {
        for (var i = 0; i < e.changedTouches.length; i++) {
          var coords = getCanvasCoords(e.changedTouches[i]);
          tapAt(coords.x, coords.y);
        }
      }
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("mousedown", function (e) {
      if (state !== STATE_PLAY) {
        initAudio();
        return;
      }
      var coords = getCanvasCoords(e);
      tapAt(coords.x, coords.y);
      if (e.cancelable) e.preventDefault();
    });
  }

  window.addEventListener("keydown", function (e) {
    if ((e.key === " " || e.key === "Enter") && state !== STATE_PLAY && state !== STATE_PAUSED) {
      startGame();
    } else if (e.key === "Escape" || e.key === "p" || e.key === "P") {
      if (state === STATE_PLAY) pauseGame();
      else if (state === STATE_PAUSED) resumeGame();
    }
  });

  /* --------------------------------------------------------------------------
     11. Auto-Pause on Window Blur / Tab Close / Visibility Change
     -------------------------------------------------------------------------- */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (state === STATE_PLAY) {
        pauseGame();
      }
    } else {
      if (actx && actx.state === "suspended") {
        actx.resume().catch(function () { });
      }
      if (state === STATE_PLAY && !isBgmPlaying) {
        startBgm();
      }
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
     12. Engine Boot
     -------------------------------------------------------------------------- */
  resize();
  resetGame();
  requestAnimationFrame(gameLoop);

})();
