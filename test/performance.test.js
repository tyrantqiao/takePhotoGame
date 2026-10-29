import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createModels, poseCharacter } from '../src/characters.js';
import { RoomAuthority } from '../src/room-state.js';
import { motionTime } from '../src/performance.js';

const base={x:0,z:0,yaw:.2,pose:'lean',expression:'neutral',motion:'still'};
test('each animal has visible expression changes and restores neutral eyes, ears and mouth',()=>{
  for(const model of Object.values(createModels(new THREE.Scene()))){
    const face=model.userData.face;poseCharacter(model,base);
    poseCharacter(model,{...base,expression:'wink'});assert.equal(face.smile.visible,true);assert.ok(face.eyes[0].object.scale.y<.2);assert.equal(face.mouth.visible,false);
    poseCharacter(model,{...base,expression:'surprise'});assert.equal(face.open.visible,true);assert.ok(face.eyes[0].object.scale.y>1);
    poseCharacter(model,base);assert.equal(face.open.visible,false);assert.equal(face.smile.visible,false);assert.equal(face.mouth.visible,true);assert.equal(face.eyes[0].object.scale.y,1);
  }
});
test('animation is deterministic at shutter time, changes bounds and restores all joints',()=>{
  const models=createModels(new THREE.Scene());
  for(const model of Object.values(models)){
    const pose={...base,expression:'joy',motion:'hop'};
    poseCharacter(model,pose,.3);const before=new THREE.Box3().setFromObject(model);
    assert.ok(model.position.y>.4);
    poseCharacter(model,{...pose,motion:'dance'},1.7);poseCharacter(model,pose,.3);
    const after=new THREE.Box3().setFromObject(model);assert.ok(before.min.distanceTo(after.min)<1e-10);assert.ok(before.max.distanceTo(after.max)<1e-10);
    poseCharacter(model,base);assert.equal(model.position.y,0);assert.equal(model.rotation.y,base.yaw);assert.equal(model.userData.parts.head.rotation.x,0);
  }
});
function room(){let now=10000,judged;const authority=new RoomAuthority('host','模特',(shot,pose)=>{judged=pose;return 88;},()=>now);authority.join('guest','摄影师');return {authority,advance:ms=>now+=ms,get now(){return now;},get judged(){return judged;}};}
test('only model controls valid performances; snapshots preserve expression and motion',()=>{
  const {authority:a}=room();assert.ok(a.command('guest',{type:'performance',expression:'joy'}));
  assert.ok(a.command('host',{type:'performance',expression:'joy',motion:'invalid'}));assert.equal(a.state.model.expression,'neutral');
  assert.ok(a.command('host',{type:'performance',motion:['wave']}));
  assert.equal(a.command('host',{type:'performance',expression:'joy',motion:'wave'}),null);
  assert.equal(a.snapshot().model.expression,'joy');assert.equal(a.snapshot().model.motion,'wave');
});
test('freezing and unfreezing preserve the exact animation phase across long waits',()=>{
  const r=room(),a=r.authority;a.command('host',{type:'performance',motion:'dance'});r.advance(1200);
  a.command('host',{type:'performance',frozen:true});assert.equal(motionTime(a.state.model,r.now),1.2);r.advance(9000);assert.equal(motionTime(a.state.model,r.now),1.2);
  a.command('host',{type:'performance',frozen:false});assert.equal(motionTime(a.state.model,r.now),1.2);r.advance(500);assert.equal(motionTime(a.state.model,r.now),1.7);
});
test('round pause preserves animation phase and blocks expression changes',()=>{
  const r=room(),a=r.authority;a.command('host',{type:'performance',motion:'hop'});a.command('host',{type:'start',duration:30,challenge:0});r.advance(700);
  a.command('host',{type:'pause',paused:true});assert.ok(a.command('host',{type:'performance',expression:'joy'}));r.advance(60000);
  a.command('host',{type:'pause',paused:false});assert.equal(motionTime(a.state.model,r.now),.7);
});
test('host judges the captured instant and rejects missing, forged, stale and frozen phase claims',()=>{
  const r=room(),a=r.authority;a.command('host',{type:'performance',motion:'hop',expression:'joy'});a.command('host',{type:'start',duration:30,challenge:0});r.advance(1000);
  const photo=animationTime=>({type:'photo',roundId:1,seq:a.state.model.seq,animationTime,taskIndex:0,image:'data:image/jpeg;base64,/9j/AA==',camera:{position:[0,1,5],quaternion:[0,0,0,1],fov:40}});
  for(const time of [undefined,NaN,-1,50])assert.ok(a.command('guest',photo(time)));
  assert.equal(a.command('guest',photo(.9)),null);assert.equal(r.judged.animationTime,.9);assert.equal(r.judged.expression,'joy');
  r.advance(2000);assert.ok(a.command('guest',photo(.9)));
  a.command('host',{type:'performance',frozen:true});r.advance(2000);assert.ok(a.command('guest',photo(0)));
  assert.equal(a.command('guest',photo(3)),null);
});
