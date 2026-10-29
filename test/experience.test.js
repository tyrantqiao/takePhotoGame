import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TutorialProgress } from '../src/tutorial.js';
import { audioPreferences } from '../src/audio.js';
import { rankedEntries, photoTitle, bestFrame } from '../src/results.js';

const sample = () => ({ position:[0,2,8],quaternion:[0,0,0,1],fov:40,distance:8,pitch:0 });
test('tutorial requires actual sequential camera actions and a passing uncropped photo', () => {
  const camera=sample(), lesson=new TutorialProgress(camera);
  assert.equal(lesson.observe(camera),false);
  assert.equal(lesson.photo({score:100,visible:true,cropped:false}),false);
  camera.position[0]=.6;assert.equal(lesson.observe(camera),true);assert.equal(lesson.step,1);
  assert.equal(lesson.observe(camera),false);
  camera.quaternion=[0,Math.sin(.2),0,Math.cos(.2)];assert.equal(lesson.observe(camera),true);
  camera.fov=48;assert.equal(lesson.observe(camera),true);
  camera.position[1]=.35;assert.equal(lesson.observe(camera),false);
  camera.pitch=12;assert.equal(lesson.observe(camera),true);
  assert.equal(lesson.photo({score:99,visible:true,cropped:true}),false);
  assert.equal(lesson.photo({score:69,visible:true,cropped:false}),false);
  assert.equal(lesson.photo({score:100,visible:false,cropped:false}),false);
  assert.equal(lesson.photo({score:70,visible:true,cropped:false}),true);
  assert.equal(lesson.photo({score:90,visible:true,cropped:false}),false);
});
test('touch dolly can fulfill zoom and quaternion sign changes do not fake rotation',()=>{
  const camera=sample(), lesson=new TutorialProgress(camera);camera.position[0]=.5;lesson.observe(camera);
  camera.quaternion=[0,0,0,-1];assert.equal(lesson.observe(camera),false);
  camera.quaternion=[0,Math.sin(.2),0,Math.cos(.2)];lesson.observe(camera);
  camera.distance=9;assert.equal(lesson.observe(camera),true);assert.equal(lesson.step,3);
});
test('ranking preserves ties, skips rank positions and does not mutate authoritative entries',()=>{
  const input=[{id:'a',score:70,at:1},{id:'b',score:90,at:3},{id:'c',score:90,at:2}];
  assert.deepEqual(rankedEntries(input).map(e=>[e.id,e.rank]),[['c',1],['b',1],['a',3]]);
  assert.equal(input[0].id,'a');assert.equal(input[0].rank,undefined);assert.deepEqual(rankedEntries([]),[]);
});
test('ceremony title requires every frame perfect; representative image is a real submitted frame',()=>{
  assert.equal(photoTitle({perfect:3,score:88},4),'金镜摄影师');
  assert.equal(photoTitle({perfect:4,score:88},4),'完美组照大师');
  const photos=[null,{score:60,image:'a'},{score:95,image:'b'},{score:100}];
  assert.equal(bestFrame({photos}).image,'b');assert.equal(bestFrame({photos:[]}),null);
});
test('audio settings reject malformed storage values and clamp volumes',()=>{
  assert.deepEqual(audioPreferences(null),{muted:false,ambient:.28,effects:.65});
  assert.deepEqual(audioPreferences({muted:true,ambient:2,effects:-1}),{muted:true,ambient:1,effects:0});
  assert.deepEqual(audioPreferences({muted:'false',ambient:NaN,effects:'1'}),{muted:false,ambient:.28,effects:.65});
});
