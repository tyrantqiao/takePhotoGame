import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RoomAuthority } from '../src/room-state.js';
import { MISSIONS, modelReadiness, scoreMission } from '../src/missions.js';
import { clampAboveGround } from '../src/camera-rig.js';

test('low camera can look upward while staying above the floor',()=>{
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,-2,5);const target=new THREE.Vector3(0,2,0);camera.lookAt(target);
 clampAboveGround(camera,target);const direction=new THREE.Vector3();camera.getWorldDirection(direction);
 assert.equal(camera.position.y,.15);assert.ok(direction.y>0);
});
test('perfect mission requires both camera composition and model cooperation',()=>{
 const mission=MISSIONS[0],pose={...mission};const metrics={...mission.frame,visible:true,cropped:false};
 assert.equal(modelReadiness(pose,mission).ready,true);
 assert.equal(scoreMission(metrics,pose,mission,mission.frame.pitch).score,100);
 assert.ok(scoreMission(metrics,{...pose,pose:'stand'},mission,mission.frame.pitch).score<=54);
 assert.ok(scoreMission(metrics,{...pose,x:3},mission,mission.frame.pitch).score<=54);
 assert.equal(scoreMission({...metrics,visible:false},pose,mission,0).score,0);
 assert.ok(scoreMission(metrics,pose,mission,-25).score<100);
});
test('nine frames use nine slots; duplicates cannot fill other slots and missing photos count zero',()=>{
 let now=10000;const a=new RoomAuthority('host','Model',()=>90,()=>now);a.join('guest','Camera');
 a.command('host',{type:'start',duration:180,challenge:0,count:9});
 const photo=()=>({type:'photo',roundId:a.state.round.id,seq:a.state.model.seq,taskIndex:a.state.round.activeTask,image:'data:image/jpeg;base64,/9j/AA==',camera:{position:[0,1,5],quaternion:[0,0,0,1],fov:40}});
 a.command('guest',photo());now+=600;a.command('guest',photo());
 assert.equal(a.state.entries[0].completed,1);assert.equal(a.state.entries[0].score,10);
 assert.equal(a.snapshot().entries[0].photos[0].image,undefined);
 assert.ok(a.command('guest',{type:'task',index:1}));
 for(let i=1;i<9;i++){now+=600;assert.equal(a.command('host',{type:'task',index:i}),null);assert.equal(a.command('guest',photo()),null);}
 assert.equal(a.state.entries[0].score,90);assert.equal(a.state.entries[0].completed,9);assert.equal(a.state.entries[0].perfect,9);
 assert.ok(a.command('guest',{type:'end'}));assert.equal(a.command('host',{type:'end'}),null);
 assert.ok(a.snapshot().entries[0].photos.every(p=>p.image));
});
test('task attribution uses the historical pose and rejects forged slot indices',()=>{
 let now=10000;const a=new RoomAuthority('host','Model',()=>80,()=>now);a.join('guest','Camera');
 a.command('host',{type:'start',duration:90,challenge:0,count:4});const seq=a.state.model.seq;
 a.command('host',{type:'task',index:1});
 const shot={type:'photo',roundId:1,seq,taskIndex:1,image:'data:image/jpeg;base64,/9j/AA==',camera:{position:[0,1,5],quaternion:[0,0,0,1],fov:40}};
 assert.ok(a.command('guest',shot));now+=600;assert.equal(a.command('guest',{...shot,taskIndex:0}),null);
 assert.equal(a.state.entries[0].photos[0].score,80);assert.equal(a.state.entries[0].photos[1],null);
 assert.ok(a.command('host',{type:'task',index:4}));
});
