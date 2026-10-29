import { Multiplayer, peerOptions } from './multiplayer.js';

const $ = id => document.getElementById(id);
const phases = { lobby: '等待开拍', shooting: '正在拍摄', results: '作品揭晓' };
export function createParty({ scoreShot, applyModel, applyLocation, getLocation, toast, clearKeys }) {
  let offset = 0, lastRound = '', gallerySignature = '', busy = false;
  let connectionSettings = { server: '', ice: '' };
  const room = new Multiplayer({
    scoreShot,
    onState(state) {
      offset = state.serverNow - Date.now();
      applyLocation(state.location);
      applyModel(state.model);
      $('partyDialog').close();
      $('roomPanel').hidden = false;
      document.querySelector('.party-banner').hidden = true;
      $('activeRoomCode').textContent = room.code;
      $('roomRole').textContent = room.isModel ? '你是模特' : '你是摄影师';
      const playerSignature = JSON.stringify([state.players, state.modelId]);
      if ($('playerList').dataset.signature !== playerSignature) {
        $('playerList').dataset.signature = playerSignature;
        $('playerList').replaceChildren(...state.players.map(player => {
          const span = document.createElement('span');
          span.className = 'player-chip';
          span.textContent = `${player.id === state.modelId ? '🐾' : '◎'} ${player.name}${player.id === room.id ? '（你）' : ''}${player.id === state.hostId ? ' · 房主' : ''}`;
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
      $('roundHint').textContent = state.round.phase === 'shooting'
        ? `主题：${['温柔的对视', '三分之一的诗', '小小的，大世界'][state.round.challenge]} · 每人保留本轮最高分 · 已交片 ${state.entries.length} / ${state.players.length - 1} · 统一 3:2 画幅`
        : state.round.phase === 'results' ? '本轮作品已揭晓。相同分数并列；没有交片的摄影师不参与排名。房主可换模特，再来一轮。' : '分享邀请链接，等朋友加入。房主可选择模特、主题与拍摄时长。';
      const roundKey = `${state.round.id}:${state.round.phase}`;
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
            const image = document.createElement('img'); image.src = entry.image; image.alt = '摄影赛参赛作品';
            const caption = document.createElement('p');
            caption.textContent = `${rank === 1 ? '🏆' : '#' + rank} ${state.players.find(p => p.id === entry.id)?.name || '已离开的摄影师'} · ${entry.score} 分`;
            const download = document.createElement('a'); download.href = entry.image; download.download = `wildframe-round-${state.round.id}-${index + 1}.jpg`; download.textContent = '↓ 保存作品';
            card.append(image, caption, download); $('roundGallery').append(card);
          });
        }
      }
      updateClock();
      setBusy(false);
    },
    onStatus(text) { $('roomStatus').textContent = text; $('partyStatus').textContent = text; },
    onError(text) { toast(text); $('partyStatus').textContent = text; setBusy(false); },
    onLeave(reason) {
      clearKeys();
      $('photoDialog').close();
      $('roomPanel').hidden = true; document.querySelector('.party-banner').hidden = false;
      document.querySelectorAll('.model').forEach(b => b.disabled = false);
      document.querySelectorAll('[data-location]').forEach(b => b.disabled = false);
      $('soloPoseControls').hidden = false; $('soloPose').value = 'stand';
      $('captureBtn').disabled = false;
      document.body.classList.remove('broadcast-mode'); $('broadcastBtn').setAttribute('aria-pressed', 'false');
      applyModel({ animal: 'rabbit', x: 0, z: 0, yaw: 0, pose: 'stand', seq: 0 });
      gallerySignature = ''; lastRound = ''; setBusy(false);
      toast(reason || '已回到单人摄影棚');
    },
  });
  function setBusy(value) { busy = value; $('createRoomBtn').disabled = value; $('joinRoomBtn').disabled = value; }
  function updateClock() {
    const state = room.state; if (!state) return;
    $('roundClock').textContent = state.round.phase === 'shooting' ? `${Math.max(0, Math.ceil((state.round.endsAt - Date.now() - offset) / 1000))} 秒` : phases[state.round.phase];
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
  $('startRoundBtn').onclick = () => room.send({ type: 'start', duration: Number($('roundDuration').value), challenge: Number($('roundChallenge').value) });
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
