'use strict';
(() => {
 const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),W=900,H=650,TAU=Math.PI*2,keys=new Set();
 let state='ready',score=0,best=0,lives=3,wave=0,rocks=[],shots=[],bolts=[],particles=[],saucer=null,ship;
 let time=0,last=performance.now(),fire=0,jump=0,shield=0,transition=0,banner=0,saucerTimer=16,bonusAt=10000;
 const wrap=(v,max)=>(v%max+max)%max;
 const distance=(a,b)=>Math.hypot(Math.min(Math.abs(a.x-b.x),W-Math.abs(a.x-b.x)),Math.min(Math.abs(a.y-b.y),H-Math.abs(a.y-b.y)));
 const stars=Array.from({length:85},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()+.3}));
 try{best=Number(localStorage.getItem('asteroids-best'))||0;}catch{}
 function hud(){ $('score').textContent=String(score).padStart(6,'0');$('best').textContent=String(best).padStart(6,'0');$('health').textContent=lives;$('wave').textContent=String(Math.max(wave,1)).padStart(2,'0');$('jump').textContent=jump>0?`${Math.ceil(jump)}s`:'READY'; }
 function announce(s){$('announcement').textContent=s;banner=1.7;}
 function award(n){score+=n;if(score>best){best=score;try{localStorage.setItem('asteroids-best',best);}catch{}}if(score>=bonusAt){lives++;bonusAt+=10000;announce('EXTRA SHIP');}hud();}
 function burst(x,y,color,count=20){for(let i=0;i<count;i++){const a=Math.random()*TAU,v=35+Math.random()*150;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.4+Math.random()*.4,color});}}
 function makeRock(x,y,size){const a=Math.random()*TAU,v=(35+Math.random()*35+wave*5)*(size===3?1:size===2?1.4:1.9);return {x,y,size,r:[0,12,25,47][size],vx:Math.cos(a)*v,vy:Math.sin(a)*v,angle:Math.random()*TAU,spin:(Math.random()-.5)*1.2,shape:Array.from({length:12},()=>.7+Math.random()*.3)};}
 function resetShip(){ship={x:W/2,y:H/2,vx:0,vy:0,angle:-Math.PI/2};shield=3;}
 function nextWave(){wave++;rocks=[];shots=[];bolts=[];saucer=null;saucerTimer=14;for(let i=0;i<Math.min(4+wave,13);i++){const side=i%4;rocks.push(makeRock(side===0?35:side===1?865:Math.random()*W,side===2?35:side===3?615:Math.random()*H,3));}transition=1.5;announce(`SECTOR ${String(wave).padStart(2,'0')}`);hud();}
 function launch(){state='playing';score=0;lives=3;wave=0;bonusAt=10000;jump=0;fire=0;particles=[];keys.clear();resetShip();nextWave();$('overlay').hidden=true;$('pause').disabled=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause game');$('status').textContent='FLIGHT ACTIVE';canvas.focus();}
 function report(over){document.getElementById("hint").textContent=over?'PRESS ENTER TO RESTART':'PRESS ENTER TO RESUME';$('overlay').hidden=false;$('overlay').classList.add('is-report');$('eyebrow').textContent=over?'SIGNAL LOST IN DEEP SPACE':'FLIGHT ON HOLD';$('title').innerHTML=over?'GAME <span>OVER</span>':'FLIGHT <span>PAUSED</span>';$('description').textContent=over?`Score ${score.toLocaleString()} · Sector ${wave}. Your next flight awaits.`:'Your ship and the debris field will wait.';$('start').textContent=over?'FLY AGAIN ↗':'RESUME FLIGHT ↗';$('status').textContent=over?'SIGNAL LOST':'FLIGHT PAUSED';}
 function pause(){if(state==='playing'){state='paused';keys.clear();report(false);}else if(state==='paused'){state='playing';$('overlay').hidden=true;$('status').textContent='FLIGHT ACTIVE';last=performance.now();canvas.focus();}$('pause').textContent=state==='paused'?'▶':'Ⅱ';$('pause').setAttribute('aria-label',state==='paused'?'Resume game':'Pause game');}
 function lose(){if(shield>0||state!=='playing')return;burst(ship.x,ship.y,'#65f5dc',35);lives--;bolts=[];shots=[];keys.clear();if(lives===0){state='over';$('pause').disabled=true;report(true);}else{resetShip();announce('REPLACEMENT SHIP');}hud();}
 function split(i){const r=rocks.splice(i,1)[0];award(r.size===3?20:r.size===2?50:100);burst(r.x,r.y,'#b7d4df');if(r.size>1)for(let j=0;j<2;j++)rocks.push(makeRock(wrap(r.x+(j?8:-8),W),r.y,r.size-1));}
 function hyperspace(){if(jump>0||state!=='playing'||transition>0)return;burst(ship.x,ship.y,'#65f5dc',12);let spot;for(let i=0;i<30;i++){spot={x:50+Math.random()*(W-100),y:70+Math.random()*(H-140)};if(rocks.every(r=>distance(r,spot)>r.r+60)&&(!saucer||distance(saucer,spot)>100))break;}Object.assign(ship,spot,{vx:0,vy:0});shield=Math.max(shield,1);jump=5;hud();}
 function advance(b,dt){b.x=wrap(b.x+b.vx*dt,W);b.y=wrap(b.y+b.vy*dt,H);}
 function update(dt){if(state==='paused')return;time+=dt;particles.forEach(p=>{advance(p,dt);p.life-=dt;});particles=particles.filter(p=>p.life>0);if(state==='ready'){rocks.forEach(r=>{advance(r,dt);r.angle+=r.spin*dt;});return;}if(state!=='playing')return;banner-=dt;if(banner<=0)$('announcement').textContent='';jump=Math.max(0,jump-dt);hud();if(transition>0){transition-=dt;return;}shield=Math.max(0,shield-dt);fire-=dt;
 ship.angle+=((keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0))*4.3*dt;
 if(keys.has('ArrowUp')||keys.has('KeyW')){ship.vx+=Math.cos(ship.angle)*240*dt;ship.vy+=Math.sin(ship.angle)*240*dt;const speed=Math.hypot(ship.vx,ship.vy);if(speed>370){ship.vx*=370/speed;ship.vy*=370/speed;}if(Math.random()<.7)particles.push({x:wrap(ship.x-Math.cos(ship.angle)*18,W),y:wrap(ship.y-Math.sin(ship.angle)*18,H),vx:ship.vx-Math.cos(ship.angle)*90,vy:ship.vy-Math.sin(ship.angle)*90,life:.2,color:'#ffbc70'});}
 advance(ship,dt);if((keys.has('Space')||keys.has('MouseFire')||keys.has('MouseTap'))&&fire<=0&&shots.length<6){shots.push({x:wrap(ship.x+Math.cos(ship.angle)*19,W),y:wrap(ship.y+Math.sin(ship.angle)*19,H),vx:ship.vx+Math.cos(ship.angle)*520,vy:ship.vy+Math.sin(ship.angle)*520,life:.95});fire=.18;keys.delete('MouseTap');}
 rocks.forEach(r=>{advance(r,dt);r.angle+=r.spin*dt;});
 saucerTimer-=dt;if(!saucer&&saucerTimer<=0){const small=wave>=3;saucer={x:0,y:110+Math.random()*400,vx:95+wave*5,vy:0,r:small?16:24,small,fire:1};saucerTimer=18+Math.random()*12;}
 if(saucer){saucer.x+=saucer.vx*dt;saucer.y+=Math.sin(time*2)*30*dt;saucer.fire-=dt;if(saucer.fire<=0){const a=saucer.small?Math.atan2(ship.y-saucer.y,ship.x-saucer.x)+(Math.random()-.5)*.25:Math.random()*TAU;bolts.push({x:saucer.x,y:saucer.y,vx:Math.cos(a)*230,vy:Math.sin(a)*230,life:2.5});saucer.fire=Math.max(.5,1.4-wave*.06);}if(saucer.x>W+30)saucer=null;}
 for(let i=shots.length-1;i>=0;i--){const b=shots[i];advance(b,dt);b.life-=dt;const j=rocks.findIndex(r=>distance(b,r)<r.r);if(j>=0){split(j);shots.splice(i,1);}else if(saucer&&distance(b,saucer)<saucer.r){award(saucer.small?1000:200);burst(saucer.x,saucer.y,'#ff688c');saucer=null;shots.splice(i,1);}else if(b.life<=0)shots.splice(i,1);}
 for(let i=bolts.length-1;i>=0;i--){const b=bolts[i];advance(b,dt);b.life-=dt;if(shield<=0&&distance(b,ship)<12){lose();break;}if(b.life<=0)bolts.splice(i,1);}
 if(shield<=0&&(rocks.some(r=>distance(r,ship)<r.r+10)||(saucer&&distance(saucer,ship)<saucer.r+10)))lose();
 if(!rocks.length&&!saucer&&state==='playing')nextWave();
 }
 function outline(points,x,y,angle,color,width=1.5){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.stroke();ctx.restore();}
 function copies(x,y,r,paint){const xs=[x],ys=[y];if(x<r)xs.push(x+W);if(x>W-r)xs.push(x-W);if(y<r)ys.push(y+H);if(y>H-r)ys.push(y-H);xs.forEach(a=>ys.forEach(b=>paint(a,b)));}
 function draw(){ctx.fillStyle='#080e1d';ctx.fillRect(0,0,W,H);ctx.fillStyle='#8daac1';stars.forEach(s=>{ctx.globalAlpha=.15+.15*(1+Math.sin(time*.5+s.x));ctx.fillRect(s.x,s.y,s.r,s.r);});ctx.globalAlpha=1;
 rocks.forEach(r=>{const points=r.shape.map((v,i)=>[Math.cos(i/12*TAU)*r.r*v,Math.sin(i/12*TAU)*r.r*v]);copies(r.x,r.y,r.r,(x,y)=>outline(points,x,y,r.angle,'#a5bdcc'));});
 if(saucer)outline([[-saucer.r,0],[-saucer.r*.5,-6],[-5,-13],[5,-13],[saucer.r*.5,-6],[saucer.r,0],[saucer.r*.55,7],[-saucer.r*.55,7],[-saucer.r,0],[saucer.r,0],[saucer.r*.5,-6],[-saucer.r*.5,-6]],saucer.x,saucer.y,0,'#ff688c',2);
 if(state!=='over'&&ship){copies(ship.x,ship.y,24,(x,y)=>{outline([[18,0],[-13,-11],[-8,0],[-13,11]],x,y,ship.angle,'#65f5dc',2);if((keys.has('ArrowUp')||keys.has('KeyW'))&&state==='playing')outline([[-12,-5],[-23-Math.random()*8,0],[-12,5]],x,y,ship.angle,'#ffbc70');if(shield>0){ctx.strokeStyle=`rgba(101,245,220,${.2+.15*Math.sin(time*8)})`;ctx.beginPath();ctx.arc(x,y,26,0,TAU);ctx.stroke();}});}
 shots.forEach(b=>{ctx.fillStyle='#e9f1ff';ctx.fillRect(b.x-1.5,b.y-1.5,3,3);});bolts.forEach(b=>{ctx.fillStyle='#ff688c';ctx.fillRect(b.x-2,b.y-2,4,4);});particles.forEach(p=>{ctx.globalAlpha=Math.min(1,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,2,2);});ctx.globalAlpha=1;
 }
 function frame(now){const dt=Math.min(.025,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(frame);}
 window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowLeft','ArrowRight','Enter'].includes(e.code))e.preventDefault();if(e.repeat&&['Enter','KeyP','Escape','ShiftLeft','ShiftRight'].includes(e.code))return;if(e.code==='Enter'){if(state==='paused')pause();else if(state!=='playing')launch();}else if(['KeyP','Escape'].includes(e.code))pause();else if(['ShiftLeft','ShiftRight'].includes(e.code))hyperspace();else keys.add(e.code);});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(state==='playing')pause();});
 canvas.addEventListener('pointerdown',e=>{if(e.button===0&&state==='playing'){keys.add('MouseFire');keys.add('MouseTap');canvas.setPointerCapture(e.pointerId);canvas.focus();}});window.addEventListener('pointerup',()=>keys.delete('MouseFire'));canvas.addEventListener('pointercancel',()=>{keys.delete('MouseFire');keys.delete('MouseTap');});$('start').onclick=()=>state==='paused'?pause():launch();$('pause').onclick=pause;
 resetShip();for(let i=0;i<9;i++)rocks.push(makeRock(Math.random()*W,Math.random()*H,i%3+1));hud();requestAnimationFrame(frame);
 if(typeof module!=='undefined')module.exports={launch,update,pause,award,lose,split,hyperspace,distance,keys,get:()=>({state,score,best,lives,wave,rocks,shots,bolts,ship,jump,shield,transition}),setShield:n=>shield=n};
})();


