import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameFlow } from '../src/game-flow.js';
import { RoomAuthority } from '../src/room-state.js';

test('game input is gated by start, pause, resume and return-to-title states',()=>{
 const flow=new GameFlow();assert.equal(flow.canOperate,false);flow.pause();assert.equal(flow.phase,'title');
 flow.play();assert.equal(flow.canOperate,true);flow.pause();assert.equal(flow.canOperate,false);
 flow.resume();assert.equal(flow.canOperate,true);flow.menu();assert.equal(flow.canOperate,false);
 flow.resume();assert.equal(flow.phase,'title');
});
test('only host can pause a round; the deadline resumes from saved remaining time',()=>{
 let now=1000;const room=new RoomAuthority('host','Host',()=>90,()=>now);room.join('guest','Guest');
 room.command('host',{type:'start',duration:30,challenge:0,count:1});now+=10000;
 assert.ok(room.command('guest',{type:'pause',paused:true}));
 assert.equal(room.command('host',{type:'pause',paused:true}),null);assert.equal(room.state.round.remainingMs,20000);
 now+=60000;assert.equal(room.tick(),false);assert.equal(room.state.round.phase,'shooting');
 assert.ok(room.command('host',{type:'move',dx:.1,dz:0,turn:0}));
 assert.ok(room.command('host',{type:'task',index:0}));
 assert.ok(room.command('guest',{type:'photo',roundId:1,seq:0,image:'data:image/jpeg;base64,/9j/AA==',camera:{position:[0,1,5],quaternion:[0,0,0,1],fov:40}}));
 assert.equal(room.command('host',{type:'pause',paused:false}),null);
 assert.equal(room.state.round.endsAt,now+20000);now+=19999;assert.equal(room.tick(),false);now++;assert.equal(room.tick(),true);
});
test('ending a paused round clears pause state instead of leaving guests stuck',()=>{
 const room=new RoomAuthority('host','Host',()=>90);room.join('guest','Guest');room.command('host',{type:'start',duration:30,challenge:0,count:1});
 room.command('host',{type:'pause',paused:true});room.command('host',{type:'end'});
 assert.equal(room.state.round.paused,false);assert.equal(room.state.round.phase,'results');
});

test('model leaving a paused round releases the pause for remaining players',()=>{
 const room=new RoomAuthority('host','Host',()=>90);room.join('guest','Guest');
 room.command('host',{type:'role',id:'guest'});
 room.command('host',{type:'start',duration:30,challenge:0,count:1});
 room.command('host',{type:'pause',paused:true});room.leave('guest');
 assert.equal(room.state.round.phase,'results');assert.equal(room.state.round.paused,false);
});
