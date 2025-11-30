(function(){
  // Prevent pinch zoom (but allow single-touch controls)
  document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
  });
  document.addEventListener('gesturechange', function(e) {
    e.preventDefault();
  });
  document.addEventListener('gestureend', function(e) {
    e.preventDefault();
  });
  
  // Prevent pinch zoom via wheel with ctrl key
  document.addEventListener('wheel', function(e) {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  }, { passive: false });
  
  // Prevent pinch zoom on multi-touch
  let touchCount = 0;
  document.addEventListener('touchstart', function(e) {
    touchCount = e.touches.length;
    if (touchCount > 1) {
      e.preventDefault();
    }
  }, { passive: false });
  
  document.addEventListener('touchmove', function(e) {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  // Canvas setup
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const DPR = Math.max(1, window.devicePixelRatio || 1);
  const gameWrap = document.getElementById('gameWrap');
  function resize(){ const rect = gameWrap.getBoundingClientRect(); canvas.width = Math.floor(rect.width * DPR); canvas.height = Math.floor(rect.height * DPR); canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px'; ctx.setTransform(DPR,0,0,DPR,0,0); }
  addEventListener('resize', resize); resize();

  // Starfield
  const stars = [];
  const nebulas = [];
  const NUM_STAR_IMAGES = 20;
  const MAX_STARS = 150;

  // UI refs
  const screenMenu = document.getElementById('screenMenu');
  const screenLevels = document.getElementById('screenLevels');
  const screenSettings = document.getElementById('screenSettings');
  const screenVictory = document.getElementById('screenVictory');
  const screenGameOver = document.getElementById('screenGameOver');
  const screenDialogue = document.getElementById('screenDialogue');
  const screenPause = document.getElementById('screenPause');
  const dialogueImage = document.getElementById('dialogueImage');
  const motherShipImage = document.getElementById('motherShipImage');
  const dialogueText = document.getElementById('dialogueText');
  const screenPlayerArea = document.getElementById('screenPlayerArea');
  const btnPlayer = document.getElementById('btnPlayer');
  const btnPlayerAreaBack = document.getElementById('btnPlayerAreaBack');
  const screenScore = document.getElementById('screenScore');
  const btnScore = document.getElementById('btnScore');
  const btnScoreBack = document.getElementById('btnScoreBack');
  const btnPlay = document.getElementById('btnPlay');
  const btnLevelSelect = document.getElementById('btnLevelSelect');
  const btnWaveMode = document.getElementById('btnWaveMode');
  const btnSettings = document.getElementById('btnSettings');
  const btnAchievements = document.getElementById('btnAchievements');
  const screenAchievements = document.getElementById('screenAchievements');
  const btnAchievementsBack = document.getElementById('btnAchievementsBack');
  const achievementsList = document.getElementById('achievements-list');
  const btnBackToMenu = document.getElementById('btnBackToMenu');
  const btnSettingsBack = document.getElementById('btnSettingsBack');
  const levelsGrid = document.getElementById('levelsGrid');
  const btnVictoryContinue = document.getElementById('btnVictoryContinue');
  const btnRetry = document.getElementById('btnRetry');
  const btnToLevels = document.getElementById('btnToLevels');
  const btnGameOverToMenu = document.getElementById('btnGameOverToMenu');
  const damageFlash = document.getElementById('damageFlash');
  const btnDialogueGo = document.getElementById('btnDialogueGo');
  const btnResetProgress = document.getElementById('btnResetProgress');
  const resetConfirmationModal = document.getElementById('resetConfirmationModal');
  const btnConfirmReset = document.getElementById('btnConfirmReset');
  const btnCancelReset = document.getElementById('btnCancelReset');
  const masterVolume = document.getElementById('masterVolume');
  const sfxVolume = document.getElementById('sfxVolume');
  const vibration = document.getElementById('vibration');
  const keyboardControlsToggle = document.getElementById('keyboardControlsToggle');
  const currentControl = document.getElementById('currentControl');
  const prevControl = document.getElementById('prevControl');
  const nextControl = document.getElementById('nextControl');
  const btnPause = document.getElementById('btnPause');
  const btnResume = document.getElementById('btnResume');
  const btnPauseToMenu = document.getElementById('btnPauseToMenu');
  const controlOptions = ['WASD', 'Arrow Keys'];
  let currentControlIndex = 0;

  prevControl.addEventListener('click', () => {
    currentControlIndex = (currentControlIndex - 1 + controlOptions.length) % controlOptions.length;
    currentControl.textContent = controlOptions[currentControlIndex];
  });

  nextControl.addEventListener('click', () => {
    currentControlIndex = (currentControlIndex + 1) % controlOptions.length;
    currentControl.textContent = controlOptions[currentControlIndex];
  });

  const keys = {};
  window.addEventListener('keydown', e => keys[e.code] = true);
  window.addEventListener('keyup', e => {
    keys[e.code] = false;
    updatePlayerVelocity();
  });

  function updatePlayerVelocity() {
    state.player.vx = 0;
    state.player.vy = 0;
    const controlType = currentControl.textContent;
    if (controlType === 'WASD') {
      if (keys['KeyW']) state.player.vy = -state.player.speed;
      if (keys['KeyS']) state.player.vy = state.player.speed;
      if (keys['KeyA']) state.player.vx = -state.player.speed;
      if (keys['KeyD']) state.player.vx = state.player.speed;
    } else if (controlType === 'Arrow Keys') {
      if (keys['ArrowUp']) state.player.vy = -state.player.speed;
      if (keys['ArrowDown']) state.player.vy = state.player.speed;
      if (keys['ArrowLeft']) state.player.vx = -state.player.speed;
      if (keys['ArrowRight']) state.player.vx = state.player.speed;
    }
  }

  window.addEventListener('keydown', e => {
    if (gameState === STATE.DIALOGUE || gameState === STATE.MENU) return;

    if (e.code === 'Enter') {
      e.preventDefault();
      if (gameState === STATE.PLAYING || gameState === STATE.WAVE_MODE) {
        showScreen(STATE.PAUSED);
      } else if (gameState === STATE.PAUSED) {
        showScreen(state.lastGameState);
      }
    }

    if (e.code === 'Space' && !e.repeat) state.player.shoot();
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') state.player.activateShield();
    updatePlayerVelocity();
  });

  const isDesktop = !('ontouchstart' in window || navigator.maxTouchPoints > 0);
  if (isDesktop) {
    document.getElementById('joystick').style.display = 'none';
    // document.getElementById('right-buttons').style.display = 'none';
  }

  const waveInfo = document.getElementById('waveInfo');
  const bossBar = document.getElementById('bossBar'), bossBarInner = document.getElementById('bossBarInner');
  const bossName = document.getElementById('bossName');
  const heartsEl = document.getElementById('hearts');
  const dbg = document.getElementById('dbg');
  dbg.style.display = 'none';

  // Assets (graceful fallback)
  const assets = { player: 'assets/player.png', player2: 'assets/player2.png', player3: 'assets/player3.png', enemy: 'assets/enemySmall.png', enemySmall2: 'assets/enemySmall2.png', enemySmall3: 'assets/enemySmall3.png', laser: 'assets/laser1.png', boss: 'assets/boss1.png', boss2: 'assets/boss2.png', boss3: 'assets/boss3.png', boss5: 'assets/boss5.png', enemySmall5: 'assets/enemySmall5.png', boss6: 'assets/boss6.png', greenCrosshair: 'assets/greenCrosshair.png', seeker1: 'assets/seeker1.png', music1: 'assets/music1.mp3', boss1: 'assets/boss1.mp3', music2: 'assets/music2.mp3', boss2Music: 'assets/boss2.mp3', wavemode: 'assets/wavemode.mp3', warn: 'assets/warn.png', laserShoot: 'assets/laserShoot.wav', playerDamage: 'assets/playerDamage.wav', explosion: 'assets/explosion.wav', lyra: 'assets/lyraStarblade.png', typewriter: 'assets/typewriter.wav', motherShip: 'assets/motherShip.png', menu: 'assets/menu.mp3', heart: 'assets/heart.png', shield: 'assets/shield.png', falcon: 'assets/falcoln.png', enemySmall4: 'assets/enemySmall4.png', enemyLaserSmall: 'assets/enemyLaserSmall.png', boss4: 'assets/boss4.png', enemyShield1: 'assets/enemyShield1.png', enemyLaserBig: 'assets/enemyLaserBig.png', pinkNebula: 'assets/pinkNebula.png', violetRift: 'assets/violetRift.png', ionGrove: 'assets/ionGrove.png', greenNebula: 'assets/greenNebula.png' };
  const NUM_ASTEROID_IMAGES = 28;
  for (let i = 1; i <= NUM_ASTEROID_IMAGES; i++) {
    assets[`asteroid${i}`] = `assets/asteroids/asteroid${i}.png`;
  }
  for (let i = 1; i <= NUM_STAR_IMAGES; i++) {
    assets[`star${i}`] = `assets/stars/star${i}.png`;
  }
  const images = {};
  const audio = {};
  function loadImg(src){ return new Promise(res => { const i = new Image(); i.src = src; i.onload = ()=>res(i); i.onerror = ()=>{ const c=document.createElement('canvas'); c.width=64; c.height=64; const g=c.getContext('2d'); if(g){ g.fillStyle='#777'; g.fillRect(0,0,64,64); } const f=new Image(); f.src=c.toDataURL(); f.onload=()=>res(f); } }); }
  function loadAudio(src){ return new Promise(res => { const a = new Audio(); a.src = src; a.oncanplaythrough = ()=>res(a); a.onerror = ()=>res(new Audio()); }); }
  
  const assetKeys = Object.keys(assets);
  const assetPromises = assetKeys.map(key => {
      const src = assets[key];
      if (src.endsWith('.png')) return loadImg(src);
      if (src.endsWith('.mp3') || src.endsWith('.wav')) return loadAudio(src);
      return Promise.resolve(null);
  });

  Promise.all(assetPromises).then(loadedAssets => {
    assetKeys.forEach((key, index) => {
      const asset = loadedAssets[index];
      if (!asset) return;

      if (assets[key].endsWith('.png')) {
        images[key] = asset;
      } else if (assets[key].endsWith('.mp3') || assets[key].endsWith('.wav')) {
        audio[key] = asset;
      }
    });

    // Set loop properties for specific audio files
    if (audio.music1) audio.music1.loop = true;
    if (audio.boss1) audio.boss1.loop = true;
    if (audio.music2) audio.music2.loop = true;
    if (audio.boss2Music) audio.boss2Music.loop = true;
    if (audio.wavemode) audio.wavemode.loop = true;
    if (audio.menu) audio.menu.loop = true;
  });

  // Game state and constants
  const STATE = { MENU:0, LEVEL_SELECT:1, PLAYING:2, VICTORY:3, GAMEOVER:4, SETTINGS: 5, DIALOGUE: 6, PAUSED: 7, ACHIEVEMENTS: 8, PLAYER_AREA: 9, SCORE: 10, WAVE_MODE: 11 };
  let gameState = STATE.MENU;

  let progress = {
    unlockedSector: 0,
    unlockedLevelInSector: 0
  };
  let scores = {};
  let waveModeHighScore = 0;
  const SCORES_KEY = 'nebulite_scores';
  const WAVE_MODE_HIGH_SCORE_KEY = 'nebulite_wave_mode_high_score';

  function saveScores() {
    try {
      localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
    } catch (e) {
      console.error("Failed to save scores", e);
    }
  }

  function loadScores() {
    try {
      const saved = localStorage.getItem(SCORES_KEY);
      if (saved) {
        scores = JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load scores", e);
    }
  }

  function saveWaveModeHighScore() {
    try {
      localStorage.setItem(WAVE_MODE_HIGH_SCORE_KEY, waveModeHighScore);
    } catch (e) {
      console.error("Failed to save wave mode highscore", e);
    }
  }

  function loadWaveModeHighScore() {
    try {
      const saved = localStorage.getItem(WAVE_MODE_HIGH_SCORE_KEY);
      if (saved) {
        waveModeHighScore = parseInt(saved, 10);
      }
    } catch (e) {
      console.error("Failed to load wave mode highscore", e);
    }
  }

  let currentSectorIndex = 0;
  let currentLevelIndexInSector = 0;
  const PROGRESS_KEY = 'nebulite_progress_sectors';

  function saveProgress() {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {
      console.error("Failed to save progress", e);
    }
  }

  function loadProgress() {
    try {
      const saved = localStorage.getItem(PROGRESS_KEY);
      if (saved) {
        const savedProgress = JSON.parse(saved);
        if (savedProgress.unlockedSector !== undefined && savedProgress.unlockedLevelInSector !== undefined) {
          progress = savedProgress;
        }
      }
    } catch (e) {
      console.error("Failed to load progress", e);
    }
  }

  function resetProgress() {
    progress = { unlockedSector: 0, unlockedLevelInSector: 0 };
    saveProgress();
    localStorage.removeItem('nebulite_achievements'); // Clear achievements
    achievements = []; // Reset in-memory achievements array
    localStorage.removeItem(SCORES_KEY); // Clear scores
    scores = {}; // Reset in-memory scores object
    waveModeHighScore = 0;
    saveWaveModeHighScore();
    rebuildLevelSelect();
  }
  const audioState = { masterVolume: 1, sfxVolume: 1, vibration: true, effectsEnabled: true, currentMusic: null };
  let audioContextUnlocked = false;
  function initAudio() {
    if (audioContextUnlocked) return;
    const allAudio = Object.values(audio);
    let loadedCount = 0;
    allAudio.forEach(a => {
      const p = a.play();
      if(p && p.catch) p.catch(()=>{});
      a.pause();
      a.load(); // <- Force load
    });
    audioContextUnlocked = true;
    if (gameState === STATE.MENU) {
      playMusic('menu');
    }
  }

  function playMusic(key) {
    if (!audioContextUnlocked) return;

    if (audioState.currentMusic) {
        try { audioState.currentMusic.pause(); } catch(e){}
    }

    const a = audio[key];
    if (!a) return;

    a.currentTime = 0;
    a.volume = audioState.masterVolume;

    try {
        const p = a.play();
        if (p && p.catch) p.catch(() => {}); // <- prevent iOS autoplay rejection freeze
    } catch(e) {
        // iOS may throw synchronously
    }

    audioState.currentMusic = a;
}
  function stopMusic(){
    if(audioState.currentMusic) audioState.currentMusic.pause();
    audioState.currentMusic = null;
  }
  function playSfx(key, volumeMultiplier = 1){
    const a = audio[key];
    if(a){ a.currentTime = 0; a.volume = audioState.sfxVolume * volumeMultiplier; a.play(); }
  }

  function triggerVibration(duration = 50) {
    if (audioState.vibration && window.navigator.vibrate) {
      window.navigator.vibrate(duration);
    }
  }

  // Level definitions generator for Level 1 (we'll allow later custom rules)
  function makeLevel1(){
    // waves: 10 waves with enemy counts 3..12 (increment by 1 per wave)
    const waves = [];
    for(let w=0; w<10; w++){
      waves.push({ enemyCount: 3 + w, enemySpeed: 80 + w*6, spawnRate: 300 }); // spawnRate ms between spawn
    }
    return {
      waves,
      waveMusic: 'music1',
      bossMusic: 'boss1',
      dialogue: 'dialogue1',
      dialogueBackgroundImage: 'motherShip',
      boss: {
        name: 'Mech-Tra',
        spriteKey: 'boss',
        hp: 10,
        w: 120, h: 120,
        speed: 40,     // movement lerp speed
        fireRate: 1100, // ms between shots
        bulletSpeed: 180
      }
    };
  }

  function makeLevel2() {
    const waves = [];
    for (let w = 0; w < 12; w++) {
      waves.push({
        enemyCount: 4 + w,
        enemySpeed: 90 + w * 7,
        spawnRate: 250,
        enemySprite: 'enemySmall2'
      });
    }
    return {
      waves,
      waveMusic: 'music1',
      bossMusic: 'boss1',
      dialogue: 'dialogue2',
      dialogueBackgroundImage: 'motherShip',
      boss: {
        name: 'Mech-Drill',
        spriteKey: 'boss2',
        hp: 50,
        w: 140, h: 140,
        speed: 60,
        fireRate: 800,
        bulletSpeed: 220,
        canDash: true,
      }
    };
  }

  function makeLevel3() {
    const waves = [];
    for (let w = 0; w < 15; w++) {
      waves.push({
        enemyCount: 5 + w,
        enemySpeed: 100 + w * 8,
        spawnRate: 200,
        enemySprite: 'asteroid'
      });
    }
    return {
      waves,
      waveMusic: 'music1',
      bossMusic: 'boss1',
      dialogue: 'dialogue3',
      dialogueBackgroundImage: 'falcon',
      boss: {
        name: 'TY-Fyter',
        spriteKey: 'boss3',
        hp: 100,
        w: 160, h: 160,
        speed: 70,
        fireRate: 700,
        bulletSpeed: 250,
        canDash: true,
        dashType: 'z-motion',
        dashCooldown: 5000,
      }
    };
  }

  function makeLevel4() {
    const waves = [];
    for (let w = 0; w < 10; w++) {
      waves.push({
        enemyCount: 2 + Math.floor(w / 2),
        enemySpeed: 60 + w * 5,
        spawnRate: 400,
        enemySprite: 'enemySmall4'
      });
    }
    return {
      waves,
      waveMusic: 'music2',
      bossMusic: 'boss2Music',
      dialogue: 'dialogue4',
      dialogueBackgroundImage: 'motherShip',
      boss: {
        name: 'Mech-Volta',
        spriteKey: 'boss4',
        hp: 400,
        w: 180, h: 180,
        speed: 50,
        fireRate: 250,
        bulletSpeed: 280,
        specialAttackCooldown: 10000,
      }
    };
  }

  function makeLevel5() {
    const waves = [];
    for (let w = 0; w < 15; w++) {
      waves.push({
        enemyCount: 6 + w,
        enemySpeed: 110 + w * 8,
        spawnRate: 180,
        enemySprite: 'enemySmall3'
      });
    }
    return {
      waves,
      waveMusic: 'music1',
      bossMusic: 'boss1',
      dialogue: 'dialogue5',
      dialogueBackgroundImage: 'motherShip',
      boss: {
        name: 'Dual-Mech',
        spriteKey: 'boss5',
        hp: 150,
        w: 160, h: 160,
        speed: 70,
        fireRate: 600,
        bulletSpeed: 270,
        canDash: true,
      }
    };
  }

  function makeLevel6() {
    const waves = [];
    for (let w = 0; w < 15; w++) {
      waves.push({
        enemyCount: 3 + w,
        enemySpeed: 100 + w * 7,
        spawnRate: 200,
        enemySprite: 'enemySmall5'
      });
    }
    return {
      waves,
      waveMusic: 'music2',
      bossMusic: 'boss2Music',
      dialogue: 'dialogue6',
      dialogueBackgroundImage: 'motherShip',
      boss: {
        name: 'Serpent-X',
        spriteKey: 'boss6',
        hp: 600,
        w: 180, h: 180,
        speed: 60,
        fireRate: 900,
        bulletSpeed: 240,
        specialAttackCooldown: 10000,
        specialAttacks: ['cone', 'seeker'],
      }
    };
  }

  const SECTORS = [
    {
      name: 'Violet Rift',
      imageKey: 'violetRift',
      levels: [
        makeLevel1(),
        makeLevel2(),
        makeLevel3(),
        makeLevel5()
      ]
    },
    {
      name: 'Ion Grove',
      imageKey: 'ionGrove',
      levels: [
        makeLevel4(),
        makeLevel6()
      ]
    }
  ];

  const ALL_BOSSES = [
    makeLevel1().boss,
    makeLevel2().boss,
    makeLevel3().boss,
    makeLevel4().boss,
    makeLevel5().boss,
    makeLevel6().boss
  ];

  class Enemy {
    constructor(x, y, w, h, speed, sprite) {
      this.x = x;
      this.initialX = x; // Store initial X for oscillation
      this.y = y;
      this.w = w;
      this.h = h;
      this.speed = speed;
      this.sprite = sprite;
      this.hp = 1;
      this.isAsteroid = sprite.startsWith('asteroid');
      if (this.isAsteroid) {
        this.oscillateSpeed = (Math.random() * 0.5 + 0.5) * 1.5; // Random speedfactor for oscillation
        this.oscillateRange = Math.random() * 50 + 20; // Random range for oscillation
        this.oscillateTime = Math.random() * Math.PI * 2; // Starting phase for sine wave
      }
    }

    update(dt) {
      this.y += this.speed * dt;
      if (this.isAsteroid) {
        this.oscillateTime += this.oscillateSpeed * dt;
        this.x = this.initialX + Math.sin(this.oscillateTime) * this.oscillateRange;
      }
    }

    render(ctx) {
      drawImageCentered(images[this.sprite] || images.enemy, this.x + this.w / 2, this.y + this.h / 2, this.w, this.h);
    }
  }

  class ShootingEnemy3 extends Enemy {
    constructor(x, y, w, h, speed, sprite) {
      super(x, y, w, h, speed, sprite);
      this.hp = 3;
      this.lastFire = 0;
      this.fireRate = 2500; // ms
      this.bulletSpeed = 160;

      this.movementPhase = 'entering'; // 'entering', 'descending', 'ascending'
      this.hoverY = 80 + Math.random() * 80; // Upper Y limit for movement
      this.dashDepthY = canvas.height / DPR * (0.6 + Math.random() * 0.2); // How far down to dash (60-80% of screen height)
      this.horizontalOffset = (Math.random() - 0.5) * 200; // -100 to 100 px offset
      this.currentLerpX = x; // For smoother horizontal movement
    }

    update(dt) {
      const screenWidth = canvas.width / DPR;
      const margin = this.w / 2;

      let targetX = state.player.x + state.player.w / 2 - this.w / 2 + this.horizontalOffset;

      // Clamp targetX to ensure it's within sensible bounds, even with offset
      targetX = clamp(targetX, margin, screenWidth - margin - this.w);


      if (this.movementPhase === 'entering') {
        this.y += this.speed * dt;
        // Smoothly move towards initial targetX while entering
        this.currentLerpX += (targetX - this.currentLerpX) * 0.05;
        this.x = this.currentLerpX;

        if (this.y >= this.hoverY) {
          this.y = this.hoverY;
          this.movementPhase = 'descending';
        }
      } else if (this.movementPhase === 'descending') {
        this.y += this.speed * 2.5 * dt; // Fast descent
        this.currentLerpX += (targetX - this.currentLerpX) * 0.1; // More aggressive horizontal tracking
        this.x = this.currentLerpX;

        if (this.y >= this.dashDepthY) {
          this.y = this.dashDepthY;
          this.movementPhase = 'ascending';
        }
      } else if (this.movementPhase === 'ascending') {
        this.y -= this.speed * 1.5 * dt; // Ascend slower than descent
        this.currentLerpX += (targetX - this.currentLerpX) * 0.05; // Less aggressive horizontal tracking
        this.x = this.currentLerpX;

        if (this.y <= this.hoverY) {
          this.y = this.hoverY;
          this.movementPhase = 'descending'; // Loop back to descending
        }
      }

      // Ensure X position is always clamped to screen bounds after movement
      this.x = clamp(this.x, margin, screenWidth - margin - this.w);


      // Fire bullets - always firing when not entering
      const now = performance.now();
      if (this.movementPhase !== 'entering' && now - this.lastFire > this.fireRate) {
        this.lastFire = now;
        const bw = 8,
          bh = 24;
        const bulletColor = currentSectorIndex === 0 ? '#de8a90' : '#90de8a';
        state.enemyBullets.push({
          x: this.x + this.w / 2 - bw / 2 - 10,
          y: this.y + this.h,
          w: bw,
          h: bh,
          vy: this.bulletSpeed,
          color: bulletColor
        });
        state.enemyBullets.push({
          x: this.x + this.w / 2 - bw / 2 + 10,
          y: this.y + this.h,
          w: bw,
          h: bh,
          vy: this.bulletSpeed,
          color: bulletColor
        });
      }
    }
  }

  class ShootingEnemy4 extends Enemy {
    constructor(x, y, w, h, speed, sprite) {
      super(x, y, w, h, speed, sprite);
      this.hp = 5;
      this.lastFire = 0;
      this.fireRate = 2000; // ms
      this.bulletSpeed = 200;
      this.movementPhase = 'entering'; // entering, diving, ascending, waiting
      this.targetY = 100 + Math.random() * 100; // Hover position
      this.diveTargetX = 0;
      this.diveTargetY = 0;
      this.phaseTimer = 0;
      this.waitTime = 0.5 + Math.random() * 1; // wait 0.5-1.5 seconds
      this.horizontalOffset = (Math.random() - 0.5) * 200; // -100 to 100 px offset
    }

    update(dt) {
      this.phaseTimer += dt;

      if (this.movementPhase === 'entering') {
        this.y += this.speed * 2 * dt;
        if (this.y >= this.targetY) {
          this.y = this.targetY;
          this.movementPhase = 'waiting';
          this.phaseTimer = 0;
        }
      } else if (this.movementPhase === 'waiting') {
        const screenWidth = canvas.width / DPR;
        const margin = this.w / 2;
        let targetX;

        // If enemy is off-screen, target the center to bring it back
        if (this.x < margin || this.x > screenWidth - margin) {
          targetX = screenWidth / 2;
        } else {
          // Otherwise, target the player with the usual offset
          targetX = state.player.x + state.player.w / 2 - this.w / 2 + this.horizontalOffset;
        }

        this.x += (targetX - this.x) * 0.05;

        if (this.phaseTimer > this.waitTime) {
          this.movementPhase = 'diving';
          this.diveTargetX = state.player.x;
          this.diveTargetY = canvas.height / DPR * 0.75;
          this.initialDiveY = this.y;
          this.initialDiveX = this.x;
        }
      } else if (this.movementPhase === 'diving') {
        const progress = (this.y - this.initialDiveY) / (this.diveTargetY - this.initialDiveY);
        this.y += this.speed * 4 * dt;
        this.x = this.initialDiveX + (this.diveTargetX - this.initialDiveX) * Math.sin(progress * Math.PI);
        if (this.y >= this.diveTargetY) {
          this.movementPhase = 'ascending';
        }
      } else if (this.movementPhase === 'ascending') {
        this.y -= this.speed * 3 * dt;
        if (this.y <= this.targetY) {
          this.y = this.targetY;
          this.movementPhase = 'waiting';
          this.phaseTimer = 0;
        }
      }

      // Fire bullets
      const now = performance.now();
      if (now - this.lastFire > this.fireRate) {
        this.lastFire = now;
        const bw = 8,
          bh = 24;
        const bulletColor = currentSectorIndex === 0 ? '#de8a90' : '#90de8a';
        const bullet = {
          x: this.x + this.w / 2 - bw / 2,
          y: this.y + this.h,
          w: bw,
          h: bh,
          vy: this.bulletSpeed,
          color: bulletColor
        };
        state.enemyBullets.push(bullet);
      }
    }
  }

class ShootingEnemy5 extends Enemy {
    constructor(x, y, w, h, speed, sprite) {
        super(x, y, w, h, speed, sprite);
        this.hp = 5;
        this.lastFire = 0;
        this.fireRate = 1800; // ms
        this.bulletSpeed = 220;
        this.movementPhase = 'diving'; // diving, ascending
        this.diveTargetY = canvas.height / DPR * (0.6 + Math.random() * 0.3);
        this.ascendTargetY = 50 + Math.random() * 100;
        this.horizontalOffset = (Math.random() - 0.5) * 250;
    }

    update(dt) {
        const screenWidth = canvas.width / DPR;
        const margin = this.w / 2;
        let targetX;

        if (this.x < margin || this.x > screenWidth - this.w - margin) {
            targetX = screenWidth / 2 - this.w / 2;
        } else {
            targetX = state.player.x + state.player.w / 2 - this.w / 2 + this.horizontalOffset;
        }

        this.x += (targetX - this.x) * 0.04;

        if (this.movementPhase === 'diving') {
            this.y += this.speed * 1.5 * dt;
            if (this.y >= this.diveTargetY) {
                this.movementPhase = 'ascending';
            }
        } else if (this.movementPhase === 'ascending') {
            this.y -= this.speed * 1.5 * dt;
            if (this.y <= this.ascendTargetY) {
                this.movementPhase = 'diving';
            }
        }

        // Fire bullets
        const now = performance.now();
        if (now - this.lastFire > this.fireRate) {
            this.lastFire = now;
            const bw = 8,
                bh = 24;
            const bulletColor = currentSectorIndex === 0 ? '#de8a90' : '#8ade8a';
            const bullet = {
                x: this.x + this.w / 2 - bw / 2,
                y: this.y + this.h,
                w: bw,
                h: bh,
                vy: this.bulletSpeed,
                color: bulletColor
            };
            state.enemyBullets.push(bullet);
        }
    }
}

class Boss {
    constructor(config) {
      this.cfg = config;
      const W = canvas.width / DPR;
      this.x = W / 2 - this.cfg.w / 2;
      this.y = -this.cfg.h;
      this.w = this.cfg.w;
      this.h = this.cfg.h;
      this.hp = this.cfg.hp;
      this.lastFire = 0;
      this.isDefeated = false;
      this.hoverY = 80;

      if (this.cfg.canDash) {
        this.isDashing = false;
        this.lastDash = performance.now();
        this.dashCooldown = this.cfg.dashCooldown || 7000;
        this.dashPhase = null;
        this.dashTargetX = 0;
        this.dashTargetY = 0;
      }

      if (this.cfg.specialAttackCooldown) {
        this.lastSpecialAttack = performance.now();
        this.specialAttackActive = false;
        this.specialAttackPhase = null;
        this.spinAngle = 0;
        this.lastSpecialFire = 0;

        if (this.cfg.specialAttacks) {
          this.specialAttackAlternate = 0;
          this.coneAttackState = { angle: 0, lastShift: 0, startTime: 0 };
          this.seekerAttackState = { crosshair: null, seekersFired: 0, lastSeekerFire: 0, activeSeeker: null };
        }
      }
    }

    update(dt) {
      if (this.isDefeated || state.warningFlash.active) return;

      const now = performance.now();
      const centerX = canvas.width / DPR / 2 - this.w / 2;

      // Special Attacks for Boss 6
      if (this.cfg.specialAttacks) {
        if (this.specialAttackActive) {
          if (this.specialAttackPhase === 'moveToCenter') {
            this.x += (centerX - this.x) * 0.08;
            
            const nextAttack = this.cfg.specialAttacks[this.specialAttackAlternate];
            let targetY = (nextAttack === 'cone') ? this.hoverY : canvas.height / DPR / 4;
            this.y += (targetY - this.y) * 0.08;

            if (Math.abs(this.x - centerX) < 5 && Math.abs(this.y - targetY) < 5) {
              this.specialAttackPhase = nextAttack;
              if (nextAttack === 'cone') {
                this.coneAttackState.startTime = now;
                this.coneAttackState.lastShift = now;
                this.coneAttackState.angle = 0;
              } else if (nextAttack === 'seeker') {
                this.seekerAttackState.seekersFired = 0;
                this.seekerAttackState.crosshair = new Crosshair();
                state.crosshairs.push(this.seekerAttackState.crosshair);
              }
            }
          } else if (this.specialAttackPhase === 'cone') {
            if (now - this.coneAttackState.startTime > 10000) {
              this.specialAttackPhase = 'returnToPosition';
            }
            if (now - this.coneAttackState.lastShift > 2000) {
              this.coneAttackState.angle = (Math.random() - 0.5) * 0.4;
              this.coneAttackState.lastShift = now;
            }
            if (now - this.lastSpecialFire > 200) {
              this.lastSpecialFire = now;
              for (let i = -2; i <= 2; i++) {
                const angle = this.coneAttackState.angle + i * Math.PI / 16;
                const bulletSpeed = 300;
                const bw = 8, bh = 24;
                const bulletColor = currentSectorIndex === 0 ? '#de8a90' : '#90de8a';
                state.enemyBullets.push({
                  x: this.x + this.w / 2 - bw / 2,
                  y: this.y + this.h / 2, w: bw, h: bh,
                  vx: Math.sin(angle) * bulletSpeed,
                  vy: Math.cos(angle) * bulletSpeed,
                  color: bulletColor
                });
              }
            }
          } else if (this.specialAttackPhase === 'seeker') {
            const seekerState = this.seekerAttackState;

            // Sync crosshair state
            if (seekerState.crosshair && seekerState.crosshair.remove) {
              seekerState.crosshair = null;
            }

            // If the active seeker has been destroyed, clear it
            if (seekerState.activeSeeker && seekerState.activeSeeker.remove) {
              seekerState.activeSeeker = null;
            }
            
            // If we've fired 3 seekers, end the attack
            if (seekerState.seekersFired >= 3 && !seekerState.activeSeeker) {
              this.specialAttackPhase = 'returnToPosition';
              if (seekerState.crosshair) {
                seekerState.crosshair.remove = true;
                seekerState.crosshair = null;
              }
            } 
            // If there's no crosshair and no active seeker, create a new crosshair
            else if (!seekerState.crosshair && !seekerState.activeSeeker) {
              seekerState.crosshair = new Crosshair();
              state.crosshairs.push(seekerState.crosshair);
            }
          } else if (this.specialAttackPhase === 'returnToPosition') {
            this.x += (this.initialX - this.x) * 0.08;
            this.y += (this.hoverY - this.y) * 0.08;
            if (Math.abs(this.x - this.initialX) < 5 && Math.abs(this.y - this.hoverY) < 5) {
              this.specialAttackActive = false;
              this.specialAttackPhase = null;
              this.lastSpecialAttack = now;
              this.specialAttackAlternate = (this.specialAttackAlternate + 1) % this.cfg.specialAttacks.length;
            }
          }
          return;
        }
      }

      // Special Attack Logic (Boss 4)
      if (this.specialAttackActive) {
        const specialAttackSpeed = this.cfg.speed * 2;
        const centerY = canvas.height / DPR / 2;

        if (this.specialAttackPhase === 'moveToCenter') {
          this.x += (centerX - this.x) * 0.08;
          this.y += (centerY - this.y) * 0.08;
          if (Math.abs(this.x - centerX) < 5 && Math.abs(this.y - centerY) < 5) {
            this.specialAttackPhase = 'spinning';
            this.spinAngle = 0;
          }
        } else if (this.specialAttackPhase === 'spinning') {
          this.spinAngle += 30 * dt; // Degrees per second
          
          // Fire projectiles in a stream
          const specialFireRate = 100; // ms
          if (now - this.lastSpecialFire > specialFireRate) {
            this.lastSpecialFire = now;
            const angle = this.spinAngle * Math.PI / 180;
            const bulletSpeed = 250;
            const bw = 8, bh = 24; // Smaller projectiles

            const bulletColor = currentSectorIndex === 0 ? '#de8a90' : '#90de8a';
            // Fire one projectile to the right
            state.enemyBullets.push({
              x: this.x + this.w / 2 - bw / 2,
              y: this.y + this.h / 2 - bh / 2,
              w: bw, h: bh,
              vx: Math.cos(angle) * bulletSpeed,
              vy: Math.sin(angle) * bulletSpeed,
              color: bulletColor,
              piercing: true,
              rotation: angle
            });

            // Fire another projectile to the left
            state.enemyBullets.push({
              x: this.x + this.w / 2 - bw / 2,
              y: this.y + this.h / 2 - bh / 2,
              w: bw, h: bh,
              vx: Math.cos(angle + Math.PI) * bulletSpeed,
              vy: Math.sin(angle + Math.PI) * bulletSpeed,
              color: bulletColor,
              piercing: true,
              rotation: angle + Math.PI
            });

            // If under 50% hp, fire in a + shape
            if (this.hp / this.cfg.hp <= 0.5) {
              // Fire projectile up
              state.enemyBullets.push({
                x: this.x + this.w / 2 - bw / 2,
                y: this.y + this.h / 2 - bh / 2,
                w: bw, h: bh,
                vx: Math.cos(angle + Math.PI / 2) * bulletSpeed,
                vy: Math.sin(angle + Math.PI / 2) * bulletSpeed,
                color: bulletColor,
                piercing: true,
                rotation: angle + Math.PI / 2
              });
              // Fire projectile down
              state.enemyBullets.push({
                x: this.x + this.w / 2 - bw / 2,
                y: this.y + this.h / 2 - bh / 2,
                w: bw, h: bh,
                vx: Math.cos(angle - Math.PI / 2) * bulletSpeed,
                vy: Math.sin(angle - Math.PI / 2) * bulletSpeed,
                color: bulletColor,
                piercing: true,
                rotation: angle - Math.PI / 2
              });
            }
          }

          if (this.spinAngle >= 360) {
            this.specialAttackPhase = 'returnToPosition';
          }
        } else if (this.specialAttackPhase === 'returnToPosition') {
          this.x += (this.initialX - this.x) * 0.08;
          this.y += (this.hoverY - this.y) * 0.08;
          if (Math.abs(this.x - this.initialX) < 5 && Math.abs(this.y - this.hoverY) < 5) {
            this.specialAttackActive = false;
            this.specialAttackPhase = null;
            this.lastSpecialAttack = now;
          }
        }
        return; // Don't do normal actions during special attack
      }

      // Dashing Logic
      if (this.isDashing) {
        const dashSpeed = this.cfg.speed * 4;
        if (this.cfg.dashType === 'z-motion') {
          if (this.dashPhase === 'z-down') {
            this.dashTimer += dt;
            const progress = Math.min(1, this.dashTimer / this.dashDuration);
            this.y = this.dashInitialY + (this.dashTargetY - this.dashInitialY) * progress;
            this.x = this.dashInitialX + Math.sin(progress * Math.PI * 4) * (canvas.width / DPR / 3);
            if (progress >= 1) this.dashPhase = 'z-up';
          } else if (this.dashPhase === 'z-up') {
            this.y -= dashSpeed * dt;
            if (this.y <= this.hoverY) {
              this.y = this.hoverY;
              this.isDashing = false;
              this.dashPhase = null;
              this.lastDash = now;
            }
          }
        } else {
          if (this.dashPhase === 'down') {
            this.y += dashSpeed * dt;
            if (this.y >= this.dashTargetY) this.dashPhase = 'across';
          } else if (this.dashPhase === 'across') {
            const targetX = this.dashTargetX - this.w / 2;
            this.x += (targetX - this.x) * 0.1;
            if (Math.abs(this.x - targetX) < 10) this.dashPhase = 'up';
          } else if (this.dashPhase === 'up') {
            this.y -= dashSpeed * dt;
            if (this.y <= this.hoverY) {
              this.y = this.hoverY;
              this.isDashing = false;
              this.dashPhase = null;
              this.lastDash = now;
            }
          }
        }
        return;
      }

      // Normal Behavior
      const hoverY = this.cfg.canDash ? this.hoverY : 80;
      if (this.y < hoverY) {
        this.y += (this.cfg.speed / 2) * dt;
        if (this.y >= hoverY) {
          this.y = hoverY;
          this.lastDash = now;
          this.lastSpecialAttack = now;
        }
      } else {
        const targetX = state.player.x + state.player.w / 2 - this.w / 2;
        this.x += (targetX - this.x) * (Math.min(1, this.cfg.speed / 100) * dt);

        if (now - this.lastFire > this.cfg.fireRate) {
          this.fire();
          this.lastFire = now;
        }

        if (this.cfg.specialAttackCooldown && now - this.lastSpecialAttack > this.cfg.specialAttackCooldown) {
          this.specialAttackActive = true;
          this.specialAttackPhase = 'moveToCenter';
          this.initialX = this.x;
        } else if (this.cfg.canDash && now - this.lastDash > this.dashCooldown) {
          this.isDashing = true;
          if (this.cfg.dashType === 'z-motion') {
            this.dashPhase = 'z-down';
            this.dashTimer = 0;
            this.dashDuration = 1.5;
            this.dashInitialY = this.y;
            this.dashTargetY = state.player.y;
            this.dashInitialX = this.x;
          } else {
            this.dashPhase = 'down';
            this.dashTargetX = state.player.x;
            this.dashTargetY = state.player.y;
          }
        }
      }
    }

    fire() {
      const isEarlyLevel = currentSectorIndex === 0 && currentLevelIndexInSector < 3;
      const bw = 8, bh = 24;
      const x = this.x + this.w / 2 - bw / 2;
      const y = this.y + this.h / 2 + 8;
      const bulletColor = currentSectorIndex === 0 ? '#de8a90' : '#90de8a';
      const bullet = {
        x, y, w: bw, h: bh,
        vy: this.cfg.bulletSpeed,
        animationTimer: 0,
        scaleX: 1,
        animationSpeed: 0.2,
        color: bulletColor
      };
      
      if (this.cfg.spriteKey === 'boss5') {
        const bullet1 = { ...bullet, x: x - 20, color: bulletColor };
        const bullet2 = { ...bullet, x: x + 20, color: bulletColor };
        state.enemyBullets.push(bullet1, bullet2);
      } else {
        state.enemyBullets.push(bullet);
      }
    }

    fireSeeker(targetPlayer) {
      const seeker = new Seeker(this.x + this.w / 2, this.y + this.h, targetPlayer);
      state.seekers.push(seeker);
      this.seekerAttackState.activeSeeker = seeker;
    }

    render(ctx) {
      if (!this.isDefeated) {
        drawImageCentered(images[this.cfg.spriteKey] || images.boss, this.x + this.w / 2, this.y + this.h / 2, this.w, this.h);
        if (this.specialAttackActive) {
          drawImageCentered(images.shield, this.x + this.w / 2, this.y + this.h / 2, this.w * 1.2, this.h * 1.2);
        }
      }
    }
  }

  class Crosshair {
    constructor() {
      this.x = canvas.width / DPR / 2;
      this.y = canvas.height / DPR / 2;
      this.w = 64;
      this.h = 64;
      this.speed = 400;
      this.snapDistance = 80;
      this.lastSnap = 0;
      this.snapCooldown = 2000;
      this.remove = false;
    }

    update(dt) {
      const p = state.player;
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 1) {
        this.x += (dx / dist) * this.speed * dt;
        this.y += (dy / dist) * this.speed * dt;
      }
      
      const now = performance.now();
      if (dist < this.snapDistance && now - this.lastSnap > this.snapCooldown) {
        this.lastSnap = now;
        state.boss.fireSeeker(p);
        state.boss.seekerAttackState.seekersFired++;
        this.remove = true; // Mark for removal, the boss will handle the rest
      }
    }

    render(ctx) {
      drawImageCentered(images.greenCrosshair, this.x, this.y, this.w, this.h);
    }
  }

  class Seeker {
    constructor(x, y, target) {
      this.x = x;
      this.y = y;
      this.w = 32;
      this.h = 32;
      this.speed = 150;
      this.life = 5; // 5 seconds
      this.target = target;
      this.angle = 0;
      this.sprite = 'seeker1';
      this.hp = 1;
      this.lastParticleSpawn = 0; // For particle stream
    }

    takeDamage() {
      this.hp--;
      if (this.hp <= 0) {
        this.remove = true;
        spawnParticles(this.x, this.y);
      }
    }


    update(dt) {
      this.life -= dt;
      if (this.life <= 0) {
        this.remove = true;
        return;
      }

      const now = performance.now();
      if (now - this.lastParticleSpawn > 50) { // Spawn particle every 50ms
        this.lastParticleSpawn = now;
        const particleSize = 4;
        const spread = 8;

        // Calculate particle velocity in the opposite direction of seeker's movement
        // Since seeker is moving towards target, particles should move away from target
        const particleSpeed = 80 + Math.random() * 30;
        const particleAngle = this.angle + Math.PI; // Opposite direction of seeker

        state.thrusterParticles.push({
          x: this.x + Math.cos(this.angle) * -spread, // Offset slightly behind seeker
          y: this.y + Math.sin(this.angle) * -spread,
          w: particleSize,
          h: particleSize,
          vx: Math.cos(particleAngle) * particleSpeed,
          vy: Math.sin(particleAngle) * particleSpeed,
          life: 0.3 + Math.random() * 0.2,
          color: '#8aff8a', // Slightly green hue
        });
      }

      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);

      this.angle = Math.atan2(dy, dx);

      if (dist > 1) {
        this.x += (dx / dist) * this.speed * dt;
        this.y += (dy / dist) * this.speed * dt;
      }
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle + Math.PI / 2);
      drawImageCentered(images.seeker1, 0, 0, this.w, this.h);
      ctx.restore();
    }
  }

  class ShootingEnemy extends Enemy {
    constructor(x, y, w, h, speed, sprite) {
      super(x, y, w, h, speed, sprite);
      this.lastFire = 0;
      this.fireRate = 1500; // ms
      this.bulletSpeed = 180;
    }

    update(dt) {
      super.update(dt); // Basic downward movement

      // Lerp towards player's x position
      const targetX = state.player.x + state.player.w / 2 - this.w / 2;
      this.x += (targetX - this.x) * 0.01; // Slow follow

      // Fire bullets
      const now = performance.now();
      if (now - this.lastFire > this.fireRate) {
        this.lastFire = now;
        const bw = 8, bh = 24;
        const bulletColor = currentSectorIndex === 0 ? '#f00' : '#90de8a';
        const bullet = {
          x: this.x + this.w / 2 - bw / 2,
          y: this.y + this.h,
          w: bw,
          h: bh,
          vy: this.bulletSpeed,
          color: bulletColor
        };
        state.enemyBullets.push(bullet); // Using enemyBullets array for now
      }
    }
  }

  class Player {
    constructor() {
      this.w = 64;
      this.h = 64;
      this.speed = 280;
      this.hp = 3;
      this.x = canvas.width / DPR / 2;
      this.y = canvas.height / DPR - 110;
      this.vx = 0;
      this.vy = 0;
      this.shieldActive = false;
      this.shieldCooldown = 0;
      this.shieldDuration = 3000; // 3 seconds
      this.shieldCooldownTime = 5000; // 5 seconds
      this.floatTimer = Math.random() * Math.PI * 2;
      this.floatAmplitude = 4; // pixels
      this.floatFrequency = 2;
      this.lastShotTime = 0;
      this.shootCooldown = 150; // 150ms cooldown
      this.isDead = false;
    }

    shoot() {
      if (this.isDead) return;
      const now = performance.now();
      if (now - this.lastShotTime < this.shootCooldown) return;
      this.lastShotTime = now;

      const w = 16, h = 32;
      state.lasers.push({ x: this.x - w / 2, y: this.y - this.h / 2 - h, w, h, speed: 520 });
      playSfx('laserShoot');
      triggerVibration(20);
      state.shotsFired++;

      // Visual feedback
      const btnFire = document.getElementById('btn-fire');
      btnFire.classList.add('firing');
      setTimeout(() => {
        btnFire.classList.remove('firing');
      }, 100);
    }

    activateShield() {
      if (this.isDead) return;
      const now = performance.now();
      if (now > this.shieldCooldown) {
        this.shieldActive = true;
        this.shieldCooldown = now + this.shieldCooldownTime;
        setTimeout(() => {
          this.shieldActive = false;
        }, this.shieldDuration);
      }
    }

    takeDamage(amount = 1, piercing = false) {
      if (this.isDead || state.debug) return;
      if (this.shieldActive && !piercing) return;
      this.hp -= amount;
      spawnParticles(this.x, this.y);
      playSfx('playerDamage');
      triggerVibration(100);
      damageFlash.style.opacity = 1;
      setTimeout(() => {
        damageFlash.style.opacity = 0;
      }, 100);
      updateHearts();
      if (this.hp <= 0) {
        this.isDead = true;
        spawnBossParticles(this.x, this.y);
        if (gameState === STATE.WAVE_MODE) {
          setTimeout(() => {
            fetch(`assets/wavemodeEnd.json`)
              .then(res => res.json())
              .then(data => {
                const formattedText = data.text
                  .replace('[waves]', state.waveIndex + 1)
                  .replace('[score]', state.score);
                state.dialogue.fullText = formattedText;
                showDialogue('wavemodeEnd', () => showScreen(STATE.MENU));
              });
          }, 5000);
        } else {
          if (state.boss) {
            state.diedToBoss = true;
          }
          bossName.style.display = 'none';
          showScreen(STATE.GAMEOVER);
        }
      }
    }

    update(dt) {
      if (this.isDead) return;
      this.floatTimer += dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      const margin = 32;
      this.x = clamp(this.x, margin, canvas.width / DPR - margin);
      this.y = clamp(this.y, margin, canvas.height / DPR - 120);

      if (this.vx !== 0 || this.vy !== 0) {
        if (Math.random() > 0.5) {
          const particleSize = 4;
          const spread = 15;

          const isSkin3 = equippedSkin === 'assets/player3.png';
          const particleColor = isSkin3 ? '#32CD32' : '#d7feff';
          const particleLife = isSkin3 ? 1.0 : 0.5;

          // Left engine
          const angleLeft = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
          const speedLeft = 150 + Math.random() * 50;
          state.thrusterParticles.push({
            x: this.x - spread,
            y: this.y + this.h / 2,
            w: particleSize,
            h: particleSize,
            vx: Math.cos(angleLeft) * speedLeft,
            vy: Math.sin(angleLeft) * speedLeft,
            life: particleLife,
            color: particleColor,
          });

          // Right engine
          const angleRight = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
          const speedRight = 150 + Math.random() * 50;
          state.thrusterParticles.push({
            x: this.x + spread,
            y: this.y + this.h / 2,
            w: particleSize,
            h: particleSize,
            vx: Math.cos(angleRight) * speedRight,
            vy: Math.sin(angleRight) * speedRight,
            life: particleLife,
            color: particleColor,
          });
        }
      }
    }

    render(ctx) {
      if (this.isDead) return;
      const floatOffsetY = Math.sin(this.floatTimer * this.floatFrequency) * this.floatAmplitude;
      const skinImg = images[equippedSkin.replace('assets/', '').replace('.png', '')] || images.player;
      drawImageCentered(skinImg, this.x, this.y + floatOffsetY, this.w, this.h);
      if (this.shieldActive) {
        drawImageCentered(images.shield, this.x, this.y + floatOffsetY, this.w * 1.2, this.h * 1.2);
      }
    }

    reset() {
      this.hp = 3;
      this.x = canvas.width / DPR / 2;
      this.y = canvas.height / DPR - 110;
      this.vx = 0;
      this.vy = 0;
      this.isDead = false;
    }
  }

  // Entities
  const state = {
    player: new Player(),
    enemies: [],
    lasers: [],
    particles: [],
    thrusterParticles: [],
    enemyBullets: [],
    crosshairs: [],
    seekers: [],
    boss: null,
    score: 0,
    waveIndex: 0,
    waveProgress: 0, // enemies spawned in current wave
    waveSpawning: false,
    waveSpawnTimer:0,
    waveCleared: false,
    waveClearTimer: 0,
    waveClearDelay: 3000, // 3 seconds
    warningFlash: { active: false, timer: 0, flashes: 0 },
    dialogue: { active: false, text: '', fullText: '', letterIndex: 0, timer: 0, speed: 50, goButtonTimerSet: false, onComplete: null },
    lastTime: performance.now(),
    debug: false,
    debugTapCount: 0,
    lastDebugTap: 0,
    fps: 0,
    diedToBoss: false,
    shotsFired: 0,
    shotsHit: 0,
    lastGameState: STATE.MENU
  };

  // helpers
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function rectIntersect(a,b){ return !(b.x > a.x + a.w || b.x + b.w < a.x || b.y > a.y + a.h || b.y + b.h < a.y); }

  // UI functions
  function showScreen(s){
    const isPlaying = s === STATE.PLAYING || s === STATE.WAVE_MODE;
    gameWrap.style.display = isPlaying ? 'block' : 'none';
    if (isPlaying) resize();
    screenMenu.style.display = (s===STATE.MENU)?'flex':'none';
    screenLevels.style.display = (s===STATE.LEVEL_SELECT)?'flex':'none';
    screenSettings.style.display = (s===STATE.SETTINGS)?'flex':'none';
    screenVictory.style.display = (s===STATE.VICTORY)?'flex':'none';
    screenGameOver.style.display = (s===STATE.GAMEOVER)?'flex':'none';
    screenDialogue.style.display = (s===STATE.DIALOGUE)?'flex':'none';
    screenPause.style.display = (s===STATE.PAUSED)?'flex':'none';
    screenAchievements.style.display = (s === STATE.ACHIEVEMENTS) ? 'flex' : 'none';
    screenPlayerArea.style.display = (s === STATE.PLAYER_AREA) ? 'flex' : 'none';
    screenScore.style.display = (s === STATE.SCORE) ? 'flex' : 'none';
    if (s === STATE.PAUSED) {
      state.lastGameState = gameState; // Store the state before pausing
    }
    if(s === STATE.VICTORY || s === STATE.GAMEOVER) {
      if (gameState === STATE.WAVE_MODE && state.score > waveModeHighScore) {
        waveModeHighScore = state.score;
        saveWaveModeHighScore();
      }
      stopMusic();
    }
    if(s === STATE.MENU) playMusic('menu');
    gameState = s;
  }

  function showDialogue(dialogueKey, onComplete, backgroundImageKey = 'motherShip') {
    playMusic('menu');
    if (dialogueKey === 'wavemodeEnd') {
      dialogueImage.src = 'assets/lyraStarblade.png';
      motherShipImage.src = images['motherShip'].src;
      state.dialogue.text = '';
      state.dialogue.letterIndex = 0;
      state.dialogue.timer = 0;
      state.dialogue.active = true;
      state.dialogue.goButtonTimerSet = false;
      state.dialogue.onComplete = onComplete; // Store the callback
      btnDialogueGo.style.display = 'none'; // Hide the button initially
      showScreen(STATE.DIALOGUE);
    } else {
      fetch(`assets/${dialogueKey}.json`)
        .then(res => res.json())
        .then(data => {
          dialogueImage.src = data.characterImage;
          motherShipImage.src = images[data.backgroundImage || backgroundImageKey].src;
          state.dialogue.fullText = data.text;
          state.dialogue.text = '';
          state.dialogue.letterIndex = 0;
          state.dialogue.timer = 0;
          state.dialogue.active = true;
          state.dialogue.goButtonTimerSet = false;
          state.dialogue.onComplete = onComplete; // Store the callback
          btnDialogueGo.style.display = 'none'; // Hide the button initially
          showScreen(STATE.DIALOGUE);
        });
    }
  }

  function completeDialogueAndShowButton() {
    if (gameState === STATE.DIALOGUE && state.dialogue.active) {
      if (state.dialogue.letterIndex < state.dialogue.fullText.length) {
        state.dialogue.letterIndex = state.dialogue.fullText.length;
        state.dialogue.text = state.dialogue.fullText;
        dialogueText.textContent = state.dialogue.text;
      }
      if (!state.dialogue.goButtonTimerSet) {
        state.dialogue.goButtonTimerSet = true;
        btnDialogueGo.style.display = 'block';
      }
    }
  }

function startWaveMode() {
  showDialogue('wavemode', beginWaveModeGameplay);
}

function beginWaveModeGameplay() {
  playMusic('wavemode');
  showScreen(STATE.WAVE_MODE);
  state.player.reset();
  updateHearts();
  
  // reset state
  nebulas.length = 0;
  state.enemies.length = 0; state.lasers.length = 0; state.enemyBullets.length = 0; state.boss = null;
  state.particles.length = 0;
  state.thrusterParticles.length = 0;
  
  state.score = 0;
  state.shotsFired = 0;
  state.shotsHit = 0;
  state.waveIndex = 0;
  state.waveProgress = 0; // enemies spawned in current wave
  state.waveSpawning = true;
  state.waveSpawnTimer = 0;
  state.lastTime = performance.now();
  waveInfo.textContent = `Wave 1`;
  bossBar.style.display = 'none';
  bossName.style.display = 'none';

  btnSecondary.style.display = 'none';
  btnShield.style.display = 'flex';
}

  function beginLevelGameplay() {
    const lvl = SECTORS[currentSectorIndex].levels[currentLevelIndexInSector];
    playMusic(lvl.waveMusic);

    showScreen(STATE.PLAYING);
    state.player.reset();
    updateHearts();
    
    // reset state
    nebulas.length = 0;
    state.enemies.length = 0; state.lasers.length = 0; state.enemyBullets.length = 0; state.boss = null;
    state.particles.length = 0;
    state.thrusterParticles.length = 0;
    
    state.score = 0;
    state.shotsFired = 0;
    state.shotsHit = 0;
    state.waveIndex = 0;
    state.waveProgress = 0; // enemies spawned in current wave
    state.waveSpawning = true;
    state.waveSpawnTimer = 0;
    state.lastTime = performance.now();
    waveInfo.textContent = `Wave 0 / ${lvl.waves.length}`;
    bossBar.style.display = 'none';
    bossName.style.display = 'none';
    

    // Show/hide buttons based on level
    btnSecondary.style.display = 'none';
    // A bit of a hack, we'll make this data-driven later
    const isFirstLevelEver = currentSectorIndex === 0 && currentLevelIndexInSector === 0;
    if (isFirstLevelEver) {
      btnShield.style.display = 'none';
    } else {
      btnShield.style.display = 'flex';
    }
  }

  function restartFromBoss() {
    const level = SECTORS[currentSectorIndex].levels[currentLevelIndexInSector];
    playMusic(level.bossMusic);

    // Reset player and boss
    state.player.reset();
    state.boss = new Boss(level.boss); // Re-create the boss
    state.diedToBoss = false; // Reset the flag

    // Clear projectiles
    state.lasers.length = 0;
    state.enemyBullets.length = 0;
    state.particles.length = 0;
    state.thrusterParticles.length = 0;

    // Reset UI
    updateHearts();
    bossBar.style.display = 'block';
    bossName.textContent = level.boss.name;
    bossName.style.display = 'block';
    bossBarInner.style.width = '100%';

    showScreen(STATE.PLAYING);
  }

  const sectorsGrid = document.getElementById('sectorsGrid');
  const levelsPanel = document.getElementById('levelsPanel');
  const sectorNameEl = document.getElementById('sectorName');
  const btnBackToSectors = document.getElementById('btnBackToSectors');

  function rebuildLevelSelect(view = 'sectors') {
    if (view === 'sectors') {
      sectorsGrid.innerHTML = '';
      SECTORS.forEach((sector, sectorIndex) => {
        const isUnlocked = sectorIndex <= progress.unlockedSector;
        const sectorEl = document.createElement('div');
        sectorEl.className = 'sector-btn' + (isUnlocked ? '' : ' locked');
        sectorEl.innerHTML = `
          <img src="assets/${sector.imageKey}.png" class="sector-image">
          <div class="sector-title">${sector.name}</div>
        `;
        if (isUnlocked) {
          sectorEl.addEventListener('click', () => {
            currentSectorIndex = sectorIndex;
            rebuildLevelSelect('levels');
          });
        }
        sectorsGrid.appendChild(sectorEl);
      });
      sectorsGrid.style.display = 'flex';
      levelsPanel.style.display = 'none';
      document.getElementById('levelSelectTitle').textContent = 'Select Sector';
    } else if (view === 'levels') {
      const sector = SECTORS[currentSectorIndex];
      levelsGrid.innerHTML = '';
      sector.levels.forEach((level, levelIndex) => {
        const isUnlocked = currentSectorIndex < progress.unlockedSector ||
                           (currentSectorIndex === progress.unlockedSector && levelIndex <= progress.unlockedLevelInSector);
        const levelEl = document.createElement('div');
        levelEl.className = 'level-btn' + (isUnlocked ? '' : ' locked');
        levelEl.textContent = `Level ${levelIndex + 1}`;
        if (isUnlocked) {
          levelEl.addEventListener('click', () => startLevel(currentSectorIndex, levelIndex));
        }
        levelsGrid.appendChild(levelEl);
      });
      sectorNameEl.textContent = sector.name;
      sectorsGrid.style.display = 'none';
      levelsPanel.style.display = 'block';
      document.getElementById('levelSelectTitle').textContent = 'Select Level';
    }
  }

  btnBackToSectors.addEventListener('click', () => {
    rebuildLevelSelect('sectors');
  });

  // Start a level
  function startLevel(sectorIndex, levelIndexInSector) {
    currentSectorIndex = sectorIndex;
    currentLevelIndexInSector = levelIndexInSector;
    const lvl = SECTORS[sectorIndex].levels[levelIndexInSector];
    if (lvl.dialogue) {
      showDialogue(lvl.dialogue, beginLevelGameplay, lvl.dialogueBackgroundImage);
    } else {
      beginLevelGameplay();
    }
  }

  // HUD hearts
  function updateHearts(){
    if (!images.heart) return;
    heartsEl.innerHTML = '';
    for(let i=0;i<state.player.hp;i++){
      const img = document.createElement('img');
      img.src = images.heart.src;
      img.className = 'heart-icon'; // Add a class for potential styling
      heartsEl.appendChild(img);
    }
  }

  // Spawning functions
  function spawnEnemy(speedOverride, spriteKey = 'enemy') {
    const W = canvas.width / DPR, H = canvas.height / DPR;
    const w = 48, h = 48;
    const x = Math.random() * (W - w);
    const speed = speedOverride || (80 + Math.random() * 60);

    let enemy;
    if (spriteKey === 'enemySmall2') {
      enemy = new ShootingEnemy(x, -h, w, h, speed, spriteKey);
    } else if (spriteKey === 'asteroid') {
      const asteroidSprite = `asteroid${Math.floor(Math.random() * NUM_ASTEROID_IMAGES) + 1}`;
      enemy = new Enemy(x, -h, w, h, speed, asteroidSprite);
    } else if (spriteKey === 'enemySmall3') {
      enemy = new ShootingEnemy3(x, -h, w, h, speed, spriteKey);
    } else if (spriteKey === 'enemySmall4') {
      enemy = new ShootingEnemy4(x, -h, w, h, speed, spriteKey);
    } else if (spriteKey === 'enemySmall5') {
      enemy = new ShootingEnemy5(x, -h, w, h, speed, spriteKey);
    } else {
      enemy = new Enemy(x, -h, w, h, speed, spriteKey);
    }
    state.enemies.push(enemy);
  }

  function spawnBoss(level){
    state.boss = new Boss(level.boss);
    state.warningFlash = { active: true, timer: 0, flashes: 3 };
  }

  function spawnStar() {
    if (stars.length >= MAX_STARS) return;
    const star = {
      x: Math.random() * (canvas.width / DPR),
      y: -20,
      size: Math.random() * 15 + 5,
      speed: Math.random() * 2 + 1,
      img: images[`star${Math.floor(Math.random() * NUM_STAR_IMAGES) + 1}`]
    };
    stars.push(star);
  }

  function spawnNebula() {
    const currentSector = SECTORS[currentSectorIndex];
    let nebulaImage = images.pinkNebula;
    if (currentSectorIndex === 1) { // Ion Grove sector
      nebulaImage = images.greenNebula;
    }

    if (!nebulaImage) return;
    const size = Math.random() * 400 + 200;
    const nebula = {
      x: Math.random() * (canvas.width / DPR),
      y: -size,
      size: size,
      speed: Math.random() * 0.5 + 0.2,
      opacity: Math.random() * 0.3 + 0.1,
      rotation: Math.random() * 360,
      scaleX: Math.random() > 0.5 ? 1 : -1,
      scaleY: Math.random() > 0.5 ? 1 : -1,
      img: nebulaImage
    };
    nebulas.push(nebula);
  }

  function spawnParticles(x, y) {
    const particleCount = 15;
    const particleSize = 8;
    const colors = ['#FFA500', '#FFFF00', '#FF0000']; // Orange, Yellow, Red
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 100 + 50;
      const color = colors[Math.floor(Math.random() * colors.length)];
      state.particles.push({
        x,
        y,
        w: particleSize,
        h: particleSize,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        gravity: 150,
        color,
      });
    }
  }

  function spawnBossParticles(x, y) {
    const particleCount = 50;
    const particleSize = 16;
    const colors = ['#FFA500', '#FFFF00', '#FF0000']; // Orange, Yellow, Red
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 300 + 150;
      const color = colors[Math.floor(Math.random() * colors.length)];
      state.particles.push({
        x,
        y,
        w: particleSize,
        h: particleSize,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        gravity: 300,
        color,
      });
    }
  }

  function spawnHitParticles(x, y) {
    const particleCount = 4;
    const particleSize = 6;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 60 + 30;
      state.particles.push({
        x, y,
        w: particleSize, h: particleSize,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3,
        gravity: 0,
        color: '#FFFFFF',
      });
    }
  }

  // game update loop
  function update(dt){
    // Starfield update (always runs)
    if (Math.random() > 0.95) {
      spawnStar();
    }
    if (gameState === STATE.PLAYING && audioState.effectsEnabled && Math.random() > (isDesktop ? 0.998 : 0.992)) {
      spawnNebula();
    }
    for (let i = stars.length - 1; i >= 0; i--) {
      const star = stars[i];
      star.y += star.speed;
      if (star.y > (canvas.height / DPR)) {
        stars.splice(i, 1);
      }
    }

    // Dialogue typewriter effect
    if (gameState === STATE.DIALOGUE && state.dialogue.active) {
      state.dialogue.timer += dt;
      if (state.dialogue.letterIndex < state.dialogue.fullText.length && state.dialogue.timer * 1000 > state.dialogue.speed) {
        state.dialogue.text += state.dialogue.fullText[state.dialogue.letterIndex];
        state.dialogue.letterIndex++;
        state.dialogue.timer = 0;
        dialogueText.textContent = state.dialogue.text;
        playSfx('typewriter', 0.2);
      } else if (state.dialogue.letterIndex >= state.dialogue.fullText.length && !state.dialogue.goButtonTimerSet) {
        // Dialogue is complete, start a timer to show the "GO" button
        state.dialogue.goButtonTimerSet = true; // Ensure timer is only set once
        setTimeout(() => {
          btnDialogueGo.style.display = 'block';
        }, 1000);
      }
      return; // Don't update the rest of the game while in dialogue
    }

    if(gameState === STATE.PAUSED) return;
    if(gameState !== STATE.PLAYING && gameState !== STATE.WAVE_MODE) return;

    // Nebulas update
    for (let i = nebulas.length - 1; i >= 0; i--) {
      const nebula = nebulas[i];
      nebula.y += nebula.speed;
      if (nebula.y > (canvas.height / DPR)) {
        nebulas.splice(i, 1);
      }
    }

    // Shield cooldown visual
    const now = performance.now();
    if (now < state.player.shieldCooldown) {
      btnShield.classList.add('cooldown');
    } else {
      btnShield.classList.remove('cooldown');
    }

    // update particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
      }
    }

    // update thruster particles
    for (let i = state.thrusterParticles.length - 1; i >= 0; i--) {
      const p = state.thrusterParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        state.thrusterParticles.splice(i, 1);
      }
    }

    // spawn thruster particles if player is moving
    state.player.update(dt);

    // warning flash
    if(state.warningFlash.active){
      state.warningFlash.timer += dt;
      if(state.warningFlash.timer > state.warningFlash.flashes * 0.8){
        state.warningFlash.active = false;
      }
    }

    if (gameState === STATE.WAVE_MODE) {
      if (!state.boss) {
        if (state.waveSpawning) {
          const enemyCount = 3 + Math.floor(state.waveIndex / 3);
          const spawnRate = Math.max(100, 300 - state.waveIndex * 5);
          state.waveSpawnTimer += dt * 1000;
          if (state.waveSpawnTimer >= spawnRate && state.waveProgress < enemyCount) {
            const enemyTypes = ['enemy', 'enemySmall2', 'enemySmall3', 'enemySmall4', 'enemySmall5', 'asteroid'];
            const randomEnemy = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            spawnEnemy(80 + state.waveIndex * 2, randomEnemy);
            state.waveProgress++;
            state.waveSpawnTimer = 0;
          }
          if (state.waveProgress >= enemyCount) {
            state.waveSpawning = false;
            state.waveCleared = false; // Reset for the new wave
          }
        } else if (!state.waveCleared && state.enemies.length === 0) {
            state.waveCleared = true;
            state.waveClearTimer = performance.now();
        }
        
        if (state.waveCleared && performance.now() - state.waveClearTimer > state.waveClearDelay) {
            state.waveIndex++;
            state.waveProgress = 0;
            state.waveSpawning = true;
            state.waveSpawnTimer = 0;
            waveInfo.textContent = `Wave ${state.waveIndex + 1}`;
            if (state.waveIndex > 0 && state.waveIndex % 10 === 0) {
              const randomBossConfig = ALL_BOSSES[Math.floor(Math.random() * ALL_BOSSES.length)];
              spawnBoss({ boss: randomBossConfig });
              playMusic('boss1');
              bossBar.style.display = 'block';
              bossName.textContent = randomBossConfig.name;
              bossName.style.display = 'block';
              bossBarInner.style.width = '100%';
            }
            state.waveCleared = false; // Ready for the next clear
        }
      }
    } else if (gameState === STATE.PLAYING) {
      const level = SECTORS[currentSectorIndex].levels[currentLevelIndexInSector];
      if(level && !state.boss){
        const totalWaves = level.waves.length;
        if(state.waveIndex < totalWaves){
          const waveCfg = level.waves[state.waveIndex];

          if(state.waveSpawning){
            state.waveSpawnTimer += dt*1000;
            if(state.waveSpawnTimer >= waveCfg.spawnRate && state.waveProgress < waveCfg.enemyCount){
              spawnEnemy(waveCfg.enemySpeed, waveCfg.enemySprite);
              state.waveProgress++;
              state.waveSpawnTimer = 0;
            }
            if(state.waveProgress >= waveCfg.enemyCount){
              state.waveSpawning = false;
              state.waveCleared = false;
            }
          } else if (!state.waveCleared && state.enemies.length === 0) {
            state.waveCleared = true;
            state.waveClearTimer = performance.now();
          }

          if (state.waveCleared && performance.now() - state.waveClearTimer > state.waveClearDelay) {
            state.waveIndex++;
            state.waveProgress = 0;
            state.waveSpawning = true;
            state.waveSpawnTimer = 0;
            state.waveCleared = false;
          }
        } else if (!state.waveCleared && state.enemies.length === 0) {
            state.waveCleared = true;
            state.waveClearTimer = performance.now();
        }
        
        if (state.waveCleared && performance.now() - state.waveClearTimer > state.waveClearDelay) {
          if(!state.boss){
            spawnBoss(level);
            playMusic(level.bossMusic);
            bossBar.style.display = 'block';
            bossName.textContent = level.boss.name;
            bossName.style.display = 'block';
            bossBarInner.style.width = '100%';
          }
          state.waveCleared = false;
        }
      }
    }

    // update enemies
    for(let i=state.enemies.length-1;i>=0;i--){
      const e = state.enemies[i];
      e.update(dt);
      if(e.y > canvas.height/DPR + 40) state.enemies.splice(i,1);
    }

    // update lasers (player)
    for(let i=state.lasers.length-1;i>=0;i--){
      const L = state.lasers[i];
      L.y -= L.speed * dt;
      if(L.y + L.h < -40) state.lasers.splice(i,1);
    }

    // update enemy bullets
    for(let i=state.enemyBullets.length-1;i>=0;i--){
      const b = state.enemyBullets[i];
      b.x += (b.vx || 0) * dt;
      b.y += b.vy * dt;

      if (b.sprite === 'enemyLaserSmall' || b.sprite === 'enemyLaserBig') {
        b.animationTimer += dt;
        if (b.animationTimer > b.animationSpeed) {
          b.animationTimer = 0;
          b.scaleX *= -1;
        }
      }

      if(b.y > canvas.height/DPR + 40 || b.y < -40 || b.x < -40 || b.x > canvas.width/DPR + 40) state.enemyBullets.splice(i,1);
    }

    // update crosshairs
    for (let i = state.crosshairs.length - 1; i >= 0; i--) {
        const c = state.crosshairs[i];
        c.update(dt);
        if (c.remove) {
            state.crosshairs.splice(i, 1);
        }
    }

    // update seekers
    for (let i = state.seekers.length - 1; i >= 0; i--) {
        const s = state.seekers[i];
        s.update(dt);
        if (s.remove) {
            state.seekers.splice(i, 1);
        }
    }

    // boss behavior
    if(state.boss){
      state.boss.update(dt);

      // boss collision with player lasers
      if (!state.boss.isDefeated && !state.boss.specialAttackActive) {
        for(let li=state.lasers.length-1; li>=0; li--){
          const L = state.lasers[li];
          const rectBoss = {x: state.boss.x, y: state.boss.y, w: state.boss.w, h: state.boss.h};
          const rectLaser = {x: L.x, y: L.y, w: L.w, h: L.h};
          if(state.boss.y >= 80 && rectIntersect(rectBoss, rectLaser)){
            state.lasers.splice(li,1);
            if (state.boss.hp > 1) {
              spawnHitParticles(state.boss.x + state.boss.w / 2, L.y); // Spawn particles at laser's y, boss's x
            }
            state.shotsHit++;
            state.boss.hp--;
            state.score += 15;
            if(state.boss.hp <= 0){
              state.boss.isDefeated = true;
              bossBar.style.display = 'none';
              bossName.style.display = 'none';

              if (gameState === STATE.PLAYING) {
                // Progression logic
                const currentSector = SECTORS[currentSectorIndex];
                if (currentLevelIndexInSector + 1 < currentSector.levels.length) {
                  // Unlock next level in the same sector
                  if (currentSectorIndex === progress.unlockedSector &&
                      currentLevelIndexInSector === progress.unlockedLevelInSector) {
                    progress.unlockedLevelInSector++;
                  }
                } else if (currentSectorIndex + 1 < SECTORS.length) {
                  // Unlock first level of the next sector
                  if (currentSectorIndex === progress.unlockedSector) {
                    progress.unlockedSector++;
                    progress.unlockedLevelInSector = 0;
                  }
                }
                saveProgress();
                // Save score for the completed level
                const levelKey = `sector${currentSectorIndex}_level${currentLevelIndexInSector}`;
                if (!scores[levelKey] || state.score > scores[levelKey].score) {
                  scores[levelKey] = {
                    score: state.score,
                    shotsFired: state.shotsFired,
                    shotsHit: state.shotsHit
                  };
                  saveScores();
                }
                checkAchievements();

                spawnBossParticles(state.boss.x + state.boss.w / 2, state.boss.y + state.boss.h / 2);
                playSfx('explosion');
                // show post-boss dialogue after a delay
                setTimeout(() => {
                  let victoryDialogue = 'dialogueClear1';
                  let dialogueBg = SECTORS[currentSectorIndex].levels[currentLevelIndexInSector].dialogueBackgroundImage;
                  if (currentSectorIndex === 0 && currentLevelIndexInSector === 1) {
                    victoryDialogue = 'dialogueClear2';
                  } else if (currentSectorIndex === 0 && currentLevelIndexInSector === 2) {
                    victoryDialogue = 'dialogueClear3';
                  } else if (currentSectorIndex === 0 && currentLevelIndexInSector === 3) {
                    victoryDialogue = 'dialogueClear5';
                  } else if (currentSectorIndex === 1 && currentLevelIndexInSector === 0) {
                    victoryDialogue = 'dialogueClear4';
                  } else if (currentSectorIndex === 1 && currentLevelIndexInSector === 1) {
                    victoryDialogue = 'dialogueClear6';
                  }
                  showDialogue(victoryDialogue, () => {
                    state.boss = null;
                    showScreen(STATE.VICTORY);
                    rebuildLevelSelect();
                  }, dialogueBg);
                }, 5000); // 5 second delay
              } else if (gameState === STATE.WAVE_MODE) {
                spawnBossParticles(state.boss.x + state.boss.w / 2, state.boss.y + state.boss.h / 2);
                playSfx('explosion');
                state.waveCleared = true; // Start the timer
                state.waveClearTimer = performance.now();
                state.boss = null;
                playMusic('wavemode');
              }
            } else {
              // update boss bar
              const pct = Math.max(0, state.boss.hp / state.boss.cfg.hp);
              bossBarInner.style.width = (pct*100) + '%';
            }
            break;
          }
        }
      }

      // boss special attack collision
      if (state.boss && state.boss.specialAttackActive && state.boss.specialAttackPhase === 'spinning') {
        for (let bi = state.enemyBullets.length - 1; bi >= 0; bi--) {
          const b = state.enemyBullets[bi];
          if (!b.piercing) continue;
          const rb = { x: b.x, y: b.y, w: b.w, h: b.h };
          const rp = { x: state.player.x - state.player.w / 2, y: state.player.y - state.player.h / 2, w: state.player.w, h: state.player.h };
          if (rectIntersect(rb, rp)) {
            state.enemyBullets.splice(bi, 1);
            state.player.takeDamage(1, true);
          }
        }
      }
    }

    // lasers hitting enemies
    for(let ei=state.enemies.length-1; ei>=0; ei--){
      const e = state.enemies[ei];
      const re = {x:e.x, y:e.y, w:e.w, h:e.h};
      for(let li=state.lasers.length-1; li>=0; li--){
        const L = state.lasers[li];
        const rl = {x:L.x, y:L.y, w:L.w, h:L.h};
        if(rectIntersect(re, rl)){
          state.lasers.splice(li,1);
          state.shotsHit++;
          if (!e.isAsteroid) {
            if (e.hp > 1) {
              spawnHitParticles(L.x + L.w / 2, L.y);
            }
            e.hp--;
            if (e.hp <= 0) {
              spawnParticles(e.x + e.w / 2, e.y + e.h / 2);
              state.enemies.splice(ei,1);
              state.score += 5;
              playSfx('explosion');
            }
          } else {
            playSfx('playerDamage', 0.5);
          }
          break;
        }
      }
    }

    // lasers hitting seekers
    for (let si = state.seekers.length - 1; si >= 0; si--) {
      const s = state.seekers[si];
      const rs = { x: s.x - s.w / 2, y: s.y - s.h / 2, w: s.w, h: s.h };
      for (let li = state.lasers.length - 1; li >= 0; li--) {
        const L = state.lasers[li];
        const rl = { x: L.x, y: L.y, w: L.w, h: L.h };
        if (rectIntersect(rs, rl)) {
          state.lasers.splice(li, 1);
          s.takeDamage();
          break; // a laser can only hit one seeker
        }
      }
    }

    // seekers hitting player
    for (let i = state.seekers.length - 1; i >= 0; i--) {
        const s = state.seekers[i];
        const rs = { x: s.x - s.w / 2, y: s.y - s.h / 2, w: s.w, h: s.h };
        const rp = { x: state.player.x - state.player.w / 2, y: state.player.y - state.player.h / 2, w: state.player.w, h: state.player.h };
        if (rectIntersect(rs, rp)) {
            s.takeDamage(); // This will handle removal and particle effects
            state.player.takeDamage(1);
        }
    }

    // enemy bullets hitting player
    for(let bi=state.enemyBullets.length-1; bi>=0; bi--){
      const b = state.enemyBullets[bi];
      const rb = {x:b.x, y:b.y, w:b.w, h:b.h};
      const rp = {x: state.player.x - state.player.w/2, y: state.player.y - state.player.h/2, w: state.player.w, h: state.player.h};
      if(rectIntersect(rb, rp)){
        state.enemyBullets.splice(bi,1);
        state.player.takeDamage(1, b.piercing || false);
      }
    }

    // enemies touching player
    for(let ei=state.enemies.length-1; ei>=0; ei--){
      const e = state.enemies[ei];
      const re = {x:e.x, y:e.y, w:e.w, h:e.h};
      const rp = {x: state.player.x - state.player.w/2, y: state.player.y - state.player.h/2, w: state.player.w, h: state.player.h};
      if(rectIntersect(re, rp)){
        state.enemies.splice(ei,1);
        state.player.takeDamage();
      }
    }

    // HUD updates
    if (gameState === STATE.PLAYING) {
      const level = SECTORS[currentSectorIndex].levels[currentLevelIndexInSector];
      const totalWaves = level ? level.waves.length : 0;
      const displayIndex = state.boss ? totalWaves : Math.min(state.waveIndex + 1, totalWaves);
      waveInfo.textContent = `Wave ${displayIndex} / ${totalWaves}`;
    } else if (gameState === STATE.WAVE_MODE) {
      waveInfo.textContent = `Wave ${state.waveIndex + 1}`;
    }

    // debug
    dbg.textContent = `Score:${state.score} Enemies:${state.enemies.length} Lasers:${state.lasers.length} EnemyBullets:${state.enemyBullets.length} FPS:${state.fps.toFixed(0)}` ;
    document.getElementById('scoreText').textContent = `Score: ${state.score}`;
  }

  // render
  function render(){
    ctx.clearRect(0,0,canvas.width/DPR,canvas.height/DPR);

    // Render stars and nebulas
    ctx.save();
    stars.forEach(star => {
      if (star.img) {
        drawImageCentered(star.img, star.x, star.y, star.size, star.size);
      }
    });
    nebulas.forEach(nebula => {
      if (nebula.img) {
        ctx.save();
        ctx.globalAlpha = nebula.opacity;
        ctx.translate(nebula.x, nebula.y);
        ctx.rotate(nebula.rotation * Math.PI / 180);
        ctx.scale(nebula.scaleX, nebula.scaleY);
        drawImageCentered(nebula.img, 0, 0, nebula.size, nebula.size);
        ctx.restore();
      }
    });

    // thruster particles
    ctx.save();
    state.thrusterParticles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
    });
    ctx.restore();

    // draw player (center x,y)
    state.player.render(ctx);

    // enemies
    state.enemies.forEach(e => e.render(ctx));

    // lasers
    ctx.save();
    state.lasers.forEach(L => {
      // either draw image or fallback
      if(images.laser && images.laser.complete) drawImageCentered(images.laser, L.x + L.w/2, L.y + L.h/2, L.w, L.h);
      else { ctx.fillStyle = '#7ff'; ctx.fillRect(L.x, L.y, L.w, L.h); }
    });
    ctx.restore();

    // particles
    ctx.save();
    state.particles.forEach(p => {
      ctx.fillStyle = `${p.color}`;
      ctx.globalAlpha = p.life;
      ctx.fillRect(p.x, p.y, p.w, p.h);
    });
    ctx.restore();

    // boss
    if(state.boss){
      state.boss.render(ctx);
    }

    // render crosshairs
    state.crosshairs.forEach(c => c.render(ctx));

    // render seekers
    state.seekers.forEach(s => s.render(ctx));

    // enemy bullets
    state.enemyBullets.forEach(bb => {
      ctx.save();
      ctx.translate(bb.x + bb.w / 2, bb.y + bb.h / 2);
      if (bb.rotation) {
        ctx.rotate(bb.rotation + Math.PI / 2); // Add PI/2 because the laser image is vertical
      }
      if (bb.scaleX && bb.scaleX !== 1) {
        ctx.scale(bb.scaleX, 1);
      }
      
      if (bb.sprite && images[bb.sprite]) {
        drawImageCentered(images[bb.sprite], 0, 0, bb.w, bb.h);
      } else {
        ctx.fillStyle = bb.color || '#ffb86b';
        ctx.fillRect(-bb.w / 2, -bb.h / 2, bb.w, bb.h);
      }
      ctx.restore();
    });

    // warning flash
    if(state.warningFlash.active && images.warn){
      const flashOpacity = Math.abs(Math.sin(state.warningFlash.timer * Math.PI * 2 / 0.8)); // Flash 3 times over 2.4 seconds
      ctx.save();
      ctx.globalAlpha = flashOpacity;
      const warnW = canvas.width / DPR * 0.8 / 3;
      const warnH = warnW * (images.warn.height / images.warn.width);
      drawImageCentered(images.warn, canvas.width/DPR/2, canvas.height/DPR/2, warnW, warnH);
      ctx.restore();
    }

    // optional small HUD on canvas (player pos)
    // nothing else here
  }

  function drawImageCentered(img, cx, cy, w, h){
    if(!img) return;
    ctx.drawImage(img, cx - w/2, cy - h/2, w, h);
  }

  // main loop
  function loop(t){
    const dt = Math.min(40, t - state.lastTime);
    state.lastTime = t;
    state.fps = 1000 / dt; // Calculate FPS
    update(dt/1000);
    render();
    requestAnimationFrame(loop);
  }
  state.lastTime = performance.now();
  requestAnimationFrame(loop);

  // controls: joystick + fire + auto-fire
  const btnFire = document.getElementById('btn-fire');
  const btnShield = document.getElementById('btn-shield');
  const btnSecondary = document.getElementById('btn-secondary');

  const knob = document.getElementById('knob');
  // joystick: track single pointer for movement on left half
  let joystickPointer = null, joyBase={x:0,y:0}, joyMax=60;
  window.addEventListener('pointerdown', e=>{
    if(e.clientX < innerWidth * 0.55){
      joystickPointer = e.pointerId;
      joyBase.x = e.clientX; joyBase.y = e.clientY;
      state.player.vx = 0; state.player.vy = 0;
    }
  });
  window.addEventListener('pointermove', e=>{
    if(e.pointerId !== joystickPointer) return;

// Double-tap on dialogue to skip
let lastDialogueTap = 0;
screenDialogue.addEventListener('pointerdown', () => {
    const now = performance.now();
    if (now - lastDialogueTap < 300) { // 300ms threshold for double tap
        completeDialogueAndShowButton();
    }
    lastDialogueTap = now;
});
    const dx = e.clientX - joyBase.x;
    const dy = e.clientY - joyBase.y;
    const dist = Math.hypot(dx, dy);
    const max = joyMax;
    const nx = dist>max ? dx / dist * max : dx;
    const ny = dist>max ? dy / dist * max : dy;
    // normalized
    state.player.vx = (nx / max) * state.player.speed;
    state.player.vy = (ny / max) * state.player.speed;
    knob.style.transform = `translate(${nx}px, ${ny}px)`;
  });
  window.addEventListener('pointerup', e=>{
    if(e.pointerId === joystickPointer){
      joystickPointer = null;
      state.player.vx = 0; state.player.vy = 0;
      knob.style.transform = 'translate(0,0)';
    }
  });

  // fire button pointerdown triggers laser immediately; can hold to spam if you want (no capture)
  btnFire.addEventListener('pointerdown', e=>{
    state.player.shoot();
  });
  btnShield.addEventListener('pointerdown', e => {
    state.player.activateShield();
  });
  // also allow tap on canvas to shoot (optional)
  canvas.addEventListener('click', e=> state.player.shoot());

  // auto-fire toggle
  btnSecondary.addEventListener('click', ()=>{
    const level = SECTORS[currentSectorIndex].levels[currentLevelIndexInSector];
    level.autoFire = !level.autoFire;
    btnSecondary.style.background = level.autoFire ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
    // simple auto-shot loop using timeout
    if(level.autoFire){
      (function af(){
        if(gameState !== STATE.PLAYING) return;
        const currentLevel = SECTORS[currentSectorIndex].levels[currentLevelIndexInSector];
        if(!currentLevel.autoFire) return;
        state.player.shoot();
        setTimeout(af, 200);
      })();
    }
  });

  // menu / level select UI wiring
  btnPlay.addEventListener('click', ()=>{ initAudio(); startLevel(0, 0); });
    btnLevelSelect.addEventListener('click', () => {
      initAudio();
      rebuildLevelSelect();
      showScreen(STATE.LEVEL_SELECT);
    });
  btnWaveMode.addEventListener('click', () => {
    initAudio();
    startWaveMode();
  });
  btnSettings.addEventListener('click', () => showScreen(STATE.SETTINGS));
  btnBackToMenu.addEventListener('click', () => showScreen(STATE.MENU));
  btnSettingsBack.addEventListener('click', () => showScreen(STATE.MENU));
  btnAchievements.addEventListener('click', () => {
    loadAchievements().then(renderAchievements);
    showScreen(STATE.ACHIEVEMENTS);
  });
  btnAchievementsBack.addEventListener('click', () => showScreen(STATE.PLAYER_AREA));
  btnPlayer.addEventListener('click', () => {
    buildSkinSelector();
    showScreen(STATE.PLAYER_AREA);
  });

  const availableSkins = ['assets/player.png'];
  let currentSkinIndex = 0;
  let equippedSkin = 'assets/player.png';

  const playerSkinImage = document.getElementById('playerSkin');
  const prevSkinBtn = document.getElementById('prevSkinBtn');
  const nextSkinBtn = document.getElementById('nextSkinBtn');
  const setSkinBtn = document.getElementById('setSkinBtn');

  function buildSkinSelector() {
    availableSkins.length = 1; // Reset to just the default skin
    if (achievements.find(a => a.id === 1 && a.unlocked)) {
      availableSkins.push('assets/player2.png');
    }
    if (achievements.find(a => a.id === 2 && a.unlocked)) {
      availableSkins.push('assets/player3.png');
    }
    updateSkinSelector();
  }

  function updateSkinSelector() {
    playerSkinImage.src = availableSkins[currentSkinIndex];
  }

  prevSkinBtn.addEventListener('click', () => {
    currentSkinIndex = (currentSkinIndex - 1 + availableSkins.length) % availableSkins.length;
    updateSkinSelector();
  });

  nextSkinBtn.addEventListener('click', () => {
    currentSkinIndex = (currentSkinIndex + 1) % availableSkins.length;
    updateSkinSelector();
  });

  setSkinBtn.addEventListener('click', () => {
    equippedSkin = availableSkins[currentSkinIndex];
    localStorage.setItem('nebulite_player_skin', equippedSkin);
    // Optionally, provide feedback to the user, e.g., change button text
    setSkinBtn.textContent = 'Skin Set!';
    setTimeout(() => {
      setSkinBtn.textContent = 'Set Skin';
    }, 1000);
  });

  btnPlayerAreaBack.addEventListener('click', () => showScreen(STATE.MENU));
  function buildScoresScreen() {
    const scoresList = document.getElementById('scores-list');
    scoresList.innerHTML = ''; 

    const waveModeHeader = document.createElement('h3');
    waveModeHeader.textContent = 'Wave Mode Highscore';
    scoresList.appendChild(waveModeHeader);
    const waveModeScore = document.createElement('p');
    waveModeScore.textContent = waveModeHighScore;
    scoresList.appendChild(waveModeScore);

    SECTORS.forEach((sector, sectorIndex) => {
      const sectorHeader = document.createElement('h3');
      sectorHeader.textContent = sector.name;
      scoresList.appendChild(sectorHeader);

      sector.levels.forEach((level, levelIndex) => {
        const levelKey = `sector${sectorIndex}_level${levelIndex}`;
        const scoreData = scores[levelKey];

        const levelRow = document.createElement('div');
        levelRow.className = 'level-score-row';

        const levelName = document.createElement('span');
        levelName.textContent = `Level ${levelIndex + 1}`;
        levelRow.appendChild(levelName);

        if (scoreData) {
          const score = document.createElement('span');
          score.textContent = `Score: ${scoreData.score}`;
          levelRow.appendChild(score);

          const accuracy = document.createElement('span');
          const accuracyPercentage = scoreData.shotsFired > 0 ? ((scoreData.shotsHit / scoreData.shotsFired) * 100).toFixed(0) : 0;
          accuracy.textContent = `Accuracy: ${accuracyPercentage}%`;
          levelRow.appendChild(accuracy);
        } else {
          const noScore = document.createElement('span');
          noScore.textContent = 'Not Played';
          levelRow.appendChild(noScore);
        }
        scoresList.appendChild(levelRow);
      });
    });
  }

  btnScore.addEventListener('click', () => {
    buildScoresScreen();
    showScreen(STATE.SCORE);
  });
  btnScoreBack.addEventListener('click', () => showScreen(STATE.PLAYER_AREA));

  let achievements = [];

  function loadAchievements() {
    return fetch('achievements.json')
      .then(res => res.json())
      .then(masterList => {
        const saved = localStorage.getItem('nebulite_achievements');
        if (saved) {
          const savedList = JSON.parse(saved);
          const unlockedMap = new Map(savedList.map(a => [a.id, a.unlocked]));
          achievements = masterList.map(ach => ({
            ...ach,
            unlocked: unlockedMap.get(ach.id) || false
          }));
        } else {
          achievements = masterList;
        }
        saveAchievements();
        return achievements;
      });
  }

  function renderAchievements() {
    achievementsList.innerHTML = '';
    achievements.forEach(achievement => {
      const item = document.createElement('div');
      item.className = 'achievement-item' + (achievement.unlocked ? '' : ' locked');
      
      
      const titleContainer = document.createElement('div');
      titleContainer.className = 'achievement-title-container';

      const title = document.createElement('h3');
      title.className = 'achievement-title';
      title.textContent = achievement.title;

      const presentIcon = document.createElement('img');
      presentIcon.src = 'assets/presentIcon.png';
      presentIcon.className = 'present-icon';
      
      if (achievement.unlocked) {
        if (achievement.id === 1) {
          title.classList.add('unlocked-blue');
        } else if (achievement.id === 2) {
          title.classList.add('unlocked-orange');
        }
      } else {
        presentIcon.classList.add('locked');
      }
      
      const description = document.createElement('p');
      description.className = 'achievement-description';
      description.textContent = achievement.description;
      
      titleContainer.appendChild(title);
      titleContainer.appendChild(presentIcon);
      item.appendChild(titleContainer);
      item.appendChild(description);
      achievementsList.appendChild(item);
    });
  }

  function saveAchievements() {
    localStorage.setItem('nebulite_achievements', JSON.stringify(achievements));
  }

  function checkAchievements() {
    const lastUnlockedSector = SECTORS.length - 1;
    const lastUnlockedLevel = SECTORS[lastUnlockedSector].levels.length - 1;

    if (progress.unlockedSector >= lastUnlockedSector && progress.unlockedLevelInSector > lastUnlockedLevel) {
      unlockAchievement(1);
    }

    // Check for "Perfect Accuracy" achievement
    let allPerfect = true;
    if (achievements.find(a => a.id === 2 && !a.unlocked)) { // Only check if not already unlocked
      for (let i = 0; i < SECTORS.length; i++) {
        for (let j = 0; j < SECTORS[i].levels.length; j++) {
          const levelKey = `sector${i}_level${j}`;
          const scoreData = scores[levelKey];
          if (!scoreData || scoreData.shotsFired === 0 || scoreData.shotsHit !== scoreData.shotsFired) {
            allPerfect = false;
            break;
          }
        }
        if (!allPerfect) break;
      }

      if (allPerfect) {
        unlockAchievement(2);
      }
    }
  }

  function unlockAchievement(id) {
    const achievement = achievements.find(a => a.id === id);
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true;
      saveAchievements();
    }
  }
  btnVictoryContinue.addEventListener('click', ()=>{ showScreen(STATE.LEVEL_SELECT); rebuildLevelSelect(); });
  btnRetry.addEventListener('click', ()=>{
    if (gameState === STATE.WAVE_MODE) {
      beginWaveModeGameplay();
    } else if (state.diedToBoss) {
      restartFromBoss();
    } else {
      startLevel(currentSectorIndex, currentLevelIndexInSector);
    }
  });
  btnToLevels.addEventListener('click', ()=>{ rebuildLevelSelect(); showScreen(STATE.LEVEL_SELECT); });
  btnGameOverToMenu.addEventListener('click', ()=>{ showScreen(STATE.MENU); });

  btnDialogueGo.addEventListener('click', () => {
    if (gameState === STATE.DIALOGUE) {
      state.dialogue.active = false;
      if (state.dialogue.onComplete) {
        state.dialogue.onComplete();
        state.dialogue.onComplete = null; // Clear the callback after execution
      } else {
        beginLevelGameplay(); // Fallback for intro dialogue
      }
    }
  });

  masterVolume.addEventListener('input', (e) => {
    audioState.masterVolume = e.target.value / 100;
    if(audioState.currentMusic) audioState.currentMusic.volume = audioState.masterVolume;
  });
  sfxVolume.addEventListener('input', (e) => {
    audioState.sfxVolume = e.target.value / 100;
    // todo: apply to sfx
  });

  vibration.addEventListener('change', (e) => {
    audioState.vibration = e.target.checked;
  });

  const effectsToggle = document.getElementById('effects');
  effectsToggle.addEventListener('change', (e) => {
    audioState.effectsEnabled = e.target.checked;
    if (!audioState.effectsEnabled) {
      nebulas.forEach(n => n.remove());
      nebulas.length = 0;
    }
  });

  const settingsTitle = document.getElementById('settingsTitle');
  settingsTitle.addEventListener('click', () => {
    const now = performance.now();
    if (now - state.lastDebugTap < 300) { // 300ms window for rapid taps
      state.debugTapCount++;
      if (state.debugTapCount >= 10) {
        state.debug = !state.debug;
        state.debugTapCount = 0; // Reset count after toggling
        state.lastDebugTap = 0; // Reset timer to prevent immediate re-toggle

        // Visual feedback for debug toggle
        settingsTitle.style.transition = 'background-color 0.1s';
        settingsTitle.style.backgroundColor = state.debug ? '#0f0' : '#f00';
        setTimeout(() => {
          settingsTitle.style.backgroundColor = '';
          settingsTitle.style.transition = '';
        }, 100);

        // Apply debug settings
        if (state.debug) {
          dbg.style.display = 'block';
          // Unlock all levels in all sectors
          progress.unlockedSector = SECTORS.length - 1;
          progress.unlockedLevelInSector = SECTORS[progress.unlockedSector].levels.length - 1;
          // Unlock all achievements
          achievements.forEach(a => a.unlocked = true);
          saveAchievements();
          rebuildLevelSelect();
        } else {
          dbg.style.display = 'none';
          // Optionally re-lock levels if desired, but for now, keep them unlocked
          // For a full reset, you'd need to store initial unlocked state
          rebuildLevelSelect();
        }
      }
    } else {
      state.debugTapCount = 1;
    }
    state.lastDebugTap = now;
  });

  function displayScores() {
    const scoresList = document.getElementById('scores-list');
    scoresList.innerHTML = '';
    let totalScore = 0;

    SECTORS.forEach((sector, sectorIndex) => {
      scoresList.innerHTML += `<p><strong>${sector.name}</strong></p>`;
      sector.levels.forEach((level, levelIndex) => {
        const levelKey = `sector${sectorIndex}_level${levelIndex}`;
        const highScore = scores[levelKey] !== undefined ? scores[levelKey] : 'N/A';
        scoresList.innerHTML += `<p>&nbsp;&nbsp;Level ${levelIndex + 1}: ${highScore}</p>`;
        if (typeof scores[levelKey] === 'number') {
          totalScore += scores[levelKey];
        }
      });
    });
    scoresList.innerHTML += `<p><strong>Total Score: ${totalScore}</strong></p>`;
  }

  function loadPlayerSkin() {
    const savedSkin = localStorage.getItem('nebulite_player_skin');
    if (savedSkin) {
      equippedSkin = savedSkin;
    }
  }

  // Initial setup
  loadPlayerSkin();
  loadProgress();
  loadScores();
  loadWaveModeHighScore();
  rebuildLevelSelect();
  initIntro(() => {
    showScreen(STATE.MENU);
  }, initAudio);
  updateHearts();

  btnResetProgress.addEventListener('click', () => {
    resetConfirmationModal.style.display = 'flex';
  });

  btnCancelReset.addEventListener('click', () => {
    resetConfirmationModal.style.display = 'none';
  });

  btnConfirmReset.addEventListener('click', () => {
    resetProgress();
    resetConfirmationModal.style.display = 'none';
  });
  btnPause.addEventListener('click', () => showScreen(STATE.PAUSED));
  btnResume.addEventListener('click', () => showScreen(state.lastGameState));
  btnPauseToMenu.addEventListener('click', () => showScreen(STATE.MENU));

})();