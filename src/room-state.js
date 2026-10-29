import { missionAt } from './missions.js';
import { EXPRESSIONS, MOTIONS, motionTime, validShotTime } from './performance.js';
export const MAX_PLAYERS = 8;
const LOCATION_IDS = ['kyoto', 'paris', 'santorini'];
export const cleanName = value => typeof value === 'string' ? value.trim().slice(0, 16) || '摄影师' : '摄影师';
export const validImage = image => typeof image === 'string' && image.length < 80000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image);
export function validCamera(shot) {
  return shot && Array.isArray(shot.position) && shot.position.length === 3 &&
    shot.position.every(n => Number.isFinite(n) && Math.abs(n) <= 40) &&
    Array.isArray(shot.quaternion) && shot.quaternion.length === 4 &&
    shot.quaternion.every(n => Number.isFinite(n) && Math.abs(n) <= 1) &&
    Math.abs(Math.hypot(...shot.quaternion) - 1) < .01 &&
    Number.isFinite(shot.fov) && shot.fov >= 20 && shot.fov <= 80;
}

// The browser host owns roles, the clock, pose history, and score calculation.
export class RoomAuthority {
  constructor(hostId, name, scoreShot, now = Date.now) {
    this.now = now;
    this.scoreShot = scoreShot;
    this.state = {
      version: 5, hostId, modelId: hostId, location: 'kyoto',
      players: [{ id: hostId, name: cleanName(name) }],
      model: { animal: 'rabbit', x: 0, z: 0, yaw: 0, pose: 'stand', seq: 0, expression:'neutral',motion:'still',motionEpoch:this.now(),frozen:false,heldTime:0 },
      round: { id: 0, phase: 'lobby', endsAt: 0, challenge: 0, count:1, activeTask:0 }, entries: [],
    };
    this.history = new Map();
    this.lastInput = new Map();
    this.lastPhoto = new Map();
    this.record();
  }
  record() {
    this.history.set(this.state.model.seq, { ...this.state.model, taskIndex:this.state.round.activeTask, at: this.now() });
    for (const [seq, pose] of this.history) if (this.now() - pose.at > 5000) this.history.delete(seq);
  }
  join(id, name) {
    if (this.state.players.some(p => p.id === id)) return false;
    if (this.state.players.length >= MAX_PLAYERS) return false;
    this.state.players.push({ id, name: cleanName(name) });
    return true;
  }
  leave(id) {
    this.state.players = this.state.players.filter(p => p.id !== id);
    if (this.state.modelId === id) {
      this.resumeMotionClock();
      this.state.modelId = this.state.hostId;
      this.state.round.phase = 'results'; // Stop rather than silently changing model mid-round.
      this.state.round.paused = false;
    }
  }
  resumeMotionClock() {
    if(this.state.round.paused){this.state.model.motionEpoch+=this.now()-this.state.round.pauseAt;this.state.model.seq++;this.record();}
  }
  tick() {
    if (this.state.round.phase === 'shooting' && !this.state.round.paused && this.now() >= this.state.round.endsAt) {
      this.state.round.phase = 'results'; return true;
    }
    return false;
  }
  command(id, message) {
    this.tick();
    if (!message || typeof message !== 'object' || !this.state.players.some(p => p.id === id)) return '无效玩家';
    const { state } = this;
    if(message.type==='pause'){
      if(id!==state.hostId||state.round.phase!=='shooting'||typeof message.paused!=='boolean')return '只有房主可以暂停或继续对局';
      if(message.paused&&!state.round.paused){state.round.remainingMs=Math.max(0,state.round.endsAt-this.now());state.round.pauseAt=this.now();state.round.paused=true;}
      else if(!message.paused&&state.round.paused){this.resumeMotionClock();state.round.endsAt=this.now()+state.round.remainingMs;state.round.paused=false;}
      return null;
    }
    if(state.round.paused&&['move','photo','task','performance'].includes(message.type))return '对局已暂停，请等待房主继续';
    if (message.type === 'end') {
      if(id!==state.hostId || state.round.phase!=='shooting')return '只有房主可以结束拍摄';
      this.resumeMotionClock();state.round.phase='results';state.round.paused=false;return null;
    }
    if (message.type === 'task') {
      if(id!==state.modelId || state.round.phase!=='shooting')return '拍摄中的模特才能切换任务';
      if(!Number.isInteger(message.index)||message.index<0||message.index>=state.round.count)return '无效镜头';
      state.round.activeTask=message.index;state.model.seq++;this.record();return null;
    }
    if (message.type === 'location') {
      if (id !== state.hostId || state.round.phase === 'shooting') return '地图只能由房主在开拍前切换';
      if (!LOCATION_IDS.includes(message.location)) return '无效地图';
      state.location = message.location;
      state.model = { ...state.model, x: 0, z: 0, seq: state.model.seq + 1 };
      this.history.clear(); this.record(); return null;
    }
    if (message.type === 'start') {
      if (id !== state.hostId || state.round.phase === 'shooting') return '只有房主可以开始新一轮';
      if (state.players.length < 2) return '至少需要一位模特和一位摄影师';
      if (![0, 1, 2].includes(message.challenge) || ![30, 60, 90, 180, 300].includes(message.duration) || ![1,4,9].includes(message.count ?? 1)) return '无效比赛设置';
      state.entries = [];
      state.round = { id: state.round.id + 1, phase: 'shooting', endsAt: this.now() + message.duration * 1000, challenge: message.challenge, count:message.count??1, activeTask:0,paused:false,remainingMs:0 };
      this.history.clear(); this.record();
      return null;
    }
    if (message.type === 'role') {
      if (id !== state.hostId || state.round.phase === 'shooting') return '请在回合结束后由房主分配模特';
      if (!state.players.some(p => p.id === message.id)) return '玩家已离开';
      state.modelId = message.id; return null;
    }
    if (message.type === 'animal') {
      if (id !== state.modelId || state.round.phase === 'shooting') return '本轮模特已锁定';
      if (!['rabbit', 'turtle'].includes(message.animal)) return '无效模特';
      state.model.animal = message.animal; state.model.seq++; this.record(); return null;
    }
    if (message.type === 'move') {
      if (id !== state.modelId) return '你当前是摄影师';
      if (this.now() - (this.lastInput.get(id) ?? -Infinity) < 50) return 'too-fast';
      if (![message.dx, message.dz, message.turn].every(Number.isFinite)) return '无效动作';
      this.lastInput.set(id, this.now());
      state.model.x = Math.max(-3.5, Math.min(3.5, state.model.x + Math.max(-.2, Math.min(.2, message.dx))));
      state.model.z = Math.max(-3.5, Math.min(3.5, state.model.z + Math.max(-.2, Math.min(.2, message.dz))));
      state.model.yaw = (state.model.yaw + Math.max(-.2, Math.min(.2, message.turn))) % (Math.PI * 2);
      if (['stand', 'lean', 'celebrate','wave','point','guard'].includes(message.pose)) state.model.pose = message.pose;
      state.model.seq++; this.record(); return null;
    }
    if(message.type==='performance'){
      if(id!==state.modelId)return '只有当前模特可以控制表情与动作';
      if((message.expression!==undefined&&(typeof message.expression!=='string'||!Object.hasOwn(EXPRESSIONS,message.expression)))||(message.motion!==undefined&&(typeof message.motion!=='string'||!Object.hasOwn(MOTIONS,message.motion)))||(message.frozen!==undefined&&typeof message.frozen!=='boolean'))return '无效表演设置';
      if(message.expression===undefined&&message.motion===undefined&&message.frozen===undefined)return '请选择表情或动作';
      if(message.expression!==undefined)state.model.expression=message.expression;
      if(message.motion!==undefined&&message.motion!==state.model.motion){state.model.motion=message.motion;state.model.motionEpoch=this.now();state.model.frozen=false;state.model.heldTime=0;}
      if(message.frozen===true&&!state.model.frozen){state.model.heldTime=motionTime(state.model,this.now());state.model.frozen=true;}
      else if(message.frozen===false&&state.model.frozen){state.model.motionEpoch=this.now()-state.model.heldTime*1000;state.model.frozen=false;}
      state.model.seq++;this.record();return null;
    }
    if (message.type === 'photo') {
      if (id === state.modelId || state.round.phase !== 'shooting' || message.roundId !== state.round.id) return '当前不能交片，请等待下一轮';
      if (!validImage(message.image) || !validCamera(message.camera)) return '照片或相机数据无效';
      const pose = this.history.get(message.seq);
      if (!pose || (message.seq !== state.model.seq && this.now() - pose.at > 5000)) return '模特状态已过期，请重新拍摄';
      const animationTime=message.animationTime??(pose.motion==='still'?0:NaN);
      if(!validShotTime(pose,animationTime,this.now()))return '动作瞬间已过期，请重新抓拍';
      if (this.now() - (this.lastPhoto.get(id) ?? -Infinity) < 500) return '交片太快，请稍等片刻';
      this.lastPhoto.set(id, this.now());
      const slot=message.taskIndex??0;
      if(!Number.isInteger(slot)||slot<0||slot>=state.round.count||slot!==pose.taskIndex)return '镜头任务已改变，请重新拍摄';
      const score = this.scoreShot(message.camera, {...pose,animationTime}, state.round.challenge, missionAt(slot));
      if (!Number.isFinite(score)) return '无法评分';
      const previous = state.entries.findIndex(p => p.id === id);
      const entry=previous<0?{id,photos:Array(state.round.count).fill(null),score:0,at:this.now()}:state.entries[previous];
      const shot={image:message.image,score:Math.max(0,Math.min(100,Math.round(score))),at:this.now(),taskIndex:slot,expression:pose.expression,motion:pose.motion,frozen:pose.frozen,animationTime};
      if(!entry.photos[slot]||shot.score>entry.photos[slot].score)entry.photos[slot]=shot;
      entry.score=Math.round(entry.photos.reduce((sum,p)=>sum+(p?.score||0),0)/state.round.count);
      entry.completed=entry.photos.filter(Boolean).length;entry.at=this.now();entry.image=entry.photos.find(Boolean)?.image;
      entry.perfect=entry.photos.filter(p=>p&&p.score>=85).length;
      if(previous<0)state.entries.push(entry);
      return null;
    }
    return '未知操作';
  }
  snapshot() {
    const show=this.state.round.phase==='results';
    return { ...this.state, serverNow: this.now(), entries: this.state.entries.map(entry => ({ ...entry, image:show?entry.image:undefined,photos:entry.photos.map(p=>p?{...p,image:show?p.image:undefined}:null) })) };
  }
}
