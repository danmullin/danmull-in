'use strict';
(() => {
 const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),keys=new Set();
 const map=[
 '#####################',
 '#o........#........o#',
 '#.###.###.#.###.###.#',
 '#...................#',
 '#.###.#.#####.#.###.#',
 '#.....#...#...#.....#',
 '#####.###.#.###.#####',
 '#...#.#.......#.#...#',
 '#.#.#.#.##.##.#.#.#.#',
 '......#.......#......',
 '#.#.#.#.#####.#.#.#.#',
 '#...#.#.......#.#...#',
 '#####.#.#####.#.#####',
 '#.........#.........#',
 '#.###.###.#.###.###.#',
 '#o..#...........#..o#',
 '###.#.#.#####.#.#.###',
 '#.....#...#...#.....#',
 '#.#######.#.#######.#',
 '#...................#',
 '#####################'];
 const COLS=21,ROWS=21,S=23,OX=(900-COLS*S)/2,OY=72,dirs=[[0,-1],[1,0],[0,1],[-1,0]],start={x:10,y:15};
 let state='ready',score=0,best=0,lives=3,level=0,dots=new Map(),player,ghosts=[],wanted=1,time=0,last=performance.now(),power=0,chain=0,transition=0,banner=0,modeClock=0,fruit=null,eaten=0,fruitMarks=new Set(),extra=false;
 try{best=Number(localStorage.getItem('pac-man-best'))||0;}catch{}
 const tile=(x,y)=>`${x},${y}`,wrap=x=>(x+COLS)%COLS;
 function open(x,y){return y>=0&&y<ROWS&&map[y][wrap(x)]!=='#';}
 function actor(x,y,d){return {x,y,d,next:null,progress:0};}
 function hud(){$('score').textContent=String(score).padStart(6,'0');$('best').textContent=String(best).padStart(6,'0');$('health').textContent=lives;$('wave').textContent=String(Math.max(1,level)).padStart(2,'0');$('dots').textContent=dots.size;}
 function award(n){score+=n;if(score>best){best=score;try{localStorage.setItem('pac-man-best',best);}catch{}}if(score>=10000&&!extra){extra=true;lives++;announce('EXTRA LIFE');}hud();}
 function announce(s,t=1.6){$('announcement').textContent=s;banner=t;}
 function resetActors(){player=actor(start.x,start.y,1);wanted=1;ghosts=[actor(10,7,3),actor(9,9,1),actor(10,9,3),actor(11,9,1)];ghosts.forEach((g,i)=>{g.id=i;g.color=['#ff688c','#ffb5dc','#65f5dc','#ffbc70'][i];g.release=i*1.4;g.dead=false;});power=0;chain=0;modeClock=0;transition=1.5;}
 function fillDots(){dots=new Map();map.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='.'||v==='o')dots.set(tile(x,y),v);}));dots.delete(tile(start.x,start.y));for(const [x,y] of [[10,7],[9,9],[10,9],[11,9]])dots.delete(tile(x,y));}
 function nextLevel(){level++;fillDots();fruit=null;eaten=0;fruitMarks.clear();resetActors();announce(`LEVEL ${String(level).padStart(2,'0')}`);hud();}
 function launch(){state='playing';score=0;lives=3;level=0;extra=false;keys.clear();nextLevel();$('overlay').hidden=true;$('pause').disabled=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause game');canvas.focus();}
 function report(over){$('overlay').hidden=false;$('overlay').classList.add('is-report');$('eyebrow').textContent=over?'THE GHOSTS GOT THE LAST BITE':'MAZE ON HOLD';$('title').innerHTML=over?'GAME <span>OVER</span>':'MAZE <span>PAUSED</span>';$('description').textContent=over?`Score ${score.toLocaleString()} · Level ${level}. Another maze awaits.`:'The maze and its pursuers will wait.';$('start').textContent=over?'PLAY AGAIN ↗':'RESUME MAZE ↗';$('hint').textContent=over?'PRESS ENTER TO RESTART':'PRESS ENTER TO RESUME';}
 function pause(){if(state==='playing'){state='paused';keys.clear();report(false);}else if(state==='paused'){state='playing';$('overlay').hidden=true;last=performance.now();canvas.focus();}$('pause').textContent=state==='paused'?'▶':'Ⅱ';$('pause').setAttribute('aria-label',state==='paused'?'Resume game':'Pause game');}
 function lose(){if(state!=='playing')return;lives--;keys.clear();if(lives<=0){state='over';$('pause').disabled=true;report(true);}else{resetActors();announce('READY!');}hud();}
 function pos(a){if(!a.next)return {x:a.x,y:a.y};const [dx,dy]=dirs[a.d];return {x:wrap(a.x+dx*a.progress),y:a.y+dy*a.progress};}
 function consume(){const key=tile(player.x,player.y),v=dots.get(key);if(v){dots.delete(key);eaten++;if(v==='o'){power=Math.max(2,7-level*.35);chain=0;ghosts.filter(g=>!g.dead).forEach(g=>{if(g.next){const oldX=g.x,oldY=g.y;g.x=g.next.x;g.y=g.next.y;g.next={x:oldX,y:oldY};g.progress=1-g.progress;g.d=(g.d+2)%4;}else g.d=(g.d+2)%4;});award(50);announce('POWER UP',1);}else award(10);if((eaten>=50&&!fruitMarks.has(50))||(eaten>=130&&!fruitMarks.has(130))){fruitMarks.add(eaten>=130?130:50);fruit={x:10,y:13,life:10};}}if(fruit&&player.x===fruit.x&&player.y===fruit.y){fruit=null;award(Math.min(5000,100*level));announce('FRUIT BONUS');}hud();}
 function target(g){const p=pos(player),[dx,dy]=dirs[player.d],scatter=Math.floor(modeClock/27)*27===0?modeClock<7:modeClock%27<7;const corners=[[19,1],[1,1],[19,19],[1,19]];if(scatter)return {x:corners[g.id][0],y:corners[g.id][1]};if(g.id===0)return p;if(g.id===1)return {x:p.x+dx*4,y:p.y+dy*4};if(g.id===2){const red=pos(ghosts[0]);return {x:(p.x+dx*2)*2-red.x,y:(p.y+dy*2)*2-red.y};}if(Math.hypot(g.x-p.x,g.y-p.y)<6)return {x:1,y:19};return p;}
 function choose(g){let options=dirs.map(([dx,dy],d)=>({x:wrap(g.x+dx),y:g.y+dy,d})).filter(n=>open(n.x,n.y)&&n.d!==(g.d+2)%4);if(!options.length)options=dirs.map(([dx,dy],d)=>({x:wrap(g.x+dx),y:g.y+dy,d})).filter(n=>open(n.x,n.y));if(!options.length)return null;if(g.dead){const distances=new Map([['10,9',0]]),queue=[[10,9]];for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of dirs){const nx=wrap(x+dx),ny=y+dy,k=tile(nx,ny);if(open(nx,ny)&&!distances.has(k)){distances.set(k,distances.get(tile(x,y))+1);queue.push([nx,ny]);}}}return options.sort((a,b)=>distances.get(tile(a.x,a.y))-distances.get(tile(b.x,b.y)))[0];}if(power>0&&!g.dead)return options[Math.floor(Math.random()*options.length)];const t=g.dead?{x:10,y:9}:target(g);return options.sort((a,b)=>(a.x-t.x)**2+(a.y-t.y)**2-((b.x-t.x)**2+(b.y-t.y)**2))[0];}
 function move(a,dt,speed,isPlayer){let budget=dt*speed;for(let i=0;i<8&&budget>0;i++){if(!a.next){if(isPlayer){const [dx,dy]=dirs[wanted];if(open(a.x+dx,a.y+dy))a.d=wanted;const [vx,vy]=dirs[a.d];if(!open(a.x+vx,a.y+vy))break;a.next={x:wrap(a.x+vx),y:a.y+vy};}else{const n=choose(a);if(!n)break;a.d=n.d;a.next={x:n.x,y:n.y};}}
 const step=Math.min(budget,1-a.progress);a.progress+=step;budget-=step;if(a.progress>=1-1e-9){a.x=a.next.x;a.y=a.next.y;a.next=null;a.progress=0;if(isPlayer)consume();else if(a.dead&&a.x===10&&a.y===9){a.dead=false;a.release=1;break;}}}}
 function collide(){const p=pos(player);for(const g of ghosts){if(g.release>0||g.dead)continue;const q=pos(g),dx=Math.min(Math.abs(p.x-q.x),COLS-Math.abs(p.x-q.x));if(Math.hypot(dx,p.y-q.y)<.72){if(power>0){g.dead=true;award(200*2**Math.min(chain++,3));announce(`${200*2**Math.min(chain-1,3)} · GHOST`);}else{lose();return true;}}}return false;}
 function update(dt){if(state==='paused')return;time+=dt;if(state!=='playing')return;banner-=dt;if(banner<=0)$('announcement').textContent='';if(transition>0){transition-=dt;return;}modeClock+=dt;power=Math.max(0,power-dt);if(fruit){fruit.life-=dt;if(fruit.life<=0)fruit=null;}consume();move(player,dt,5.7+Math.min(level,10)*.12,true);if(collide())return;for(const g of ghosts){if(g.release>0){g.release-=dt;continue;}move(g,dt,g.dead?10:power>0?3.1:5+Math.min(level,10)*.14,false);}if(collide())return;if(!dots.size)nextLevel();}
 function drawGhost(g,x,y){if(!g.dead){ctx.fillStyle=power>0?(power<2&&Math.floor(time*7)%2?'#e9f1ff':'#526cff'):g.color;ctx.beginPath();ctx.arc(x,y-2,9,Math.PI,0);ctx.lineTo(x+9,y+9);for(let i=0;i<6;i++)ctx.lineTo(x+9-i*3,y+6+(i%2?3:0));ctx.lineTo(x-9,y+9);ctx.closePath();ctx.fill();}for(const o of [-4,4]){ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x+o,y-2,3,4,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#20345e';const [dx,dy]=dirs[g.d];ctx.fillRect(x+o-1+dx,y-3+dy,2.5,3);}}
 function draw(){ctx.fillStyle='#080e1d';ctx.fillRect(0,0,900,650);ctx.fillStyle='#071021';ctx.fillRect(OX,OY,COLS*S,ROWS*S);map.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='#'){ctx.fillStyle='#101d48';ctx.fillRect(OX+x*S,OY+y*S,S,S);ctx.strokeStyle='#4b68e2';ctx.lineWidth=2;ctx.beginPath();for(const [dx,dy] of dirs){if(map[y+dy]?.[x+dx]==='#')continue;const left=OX+x*S,top=OY+y*S;if(dx===-1){ctx.moveTo(left+2,top);ctx.lineTo(left+2,top+S);}if(dx===1){ctx.moveTo(left+S-2,top);ctx.lineTo(left+S-2,top+S);}if(dy===-1){ctx.moveTo(left,top+2);ctx.lineTo(left+S,top+2);}if(dy===1){ctx.moveTo(left,top+S-2);ctx.lineTo(left+S,top+S-2);}}ctx.stroke();}}));dots.forEach((v,key)=>{const [x,y]=key.split(',').map(Number);ctx.fillStyle='#ffe8b0';ctx.beginPath();ctx.arc(OX+(x+.5)*S,OY+(y+.5)*S,v==='o'?4+Math.sin(time*7):1.7,0,Math.PI*2);ctx.fill();});if(fruit){const x=OX+(fruit.x+.5)*S,y=OY+(fruit.y+.5)*S;ctx.fillStyle='#ff688c';for(const o of [-4,4]){ctx.beginPath();ctx.arc(x+o,y+3,5,0,Math.PI*2);ctx.fill();}ctx.strokeStyle='#65f5dc';ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+2,y-8);ctx.lineTo(x+4,y);ctx.stroke();}
 if(player&&state!=='over'){const p=pos(player),angle=[-Math.PI/2,0,Math.PI/2,Math.PI][player.d],mouth=.1+Math.abs(Math.sin(time*12))*.5;ctx.fillStyle='#ffcf45';ctx.beginPath();ctx.moveTo(OX+(p.x+.5)*S,OY+(p.y+.5)*S);ctx.arc(OX+(p.x+.5)*S,OY+(p.y+.5)*S,10,angle+mouth,angle+Math.PI*2-mouth);ctx.closePath();ctx.fill();}ghosts.forEach(g=>{const p=pos(g);drawGhost(g,OX+(p.x+.5)*S,OY+(p.y+.5)*S);});}
 function frame(now){const dt=Math.min(.025,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(frame);}
 const bindings={ArrowUp:0,KeyW:0,ArrowRight:1,KeyD:1,ArrowDown:2,KeyS:2,ArrowLeft:3,KeyA:3};window.addEventListener('keydown',e=>{if(e.code in bindings||e.code==='Enter')e.preventDefault();if(e.repeat&&['Enter','KeyP','Escape'].includes(e.code))return;if(e.code in bindings){wanted=bindings[e.code];if(player.next&&wanted===(player.d+2)%4){const x=player.x,y=player.y;player.x=player.next.x;player.y=player.next.y;player.next={x,y};player.progress=1-player.progress;player.d=wanted;}}else if(e.code==='Enter'){if(state==='paused')pause();else if(state!=='playing')launch();}else if(['KeyP','Escape'].includes(e.code))pause();});window.addEventListener('blur',()=>{if(state==='playing')pause();});$('start').onclick=()=>state==='paused'?pause():launch();$('pause').onclick=pause;fillDots();resetActors();hud();requestAnimationFrame(frame);
 if(typeof module!=='undefined')module.exports={launch,update,pause,lose,consume,collide,open,pos,map,choose,get:()=>({state,score,lives,level,dots,player,ghosts,power,fruit}),setWanted:n=>wanted=n,setTransition:n=>transition=n};
})();


