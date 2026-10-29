import { EXPRESSIONS, MOTIONS } from './performance.js';
const $=id=>document.getElementById(id);
export function syncPerformanceUI(pose, inRoom=false, canControl=true) {
  $('soloPerformance').hidden=inRoom;
  const prefix=inRoom?'model':'solo';
  $(prefix+'Expression').value=pose.expression||'neutral';$(prefix+'Motion').value=pose.motion||'still';
  $(prefix+'Freeze').textContent=pose.frozen?'▷ 继续动作':'Ⅱ 定格这一瞬';
  $(prefix+'Freeze').setAttribute('aria-pressed',String(!!pose.frozen));
  $(prefix+'Freeze').disabled=!canControl||!pose.motion||pose.motion==='still';
  for(const suffix of ['Expression','Motion'])$(prefix+suffix).disabled=!canControl;
  $(prefix+'PerformanceStatus').textContent=`${EXPRESSIONS[pose.expression]||EXPRESSIONS.neutral} · ${MOTIONS[pose.motion]||MOTIONS.still}${pose.frozen?' · 已定格':''}`;
  $('performanceQuick').hidden=(!pose.motion||pose.motion==='still')&&(!pose.expression||pose.expression==='neutral');
  $('performanceLive').textContent=$(prefix+'PerformanceStatus').textContent;
  $('quickFreeze').hidden=!canControl||!pose.motion||pose.motion==='still';
  $('quickFreeze').textContent=pose.frozen?'▷ 继续动作':'Ⅱ 定格模特';$('quickFreeze').setAttribute('aria-pressed',String(!!pose.frozen));
}
export function setupPerformanceUI({getRoom,getSoloPose,changeSolo}) {
  const quick=document.createElement('div');quick.id='performanceQuick';quick.hidden=true;
  const live=document.createElement('span');live.id='performanceLive';
  const quickButton=document.createElement('button');quickButton.id='quickFreeze';quickButton.onclick=()=>{const pose=getRoom()?.active?getRoom().state.model:getSoloPose();update({frozen:!pose.frozen});};quick.append(live,quickButton);document.body.append(quick);
  for(const prefix of ['solo','model']){
    const details=document.createElement('details');details.id=prefix+'Performance';details.className='performance-controls';details.open=prefix==='solo';
    const summary=document.createElement('summary');summary.textContent='表情与连续动作';details.append(summary);
    const grid=document.createElement('div');grid.className='performance-grid';
    for(const [suffix,title,catalog] of [['Expression','表情',EXPRESSIONS],['Motion','连续动作',MOTIONS]]){
      const label=document.createElement('label');label.textContent=title;
      const select=document.createElement('select');select.id=prefix+suffix;
      for(const [value,text] of Object.entries(catalog)){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
      select.onchange=()=>update({[suffix==='Expression'?'expression':'motion']:select.value});label.append(select);grid.append(label);
    }
    const freeze=document.createElement('button');freeze.id=prefix+'Freeze';freeze.type='button';freeze.onclick=()=>{const pose=getRoom()?.active?getRoom().state.model:getSoloPose();update({frozen:!pose.frozen});};grid.append(freeze);
    const status=document.createElement('p');status.id=prefix+'PerformanceStatus';status.setAttribute('aria-live','polite');grid.append(status);
    const hint=document.createElement('small');hint.textContent='动作叠加在基础摆姿上；定格后所有摄影师可从不同角度拍摄。';grid.append(hint);
    details.append(grid);if(prefix==='solo')$('soloPoseControls').after(details);else $('modelControls').append(details);
  }
  function update(change){const room=getRoom();if(room?.active)room.send({type:'performance',...change});else {changeSolo(change);syncPerformanceUI(getSoloPose());}}
  const badge=document.createElement('p');badge.id='photoPerformance';badge.className='photo-performance';$('scoreDetails').after(badge);
  syncPerformanceUI(getSoloPose());
}
export function showPhotoPerformance(photo){
  const badge=$('photoPerformance');badge.hidden=!photo.expression&&!photo.motion;
  badge.textContent=`表演瞬间 · ${EXPRESSIONS[photo.expression]||EXPRESSIONS.neutral} / ${MOTIONS[photo.motion]||MOTIONS.still}${photo.frozen?' · 定格抓拍':''}`;
}
