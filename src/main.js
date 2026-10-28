import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = id => document.getElementById(id);
const viewport = $('viewport');
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); }
catch { $('loading').textContent = '你的浏览器暂不支持 WebGL，请开启硬件加速后重试。'; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
viewport.prepend(renderer.domElement);
$('loading').remove();
const scene = new THREE.Scene();
scene.background = new THREE.Color('#cbd8b3');
scene.fog = new THREE.Fog('#cbd8b3', 13, 37);
const camera = new THREE.PerspectiveCamera(39.6, 1, .1, 80);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .08;
controls.minDistance = 2;
controls.maxDistance = 17;
controls.maxPolarAngle = Math.PI * .485;
controls.minPolarAngle = .15;
controls.target.set(0, 1.1, 0);
const hemi = new THREE.HemisphereLight('#fff4d6', '#a4ae77', 2.4); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0cc', 4.2); sun.position.set(-4, 9, 5); sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12; sun.shadow.normalBias=.035;scene.add(sun);
const mats = {};
function mat(color, roughness = .86) { return mats[color] ||= new THREE.MeshStandardMaterial({color,roughness}); }
function ball(parent, color, pos, scale, segments=32) { const mesh = new THREE.Mesh(new THREE.SphereGeometry(1,segments,24),mat(color));mesh.position.set(...pos);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh; }
function box(parent,color,pos,scale,rotation=0) { const m=new THREE.Mesh(new THREE.BoxGeometry(...scale),mat(color));m.position.set(...pos);m.rotation.y=rotation;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m; }
function cylinder(parent,color,pos,rt,rb,h){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,20),mat(color));m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
let seed=56;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),mat('#a9b67b'));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const lawn=cylinder(scene,'#b9c58b',[0,-.08,0],8,8.1,.18);
// A curving path laid from smooth river stones.
for(let i=0;i<34;i++){const z=-8+i*.48;const x=2.65+Math.sin(z*.52)*.8;ball(scene,['#d8d2b5','#d4ceb0','#ded7bb'][i%3],[x,.025,z],[.62+random()*.2,.055,.36+random()*.08],16);}
// Garden fence and cross rails.
for(let i=0;i<20;i++){const x=-10+i*1.03;box(scene,'#e4dfc5',[x,.8,-5.6],[.15,1.6,.15]);ball(scene,'#e4dfc5',[x,1.6,-5.6],[.12,.12,.12],12);}
box(scene,'#ddd8b9',[0,.58,-5.62],[20,.14,.12]);box(scene,'#ddd8b9',[0,1.18,-5.62],[20,.14,.12]);
// Rounded topiary, soft trees, tiny flowers.
for(let i=0;i<18;i++){const x=-11+random()*22,z=-6.8-random()*7;const h=2+random()*3;cylinder(scene,'#8c8461',[x,h*.4,z],.11,.17,h*.8);ball(scene,i%2?'#819a64':'#94aa70',[x,h,z],[1.15+random(),1.5+random(),1.2],20);ball(scene,'#a5b87b',[x-.4,h+.65,z+.3],[.95,1,.85],20);}
for(let i=0;i<36;i++){const a=random()*Math.PI*2,r=4+random()*5;ball(scene,['#8da365','#9dae70','#a3b679'][i%3],[Math.cos(a)*r,.24,Math.sin(a)*r],[.4+random()*.6,.28+random()*.35,.4+random()*.5],16);}
function flower(x,z,color,size=1){const h=(.18+random()*.23)*size;cylinder(scene,'#7b985c',[x,h/2,z],.014,.018,h);const petals=5;for(let j=0;j<petals;j++){const a=j/petals*Math.PI*2;ball(scene,color,[x+Math.cos(a)*.075*size,h,z+Math.sin(a)*.075*size],[.065*size,.025*size,.065*size],10);}ball(scene,'#e7b651',[x,h+.018,z],[.04*size,.026*size,.04*size],10);}
for(let i=0;i<125;i++){const x=(random()-.5)*15,z=(random()-.5)*13;if(Math.hypot(x,z)<1.65||Math.abs(x-(2.65+Math.sin(z*.52)*.8))<.8)continue;flower(x,z,['#fff8dc','#f0d09c','#e6b7a2'][i%3],.65+random()*.8);}
// Wooden garden bench.
for(let i=0;i<4;i++)box(scene,'#ae9469',[-3.7,.64,-2.8+i*.16],[2,.1,.13]);
for(const x of [-4.45,-2.95]){box(scene,'#756f50',[x,.31,-2.55],[.12,.62,.56]);box(scene,'#89794f',[x,1.05,-2.92],[.09,1,.09]);}
box(scene,'#b49a70',[-3.7,1.15,-2.93],[2,.21,.1]);box(scene,'#b49a70',[-3.7,1.44,-2.93],[2,.21,.1]);
// Small terracotta flower pot.
cylinder(scene,'#bd9270',[-1.9,.2,.6],.24,.17,.4);cylinder(scene,'#a77e5b',[-1.9,.41,.6],.26,.26,.07);
for(let i=0;i<5;i++)flower(-1.9+(random()-.5)*.25,.6+(random()-.5)*.25,'#fff0cc',1.8);
const rabbit=new THREE.Group();scene.add(rabbit);
ball(rabbit,'#f4edd9',[0,.74,0],[.55,.69,.43]);
ball(rabbit,'#faf2de',[0,1.48,.08],[.53,.48,.46]);
for(const side of [-1,1]){const ear=ball(rabbit,'#f4edd9',[side*.25,2.13,.02],[.155,.6,.145]);ear.rotation.z=-side*.16;const pink=ball(rabbit,'#e8c7b9',[side*.25,2.16,.147],[.082,.43,.026]);pink.rotation.z=-side*.16;ball(rabbit,'#eee4ce',[side*.32,.2,.24],[.25,.19,.4]);const arm=ball(rabbit,'#eee4ce',[side*.48,.86,.16],[.16,.32,.16]);arm.rotation.z=side*.24;ball(rabbit,'#332f28',[side*.22,1.56,.486],[.052,.066,.033]);ball(rabbit,'#ffffff',[side*.21,1.58,.513],[.014,.017,.01],12);ball(rabbit,'#e7c4ad',[side*.32,1.39,.468],[.105,.055,.018]);}
ball(rabbit,'#d5aa9a',[0,1.4,.557],[.064,.043,.036]);ball(rabbit,'#faf2de',[0,.65,-.45],[.23,.23,.23]);
// Sage bandana.
const scarf=new THREE.Mesh(new THREE.TorusGeometry(.36,.075,12,48),mat('#8d9d72'));scarf.rotation.x=Math.PI/2;scarf.position.set(0,1.15,.04);scarf.scale.set(1.18,1,1);rabbit.add(scarf);
const scarfTail=box(rabbit,'#8d9d72',[.2,.99,.43],[.2,.29,.06]);scarfTail.rotation.z=-.24;
const turtle=new THREE.Group();scene.add(turtle);turtle.visible=false;
ball(turtle,'#748c59',[0,.64,0],[.84,.57,.95]);
for(let i=0;i<7;i++){const a=i/6*Math.PI*2;const x=i===6?0:Math.sin(a)*.52,z=i===6?0:Math.cos(a)*.57;ball(turtle,i%2?'#92a468':'#879b60',[x,.94,z],[.29,.17,.31],16);}
for(const x of [-.58,.58])for(const z of [-.5,.48])ball(turtle,'#a6b780',[x,.23,z],[.28,.22,.29]);
ball(turtle,'#b3c28d',[0,.64,1.04],[.36,.36,.42]);
for(const x of [-.19,.19]){ball(turtle,'#333b29',[x,.75,1.373],[.045,.06,.025]);ball(turtle,'#ffffff',[x+.009,.77,1.393],[.012,.015,.009],10);ball(turtle,'#d7b59a',[x*1.3,.59,1.348],[.06,.035,.016]);}
ball(turtle,'#a6b780',[0,.29,-.94],[.13,.12,.32]);
const keys=new Set();let currentModel='rabbit',currentPhoto=null,album=[];let capturing=false;
try {const saved=JSON.parse(localStorage.getItem('wildframe-album')||'[]');if(Array.isArray(saved))album=saved.filter(p=>p&&typeof p.image==='string'&&p.image.startsWith('data:image/jpeg')&&typeof p.score==='number').slice(0,24);}catch{}
$('albumCount').textContent=album.length;
const awards=[
 {title:'温柔的对视',name:'森林肖像家',tag:'01 / PORTRAIT',description:'把目光交给主角，让可爱占满画面。',x:.5,y:.49,size:.69,height:1.45,distance:5.5,target:[0,1.28,0],pos:[.45,1.65,5.8],focal:65},
 {title:'三分之一的诗',name:'构图诗人',tag:'02 / COMPOSITION',description:'让主角落在三分线上，把故事留给花园。',x:.333,y:.49,size:.52,height:2.1,distance:7.5,target:[1.25,1.15,0],pos:[3.3,2.6,7.4],focal:50},
 {title:'小小的，大世界',name:'旷野观察者',tag:'03 / ENVIRONMENT',description:'退后一点，让微小的生命与世界同框。',x:.5,y:.56,size:.29,height:3.4,distance:10,target:[0,1.2,0],pos:[5,4.6,10],focal:35}
];
function setFocal(value){camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(36/(2*value)));camera.updateProjectionMatrix();$('zoom').value=value;$('focalValue').innerHTML=`${value} <small>mm</small>`;$('focalHud').textContent=`${value} mm`;}
function reset(){camera.position.set(4.4,2.85,7.2);controls.target.set(0,1.1,0);setFocal(50);controls.update();}
function render(){renderer.render(scene,camera);}
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();render();}
new ResizeObserver(resize).observe(viewport);
reset();resize();
function makeReferences(){const position=camera.position.clone(),target=controls.target.clone(),focal=Number($('zoom').value),aspect=camera.aspect;renderer.setSize(480,320,false);camera.aspect=1.5;for(const a of awards){camera.position.set(...a.pos);controls.target.set(...a.target);camera.lookAt(controls.target);setFocal(a.focal);render();const measured=metrics();a.x=measured.x;a.y=measured.y;a.size=measured.size;a.height=measured.height;a.image=renderer.domElement.toDataURL('image/jpeg',.82);}camera.position.copy(position);controls.target.copy(target);camera.aspect=aspect;setFocal(focal);controls.update();resize();$('awardCards').replaceChildren(...awards.map((a,i)=>{const b=document.createElement('button');b.className='award-card';b.innerHTML=`<img src="${a.image}" alt="${a.title}参考构图"><div><span class="tag">${a.tag}</span><h3>${a.title} <span>✳</span></h3><p>${a.description}</p></div><span class="award-arrow">↗</span>`;b.onclick=()=>{toast(`挑战：${a.title} · ${a.description}`);document.querySelectorAll('.award-card').forEach(c=>c.style.borderColor='');b.style.borderColor='#6e8759';};return b;}));}
makeReferences();
$('zoom').oninput=e=>setFocal(Number(e.target.value));
$('resetBtn').onclick=()=>{reset();toast('相机已回到初始位置');};
$('gridBtn').onclick=()=>{const enabled=$('grid').hidden;$('grid').hidden=!enabled;$('gridBtn').setAttribute('aria-pressed',String(enabled));};
document.querySelectorAll('.model').forEach(b=>b.onclick=()=>{currentModel=b.dataset.model;rabbit.visible=currentModel==='rabbit';turtle.visible=!rabbit.visible;document.querySelectorAll('.model').forEach(m=>m.classList.toggle('active',m===b));document.querySelector('.panel-heading>span:last-child').textContent=rabbit.visible?'01 / 02':'02 / 02';makeReferences();toast(`模特已切换为${rabbit.visible?'棉棉':'慢慢'}`);});
let toastTimer;function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3200);}
function metrics(){camera.updateMatrixWorld();const model=rabbit.visible?rabbit:turtle;const bounds=new THREE.Box3().setFromObject(model);const points=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));const center=bounds.getCenter(new THREE.Vector3()).project(camera);const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));const visible=center.z>-1&&center.z<1&&maxX>-1&&minX<1&&maxY>-1&&minY<1;const cropped=minX< -1||maxX>1||minY< -1||maxY>1;return{x:(center.x+1)/2,y:(1-center.y)/2,size:(maxY-minY)/2,height:camera.position.y,visible,cropped};}
function evaluate(){const m=metrics();return awards.map(a=>{const composition=Math.max(0,100-Math.hypot(m.x-a.x,m.y-a.y)*170);const framing=Math.max(0,100-Math.abs(m.size-a.size)*160);const angle=Math.max(0,100-Math.abs(m.height-a.height)*17);let score=Math.round(composition*.43+framing*.4+angle*.17);if(m.cropped)score=Math.min(score,50);if(!m.visible)score=0;return{award:awards.indexOf(a),score,details:[Math.round(composition),Math.round(framing),Math.round(angle)],visible:m.visible,cropped:m.cropped};}).sort((a,b)=>b.score-a.score)[0];}
function showPhoto(photo){currentPhoto=photo;const a=awards[photo.award]||awards[0];$('photoImage').src=photo.image;$('photoDate').textContent=new Date(photo.date).toLocaleDateString('zh-CN');$('resultScore').textContent=photo.score;$('resultLevel').textContent=photo.score>=85?'金奖 · 本次解锁称号':photo.score>=70?'银奖 · 本次获得称号':photo.score>=55?'入围 · 本次获得称号':'继续探索，下一个角度会更好';$('resultTitle').textContent=photo.score>=55?a.name:'好奇的观察员';$('resultDescription').textContent=photo.visible?(photo.cropped?'主体有些超出画面了。试着拉远一点，保留完整轮廓。':a.description):'模特离开了画面。重置相机或转动镜头，让主角重新回到取景框里。';$('scoreDetails').textContent=`主体落点 ${photo.details[0]} · 景别匹配 ${photo.details[1]} · 机位高度 ${photo.details[2]}`;$('referenceImage').src=photo.reference||a.image;$('referenceTitle').textContent=a.title;if(!$('photoDialog').open)$('photoDialog').showModal();}
function capture(){if(capturing)return;capturing=true;render();const result=evaluate();const image=renderer.domElement.toDataURL('image/jpeg',.88);const photo={...result,image,reference:awards[result.award].image,date:Date.now(),model:currentModel};album.unshift(photo);album=album.slice(0,24);try{localStorage.setItem('wildframe-album',JSON.stringify(album));}catch{toast('浏览器存储已满，本次照片可直接下载保存。');} $('albumCount').textContent=album.length;$('flash').classList.add('fire');setTimeout(()=>$('flash').classList.remove('fire'),90);setTimeout(()=>{showPhoto(photo);capturing=false;},280);}
$('captureBtn').onclick=capture;
$('downloadBtn').onclick=()=>{if(!currentPhoto)return;const a=document.createElement('a');a.download=`wildframe-${currentPhoto.date}.jpg`;a.href=currentPhoto.image;a.click();};
$('closePhoto').onclick=$('continueBtn').onclick=()=>$('photoDialog').close();
$('guideBtn').onclick=()=>$('guideDialog').showModal();$('closeGuide').onclick=$('startBtn').onclick=()=>$('guideDialog').close();
$('albumNav').onclick=()=>{const grid=$('albumGrid');grid.replaceChildren();if(!album.length){const p=document.createElement('p');p.textContent='影集还空着。去花园里按下第一声快门吧。';p.className='subtitle';grid.append(p);}for(const photo of album){const b=document.createElement('button');b.className='album-item';const img=document.createElement('img');img.src=photo.image;img.alt='花园里的动物摄影作品';const p=document.createElement('p');p.textContent=`${photo.score>=55?(awards[photo.award]?.name||'摄影作品'):'好奇的观察员'} · ${photo.score} 分`;b.append(img,p);b.onclick=()=>{$('albumDialog').close();showPhoto(photo);};grid.append(b);} $('albumDialog').showModal();};
$('closeAlbum').onclick=()=>$('albumDialog').close();$('studioNav').onclick=()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());viewport.scrollIntoView({behavior:'smooth',block:'center'});};
addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||e.target instanceof HTMLInputElement)return;if(['Space','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();if(e.code==='Space'){if(!e.repeat)capture();}else keys.add(e.code);}});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('close',()=>keys.clear());d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(!document.querySelector('dialog[open]')&&keys.size){const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();const right=new THREE.Vector3().crossVectors(forward,camera.up).normalize();const movement=new THREE.Vector3();if(keys.has('KeyW'))movement.add(forward);if(keys.has('KeyS'))movement.sub(forward);if(keys.has('KeyD'))movement.add(right);if(keys.has('KeyA'))movement.sub(right);if(keys.has('ArrowUp'))movement.y+=1;if(keys.has('ArrowDown'))movement.y-=1;movement.multiplyScalar(dt*2.7);const next=camera.position.clone().add(movement);if(next.y>.28&&next.y<12&&Math.hypot(next.x,next.z)<19){camera.position.add(movement);controls.target.add(movement);}}controls.update();render();}
animate();


