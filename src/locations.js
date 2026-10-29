import * as THREE from 'three';
import { block, ellipsoid as oval, column, beam, mesh, pivot } from './scene-kit.js';

export const LOCATION_IDS = ['kyoto', 'paris', 'santorini'];
export const LOCATIONS = {
  kyoto: { title: '京都 · 千本鸟居', subtitle: 'KYOTO / VERMILION PASSAGE', weather: '山间薄雾 · 朱红与墨绿', tip: '沿鸟居中轴线取景，用重复的门框形成引导线。', sky: '#bdc9bb', ground: '#8a9380', sun: '#ffe4bf', light: 2.6, camera: [5.8, 2.8, 10], target: [0, 2, -1] },
  paris: { title: '巴黎 · 铁塔广场', subtitle: 'PARIS / GOLDEN HOUR', weather: '落日金光 · 城市漫步', tip: '向后退，用广角把铁塔与人物一起收入画面。', sky: '#dfcdb7', ground: '#c8b9a1', sun: '#ffcf92', light: 3, camera: [7.4, 4.7, 15], target: [-.5, 5.6, -7], focal: 40 },
  santorini: { title: '圣托里尼 · 蓝顶海岸', subtitle: 'SANTORINI / AEGEAN BLUE', weather: '海风晴空 · 蓝白交响', tip: '把蓝顶放在背景三分线上，借白墙和海面留白。', sky: '#b5d9e3', ground: '#dfdbcd', sun: '#fff3d2', light: 3, camera: [6.3, 3.4, 10], target: [-.8, 2.3, -2], focal: 45 },
};
function tiledGround(parent, base, line, width = 70) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256); ctx.strokeStyle = line; ctx.lineWidth = 2;
  for (let row = 0; row < 8; row++) for (let col = -1; col < 8; col++) {
    const x = col * 40 + row % 2 * 20, y = row * 32;
    ctx.strokeRect(x + 2, y + 2, 37, 29);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(12, 12); texture.anisotropy = 4;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(width, width), new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; parent.add(ground);
}
function tree(parent, x, z, scale = 1, color = '#556d56') {
  column(parent, '#635849', [x, 1.3 * scale, z], .12 * scale, .2 * scale, 2.6 * scale);
  oval(parent, color, [x, 3 * scale, z], [1.3 * scale, 1.7 * scale, 1.25 * scale]);
  oval(parent, '#718465', [x - .4 * scale, 3.8 * scale, z], [.9 * scale, 1.1 * scale, 1.1 * scale]);
}
function lantern(parent, x, z) {
  column(parent, '#646459', [x, .16, z], .35, .45, .32, 4);
  column(parent, '#8a8975', [x, .8, z], .12, .2, 1.3, 6);
  block(parent, '#b9b9a0', [x, 1.5, z], [.5, .5, .5]);
  block(parent, '#e9c58c', [x, 1.5, z + .26], [.25, .32, .015]);
  const cap = column(parent, '#6b7061', [x, 1.88, z], .08, .52, .3, 4); cap.rotation.y = Math.PI / 4;
}
function kyoto(root) {
  tiledGround(root, '#a09e8b', '#8d8e7d');
  block(root, '#aaa796', [0, .025, -9], [4.2, .05, 30]);
  for (let i = 0; i < 10; i++) {
    const z = -3.8 - i * 2.1;
    for (const side of [-1, 1]) {
      column(root, '#b5442c', [side * 2.85, 2.45, z], .14, .19, 4.9);
      column(root, '#32392f', [side * 2.85, .35, z], .205, .22, .7);
    }
    block(root, '#ba472e', [0, 4.4, z], [6.6, .23, .28]);
    block(root, '#b6422d', [0, 5.02, z], [7.05, .3, .42]);
    block(root, '#303b33', [0, 5.22, z], [7.3, .16, .52]);
    for (const side of [-1, 1]) {
      const tip = block(root, '#303b33', [side * 3.7, 5.3, z], [.65, .16, .52]); tip.rotation.z = side * .15;
    }
    block(root, '#ae753e', [0, 4.7, z + .23], [.4, .55, .07]);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 11; i++) tree(root, side * (6 + (i % 3) * 2), -3 - i * 2.7, 1.15 + i % 3 * .18);
    for (const z of [1.2, -5, -11]) lantern(root, side * 4, z);
    for (let i = 0; i < 9; i++) oval(root, '#65745b', [side * (5 + i % 2), .3, -i * 2], [1, .45, .8]);
  }
  // Dark timber tea house; architectural massing rather than copied textures.
  const house = pivot(root, [-7.5, 0, -4]);
  block(house, '#755e48', [0, 1.5, 0], [3.3, 3, 3.4]);
  for (const x of [-1, 0, 1]) { block(house, '#ddc9a6', [x, 1.55, 1.72], [.75, 1.5, .04]); block(house, '#594e3e', [x, 1.55, 1.76], [.035, 1.5, .05]); }
  const roof = mesh(house, new THREE.ConeGeometry(2.8, 1.1, 4), '#48504a', [0, 3.25, 0], [1, 1, 1.15]); roof.rotation.y = Math.PI / 4;
}
function paris(root) {
  tiledGround(root, '#c1b4a0', '#a99e8b');
  const tower = pivot(root, [-1.2, 0, -16]);
  const levels = [[0, 3.6], [4.5, 1.95], [8.8, .95], [15.4, .23], [17.6, .04]];
  for (let tier = 0; tier < levels.length - 1; tier++) {
    const [y0, w0] = levels[tier], [y1, w1] = levels[tier + 1];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      beam(tower, '#786b54', [sx * w0, y0, sz * w0], [sx * w1, y1, sz * w1], tier < 2 ? .13 : .075);
      for (let j = 0; j < 5; j++) {
        const t0 = j / 5, t1 = (j + 1) / 5;
        const ya = y0 + (y1-y0)*t0, yb = y0+(y1-y0)*t1, wa=w0+(w1-w0)*t0, wb=w0+(w1-w0)*t1;
        beam(tower, '#927e61', [sx*wa, ya, -wa], [sx*wb, yb, wb], .025, 5);
        beam(tower, '#927e61', [sx*wa, ya, wa], [sx*wb, yb, -wb], .025, 5);
        beam(tower, '#927e61', [-wa, ya, sz*wa], [wb, yb, sz*wb], .025, 5);
      }
    }
    if (tier < 3) block(tower, '#70634e', [0, y1, 0], [w1*2+.5, .22, w1*2+.5]);
  }
  beam(tower, '#75654d', [0,17.6,0],[0,19,0],.045);
  // A curved arch connects each pair of feet.
  for (const side of [-1,1]) {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-3.5,.5,side*3.5),new THREE.Vector3(0,6,side*2.3),new THREE.Vector3(3.5,.5,side*3.5));
    mesh(tower,new THREE.TubeGeometry(curve,20,.1,6,false),'#87765a',[0,0,0]);
  }
  for (const side of [-1,1]) {
    block(root,'#81916c',[side*7,.06,-7],[4,.12,24]);
    for(let i=0;i<8;i++) tree(root,side*9,-2-i*3, .85,'#667951');
    for(const z of [1,-5,-11]) {
      column(root,'#45554c',[side*4.8,1.8,z],.055,.09,3.6);
      oval(root,'#f0dfad',[side*4.8,3.75,z],[.2,.29,.2]);
      column(root,'#45554c',[side*4.8,4.06,z],0,.26,.23);
    }
  }
  // Low fountain and formal plaza steps in the foreground.
  column(root,'#a89f8c',[-5,.18,2.4],1.3,1.4,.35,40);
  column(root,'#87a9a7',[-5,.37,2.4],1.15,1.15,.04,40);
  column(root,'#b9af98',[-5,.7,2.4],.12,.22,.7);
  for(let i=0;i<3;i++) block(root,'#c9bda6',[0,-.08-i*.08,4+i*.7],[11,.16,.65]);
}
function santorini(root) {
  tiledGround(root,'#dfd8c5','#c6bfac',22);
  block(root,'#b4a78b',[0,-1.1,-2],[22,2.1,18]);
  // Visible sea and horizon beyond the terrace, with a sunlit ribbon.
  block(root,'#539ab6',[0,-1.2,-29],[110,.12,52]);
  for(let i=0;i<24;i++) block(root,i%2?'#6caec3':'#86bdca',[-19+(i*7)%37,-1.13,-8-i*1.7],[2+i%4,.012,.06]);
  for(const side of [-1,1]) for(let i=0;i<3;i++) {
    const x=side*(4.6+i*2),z=-3.5-i*4,h=2.8+i*.45;
    block(root,'#efeadb',[x,h/2,z],[3.4,h,3.2]);
    block(root,'#faf3e2',[x,h+.06,z],[3.6,.18,3.35]);
    for(const wx of [-.75,.75]) { block(root,'#366d8a',[x+wx,1.8,z+1.62],[.6,.85,.04]);block(root,'#f5eddc',[x+wx,1.8,z+1.65],[.04,.85,.04]); }
    block(root,'#456f83',[x,.92,z+1.64],[.65,1.8,.05]);
  }
  // Two blue domes, each on its own white drum.
  for(const [x,z,scale] of [[-5,-6,1],[4.3,-10,1.2]]) {
    block(root,'#eee7d5',[x,1.525*scale,z],[2.6*scale,3.05*scale,2.6*scale]);
    block(root,'#426f87',[x,1.1*scale,z+1.31*scale],[.65*scale,1.8*scale,.035]);
    column(root,'#f3ecda',[x,3.9*scale,z],1*scale,1*scale,1.7*scale,32);
    mesh(root,new THREE.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2),'#367caa',[x,4.75*scale,z],[1.1*scale,.85*scale,1.1*scale]);
    beam(root,'#e9d9b7',[x,5.5*scale,z],[x,5.95*scale,z],.035);
    beam(root,'#e9d9b7',[x-.14,5.8*scale,z],[x+.14,5.8*scale,z],.035);
  }
  for(const side of [-1,1]) { block(root,'#efe8d6',[side*3.1,.45,-3],[.35,.9,5]);block(root,'#faf4e6',[side*3.1,.94,-3],[.44,.12,5.1]); }
  for(let i=0;i<6;i++) block(root,'#eee6d2',[0,-.1-i*.05,-4-i*.45],[5.8,.2,.45]);
  for(const x of [-3.9,3.9]) {
    column(root,'#b78065',[x,.35,1.3],.34,.25,.7);
    for(let i=0;i<8;i++) oval(root,i%2?'#aa5b7f':'#c97f9d',[x+Math.sin(i*2)*.35,.9+i%3*.22,1.3+Math.cos(i*2)*.3],[.23,.21,.2]);
  }
}
export function createLocations(scene) {
  const cache = new Map();
  return {
    select(id) {
      if (!LOCATION_IDS.includes(id)) return false;
      if (!cache.has(id)) { const group = new THREE.Group(); ({kyoto,paris,santorini})[id](group); scene.add(group); cache.set(id,group); }
      for(const [key,group] of cache) group.visible=key===id;
      return LOCATIONS[id];
    },
  };
}
