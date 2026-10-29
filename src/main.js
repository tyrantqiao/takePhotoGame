import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createParty } from './party-ui.js';
import { createModels, poseCharacter } from './characters.js';
import { createLocations, LOCATIONS } from './locations.js';
import { missionAt, scoreMission } from './missions.js';
import { referenceById } from './references.js';
import { setupReferences } from './reference-ui.js';
import { clampAboveGround } from './camera-rig.js';

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
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI * .88;
controls.minPolarAngle = .15;
controls.target.set(0, 1.1, 0);
const hemi = new THREE.HemisphereLight('#fff4d6', '#a4ae77', 2.4); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0cc', 4.2); sun.position.set(-4, 9, 5); sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12; sun.shadow.normalBias=.035;scene.add(sun);
const locations = createLocations(scene);
const { rabbit, turtle } = createModels(scene);
let currentLocation = '';
for (const model of [rabbit, turtle]) poseCharacter(model, {x:0,z:0,yaw:0,pose:'stand'});
let party;
let practiceTask = null;
const taskMarker = new THREE.Group();
const ring = new THREE.Mesh(new THREE.RingGeometry(.42,.48,48),new THREE.MeshBasicMaterial({color:0xc09b54,side:THREE.DoubleSide,depthWrite:false}));
ring.rotation.x=-Math.PI/2;ring.position.y=.025;taskMarker.add(ring);
const arrow = new THREE.Mesh(new THREE.ConeGeometry(.13,.35,3),new THREE.MeshBasicMaterial({color:0xc09b54}));arrow.rotation.x=Math.PI/2;arrow.position.set(0,.04,.6);taskMarker.add(arrow);taskMarker.visible=false;scene.add(taskMarker);
function showTaskMarker(task){taskMarker.visible=!!task;if(task){taskMarker.position.set(task.x,0,task.z);taskMarker.rotation.y=task.yaw;}}
const keys=new Set();let currentModel='rabbit',currentPhoto=null,album=[];let capturing=false;
try {const saved=JSON.parse(localStorage.getItem('wildframe-album')||'[]');if(Array.isArray(saved))album=saved.filter(p=>p&&typeof p.image==='string'&&p.image.startsWith('data:image/jpeg')&&typeof p.score==='number').slice(0,24);}catch{}
$('albumCount').textContent=album.length;
const awards=[
 {title:'温柔的对视',name:'都市肖像家',tag:'01 / PORTRAIT',description:'把目光交给主角，让目光成为画面的中心。',x:.5,y:.49,size:.69,height:1.45,distance:5.5,target:[0,1.95,0],pos:[.45,2.35,9.2],focal:55},
 {title:'三分之一的诗',name:'构图诗人',tag:'02 / COMPOSITION',description:'让主角落在三分线上，把故事留给街景。',x:.333,y:.49,size:.52,height:2.1,distance:7.5,target:[1.65,1.9,0],pos:[3.3,3.1,10.6],focal:50},
 {title:'小小的，大世界',name:'旷野观察者',tag:'03 / ENVIRONMENT',description:'退后一点，让微小的生命与世界同框。',x:.5,y:.56,size:.29,height:3.4,distance:10,target:[0,2.1,-2],pos:[6,4.8,14],focal:35}
];
function setFocal(value){camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(36/(2*value)));camera.updateProjectionMatrix();$('zoom').value=value;$('focalValue').innerHTML=`${value} <small>mm</small>`;$('focalHud').textContent=`${value} mm`;}
function reset(){const location=LOCATIONS[currentLocation] || LOCATIONS.kyoto;camera.position.set(...location.camera);controls.target.set(...location.target);setFocal(location.focal || 50);controls.update();}
function selectLocation(id, refresh = true) {
  if (id === currentLocation) return;
  const config = locations.select(id); if (!config) return;
  currentLocation = id;
  scene.background = new THREE.Color(config.sky); scene.fog = new THREE.Fog(config.sky, 25, 65);
  sun.color.set(config.sun); sun.intensity = config.light;
  hemi.intensity = id === 'kyoto' ? 1.65 : 2.1;
  document.querySelector('.scene-top b').textContent = config.title;
  document.querySelector('.scene-footer>span').textContent = config.weather;
  document.querySelector('.session').innerHTML = '<span class="live-dot"></span> 地标摄影漫游 <small>' + config.subtitle + '</small>';
  $('locationTip').textContent = config.tip;
  document.querySelectorAll('[data-location]').forEach(button => {const selected=button.dataset.location===id;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
  if (refresh) { reset(); makeReferences(); }
}
function render(){renderer.render(scene,camera);}
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();render();}
new ResizeObserver(resize).observe(viewport);
selectLocation('kyoto',false);reset();resize();
function makeReferences() {
  const markerWasVisible=taskMarker.visible;taskMarker.visible=false;
  const model = rabbit.visible ? rabbit : turtle, savedPose = {...model.userData.pose};
  const position=camera.position.clone(), quaternion=camera.quaternion.clone(), target=controls.target.clone(), focal=Number($('zoom').value), aspect=camera.aspect;
  poseCharacter(model,{x:0,z:0,yaw:0,pose:'stand'});
  renderer.setSize(480,320,false); camera.aspect=1.5;
  for(const award of awards){camera.position.set(...award.pos);controls.target.set(...award.target);camera.lookAt(controls.target);setFocal(award.focal);render();const measured=metrics();Object.assign(award,{x:measured.x,y:measured.y,size:measured.size,height:measured.height});award.image=renderer.domElement.toDataURL('image/jpeg',.82);}
  poseCharacter(model,savedPose);taskMarker.visible=markerWasVisible;
  camera.position.copy(position); camera.quaternion.copy(quaternion); controls.target.copy(target); camera.aspect=aspect;setFocal(focal);resize();
  $('awardCards').replaceChildren(...awards.map(award=>{
    const button=document.createElement('button');button.className='award-card';
    button.innerHTML='<img src="'+award.image+'" alt="'+award.title+'参考构图"><div><span class="tag">'+award.tag+'</span><h3>'+award.title+' ✳</h3><p>'+award.description+'</p></div><span class="award-arrow">↗</span>';
    button.onclick=()=>{toast('挑战：'+award.title+' · '+award.description);document.querySelectorAll('.award-card').forEach(c=>c.style.borderColor='');button.style.borderColor='#6e8759';};
    return button;
  }));
}

makeReferences();
document.querySelectorAll('[data-location]').forEach(button => button.onclick = () => {
  if (party?.active) party.send({type:'location',location:button.dataset.location});
  else selectLocation(button.dataset.location);
});
$('soloPose').onchange=()=>{for(const model of [rabbit,turtle])poseCharacter(model,{...model.userData.pose,pose:$('soloPose').value});};
$('lowAngleBtn').onclick=()=>{const model=rabbit.visible?rabbit:turtle;const offset=camera.position.clone().sub(model.position);offset.y=0;if(offset.length()<.1)offset.set(0,0,1);offset.normalize().multiplyScalar(5.7);camera.position.set(model.position.x+offset.x,.35,model.position.z+offset.z);controls.target.set(model.position.x,1.9,model.position.z);setFocal(35);controls.update();toast('低机位已就绪，拖动画面可继续向上仰拍');};
$('cameraHeight').oninput=e=>{camera.position.y=Number(e.target.value);controls.update();clampAboveGround(camera,controls.target);};
setupReferences({onPractice(index){if(party?.active){toast('联机中请按本轮镜头清单拍摄');return;}practiceTask=index;const task=missionAt(index);showTaskMarker(task);for(const model of [rabbit,turtle])poseCharacter(model,{...model.userData.pose,x:task.x,z:task.z,yaw:task.yaw,pose:task.pose});$('soloPose').value=task.pose;$('practiceHint').textContent='练习：'+task.title+' · '+task.hint;$('practiceHint').hidden=false;viewport.scrollIntoView({behavior:'smooth',block:'center'});}});
$('zoom').oninput=e=>setFocal(Number(e.target.value));
$('resetBtn').onclick=()=>{reset();toast('相机已回到初始位置');};
$('gridBtn').onclick=()=>{const enabled=$('grid').hidden;$('grid').hidden=!enabled;$('gridBtn').setAttribute('aria-pressed',String(enabled));};
function selectAnimal(animal) {
  const changed = currentModel !== animal;
  currentModel = animal;
  rabbit.visible = animal === 'rabbit'; turtle.visible = !rabbit.visible;
  document.querySelectorAll('.model').forEach(b => b.classList.toggle('active', b.dataset.model === animal));
  document.querySelector('.panel-heading>span:last-child').textContent = rabbit.visible ? '01 / 02' : '02 / 02';
  if (changed) makeReferences();
}
document.querySelectorAll('.model').forEach(b => b.onclick = () => {
  if (party?.active) party.send({ type: 'animal', animal: b.dataset.model });
  else { selectAnimal(b.dataset.model); toast(`模特已切换为${rabbit.visible ? '棉棉' : '慢慢'}`); }
});
let toastTimer;function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3200);}
function metrics(){camera.updateMatrixWorld();const model=rabbit.visible?rabbit:turtle;const bounds=new THREE.Box3().setFromObject(model);const points=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));const center=bounds.getCenter(new THREE.Vector3()).project(camera);const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));const visible=center.z>-1&&center.z<1&&maxX>-1&&minX<1&&maxY>-1&&minY<1;const cropped=minX< -1||maxX>1||minY< -1||maxY>1;return{x:(center.x+1)/2,y:(1-center.y)/2,size:(maxY-minY)/2,height:camera.position.y,visible,cropped};}
function scoreMetrics(m, a) {
  const composition = Math.max(0, 100 - Math.hypot(m.x - a.x, m.y - a.y) * 170);
  const framing = Math.max(0, 100 - Math.abs(m.size - a.size) * 160);
  const angle = Math.max(0, 100 - Math.abs(m.height - a.height) * 17);
  let score = Math.round(composition * .43 + framing * .4 + angle * .17);
  if (m.cropped) score = Math.min(score, 50);
  if (!m.visible) score = 0;
  return { award: awards.indexOf(a), score, details: [Math.round(composition), Math.round(framing), Math.round(angle)], visible: m.visible, cropped: m.cropped };
}
function evaluate(challenge) {
  const m = metrics();
  if (challenge !== undefined) return scoreMetrics(m, awards[challenge]);
  return awards.map(a => scoreMetrics(m, a)).sort((a, b) => b.score - a.score)[0];
}
function applyPose(model, pose) { poseCharacter(model, pose); }

