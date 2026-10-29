(()=>{
'use strict';
const canvas=document.getElementById('machine'),ctx=canvas.getContext('2d'),status=document.getElementById('status'),collection=document.getElementById('collection');
const W=400,H=500,prizeNames=['Star Buddy','Rocket Pup','Moon Cat','Pixel Bear','Cloud Bunny'];
const colors=['#ffd166','#8dd8fc','#d7a4ff','#ffa6ad','#a6e7b6'];
const key='cu-claw-machine-prizes-v1';let wins=[];try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))wins=saved.filter(x=>prizeNames.includes(x)).slice(-100)}catch{}
let clawX=200,clawY=65,phase='ready',target=null,held=null,velocity=0,moveDir=0,round=0,prizes=[];
function random(i){const n=Math.sin((i+1)*83.21+round*117.9)*43758.5453;return n-Math.floor(n)}
function start(){round++;clawX=200;clawY=65;phase='ready';target=null;held=null;prizes=Array.from({length:9},(_,i)=>({id:i,x:60+(i%5)*68+(random(i)*16-8),y:370+Math.floor(i/5)*34,kind:i%prizeNames.length,caught:false}));status.textContent='Line up your claw, then press DROP.';}
function save(){try{localStorage.setItem(key,JSON.stringify(wins))}catch{}collection.textContent=wins.length?wins.map((n,i)=>((i+1)+'. '+n)).join(' · '):'Nothing won yet.';}
function drop(){if(phase!=='ready')return;phase='lowering';status.textContent='Claw descending…';}
function draw(){ctx.clearRect(0,0,W,H);
const gradient=ctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,'#264778');gradient.addColorStop(1,'#111b3b');ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
ctx.fillStyle='#fcd34d';ctx.fillRect(12,12,376,12);ctx.fillRect(12,12,12,450);ctx.fillRect(376,12,12,450);
ctx.fillStyle='#e76b9b';ctx.fillRect(24,435,352,40);ctx.fillStyle='#9c3a67';ctx.fillRect(24,470,352,20);
ctx.fillStyle='#091326';ctx.fillRect(290,438,76,36);ctx.fillStyle='#ffd166';ctx.font='12px monospace';ctx.fillText('PRIZE',308,460);
for(const p of prizes){if(p.caught)continue;drawPrize(p.x,p.y,p.kind);}
ctx.strokeStyle='#dce9fc';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(clawX,24);ctx.lineTo(clawX,clawY);ctx.stroke();
ctx.fillStyle='#b5c8e7';ctx.fillRect(clawX-16,clawY-6,32,15);
ctx.strokeStyle='#dce9fc';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(clawX-13,clawY+8);ctx.lineTo(clawX-21,clawY+28);ctx.lineTo(clawX-13,clawY+35);ctx.moveTo(clawX+13,clawY+8);ctx.lineTo(clawX+21,clawY+28);ctx.lineTo(clawX+13,clawY+35);ctx.stroke();
if(held)drawPrize(clawX,clawY+55,held.kind);
ctx.fillStyle='#ffffffa8';ctx.font='bold 12px monospace';ctx.fillText('CARTOON UNIVERSE',126,40);
}
function drawPrize(x,y,kind){ctx.save();ctx.translate(x,y);ctx.fillStyle=colors[kind];ctx.beginPath();ctx.ellipse(0,0,24,21,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#17233c';ctx.beginPath();ctx.arc(-8,-3,3,0,7);ctx.arc(8,-3,3,0,7);ctx.fill();ctx.strokeStyle='#17233c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,2,7,.1,Math.PI-.1);ctx.stroke();ctx.fillStyle=colors[kind];ctx.fillRect(-16,-24,12,11);ctx.fillRect(4,-24,12,11);ctx.restore();}
function tick(){if(phase==='ready')clawX=Math.max(46,Math.min(354,clawX+moveDir*3.2));
if(phase==='lowering'){clawY+=4.4;if(clawY>=305){clawY=305;const candidates=prizes.filter(p=>!p.caught&&Math.abs(p.x-clawX)<25).sort((a,b)=>Math.abs(a.x-clawX)-Math.abs(b.x-clawX));target=candidates[0]||null;held=target&&Math.random()<.72?target:null;if(held)held.caught=true;phase='lifting';status.textContent=held?'You grabbed something!':'Missed! Try again.';}}
else if(phase==='lifting'){clawY-=3.5;if(clawY<=65){clawY=65;phase=held?'returning':'ready';}}
else if(phase==='returning'){clawX+=Math.sign(330-clawX)*3.5;if(Math.abs(clawX-330)<4){clawX=330;phase='release';}}
else if(phase==='release'){if(held){wins.push(prizeNames[held.kind]);wins=wins.slice(-100);save();status.textContent='You won '+prizeNames[held.kind]+'!';held=null;}phase='ready';}
draw();requestAnimationFrame(tick);}
for(const [id,dir] of [['left',-1],['right',1]]){const b=document.getElementById(id);b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);moveDir=dir});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{if(moveDir===dir)moveDir=0});}
const keys=new Set();function updateDir(){moveDir=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'))}
document.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','KeyA','KeyD','Space'].includes(e.code)){e.preventDefault();if(e.code==='Space'&&!e.repeat)drop();else keys.add(e.code);updateDir();}});document.addEventListener('keyup',e=>{keys.delete(e.code);updateDir()});window.addEventListener('blur',()=>{keys.clear();moveDir=0});
document.getElementById('drop').addEventListener('click',drop);document.getElementById('restart').addEventListener('click',start);
start();save();tick();
})();