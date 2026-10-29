import { rankedEntries, photoTitle, bestFrame } from './results.js';
import { downloadContactSheet } from './contact-sheet.js';

export function createCeremony({ audio, getRoom, openRoom, toast }) {
  const dialog = document.createElement('dialog');dialog.id = 'ceremonyDialog';dialog.setAttribute('aria-label', '摄影赛颁奖典礼');
  dialog.innerHTML = `<button class="close" id="closeCeremony" aria-label="关闭颁奖典礼">×</button><div class="ceremony-stars" aria-hidden="true">✦ · ✧ · ✦</div><p class="game-overline">WILDFRAME / THE PHOTO AWARDS</p><p id="ceremonyRound"></p><h2 id="ceremonyHeading"></h2><p id="ceremonySubtitle"></p><div id="ceremonyHero"></div><div id="ceremonyPersonal" aria-live="polite"></div><div class="ceremony-ranking"><h3>本轮摄影师榜单</h3><div id="ceremonyRanks"></div></div><p id="ceremonyModel"></p><div class="ceremony-actions"><button id="ceremonyGallery">查看全部组照</button><button id="ceremonyAgain" class="primary">再来一轮 ↗</button></div>`;
  document.body.append(dialog);
  const $ = id => document.getElementById(id);
  const rewatch = document.createElement('button');rewatch.id = 'rewatchCeremony';rewatch.textContent = '✦ 重看颁奖典礼';rewatch.hidden = true;document.getElementById('roomPanel').prepend(rewatch);
  let snapshot = null, lastRound = null;
  const name = id => snapshot.players.find(p => p.id === id)?.name || '已离开的摄影师';
  $('closeCeremony').onclick = () => dialog.close();
  $('ceremonyGallery').onclick = () => { dialog.close();openRoom(); };
  $('ceremonyAgain').onclick = () => { if (!getRoom()?.isHost) return;dialog.close();$('startRoundBtn').click(); };
  rewatch.onclick = () => { document.querySelectorAll('dialog[open]').forEach(d => d.close());show(false); };
  function show(withSound) {
    if (!snapshot) return;
    const room = getRoom(), count = snapshot.round.count, rows = rankedEntries(snapshot.entries), winners = rows.filter(e => e.rank === 1);
    $('ceremonyRound').textContent = `第 ${snapshot.round.id} 回 · ${count === 1 ? '单张摄影赛' : count + ' 镜头组照赛'}`;
    $('ceremonyHeading').textContent = rows.length ? winners.length > 1 ? '好照片，可以并列第一。' : '这一刻，属于你的镜头。' : '故事还在等下一声快门。';
    $('ceremonySubtitle').textContent = rows.length ? `${winners.length > 1 ? '并列冠军' : '本轮冠军'} · ${winners.map(e => name(e.id)).join(' / ')}` : '本轮没有交片，不生成冠军或排名。';
    const hero = $('ceremonyHero');hero.replaceChildren();
    const champion = rows[0], best = bestFrame(champion);
    if (best) {
      const frame = document.createElement('figure'), image = document.createElement('img'), caption = document.createElement('figcaption');
      image.src = best.image;image.alt = name(champion.id) + '的代表作品';
      caption.textContent = `CHAMPION FRAME / ${name(champion.id)} · 单格 ${best.score} 分`;frame.append(image, caption);hero.append(frame);
      const badge = document.createElement('div');badge.className = 'champion-badge';
      const icon = document.createElement('span');icon.textContent = '✦';const title = document.createElement('h3');title.textContent = photoTitle(champion, count);
      const score = document.createElement('strong');score.textContent = champion.score;const label = document.createElement('p');label.textContent = `组照总分 / 100 · 达标 ${champion.perfect}/${count} 格`;
      badge.append(icon,title,score,label);hero.append(badge);
    }
    const mine = rows.find(e => e.id === room.id);
    $('ceremonyPersonal').textContent = room.isModel ? '你的角色 · 动作导演 / 谢谢你配合每一位摄影师。' : mine ? `你的成绩 · 第 ${mine.rank} 名 · ${mine.score} 分 · ${photoTitle(mine, count)}` : '你的成绩 · 本轮未交片，不参与排名。';
    $('ceremonyRanks').replaceChildren(...rows.map(entry => {
      const row = document.createElement('article');row.className = 'ceremony-row' + (entry.id === room.id ? ' is-me' : '');row.style.setProperty('--order', Math.min(entry.rank, 8));
      const rank = document.createElement('b');rank.textContent = String(entry.rank).padStart(2, '0');
      const info = document.createElement('div'), player = document.createElement('strong'), detail = document.createElement('small');
      player.textContent = name(entry.id) + (entry.id === room.id ? '（你）' : '');detail.textContent = `${photoTitle(entry, count)} · 已交 ${entry.completed}/${count} · 达标 ${entry.perfect}/${count}`;info.append(player, detail);
      const score = document.createElement('span');score.className = 'ceremony-score';score.textContent = entry.score + ' 分';
      const view = document.createElement('button');view.textContent = '看组照';view.setAttribute('aria-label', '查看' + name(entry.id) + '的组照');view.onclick = () => downloadContactSheet(entry, count, name(entry.id), snapshot.round.id).catch(() => toast('组照生成失败，请重试'));
      row.append(rank,info,score,view);return row;
    }));
    const unsubmitted = snapshot.players.filter(p => p.id !== snapshot.modelId && !rows.some(e => e.id === p.id)).length;
    $('ceremonyModel').textContent = `动作导演 · ${name(snapshot.modelId)} / ${rows.length} 位摄影师交片${unsubmitted ? ' · ' + unsubmitted + ' 位未交片' : ''} · 同分并列，缺格计 0 分`;
    $('ceremonyAgain').hidden = !room.isHost;$('ceremonyGallery').textContent = room.isHost ? '查看全部组照' : '作品与房间 · 等待房主开拍';
    if (!dialog.open) dialog.showModal();
    if (withSound && rows.length) audio.play('award');
  }
  return {
    update(state) {
      snapshot = state;rewatch.hidden = state?.round.phase !== 'results';
      if (!state || state.round.phase !== 'results') { dialog.close();if (!state) lastRound = null;return; }
      if (state.round.id !== lastRound) { lastRound = state.round.id;document.querySelectorAll('dialog[open]').forEach(d => d.close());show(true); }
    },
  };
}
