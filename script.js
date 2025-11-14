(function(){
  // Canvas setup
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const DPR = Math.max(1, window.devicePixelRatio || 1);
  function resize(){ canvas.width = Math.floor(innerWidth * DPR); canvas.height = Math.floor(innerHeight * DPR); canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px'; ctx.setTransform(DPR,0,0,DPR,0,0); }
  addEventListener('resize', resize); resize();

  // Starfield
  const starfield = document.getElementById('starfield');
  const gameWrap = document.getElementById('gameWrap');
  const stars = [];
  const NUM_STAR_IMAGES = 20;
  const MAX_STARS = 150;

  // UI refs
  const screenMenu = document.getElementById('screenMenu');
  const screenLevels = document.getElementById('screenLevels');
  const screenSettings = document.getElementById('screenSettings');
  const screenVictory = document.getElementById('screenVictory');
  const screenGameOver = document.getElementById('screenGameOver');
  const screenDialogue = document.getElementById('screenDialogue');
  const dialogueImage = document.getElementById('dialogueImage');
  const motherShipImage = document.getElementById('motherShipImage');
  const dialogueText = document.getElementById('dialogueText');
  const btnPlay = document.getElementById('btnPlay');
  const btnLevelSelect = document.getElementById('btnLevelSelect');
  const btnSettings = document.getElementById('btnSettings');
  const btnBackToMenu = document.getElementById('btnBackToMenu');
  const btnSettingsBack = document.getElementById('btnSettingsBack');
  const levelsGrid = document.getElementById('levelsGrid');
  const btnVictoryContinue = document.getElementById('btnVictoryContinue');
  const btnRetry = document.getElementById('btnRetry');
  const btnToLevels = document.getElementById('btnToLevels');
  const btnGameOverToMenu = document.getElementById('btnGameOverToMenu');
  const btnDialogueGo = document.getElementById('btnDialogueGo');
  const masterVolume = document.getElementById('masterVolume');
  const sfxVolume = document.getElementById('sfxVolume');
  const vibration = document.getElementById('vibration');

  const waveInfo = document.getElementById('waveInfo');
  const bossBar = document.getElementById('bossBar'), bossBarInner = document.getElementById('bossBarInner');
  const bossName = document.getElementById('bossName');
  const heartsEl = document.getElementById('hearts');
  const dbg = document.getElementById('dbg');
  dbg.style.display = 'none';

  // Assets (graceful fallback)
  const assets = { player: 'assets/player.png', enemy: 'assets/enemySmall.png', enemySmall2: 'assets/enemySmall2.png', laser: 'assets/laser1.png', boss: 'assets/boss1.png', boss2: 'assets/boss2.png', boss3: 'assets/boss3.png', music1: 'assets/music1.mp3', boss1: 'assets/boss1.mp3', warn: 'assets/warn.png', laserShoot: 'assets/laserShoot.wav', playerDamage: 'assets/playerDamage.wav', explosion: 'assets/explosion.wav', lyra: 'assets/lyraStarblade.png', typewriter: 'assets/typewriter.wav', motherShip: 'assets/motherShip.png', menu: 'assets/menu.mp3', heart: 'assets/heart.png', shield: 'assets/shield.png' };
  const NUM_ASTEROID_IMAGES = 28;
  for (let i = 1; i <= NUM_ASTEROID_IMAGES; i++) {
    assets[`asteroid${i}`] = `assets/asteroids/asteroid${i}.png`;
  }
  const images = {};
  const audio = {};
  function loadImg(src){ return new Promise(res => { const i = new Image(); i.src = src; i.onload = ()=>res(i); i.onerror = ()=>{ const c=document.createElement('canvas'); c.width=64; c.height=64; const g=c.getContext('d'); g.fillStyle='#777'; g.fillRect(0,0,64,64); const f=new Image(); f.src=c.toDataURL(); f.onload=()=>res(f); } }); }
  function loadAudio(src){ return new Promise(res => { const a = new Audio(); a.src = src; a.oncanplaythrough = ()=>res(a); a.onerror = ()=>res(new Audio()); }); }
  Promise.all(Object.values(assets).map(src => {
    if(src.endsWith('.png')) return loadImg(src);
    if(src.endsWith('.mp3') || src.endsWith('.wav')) return loadAudio(src);
  })).then(loadedAssets=>{
    images.player=loadedAssets[0]; images.enemy=loadedAssets[1]; images.enemySmall2=loadedAssets[2]; images.laser=loadedAssets[3]; images.boss=loadedAssets[4]; images.boss2=loadedAssets[5]; images.boss3=loadedAssets[6];
    audio.music1 = loadedAssets[7]; audio.boss1 = loadedAssets[8];
    images.warn = loadedAssets[9];
    audio.laserShoot = loadedAssets[10]; audio.playerDamage = loadedAssets[11]; audio.explosion = loadedAssets[12];
    images.lyra = loadedAssets[13];
    audio.typewriter = loadedAssets[14];
    images.motherShip = loadedAssets[15];
    audio.menu = loadedAssets[16];
    images.heart = loadedAssets[17];
    images.shield = loadedAssets[18];
    for (let i = 0; i < NUM_ASTEROID_IMAGES; i++) {
      images[`asteroid${i+1}`] = loadedAssets[19+i];
    }
    audio.music1.loop = true; audio.boss1.loop = true;
    audio.menu.loop = true;
  });

  // Game state and constants
  const STATE = { MENU:0, LEVEL_SELECT:1, PLAYING:2, VICTORY:3, GAMEOVER:4, SETTINGS: 5, DIALOGUE: 6 };
  let gameState = STATE.MENU;

  const LEVEL_COUNT = 3; // show 3 levels for selection (only 1 unlocked initially)
  const unlocked = [true, false, false]; // unlock array
  let currentLevelIndex = 0;

  const audioState = { masterVolume: 1, sfxVolume: 1, vibration: true, currentMusic: null };
  function playMusic(key){
    if(audioState.currentMusic) audioState.currentMusic.pause();
    const a = audio[key];
    if(a){ a.currentTime = 0; a.volume = audioState.masterVolume; a.play(); audioState.currentMusic = a; }
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
      boss: {
        name: 'Mecha-Drill',
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
      boss: {
        name: 'Asteroid Guardian',
        spriteKey: 'boss3',
        hp: 100,
        w: 160, h: 160,
        speed: 70,
        fireRate: 700,
        bulletSpeed: 250,
        canDash: true,
      }
    };
  }

  const LEVELS = [ makeLevel1(), makeLevel2(), makeLevel3() ];

  class Enemy {
    constructor(x, y, w, h, speed, sprite) {
      this.x = x;
      this.initialX = x; // Store initial X for oscillation
      this.y = y;
      this.w = w;
      this.h = h;
      this.speed = speed;
      this.sprite = sprite;
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

      if (this.cfg.canDash) {
        this.isDashing = false;
        this.lastDash = performance.now();
        this.dashCooldown = 7000; // 7 seconds
        this.dashPhase = null;
        this.dashTargetX = 0;
        this.dashTargetY = 0;
        this.hoverY = 80; // Normal Y position
      }
    }

    update(dt) {
      if (this.isDefeated || state.warningFlash.active) return;

      const now = performance.now();

      // If dashing, execute dash logic and nothing else
      if (this.isDashing) {
        const dashSpeed = this.cfg.speed * 4;
        if (this.dashPhase === 'down') {
          this.y += dashSpeed * dt;
          if (this.y >= this.dashTargetY) {
            this.dashPhase = 'across';
          }
        } else if (this.dashPhase === 'across') {
          const targetX = this.dashTargetX - this.w / 2;
          this.x += (targetX - this.x) * 0.1;
          if (Math.abs(this.x - targetX) < 10) {
            this.dashPhase = 'up';
          }
        } else if (this.dashPhase === 'up') {
          this.y -= dashSpeed * dt;
          if (this.y <= this.hoverY) {
            this.y = this.hoverY;
            this.isDashing = false;
            this.dashPhase = null;
            this.lastDash = now; // Reset cooldown AFTER dash
          }
        }
        return; // End update here if dashing
      }

      // --- If NOT dashing, perform normal behavior ---

      // 1. Descend to hover position if not already there
      const hoverY = this.cfg.canDash ? this.hoverY : 80;
      if (this.y < hoverY) {
        this.y += (this.cfg.speed / 2) * dt;
        if (this.y >= hoverY) {
          this.y = hoverY;
          this.lastDash = now; // Start the timer once in position
        }
      }
      // 2. Once in position, execute normal attacks and check for dash trigger
      else {
        // Track player
        const targetX = state.player.x + state.player.w / 2 - this.w / 2;
        this.x += (targetX - this.x) * (Math.min(1, this.cfg.speed / 200) * dt * 2.2);

        // Fire
        if (now - this.lastFire > this.cfg.fireRate) {
          this.fire();
          this.lastFire = now;
        }

        // Check if it's time to dash
        if (this.cfg.canDash && now - this.lastDash > this.dashCooldown) {
          this.isDashing = true;
          this.dashPhase = 'down';
          this.dashTargetX = state.player.x;
          this.dashTargetY = state.player.y;
        }
      }
    }

    fire() {
      const bw = 12, bh = 24;
      const x = this.x + this.w / 2 - bw / 2;
      const y = this.y + this.h / 2 + 8;
      state.enemyBullets.push({ x, y, w: bw, h: bh, vy: this.cfg.bulletSpeed });
    }

    render(ctx) {
      if (!this.isDefeated) {
        drawImageCentered(images[this.cfg.spriteKey] || images.boss, this.x + this.w / 2, this.y + this.h / 2, this.w, this.h);
      }
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
        const bw = 8, bh = 16;
        const bullet = {
          x: this.x + this.w / 2 - bw / 2,
          y: this.y + this.h,
          w: bw,
          h: bh,
          vy: this.bulletSpeed
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
    }

    shoot() {
      const w = 16, h = 32;
      state.lasers.push({ x: this.x - w / 2, y: this.y - this.h / 2 - h, w, h, speed: 520 });
      playSfx('laserShoot');
      triggerVibration(20);
    }

    activateShield() {
      const now = performance.now();
      if (now > this.shieldCooldown) {
        this.shieldActive = true;
        this.shieldCooldown = now + this.shieldCooldownTime;
        setTimeout(() => {
          this.shieldActive = false;
        }, this.shieldDuration);
      }
    }

    takeDamage(amount = 1) {
      if (this.shieldActive) return;
      this.hp -= amount;
      spawnParticles(this.x, this.y);
      playSfx('playerDamage');
      triggerVibration(100);
      updateHearts();
      if (this.hp <= 0) {
        bossName.style.display = 'none';
        showScreen(STATE.GAMEOVER);
      }
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      const margin = 32;
      this.x = clamp(this.x, margin, canvas.width / DPR - margin);
      this.y = clamp(this.y, margin, canvas.height / DPR - 120);

      if (this.vx !== 0 || this.vy !== 0) {
        if (Math.random() > 0.5) {
          const particleSize = 4;
          const spread = 15;

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
            life: 0.5,
            color: '#d7feff',
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
            life: 0.5,
            color: '#d7feff',
          });
        }
      }
    }

    render(ctx) {
      drawImageCentered(images.player, this.x, this.y, this.w, this.h);
      if (this.shieldActive) {
        drawImageCentered(images.shield, this.x, this.y, this.w * 1.2, this.h * 1.2);
      }
    }

    reset() {
      this.hp = 3;
      this.x = canvas.width / DPR / 2;
      this.y = canvas.height / DPR - 110;
      this.vx = 0;
      this.vy = 0;
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
    boss: null,
    score: 0,
    waveIndex: 0,
    waveProgress: 0, // enemies spawned in current wave
    waveSpawning: false,
    waveSpawnTimer:0,
    waveCleared: false,
    warningFlash: { active: false, timer: 0, flashes: 0 },
    dialogue: { active: false, text: '', fullText: '', letterIndex: 0, timer: 0, speed: 50, goButtonTimerSet: false, onComplete: null },
    lastTime: performance.now(),
    debug: false,
    debugTapCount: 0,
    lastDebugTap: 0,
    fps: 0
  };

  // helpers
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function rectIntersect(a,b){ return !(b.x > a.x + a.w || b.x + b.w < a.x || b.y > a.y + a.h || b.y + b.h < a.y); }

  // UI functions
  function showScreen(s){
    gameWrap.style.display = (s === STATE.PLAYING) ? 'block' : 'none';
    screenMenu.style.display = (s===STATE.MENU)?'flex':'none';
    screenLevels.style.display = (s===STATE.LEVEL_SELECT)?'flex':'none';
    screenSettings.style.display = (s===STATE.SETTINGS)?'flex':'none';
    screenVictory.style.display = (s===STATE.VICTORY)?'flex':'none';
    screenGameOver.style.display = (s===STATE.GAMEOVER)?'flex':'none';
    screenDialogue.style.display = (s===STATE.DIALOGUE)?'flex':'none';
    if(s === STATE.VICTORY || s === STATE.GAMEOVER) stopMusic();
    if(s === STATE.MENU) playMusic('menu');
    gameState = s;
  }

  function showDialogue(dialogueKey, onComplete) {
    playMusic('menu');
    fetch(`assets/${dialogueKey}.json`)
      .then(res => res.json())
      .then(data => {
        dialogueImage.src = data.characterImage;
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

  function beginLevelGameplay() {
    const lvl = LEVELS[currentLevelIndex];
    playMusic(lvl.waveMusic);
    // reset state
    state.enemies.length = 0; state.lasers.length = 0; state.enemyBullets.length = 0; state.boss = null;
    state.player.reset();
    state.score = 0;
    state.waveIndex = 0;
    state.waveProgress = 0; // enemies spawned in current wave
    state.waveSpawning = true;
    state.waveSpawnTimer = 0;
    state.lastTime = performance.now();
    waveInfo.textContent = `Wave 0 / ${LEVELS[currentLevelIndex].waves.length}`;
    bossBar.style.display = 'none';
    bossName.style.display = 'none';
    updateHearts();
    showScreen(STATE.PLAYING);

    // Show/hide buttons based on level
    if (currentLevelIndex === 1 || currentLevelIndex === 2) { // Level 2 or 3
      btnSecondary.style.display = 'none';
      btnShield.style.display = 'flex';
    } else { // Level 1
      btnSecondary.style.display = 'flex';
      btnShield.style.display = 'none';
    }
  }

  // Build level select buttons
  function rebuildLevelSelect(){
    levelsGrid.innerHTML = '';
    for(let i=0;i<LEVEL_COUNT;i++){
      const b = document.createElement('div');
      b.className = 'level-btn' + (unlocked[i] ? '' : ' locked');
      b.textContent = 'Level ' + (i+1);
      b.addEventListener('click', ()=>{ if(unlocked[i]) startLevel(i); });
      levelsGrid.appendChild(b);
    }
  }

  // Start a level
  function startLevel(index){
    currentLevelIndex = index;
    const lvl = LEVELS[index];
    if (lvl.dialogue) {
      showDialogue(lvl.dialogue, beginLevelGameplay);
    } else {
      beginLevelGameplay();
    }
  }

  // HUD hearts
  function updateHearts(){
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
    const star = document.createElement('div');
    star.className = 'star';
    const starIndex = Math.floor(Math.random() * NUM_STAR_IMAGES) + 1;
    star.style.backgroundImage = `url('assets/stars/star${starIndex}.png')`;
    const size = Math.random() * 15 + 5;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${Math.random() * 100}vw`;
    star.style.top = '-20px';
    star.dataset.speed = Math.random() * 2 + 1;
    starfield.appendChild(star);
    stars.push(star);
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

  // game update loop
  function update(dt){
    // Starfield update (always runs)
    if (Math.random() > 0.95) {
      spawnStar();
    }
    stars.forEach((star, index) => {
      const newTop = parseFloat(star.style.top) + parseFloat(star.dataset.speed);
      star.style.top = `${newTop}px`;
      if (newTop > window.innerHeight) {
        star.remove();
        stars.splice(index, 1);
      }
    });

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
        }, 5000);
      }
      return; // Don't update the rest of the game while in dialogue
    }

    if(gameState !== STATE.PLAYING) return;

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



    // spawn waves
    const level = LEVELS[currentLevelIndex];
    if(level && !state.boss){
      const totalWaves = level.waves.length;
      if(state.waveIndex < totalWaves){
        const waveCfg = level.waves[state.waveIndex];

        // start spawning if not started
        if(state.waveSpawning){
          state.waveSpawnTimer += dt*1000;
          if(state.waveSpawnTimer >= waveCfg.spawnRate && state.waveProgress < waveCfg.enemyCount){
            spawnEnemy(waveCfg.enemySpeed, waveCfg.enemySprite);
            state.waveProgress++;
            state.waveSpawnTimer = 0;
          }
          // if finished spawning enemies for this wave and no enemies left on screen -> advance to next wave
          if(state.waveProgress >= waveCfg.enemyCount){
            state.waveSpawning = false;
          }
        } else {
          // check if enemies cleared
          if(state.enemies.length === 0 && state.lasers.length === 0){
            // advance to next wave
            state.waveIndex++;
            state.waveProgress = 0;
            state.waveSpawning = true;
            state.waveSpawnTimer = 0;
          }
        }
      } else {
        // all waves done -> spawn boss if not spawned yet
        if(!state.boss && state.enemies.length === 0 && state.lasers.length === 0){
          spawnBoss(level);
          playMusic(level.bossMusic);
          bossBar.style.display = 'block';
          bossName.textContent = level.boss.name;
          bossName.style.display = 'block';
          bossBarInner.style.width = '100%';
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
      b.y += b.vy * dt;
      if(b.y > canvas.height/DPR + 40) state.enemyBullets.splice(i,1);
    }

    // boss behavior
    if(state.boss){
      state.boss.update(dt);

      // boss collision with player lasers
      if (!state.boss.isDefeated) {
        for(let li=state.lasers.length-1; li>=0; li--){
          const L = state.lasers[li];
          const rectBoss = {x: state.boss.x, y: state.boss.y, w: state.boss.w, h: state.boss.h};
          const rectLaser = {x: L.x, y: L.y, w: L.w, h: L.h};
          if(state.boss.y >= 80 && rectIntersect(rectBoss, rectLaser)){
            state.lasers.splice(li,1);
            state.boss.hp--;
            state.score += 15;
            if(state.boss.hp <= 0){
              state.boss.isDefeated = true;
              bossBar.style.display = 'none';
              bossName.style.display = 'none';
              unlocked[currentLevelIndex+1] = true; // unlock next level (if exists)
              spawnParticles(state.boss.x + state.boss.w / 2, state.boss.y + state.boss.h / 2);
              playSfx('explosion');
              // show post-boss dialogue after a delay
              setTimeout(() => {
                let victoryDialogue = 'dialogueClear1';
                if (currentLevelIndex === 1) {
                  victoryDialogue = 'dialogueClear2';
                } else if (currentLevelIndex === 2) {
                  victoryDialogue = 'dialogueClear3';
                }
                showDialogue(victoryDialogue, () => {
                  state.boss = null;
                  showScreen(STATE.VICTORY);
                  rebuildLevelSelect();
                });
              }, 5000); // 5 second delay
            } else {
              // update boss bar
              const pct = Math.max(0, state.boss.hp / state.boss.cfg.hp);
              bossBarInner.style.width = (pct*100) + '%';
            }
            break;
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
          // If it's an asteroid, remove the laser but not the asteroid
          if (e.isAsteroid) {
            state.lasers.splice(li,1);
            playSfx('playerDamage', 0.5); // Play a lighter sound for laser hitting asteroid
          } else {
            spawnParticles(e.x + e.w / 2, e.y + e.h / 2);
            state.enemies.splice(ei,1);
            state.lasers.splice(li,1);
            state.score += 5;
            playSfx('explosion');
          }
          break;
        }
      }
    }

    // enemy bullets hitting player
    for(let bi=state.enemyBullets.length-1; bi>=0; bi--){
      const b = state.enemyBullets[bi];
      const rb = {x:b.x, y:b.y, w:b.w, h:b.h};
      const rp = {x: state.player.x - state.player.w/2, y: state.player.y - state.player.h/2, w: state.player.w, h: state.player.h};
      if(rectIntersect(rb, rp)){
        state.enemyBullets.splice(bi,1);
        state.player.takeDamage();
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
    waveInfo.textContent = (() => {
      const totalWaves = level ? level.waves.length : 0;
      const current = Math.min(totalWaves, Math.max(0, state.waveIndex + (state.boss ? totalWaves : 0)));
      const displayIndex = (state.boss ? totalWaves : (state.waveIndex + 1 <= totalWaves ? state.waveIndex + (state.waveSpawning || state.enemies.length>0 ? 1 : 0) : totalWaves)) ;
      return `Wave ${Math.min(displayIndex, totalWaves)} / ${totalWaves}`;
    })();

    // debug
    dbg.textContent = `Score:${state.score} Enemies:${state.enemies.length} Lasers:${state.lasers.length} EnemyBullets:${state.enemyBullets.length} FPS:${state.fps.toFixed(0)}` ;
  }

  // render
  function render(){
    ctx.clearRect(0,0,canvas.width/DPR,canvas.height/DPR);

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

    // enemy bullets
    state.enemyBullets.forEach(bb => {
      ctx.fillStyle = '#ffb86b'; ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
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
    LEVELS[currentLevelIndex].autoFire = !LEVELS[currentLevelIndex].autoFire;
    btnSecondary.style.background = LEVELS[currentLevelIndex].autoFire ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
    // simple auto-shot loop using timeout
    if(LEVELS[currentLevelIndex].autoFire){
      (function af(){
        if(gameState !== STATE.PLAYING) return;
        if(!LEVELS[currentLevelIndex].autoFire) return;
        state.player.shoot();
        setTimeout(af, 200);
      })();
    }
  });

  // menu / level select UI wiring
  btnPlay.addEventListener('click', ()=>{ startLevel(0); });
  btnLevelSelect.addEventListener('click', ()=>{ rebuildLevelSelect(); showScreen(STATE.LEVEL_SELECT); });
  btnSettings.addEventListener('click', ()=>{ showScreen(STATE.SETTINGS); });
  btnBackToMenu.addEventListener('click', ()=>{ showScreen(STATE.MENU); });
  btnSettingsBack.addEventListener('click', ()=>{ showScreen(STATE.MENU); });
  btnVictoryContinue.addEventListener('click', ()=>{ showScreen(STATE.LEVEL_SELECT); rebuildLevelSelect(); });
  btnRetry.addEventListener('click', ()=>{ startLevel(currentLevelIndex); });
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
          for (let i = 0; i < unlocked.length; i++) {
            unlocked[i] = true;
          }
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

  // initialize UI
  rebuildLevelSelect();
  initIntro(() => {
    showScreen(STATE.MENU);
  });
  updateHearts();

})();