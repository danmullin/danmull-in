'use strict';
(() => {
  const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const W = 900, H = 650, keys = new Set();
  // Reference: typical red enemy ~20x10 px, player ~23x14 px.
  // Our player is 36x21, so match with a 31x15 enemy silhouette.
  const ENEMY_WIDTH=31, ENEMY_HEIGHT=15;
  let state = 'ready', score = 0, best = 0, wave = 0, hull = 3;
  let enemies = [], shots = [], enemyShots = [], particles = [], transition = 0;
  let direction = 1, fireTimer = 0, enemyTimer = 0, invincible = 0, bannerTimer = 0, time = 0, shake = 0;
  let player = { x: W / 2, y: H - 82 }, last = performance.now(), muted = false;
  const FUEL_SECONDS = 70, ranks = [2,5,7,9,9,9];
  let fuel=100, fuelGrace=0, bonusLife=false, diveTimer=0, attackCount=0, center=W/2, respawn=0;
  const home = e => ({x:center+e.slotX,y:e.slotY});
  try { best = Number(localStorage.getItem('space-attack-best')) || 0; } catch {}
  const stars = Array.from({length:100}, () => ({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+.3,s:Math.random()*20+8}));
  const soundFiles=new Map();
  const activeSounds=new Set();
  function sample(name,fallback=()=>{}) {
    if(muted)return;
    try {
      if(!soundFiles.has(name)){const clip=new Audio(`audio/${name}.wav`);clip.preload='auto';soundFiles.set(name,clip);}
      const clip=soundFiles.get(name).cloneNode();clip.volume=.45;activeSounds.add(clip);
      clip.addEventListener('ended',()=>activeSounds.delete(clip),{once:true});
      const playing=clip.play();if(playing)playing.catch(()=>{activeSounds.delete(clip);fallback();});
    }catch{fallback();}
  }
  function hud() {
    $('score').textContent=String(score).padStart(6,'0');$('best').textContent=String(best).padStart(6,'0');$('wave').textContent=String(Math.max(1,wave)).padStart(2,'0');$('health').textContent=String(hull);$('health').setAttribute('aria-label',`${hull} lives`);
    // Icons show spare launchers; the number counts all remaining lives.
    $('life-icons').innerHTML=Array.from({length:Math.max(0,hull-1)},()=>'<svg class="reserve-ship" viewBox="0 0 36 21"><path d="M15 0h6v3h6v3h6v3H21v3h15v9h-6v-3H6v3H0v-9h15V9H3V6h6V3h6Z"/></svg>').join('');
    $('fuel-fill').style.width=`${fuel}%`;$('fuel').setAttribute('aria-valuenow',String(Math.ceil(fuel)));$('fuel-value').textContent=`${Math.ceil(fuel)}%`;$('fuel').classList.toggle('low',fuel<=20);
  }
  function award(points) {score+=points;if(!bonusLife&&score>=5000){bonusLife=true;hull++;bannerTimer=2;$('announcement').textContent='5,000 · EXTRA LIFE';}hud();}
  function burst(x,y,color,count=18) { for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=40+Math.random()*160;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.4+Math.random()*.35,max:.75,color});} }
  function newWave() {
    wave++;direction=1;center=W/2;enemies=[];enemyShots=[];shots=[];fuel=100;fuelGrace=0;attackCount=0;diveTimer=1.1;
    ranks.forEach((count,r)=>{for(let c=0;c<count;c++){
      // Two spaced flagships crown the wider 5/7/9/9/9 ranks.
      const slotX=r===0?(c===0?-60:60):(c-(count-1)/2)*50;
      const slotY=75+r*34;
      enemies.push({x:center+slotX,y:slotY,slotX,slotY,row:r,hp:1,dive:false,mode:'formation',visible:true,phase:Math.random()*6.28});
    }});
    transition=wave===1?2.11:1.8;enemyTimer=1.2;bannerTimer=transition;$('announcement').textContent=`ARMADA ${String(wave).padStart(2,'0')}`;hud();
  }
  function beginDive(e) {
    e.dive=true;e.mode='peel';e.elapsed=0;e.startX=e.x;e.startY=e.y;e.targetX=player.x;
    e.side=e.x<center?-1:1;e.cloak=(++attackCount%3===0);e.fired=false;
  }
  function rocket(e) {
    const angle=Math.max(-.65,Math.min(.65,(player.x-e.x)/400));
    enemyShots.push({x:e.x,y:e.y+16,vx:angle*100,vy:190+Math.min(wave,15)*14});
  }
  function moveEnemy(e,dt) {
    if(e.mode==='formation'){Object.assign(e,home(e));return;}
    e.elapsed+=dt;
    if(e.mode==='peel'){
      const t=Math.min(1,e.elapsed/.65);
      e.x=e.startX+e.side*65*Math.sin(t*Math.PI/2);e.y=e.startY-28*Math.sin(t*Math.PI)+35*t;
      if(t===1){e.mode='attack';e.elapsed=0;e.startX=e.x;e.startY=e.y;}
    }else if(e.mode==='attack'){
      const duration=Math.max(1.5,2.7-wave*.08),t=Math.min(1,e.elapsed/duration);
      e.x=e.startX+(e.targetX-e.startX)*t+e.side*65*Math.sin(t*Math.PI*2)*(1-t);
      e.y=e.startY+(H+45-e.startY)*t;
      // Actual invisibility: no sprite or trail; collisions and movement continue.
      e.visible=!(e.cloak&&t>.18&&t<.6);
      if(t>.42&&!e.fired){e.fired=true;rocket(e);}
      if(t===1){e.mode='return';e.elapsed=0;e.startX=e.x;e.y=-30;e.visible=true;}
    }else if(e.mode==='return'){
      const t=Math.min(1,e.elapsed/1.1),dest=home(e);
      e.x=e.startX+(dest.x-e.startX)*t;e.y=-30+(dest.y+30)*t;
      if(t===1){e.mode='formation';e.dive=false;e.visible=true;Object.assign(e,dest);}
    }
  }
  function launch() {
    state='playing';score=0;hull=3;wave=0;bonusLife=false;respawn=0;player={x:W/2,y:H-82};particles=[];shots=[];enemyShots=[];keys.clear();invincible=0;fireTimer=0;shake=0;
    activeSounds.forEach(clip=>clip.pause());activeSounds.clear();
    $('overlay').hidden=true;$('overlay').classList.remove('is-report');$('pause').disabled=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause game');$('status').textContent='MISSION ACTIVE';newWave();sample('intro');canvas.focus();
  }
  function overlay(eyebrow,title,description,button,hint) {
    $('overlay').classList.add('is-report');$('eyebrow').textContent=eyebrow;$('title').innerHTML=title;$('description').textContent=description;$('start').textContent=button;$('hint').textContent=hint;$('overlay').hidden=false;
  }
  function end() {
    state='over';keys.clear();$('pause').disabled=true;$('announcement').textContent='';
    if(score>best){best=score;try{localStorage.setItem('space-attack-best',String(best));}catch{}}
    hud();$('status').textContent='SIGNAL LOST';overlay('MISSION REPORT','GAME<br><span>OVER</span>',`Score ${score.toLocaleString()} · Armada ${wave} · Best ${best.toLocaleString()}`,'TRY AGAIN ↗','PRESS ENTER TO RESTART');
  }
  function hit() {
    if(invincible>0 || state!=='playing')return;
    hull--;invincible=1.8;respawn=.6;fuel=100;fuelGrace=0;enemyShots=[];shots=[];shake=12;burst(player.x,player.y,'#65f5dc',32);hud();if(hull<=0)end();
  }
  function pause() {
    if(state==='playing'){state='paused';keys.clear();overlay('TAKE A BREATHER','MISSION<br><span>PAUSED</span>','Your orbit can wait. Resume when you’re ready.','RESUME MISSION ↗','PRESS P OR ENTER TO RESUME');$('pause').textContent='▶';$('pause').setAttribute('aria-label','Resume game');$('status').textContent='MISSION PAUSED';}
    else if(state==='paused'){state='playing';$('overlay').hidden=true;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause game');$('status').textContent='MISSION ACTIVE';canvas.focus();}
  }
  $('start').addEventListener('click',()=>state==='paused'?pause():launch());$('pause').addEventListener('click',pause);
  $('sound').addEventListener('click',()=>{muted=!muted;if(muted){activeSounds.forEach(clip=>clip.pause());activeSounds.clear();}$('sound').textContent=muted?'Sound off':'Sound on';$('sound').setAttribute('aria-pressed',String(!muted));});
  window.addEventListener('keydown',e=>{
    if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
    if(e.repeat && ['Enter','KeyP','Escape'].includes(e.code))return;
    if(e.code==='Enter'){if(state==='ready'||state==='over')launch();else if(state==='paused')pause();return;}
    if(e.code==='KeyP'||e.code==='Escape'){pause();return;}keys.add(e.code);
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(state==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
  canvas.addEventListener('pointerdown',e=>{if(e.button===0&&state==='playing'){e.preventDefault();canvas.focus();keys.add('MouseFire');keys.add('MouseTap');canvas.setPointerCapture?.(e.pointerId);}});
  window.addEventListener('pointerup',e=>{if(e.button===0)keys.delete('MouseFire');});
  canvas.addEventListener('pointercancel',()=>{keys.delete('MouseFire');keys.delete('MouseTap');});
  function update(dt) {
    time+=dt;
    stars.forEach(s=>{s.y+=s.s*dt;if(s.y>H){s.y=0;s.x=Math.random()*W;}});
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;});particles=particles.filter(p=>p.life>0);shake=Math.max(0,shake-dt*40);
    if(state!=='playing')return;
    invincible-=dt;respawn=Math.max(0,respawn-dt);fireTimer-=dt;bannerTimer-=dt;if(bannerTimer<=0)$('announcement').textContent='';
    const movement=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0);
    if(respawn===0)player.x=Math.max(26,Math.min(W-26,player.x+movement*420*dt));
    // The launcher cannot fire again until its current missile hits or leaves.
    shots=shots.filter(b=>!b.dead&&b.y>-20);
    if(transition<=0&&respawn===0&&(keys.has('Space')||keys.has('MouseFire')||keys.has('MouseTap'))&&fireTimer<=0&&shots.length===0){shots.push({x:player.x,y:player.y-25});keys.delete('MouseTap');fireTimer=.12;}
    shots.forEach(b=>b.y-=650*dt);shots=shots.filter(b=>b.y>-20&&!b.dead);
    transition-=dt;
    if(transition>0)return;
    fuel=Math.max(0,fuel-dt*100/FUEL_SECONDS);
    if(fuel===0){fuelGrace+=dt;if(fuelGrace>=2){invincible=0;hit();}}
    if(state!=='playing')return;
    hud();
    const cloaked=enemies.some(e=>!e.visible);
    $('status').textContent=fuel<=20?'LOW FUEL · CLEAR THE ARMADA':cloaked?'CLOAKED CONTACT · KEEP FIRING':'MISSION ACTIVE';
    const speed=24+Math.min(wave,15)*6;
    center+=direction*speed*dt;if(center>W-255){center=W-255;direction=-1;}if(center<255){center=255;direction=1;}
    for(const e of enemies){
      moveEnemy(e,dt);
      if(respawn===0&&invincible<=0&&Math.abs(e.x-player.x)<18+ENEMY_WIDTH/2&&Math.abs(e.y-player.y)<10+ENEMY_HEIGHT/2){e.dead=true;burst(e.x,e.y,'#ff688c');hit();}
    }
    diveTimer-=dt;
    const available=enemies.filter(e=>!e.dead&&e.mode==='formation');
    if(diveTimer<=0&&available.length&&enemies.filter(e=>e.dive).length<Math.min(5,2+Math.floor(wave/2))){
      const edges=available.filter(e=>!available.some(o=>o!==e&&Math.abs(o.slotX-e.slotX)<10&&o.row>e.row));
      const pool=edges.length?edges:available;beginDive(pool[Math.floor(Math.random()*pool.length)]);
      diveTimer=Math.max(.55,2.1-wave*.13);
    }
    enemyTimer-=dt;
    if(enemyTimer<=0&&enemies.length){
      const shooters=enemies.filter(e=>!e.dead&&e.y>0&&e.y<player.y-70&&e.mode!=='return');
      if(shooters.length)rocket(shooters[Math.floor(Math.random()*shooters.length)]);
      enemyTimer=Math.max(.22,1.05-wave*.07);
    }
    for(const b of shots){for(const e of enemies){if(!b.dead&&!e.dead&&Math.abs(b.x-e.x)<ENEMY_WIDTH/2+2&&Math.abs(b.y-e.y)<ENEMY_HEIGHT/2+9){b.dead=true;e.dead=true;award(e.mode==='attack'||e.mode==='peel'?[200,100,80,60,60,60][e.row]:[60,50,40,30,30,30][e.row]);burst(e.x,e.y,color(e.row));break;}}}
    enemyShots.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;if(Math.abs(b.x-player.x)<17&&Math.abs(b.y-player.y)<21){b.dead=true;hit();}});
    enemyShots=enemyShots.filter(b=>!b.dead&&b.y<H+15);enemies=enemies.filter(e=>!e.dead);
    if(state==='playing'&&enemies.length===0)newWave();
  }
  const color = row => ['#ffc778','#ff688c','#65f5dc','#ff688c','#ff688c','#ff688c'][row];
  function ship(x,y) {
    const pixels=['000001100000','000111111000','011111111110','000001100000','111111111111','111111111111','110000000011'];
    ctx.save();ctx.translate(Math.round(x)-18,Math.round(y)-10);ctx.fillStyle='#65f5dc';ctx.shadowColor='#65f5dc';ctx.shadowBlur=5;
    pixels.forEach((row,r)=>[...row].forEach((p,c)=>{if(p==='1')ctx.fillRect(c*3,r*3,3,3);}));ctx.restore();
  }
  function alien(e) {
    if(e.visible===false)return;
    ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y));ctx.fillStyle=color(e.row);ctx.shadowColor=color(e.row);ctx.shadowBlur=4;
    const pattern=e.row===0?['001000100','000101000','001111100','011111110','110101011','111111111','100000001','010000010']:['001000100','000101000','001111100','011111110','110101011','111111111','001000100','010101010'];
    pattern.forEach((line,r)=>[...line].forEach((p,c)=>{if(p==='1'){
      const x=Math.round((c/9-.5)*ENEMY_WIDTH),y=Math.round((r/8-.5)*ENEMY_HEIGHT);
      ctx.fillRect(x,y,Math.round(((c+1)/9-.5)*ENEMY_WIDTH)-x,Math.round(((r+1)/8-.5)*ENEMY_HEIGHT)-y);
    }}));
    if(e.hp>1){ctx.shadowBlur=0;ctx.strokeStyle='#ffc77888';ctx.strokeRect(-23,-22,46,42);}ctx.restore();
  }
  function draw() {
    ctx.fillStyle='#080e1d';ctx.fillRect(0,0,W,H);
    const glow=ctx.createRadialGradient(W/2,H/2,10,W/2,H/2,500);glow.addColorStop(0,'#18234266');glow.addColorStop(1,'#080e1d00');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    stars.forEach(s=>{ctx.globalAlpha=.25+s.r*.25;ctx.fillStyle='#bedbff';ctx.fillRect(s.x,s.y,s.r,s.r);});ctx.globalAlpha=1;
    ctx.strokeStyle='#65f5dc13';ctx.setLineDash([4,10]);ctx.beginPath();ctx.moveTo(0,H-105);ctx.lineTo(W,H-105);ctx.stroke();ctx.setLineDash([]);
    ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
    if(state==='ready'){
      [{x:140,y:130,row:0},{x:760,y:130,row:0},{x:110,y:220,row:1},{x:790,y:220,row:1},{x:170,y:320,row:2},{x:730,y:320,row:2}].forEach(e=>alien({...e,y:e.y+Math.sin(time+e.x)*5}));ship(W/2,H-82);
    }else{
      enemies.forEach(alien);if(hull>0&&respawn===0&&(invincible<=0||Math.floor(time*12)%2===0))ship(player.x,player.y);
      ctx.shadowBlur=12;ctx.shadowColor='#abffed';ctx.fillStyle='#c7fff2';shots.filter(b=>!b.dead).forEach(b=>ctx.fillRect(b.x-2,b.y-10,4,18));
      ctx.shadowColor='#ff688c';ctx.fillStyle='#ff688c';enemyShots.forEach(b=>{ctx.beginPath();ctx.moveTo(b.x,b.y+8);ctx.lineTo(b.x-4,b.y);ctx.lineTo(b.x,b.y-8);ctx.lineTo(b.x+4,b.y);ctx.closePath();ctx.fill();});ctx.shadowBlur=0;
    }
    particles.forEach(p=>{ctx.globalAlpha=p.life/p.max;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3);});ctx.globalAlpha=1;ctx.restore();
  }
  function frame(now){const dt=Math.min((now-last)/1000,.035);last=now;update(dt);draw();requestAnimationFrame(frame);}
  hud();requestAnimationFrame(frame);
})();