function scoreRemoteShot(shot, pose, challenge, mission) {
  const position = camera.position.clone(), quaternion = camera.quaternion.clone(), aspect = camera.aspect, fov = camera.fov;
  const model = pose.animal === 'rabbit' ? rabbit : turtle;
  const savedPose = {...model.userData.pose};
  try {
    camera.position.fromArray(shot.position); camera.quaternion.fromArray(shot.quaternion);
    camera.aspect = 1.5; camera.fov = shot.fov; camera.updateProjectionMatrix();
    applyPose(model, pose);
    if(mission){const direction=new THREE.Vector3();camera.getWorldDirection(direction);return scoreMission(metrics(),pose,mission,THREE.MathUtils.radToDeg(Math.asin(direction.y))).score;}
    return evaluate(challenge).score;
  } finally {
    camera.position.copy(position); camera.quaternion.copy(quaternion); camera.aspect = aspect; camera.fov = fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    poseCharacter(model, savedPose);
  }
}
function showPhoto(photo){currentPhoto=photo;const a=awards[photo.award]||awards[0];$('photoImage').src=photo.image;$('photoDate').textContent=new Date(photo.date).toLocaleDateString('zh-CN');$('resultScore').textContent=photo.score;$('resultLevel').textContent=photo.score>=85?'金奖 · 本次解锁称号':photo.score>=70?'银奖 · 本次获得称号':photo.score>=55?'入围 · 本次获得称号':'继续探索，下一个角度会更好';$('resultTitle').textContent=photo.missionTitle|| (photo.score>=55?a.name:'好奇的观察员');$('resultDescription').textContent=photo.visible?(photo.cropped?'主体有些超出画面了。试着拉远一点，保留完整轮廓。':a.description):'模特离开了画面。重置相机或转动镜头，让主角重新回到取景框里。';$('scoreDetails').textContent=`主体落点 ${photo.details[0]} · 景别匹配 ${photo.details[1]} · 机位高度 ${photo.details[2]}`+(photo.cooperation?` · 站位 ${photo.cooperation[0]} · 摆姿 ${photo.cooperation[1]} · 朝向 ${photo.cooperation[2]}`:'');if(photo.missionTitle)$('resultDescription').textContent=photo.ready?'模特已配合就位。继续调整主体落点、景别和仰俯角，85 分即可达标。':'模特尚未满足本镜头的站位、摆姿或朝向，本张最高 54 分；裁切或出框会进一步扣分。';$('referenceImage').src=photo.reference||a.image;$('referenceTitle').textContent=photo.referenceTitle||a.title;if(!$('photoDialog').open)$('photoDialog').showModal();}
function capture() {
  if (capturing) return;
  if (party?.active && (party.isModel || party.state.round.phase !== 'shooting')) { toast(party.isModel ? '你是模特，摆好姿势让朋友来拍吧' : '等待房主开始本轮摄影赛'); return; }
  capturing = true;
  const inRound = party?.active;
  const roundId = inRound ? party.state.round.id : null;
  const aspect = camera.aspect;
  const pixelRatio = renderer.getPixelRatio();
  // Every contestant gets the same 3:2 sensor, regardless of screen dimensions.
  if (inRound) { renderer.setPixelRatio(1); renderer.setSize(600,400,false); camera.aspect=1.5; camera.updateProjectionMatrix(); }
  const markerVisible=taskMarker.visible; taskMarker.visible=false; render();
  const taskIndex=inRound?party.state.round.activeTask:practiceTask;
  const mission=taskIndex===null?null:missionAt(taskIndex);
  const direction=new THREE.Vector3();camera.getWorldDirection(direction);
  const model=rabbit.visible?rabbit:turtle;
  const result=mission?{...scoreMission(metrics(),model.userData.pose,mission,THREE.MathUtils.radToDeg(Math.asin(direction.y))),award:0}:evaluate();
  const image = renderer.domElement.toDataURL('image/jpeg', inRound ? .65 : .88);
  const shot = { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov };
  if (inRound) {
    party.send({ type: 'photo', roundId: party.state.round.id, seq: party.state.model.seq, camera: shot, image, taskIndex });
    camera.aspect=aspect; camera.updateProjectionMatrix(); renderer.setPixelRatio(pixelRatio); resize();
    toast('已提交镜头 '+(taskIndex+1)+'，同一格保留最高分');
  }
  taskMarker.visible=markerVisible;
  const reference=mission?referenceById(mission.reference):null;
  const photo = {...result,image,reference:reference?.image||awards[result.award].image,referenceTitle:reference?.image?reference.title:mission?mission.title+' · 游戏构图示意':undefined,missionTitle:mission?.title,date:Date.now(),model:currentModel,location:currentLocation};
  album.unshift(photo); album=album.slice(0,24);
  try { localStorage.setItem('wildframe-album',JSON.stringify(album)); } catch { toast('浏览器存储已满，本次照片可直接下载保存。'); }
  $('albumCount').textContent=album.length;
  $('flash').classList.add('fire'); setTimeout(()=>$('flash').classList.remove('fire'),90);
  setTimeout(() => {
    const sameRound = party?.active && party.state.round.id === roundId && party.state.round.phase === 'shooting';
    if (inRound ? sameRound : !party?.active) showPhoto(photo);
    capturing = false;
  }, 280);
}
$('captureBtn').onclick=capture;
$('downloadBtn').onclick=()=>{if(!currentPhoto)return;const a=document.createElement('a');a.download=`wildframe-${currentPhoto.date}.jpg`;a.href=currentPhoto.image;a.click();};
$('closePhoto').onclick=$('continueBtn').onclick=()=>$('photoDialog').close();
$('guideBtn').onclick=()=>$('guideDialog').showModal();$('closeGuide').onclick=$('startBtn').onclick=()=>$('guideDialog').close();
$('albumNav').onclick=()=>{const grid=$('albumGrid');grid.replaceChildren();if(!album.length){const p=document.createElement('p');p.textContent='影集还空着。去花园里按下第一声快门吧。';p.className='subtitle';grid.append(p);}for(const photo of album){const b=document.createElement('button');b.className='album-item';const img=document.createElement('img');img.src=photo.image;img.alt='花园里的动物摄影作品';const p=document.createElement('p');p.textContent=`${photo.score>=55?(awards[photo.award]?.name||'摄影作品'):'好奇的观察员'} · ${photo.score} 分`;b.append(img,p);b.onclick=()=>{$('albumDialog').close();showPhoto(photo);};grid.append(b);} $('albumDialog').showModal();};
$('closeAlbum').onclick=()=>$('albumDialog').close();$('studioNav').onclick=()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());viewport.scrollIntoView({behavior:'smooth',block:'center'});};
addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)return;if(['Space','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE'].includes(e.code)){e.preventDefault();if(e.code==='Space'){if(!e.repeat)capture();}else keys.add(e.code);}});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('close',()=>keys.clear());d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
party = createParty({
  scoreShot: scoreRemoteShot,
  applyLocation: id => selectLocation(id),
  getLocation: () => currentLocation,
  applyMission: task => { practiceTask=null; showTaskMarker(task);$('practiceHint').hidden=true; },
  applyModel(pose) { selectAnimal(pose.animal); applyPose(rabbit, pose); applyPose(turtle, pose); },
  toast,
  clearKeys: () => keys.clear(),
});
const clock = new THREE.Clock();
let moveElapsed = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .05);
  moveElapsed += dt;
  if (!document.querySelector('dialog[open]') && keys.size) {
    if (party.active && party.isModel) {
      if (moveElapsed >= .09) {
        const dx = (Number(keys.has('KeyD')) - Number(keys.has('KeyA'))) * .14;
        const dz = (Number(keys.has('KeyS')) - Number(keys.has('KeyW'))) * .14;
        const turn = (Number(keys.has('KeyE')) - Number(keys.has('KeyQ'))) * .14;
        if (dx || dz || turn) party.send({ type: 'move', dx, dz, turn });
        moveElapsed = 0;
      }
    } else {
      const forward = new THREE.Vector3(); camera.getWorldDirection(forward); forward.y=0; forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward,camera.up).normalize();
      const movement = new THREE.Vector3();
      if(keys.has('KeyW'))movement.add(forward); if(keys.has('KeyS'))movement.sub(forward);
      if(keys.has('KeyD'))movement.add(right); if(keys.has('KeyA'))movement.sub(right);
      if(keys.has('ArrowUp'))movement.y+=1; if(keys.has('ArrowDown'))movement.y-=1;
      movement.multiplyScalar(dt*2.7);
      const next=camera.position.clone().add(movement);
      if(next.y>=.15&&next.y<12&&Math.hypot(next.x,next.z)<19){camera.position.add(movement);controls.target.add(movement);}
    }
  }
  controls.update();clampAboveGround(camera,controls.target);
  const height=camera.position.y.toFixed(2);if($('cameraHeightValue').textContent!==height+' m'){$('cameraHeightValue').textContent=height+' m';$('cameraHeight').value=height;}
  render();
}
animate();


