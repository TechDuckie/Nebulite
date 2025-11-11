(function(){
  // Canvas setup
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const DPR = Math.max(1, window.devicePixelRatio || 1);
  function resize(){ canvas.width = Math.floor(innerWidth * DPR); canvas.height = Math.floor(innerHeight * DPR); canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px'; ctx.setTransform(DPR,0,0,DPR,0,0); }
  addEventListener('resize', resize); resize();

  // Starfield
  const starfield = document.getElementById('starfield');
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

  const waveInfo = document.getElementById('waveInfo');
  const bossBar = document.getElementById('bossBar'), bossBarInner = document.getElementById('bossBarInner');
  const bossName = document.getElementById('bossName');
  const heartsEl = document.getElementById('hearts');
  const dbg = document.getElementById('dbg');

  // Assets (graceful fallback)
  const assets = { player: 'assets/player.png', enemy: 'assets/enemySmall.png', laser: 'assets/laser1.png', boss: 'assets/boss1.png', music1: 'assets/music1.mp3', boss1: 'assets/boss1.mp3', warn: 'assets/warn.png', laserShoot: 'assets/laserShoot.wav', playerDamage: 'assets/playerDamage.wav', explosion: 'assets/explosion.wav', lyra: 'assets/lyraStarblade.png', typewriter: 'assets/typewriter.wav' };
  const images = {};
  const audio = {};
  function loadImg(src){ return new Promise(res => { const i = new Image(); i.src = src; i.onload = ()=>res(i); i.onerror = ()=>{ const c=document.createElement('canvas'); c.width=64; c.height=64; const g=c.getContext('d'); g.fillStyle='#777'; g.fillRect(0,0,64,64); const f=new Image(); f.src=c.toDataURL(); f.onload=()=>res(f); } }); }
  function loadAudio(src){ return new Promise(res => { const a = new Audio(); a.src = src; a.oncanplaythrough = ()=>res(a); a.onerror = ()=>res(new Audio()); }); }
  Promise.all(Object.values(assets).map(src => {
    if(src.endsWith('.png')) return loadImg(src);
    if(src.endsWith('.mp3') || src.endsWith('.wav')) return loadAudio(src);
  })).then(loadedAssets=>{
    images.player=loadedAssets[0]; images.enemy=loadedAssets[1]; images.laser=loadedAssets[2]; images.boss=loadedAssets[3];
    audio.music1 = loadedAssets[4]; audio.boss1 = loadedAssets[5];
    images.warn = loadedAssets[6];
    audio.laserShoot = loadedAssets[7]; audio.playerDamage = loadedAssets[8]; audio.explosion = loadedAssets[9];
    images.lyra = loadedAssets[10];
    audio.typewriter = loadedAssets[11];
    audio.music1.loop = true; audio.boss1.loop = true;
  });

  // Game state and constants
  const STATE = { MENU:0, LEVEL_SELECT:1, PLAYING:2, VICTORY:3, GAMEOVER:4, SETTINGS: 5, DIALOGUE: 6 };
  let gameState = STATE.MENU;

  const LEVEL_COUNT = 4; // show 4 levels for selection (only 1 unlocked initially)
  const unlocked = [true, false, false, false]; // unlock array
  let currentLevelIndex = 0;

  const audioState = { masterVolume: 1, sfxVolume: 1, currentMusic: null };
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
        sprite: 'assets/boss1.png',
        hp: 10,
        w: 120, h: 120,
        speed: 40,     // movement lerp speed
        fireRate: 1100, // ms between shots
        bulletSpeed: 180
      }
    };
  }

  const LEVELS = [ makeLevel1(), /* placeholders for other levels */ {}, {} , {} ];

  // Entities
  const state = {
    player: { x:0, y:0, w:64, h:64, speed: 280, vx:0, vy:0, hp:3 },
    enemies: [],
    lasers: [],
    bossBullets: [],
    boss: null,
    score: 0,
    waveIndex: 0,
    waveProgress: 0, // enemies spawned in current wave
    waveSpawning: false,
    waveSpawnTimer:0,
    waveCleared: false,
    warningFlash: { active: false, timer: 0, flashes: 0 },
    dialogue: { active: false, text: '', fullText: '', letterIndex: 0, timer: 0, speed: 50, goButtonTimerSet: false },
    lastTime: performance.now()
  };

  // helpers
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function rectIntersect(a,b){ return !(b.x > a.x + a.w || b.x + b.w < a.x || b.y > a.y + a.h || b.y + b.h < a.y); }

  // UI functions
  function showScreen(s){
    screenMenu.style.display = (s===STATE.MENU)?'flex':'none';
    screenLevels.style.display = (s===STATE.LEVEL_SELECT)?'flex':'none';
    screenSettings.style.display = (s===STATE.SETTINGS)?'flex':'none';
    screenVictory.style.display = (s===STATE.VICTORY)?'flex':'none';
    screenGameOver.style.display = (s===STATE.GAMEOVER)?'flex':'none';
    screenDialogue.style.display = (s===STATE.DIALOGUE)?'flex':'none';
    if(s === STATE.VICTORY || s === STATE.GAMEOVER) stopMusic();
    gameState = s;
  }

  function showDialogue(dialogueKey) {
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
        btnDialogueGo.style.display = 'none'; // Hide the button initially
        showScreen(STATE.DIALOGUE);
      });
  }

  function beginLevelGameplay() {
    const lvl = LEVELS[currentLevelIndex];
    playMusic(lvl.waveMusic);
    // reset state
    state.enemies.length = 0; state.lasers.length = 0; state.bossBullets.length = 0; state.boss = null;
    state.player.x = canvas.width/DPR/2; state.player.y = canvas.height/DPR - 110; state.player.vx = 0; state.player.vy = 0;
    state.player.hp = 3;
    state.score = 0;
    state.waveIndex = 0;
    state.waveProgress = 0;
    state.waveSpawning = true;
    state.waveSpawnTimer = 0;
    state.lastTime = performance.now();
    waveInfo.textContent = `Wave 0 / ${LEVELS[currentLevelIndex].waves.length}`;
    bossBar.style.display = 'none';
    bossName.style.display = 'none';
    updateHearts();
    showScreen(STATE.PLAYING);
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
      showDialogue(lvl.dialogue);
    } else {
      beginLevelGameplay();
    }
  }

  // HUD hearts
  function updateHearts(){
    heartsEl.innerHTML = '';
    for(let i=0;i<state.player.hp;i++){
      const s = document.createElement('span'); s.textContent = '♥'; heartsEl.appendChild(s);
    }
  }

  // Spawning functions
  function spawnEnemy(speedOverride){
    const W = canvas.width / DPR, H = canvas.height / DPR;
    const w = 48, h = 48; // enemies 48x48 (middle ground)
    const x = Math.random() * (W - w) + w/2;
    const e = { x: x - w/2, y: -h, w, h, speed: speedOverride || (80 + Math.random()*60) };
    state.enemies.push(e);
  }

  function spawnLaserFromPlayer(){
    const p = state.player;
    const w = 16, h = 32; // narrow laser
    state.lasers.push({ x: p.x - w/2, y: p.y - p.h/2 - h, w, h, speed: 520 });
    playSfx('laserShoot');
  }

  function spawnBoss(level){
    const cfg = level.boss;
    const W = canvas.width / DPR, H = canvas.height / DPR;
    const b = { x: W/2 - cfg.w/2, y: -cfg.h, w: cfg.w, h: cfg.h, hp: cfg.hp, cfg, lastFire:0 };
    state.boss = b;
    state.warningFlash = { active: true, timer: 0, flashes: 3 };
  }

  function spawnBossBullet(boss){
    const cfg = boss.cfg;
    // boss bullet straight down (for level1) - spawn centered under boss
    const bw = 12, bh = 24;
    const x = boss.x + boss.w/2 - bw/2;
    const y = boss.y + boss.h/2 + 8;
    // for straight-down: vx=0, vy = bulletSpeed
    state.bossBullets.push({ x, y, w:bw, h:bh, vy: cfg.bulletSpeed });
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
        playSfx('typewriter', 0.5);
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
            spawnEnemy(waveCfg.enemySpeed);
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
      e.y += e.speed * dt;
      if(e.y > canvas.height/DPR + 40) state.enemies.splice(i,1);
    }

    // update lasers (player)
    for(let i=state.lasers.length-1;i>=0;i--){
      const L = state.lasers[i];
      L.y -= L.speed * dt;
      if(L.y + L.h < -40) state.lasers.splice(i,1);
    }

    // update boss bullets
    for(let i=state.bossBullets.length-1;i>=0;i--){
      const b = state.bossBullets[i];
      b.y += b.vy * dt;
      if(b.y > canvas.height/DPR + 40) state.bossBullets.splice(i,1);
    }

    // boss behavior
    if(state.boss){
      const boss = state.boss;
      if(state.warningFlash.active) {
        // Boss is waiting for warning to finish, do nothing
      } else {
        // descend to visible area
        if(boss.y < 80) boss.y += (boss.cfg.speed/2) * dt;
        else {
          // track player slowly (lerp)
          const targetX = state.player.x + state.player.w/2 - boss.w/2;
          boss.x += (targetX - boss.x) * (Math.min(1, boss.cfg.speed/200) * dt * 2.2); // smooth follow
          // firing straight down at intervals
          const now = performance.now();
          if(now - boss.lastFire > boss.cfg.fireRate){
            spawnBossBullet(boss);
            boss.lastFire = now;
          }
        }
      }
      // boss collision with player lasers
      for(let li=state.lasers.length-1; li>=0; li--){
        const L = state.lasers[li];
        const rectBoss = {x: boss.x, y: boss.y, w: boss.w, h: boss.h};
        const rectLaser = {x: L.x, y: L.y, w: L.w, h: L.h};
        if(boss.y >= 80 && rectIntersect(rectBoss, rectLaser)){
          state.lasers.splice(li,1);
          boss.hp--;
          state.score += 15;
          if(boss.hp <= 0){
            // boss defeated
            state.boss = null;
            bossBar.style.display = 'none';
            bossName.style.display = 'none';
            unlocked[currentLevelIndex+1] = true; // unlock next level (if exists)
            // show victory
            showScreen(STATE.VICTORY);
          } else {
            // update boss bar
            const pct = Math.max(0, boss.hp / boss.cfg.hp);
            bossBarInner.style.width = (pct*100) + '%';
          }
          break;
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
          state.enemies.splice(ei,1);
          state.lasers.splice(li,1);
          state.score += 5;
          playSfx('explosion');
          break;
        }
      }
    }

    // boss bullets hitting player (straight down, for level1)
    for(let bi=state.bossBullets.length-1; bi>=0; bi--){
      const b = state.bossBullets[bi];
      const rb = {x:b.x, y:b.y, w:b.w, h:b.h};
      const rp = {x: state.player.x - state.player.w/2, y: state.player.y - state.player.h/2, w: state.player.w, h: state.player.h};
      if(rectIntersect(rb, rp)){
        state.bossBullets.splice(bi,1);
        // player takes damage
        state.player.hp--;
        playSfx('playerDamage');
        updateHearts();
        if(state.player.hp <= 0){
          // game over
          bossName.style.display = 'none';
          showScreen(STATE.GAMEOVER);
        }
      }
    }

    // enemies touching player
    for(let ei=state.enemies.length-1; ei>=0; ei--){
      const e = state.enemies[ei];
      const re = {x:e.x, y:e.y, w:e.w, h:e.h};
      const rp = {x: state.player.x - state.player.w/2, y: state.player.y - state.player.h/2, w: state.player.w, h: state.player.h};
      if(rectIntersect(re, rp)){
        state.enemies.splice(ei,1);
        state.player.hp--;
        playSfx('playerDamage');
        updateHearts();
        if(state.player.hp <= 0){
          showScreen(STATE.GAMEOVER);
        }
      }
    }

    // player movement apply
    state.player.x += state.player.vx * dt;
    state.player.y += state.player.vy * dt;
    // constrain player to screen with margin
    const margin = 32;
    state.player.x = clamp(state.player.x, margin, canvas.width/DPR - margin);
    state.player.y = clamp(state.player.y, margin, canvas.height/DPR - 120);

    // HUD updates
    waveInfo.textContent = (() => {
      const totalWaves = level ? level.waves.length : 0;
      const current = Math.min(totalWaves, Math.max(0, state.waveIndex + (state.boss ? totalWaves : 0)));
      const displayIndex = (state.boss ? totalWaves : (state.waveIndex + 1 <= totalWaves ? state.waveIndex + (state.waveSpawning || state.enemies.length>0 ? 1 : 0) : totalWaves)) ;
      return `Wave ${Math.min(displayIndex, totalWaves)} / ${totalWaves}`;
    })();

    // debug
    dbg.textContent = `Score:${state.score} Enemies:${state.enemies.length} Lasers:${state.lasers.length} BossBullets:${state.bossBullets.length}` ;
  }

  // render
  function render(){
    ctx.clearRect(0,0,canvas.width/DPR,canvas.height/DPR);

    // draw player (center x,y)
    const p = state.player;
    drawImageCentered(images.player, p.x, p.y, p.w, p.h);

    // enemies
    state.enemies.forEach(e => drawImageCentered(images.enemy, e.x + e.w/2, e.y + e.h/2, e.w, e.h));

    // lasers
    ctx.save();
    state.lasers.forEach(L => {
      // either draw image or fallback
      if(images.laser && images.laser.complete) drawImageCentered(images.laser, L.x + L.w/2, L.y + L.h/2, L.w, L.h);
      else { ctx.fillStyle = '#7ff'; ctx.fillRect(L.x, L.y, L.w, L.h); }
    });
    ctx.restore();

    // boss
    if(state.boss){
      const b = state.boss;
      drawImageCentered(images.boss, b.x + b.w/2, b.y + b.h/2, b.w, b.h);
    }

    // boss bullets
    state.bossBullets.forEach(bb => {
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
    update(dt/1000);
    render();
    requestAnimationFrame(loop);
  }
  state.lastTime = performance.now();
  requestAnimationFrame(loop);

  // controls: joystick + fire + auto-fire
  const btnFire = document.getElementById('btn-fire');
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
    spawnLaserFromPlayer();
  });
  // also allow tap on canvas to shoot (optional)
  canvas.addEventListener('click', e=> spawnLaserFromPlayer());

  // auto-fire toggle
  btnSecondary.addEventListener('click', ()=>{
    LEVELS[currentLevelIndex].autoFire = !LEVELS[currentLevelIndex].autoFire;
    btnSecondary.style.background = LEVELS[currentLevelIndex].autoFire ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
    // simple auto-shot loop using timeout
    if(LEVELS[currentLevelIndex].autoFire){
      (function af(){
        if(gameState !== STATE.PLAYING) return;
        if(!LEVELS[currentLevelIndex].autoFire) return;
        spawnLaserFromPlayer();
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
      beginLevelGameplay();
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

  // initialize UI
  rebuildLevelSelect();
  showScreen(STATE.MENU);
  updateHearts();

})();