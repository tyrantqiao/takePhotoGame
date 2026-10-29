import { Multiplayer, peerOptions } from './multiplayer.js';
import { missionAt, modelReadiness, POSE_NAMES } from './missions.js';
import { referenceById } from './references.js';
import { downloadContactSheet } from './contact-sheet.js';
import { syncPerformanceUI } from './performance-ui.js';

const $ = id => document.getElementById(id);
const phases = { lobby: '等待开拍', shooting: '正在拍摄', results: '作品揭晓' };
export function createParty({ scoreShot, applyModel, applyLocation, getLocation, applyMission, onRoomState, toast, clearKeys }) {
  let offset = 0, lastRound = '', gallerySignature = '', busy = false;
  let connectionSettings = { server: '', ice: '' };
  const room = new Multiplayer({
    scoreShot,
    onState(state) {
      offset = state.serverNow - Date.now();
      applyLocation(state.location);
      applyModel(state.model);
      syncPerformanceUI(state.model,true,room.isModel&&!state.round.paused);
      const mission=missionAt(state.round.activeTask);
      applyMission(state.round.phase==='shooting'?mission:null);
      $('partyDialog').close();
      $('roomPanel').hidden = false;
      document.querySelector('.party-banner').hidden = true;
      $('activeRoomCode').textContent = room.code;
      $('roomRole').textContent = room.isModel ? '你是模特' : '你是摄影师';
      const playerSignature = JSON.stringify([state.players, state.modelId,state.entries.map(e=>[e.id,e.completed,e.perfect])]);
      if ($('playerList').dataset.signature !== playerSignature) {
        $('playerList').dataset.signature = playerSignature;
        $('playerList').replaceChildren(...state.players.map(player => {
          const span = document.createElement('span');
          span.className = 'player-chip';
          const progress=state.entries.find(e=>e.id===player.id);
          span.textContent = `${player.id === state.modelId ? '🐾' : '◎'} ${player.name}${player.id === room.id ? '（你）' : ''}${player.id === state.hostId ? ' · 房主' : ''}${player.id!==state.modelId?' · '+(progress?.completed||0)+'/'+state.round.count+' 格':''}`;
          return span;
        }));
        $('modelPlayer').replaceChildren(...state.players.map(player => {
          const option = document.createElement('option'); option.value = player.id; option.textContent = player.name; return option;
        }));
        $('modelPlayer').value = state.modelId;
      }
      $('hostSettings').hidden = !room.isHost;
      $('hostSettings').querySelectorAll('select,button').forEach(el => el.disabled = state.round.phase === 'shooting');
      $('modelControls').hidden = !room.isModel;
      $('poseSelect').value = state.model.pose;
      document.querySelectorAll('.model').forEach(b => b.disabled = !room.isModel || state.round.phase === 'shooting');
      document.querySelectorAll('[data-location]').forEach(b => b.disabled = !room.isHost || state.round.phase === 'shooting');
      $('soloPoseControls').hidden = true;
      $('captureBtn').disabled = room.isModel || state.round.phase !== 'shooting';
      const mine=state.entries.find(e=>e.id===room.id);
      $('roundHint').textContent = state.round.phase === 'shooting'
        ? `${state.round.count} 镜头组照 · 每格保留最高分，漏拍记 0 分 · ${room.isModel?'模特负责所有人的镜头切换':'我已拍 '+(mine?.completed||0)+' 格 / 达标 '+(mine?.perfect||0)+' 格'} · 85 分达标 · 统一 3:2 画幅`
        : state.round.phase === 'results' ? '本轮作品已揭晓。相同分数并列；没有交片的摄影师不参与排名。房主可换模特，再来一轮。' : '分享邀请链接，等朋友加入。房主可选择模特、主题与拍摄时长。';
      const roundKey = `${state.round.id}:${state.round.phase}`;
      const readiness=modelReadiness(state.model,mission);
      document.querySelector('.task-board').hidden=state.round.phase==='lobby';
      $('missionTitle').textContent=`镜头 ${state.round.activeTask+1} / ${state.round.count} · ${mission.title}`;
      $('missionHint').textContent=mission.hint;
      const ref=referenceById(mission.reference);
      $('missionReference').hidden=!ref.image;
      if(ref.image){$('missionReference').src=ref.image;$('missionReference').alt=ref.title;}
      $('missionReferenceLabel').textContent=ref.image?'参考：'+ref.title:'梗镜头演绎：'+ref.title+'（出处见参考库）';
      $('modelReadiness').textContent=`目标 (${mission.x.toFixed(1)}, ${mission.z.toFixed(1)}) / 当前 (${state.model.x.toFixed(1)}, ${state.model.z.toFixed(1)}) · ${POSE_NAMES[mission.pose]} · 距离 ${readiness.distance.toFixed(2)} m / 转向误差 ${Math.round(readiness.angle*180/Math.PI)}° · ${readiness.ready?'✓ 模特已就位':'按地面圆环站位，用 Q / E 调整朝向'}`;
      $('modelReadiness').classList.toggle('ready',readiness.ready);
      $('previousTask').disabled=!room.isModel||state.round.phase!=='shooting'||state.round.activeTask===0;
      $('nextTask').disabled=!room.isModel||state.round.phase!=='shooting'||state.round.activeTask===state.round.count-1;
      $('endRoundBtn').hidden=!room.isHost||state.round.phase!=='shooting';
      const slotSignature=JSON.stringify([state.round.id,state.round.phase,state.round.activeTask,mine?.photos.map(p=>p?.score)]);
      if($('missionSlots').dataset.signature!==slotSignature){
        $('missionSlots').dataset.signature=slotSignature;
        $('missionSlots').replaceChildren(...Array.from({length:state.round.count},(_,index)=>{
          const slot=document.createElement('span');slot.className='mission-slot'+(index===state.round.activeTask?' active':'');slot.textContent=`${index+1}. ${missionAt(index).title} · ${mine?.photos[index]?mine.photos[index].score+' 分':'待拍'}`;return slot;
        }));
      }
      if (lastRound !== roundKey) {
        clearKeys();
        if (state.round.phase === 'shooting') { document.querySelectorAll('dialog[open]').forEach(d => d.close()); toast('摄影赛开始！同一主题，各凭视角。'); }
        if (state.round.phase === 'results') { $('photoDialog').close(); toast('本轮已结束，作品已揭晓。'); }
        lastRound = roundKey;
      }
      const signature = state.round.phase === 'results' ? JSON.stringify([state.entries.map(e => [e.id, e.score, e.at]), state.players]) : state.round.phase;
      if (signature !== gallerySignature) {
        gallerySignature = signature;
        $('roundGallery').replaceChildren();
        if (state.round.phase === 'results') {
          const entries = [...state.entries].sort((a, b) => b.score - a.score || a.at - b.at);
          if (!entries.length) $('roundGallery').textContent = '本轮还没有作品，下轮记得按下快门。';
          let rank = 1;
          entries.forEach((entry, index) => {
            if (index && entry.score !== entries[index - 1].score) rank = index + 1;
            const card = document.createElement('article'); card.className = 'round-entry';
            const sheet=document.createElement('div');sheet.className='entry-sheet count-'+state.round.count;
            Array.from({length:state.round.count},(_,slot)=>{
              const cell=document.createElement('div');const photo=entry.photos[slot];
              if(photo?.image){const image=document.createElement('img');image.src=photo.image;image.alt=`镜头 ${slot+1}：${missionAt(slot).title}`;cell.append(image);}
              else cell.textContent='未完成';
              const label=document.createElement('small');label.textContent=`${slot+1} · ${photo?.score||0} 分`;cell.append(label);sheet.append(cell);
            });
            const caption = document.createElement('p');
            const name=state.players.find(p=>p.id===entry.id)?.name||'已离开的摄影师';
            caption.textContent = `${rank === 1 ? '🏆' : '#' + rank} ${name} · ${entry.score} 分 · ${entry.completed}/${state.round.count} 格 · 达标 ${entry.perfect}/${state.round.count}${entry.perfect===state.round.count?' ✦ 完美组照':''}`;
            const download=document.createElement('button');download.textContent='↓ 保存整套组照';download.onclick=()=>downloadContactSheet(entry,state.round.count,name,state.round.id).catch(()=>toast('组照生成失败，请重试'));
            card.append(sheet,caption,download); $('roundGallery').append(card);
          });
        }
      }
      updateClock();
      setBusy(false);
      onRoomState?.(state);
    },
    onStatus(text) { $('roomStatus').textContent = text; $('partyStatus').textContent = text; },
    onError(text) { toast(text); $('partyStatus').textContent = text; setBusy(false); },
    onLeave(reason) {
      clearKeys();
      applyMission(null);
      $('photoDialog').close();
      $('roomPanel').hidden = true; document.querySelector('.party-banner').hidden = false;
      document.querySelectorAll('.model').forEach(b => b.disabled = false);
      document.querySelectorAll('[data-location]').forEach(b => b.disabled = false);
      $('soloPoseControls').hidden = false; $('soloPose').value = 'stand';
      $('captureBtn').disabled = false;
      document.body.classList.remove('broadcast-mode'); $('broadcastBtn').setAttribute('aria-pressed', 'false');
      applyModel({ animal: 'rabbit', x: 0, z: 0, yaw: 0, pose: 'stand', seq: 0 });
      syncPerformanceUI({expression:'neutral',motion:'still'});
      gallerySignature = ''; lastRound = ''; setBusy(false);
      toast(reason || '已回到单人摄影棚');
      onRoomState?.(null);
    },
  });
  function setBusy(value) { busy = value; $('createRoomBtn').disabled = value; $('joinRoomBtn').disabled = value; }
  function updateClock() {
    const state = room.state; if (!state) return;
    $('roundClock').textContent = state.round.phase === 'shooting' ? state.round.paused?`暂停 · 剩余 ${Math.ceil(state.round.remainingMs/1000)} 秒`:`${Math.max(0, Math.ceil((state.round.endsAt - Date.now() - offset) / 1000))} 秒` : phases[state.round.phase];
  }
  setInterval(updateClock, 200);
  async function connect(host) {
    if (busy) return;
    try {
      const server = $('signalServer').value.trim(), ice = $('iceConfig').value;
      const options = peerOptions(server, ice);
      connectionSettings = { server, ice };
      setBusy(true);
      await room.connect({ host, code: $('joinCode').value, name: $('playerName').value, options, location: getLocation() });
    } catch (error) { $('partyStatus').textContent = error.message; toast(error.message); setBusy(false); }
  }
  $('partyOpen').onclick = () => $('partyDialog').showModal();
  $('closeParty').onclick = () => { if (busy && !room.active) room.leave(false); setBusy(false); $('partyDialog').close(); };
  $('partyDialog').addEventListener('cancel', () => { if (busy && !room.active) room.leave(false); setBusy(false); });
  $('partyDialog').addEventListener('close', () => { if (busy && !room.active) room.leave(false); setBusy(false); });
  $('createRoomBtn').onclick = () => connect(true); $('joinRoomBtn').onclick = () => connect(false);
  $('leaveRoomBtn').onclick = () => room.leave();
  $('startRoundBtn').onclick = () => room.send({ type: 'start', duration: Number($('roundDuration').value), challenge: Number($('roundChallenge').value),count:Number($('roundCount').value) });
  $('roundCount').onchange=()=>{$('roundDuration').value=Number($('roundCount').value)===1?'60':Number($('roundCount').value)===4?'180':'300';};
  $('previousTask').onclick=()=>room.send({type:'task',index:room.state.round.activeTask-1});
  $('nextTask').onclick=()=>room.send({type:'task',index:room.state.round.activeTask+1});
  $('endRoundBtn').onclick=()=>room.send({type:'end'});
  $('modelPlayer').onchange = () => room.send({ type: 'role', id: $('modelPlayer').value });
  $('poseSelect').onchange = () => room.send({ type: 'move', dx: 0, dz: 0, turn: 0, pose: $('poseSelect').value });
  document.querySelectorAll('[data-step]').forEach(button => button.onclick = () => {
    const direction = button.dataset.step;
    room.send({ type: 'move', dx: direction === 'a' ? -.18 : direction === 'd' ? .18 : 0, dz: direction === 'w' ? -.18 : direction === 's' ? .18 : 0, turn: direction === 'q' ? -.18 : direction === 'e' ? .18 : 0 });
  });
  $('broadcastBtn').onclick = () => { const active = document.body.classList.toggle('broadcast-mode'); $('broadcastBtn').setAttribute('aria-pressed', String(active)); };
  $('inviteBtn').onclick = async () => {
    const url = new URL(location.href); const hash = new URLSearchParams({ room: room.code });
    if (connectionSettings.server) hash.set('signal', connectionSettings.server);
    url.hash = hash.toString();
    try { await navigator.clipboard.writeText(url.toString()); toast('邀请链接已复制，发送给朋友即可加入'); }
    catch { $('partyStatus').textContent = `复制失败，房间码：${room.code}`; toast(`房间码 ${room.code}，可手动告诉朋友`); }
  };
  const invite = new URLSearchParams(location.hash.slice(1));
  if (invite.has('room')) {
    $('joinCode').value = invite.get('room').slice(0, 8);
    if (invite.has('signal')) $('signalServer').value = invite.get('signal').slice(0, 500);
    $('partyDialog').showModal();
    $('partyStatus').textContent = '朋友邀请你加入摄影派对。填写昵称后点击加入；自建信令地址可在网络设置中确认。';
  }
  return room;
}
