import * as THREE from 'https://esm.sh/three@0.170.0';
const canvas=document.querySelector('#scene'),status=document.querySelector('#status');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'default'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color('#8fd5ec');scene.fog=new THREE.Fog('#8fd5ec',28,72);
const camera=new THREE.PerspectiveCamera(62,1,.1,120);
scene.add(new THREE.HemisphereLight(0xe5f6ff,0x4c7544,2.2));
const sun=new THREE.DirectionalLight(0xffefc0,2.4);sun.position.set(-10,19,11);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
const mat=(color,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness});
const grass=mat('#66b36c'),path=mat('#c5aa7b'),trunk=mat('#705039'),leaves=[mat('#2e8d60'),mat('#46a46c'),mat('#66ba76')],rock=mat('#8293a0');
function mesh(geometry,material,x,y,z,shadow=true){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;scene.add(m);return m;}
mesh(new THREE.PlaneGeometry(90,90),grass,0,0,0,false).rotation.x=-Math.PI/2;
mesh(new THREE.BoxGeometry(5,.08,50),path,0,.01,0,false);
const seed=(n)=>{const v=Math.sin(n*127.1+78.233)*43758.5453;return v-Math.floor(v)};
for(let i=0;i<68;i++){const x=(seed(i*2)-.5)*76,z=(seed(i*2+1)-.5)*76;if(Math.abs(x)<5&&Math.abs(z)<27)continue;
 if(i%5===0){mesh(new THREE.DodecahedronGeometry(.6+seed(i)*.65),rock,x,.42,z);continue;}
 const h=1.7+seed(i+110)*1.9;mesh(new THREE.CylinderGeometry(.23,.33,h,7),trunk,x,h/2,z);
 for(let j=0;j<3;j++)mesh(new THREE.ConeGeometry(1.3-j*.19,1.7,7),leaves[(i+j)%3],x,h*.72+j*.53,z);
}
const player=new THREE.Group();scene.add(player);
function part(geometry,material,x,y,z,parent=player){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
const blue=mat('#246fd3'),gold=mat('#ffcb4a'),skin=mat('#f6b98e'),dark=mat('#1d3554');
part(new THREE.BoxGeometry(.75,.9,.43),blue,0,1.1,0);part(new THREE.SphereGeometry(.3,12,8),skin,0,1.85,0);
part(new THREE.BoxGeometry(.75,.15,.55),gold,0,2.08,0);part(new THREE.BoxGeometry(.22,.7,.25),dark,-.23,.35,0);part(new THREE.BoxGeometry(.22,.7,.25),dark,.23,.35,0);
part(new THREE.BoxGeometry(.22,.75,.25),skin,-.52,1.06,0);part(new THREE.BoxGeometry(.22,.75,.25),skin,.52,1.06,0);
const monsters=[];
function creature(x,z,color){const root=new THREE.Group();root.position.set(x,0,z);scene.add(root);
const body=new THREE.Mesh(new THREE.SphereGeometry(.55,16,12),mat(color,.72));body.scale.set(1,1.15,.9);body.position.y=.75;root.add(body);
for(const side of [-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.22,.65,8),mat(color));ear.position.set(side*.32,1.55,0);root.add(ear);
const eye=new THREE.Mesh(new THREE.SphereGeometry(.085,8,6),mat('#152337'));eye.position.set(side*.22,.94,.48);root.add(eye);}
monsters.push(root);}
creature(4,-7,'#f2a343');creature(-5,-14,'#6bbbea');creature(6,12,'#f0d05d');
const keys=new Set();const directions={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD'};
document.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();keys.add(e.code)}});
document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
for(const b of document.querySelectorAll('[data-dir]')){const code=directions[b.dataset.dir];b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(code);b.setPointerCapture(e.pointerId)});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(code));}
let cameraMode=0,yaw=0,dragging=false,lastX=0;
document.querySelector('#camera').addEventListener('click',()=>cameraMode=(cameraMode+1)%2);
document.querySelector('#reset').addEventListener('click',()=>player.position.set(0,0,0));
canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX});canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
canvas.addEventListener('pointermove',e=>{if(dragging){yaw+=(e.clientX-lastX)*.006;lastX=e.clientX}});
const clock=new THREE.Clock();let elapsed=0;
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;
const dx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
const dz=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
if(dx||dz){const n=Math.hypot(dx,dz),speed=5.5;player.position.x=THREE.MathUtils.clamp(player.position.x+dx/n*speed*dt,-39,39);player.position.z=THREE.MathUtils.clamp(player.position.z+dz/n*speed*dt,-39,39);player.rotation.y=Math.atan2(dx,dz);}
monsters.forEach((m,i)=>m.position.y=.08+Math.sin(elapsed*2+i)*.12);
const offset=cameraMode?new THREE.Vector3(0,17,12):new THREE.Vector3(Math.sin(yaw)*9,6.5,Math.cos(yaw)*9);
camera.position.lerp(player.position.clone().add(offset),Math.min(1,dt*5));camera.lookAt(player.position.x,1,player.position.z);
const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
status.textContent='Exploring · X '+player.position.x.toFixed(1)+' · Z '+player.position.z.toFixed(1);
renderer.render(scene,camera);}
frame();
