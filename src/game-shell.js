import { GameFlow } from './game-flow.js';
import './game.css';

const $=id=>document.getElementById(id);
export function createGameShell({getRoom,clearKeys,resetCamera,toast}) {
  const flow=new GameFlow();
  let localPaused=false,remotePaused=false,lastRoundKey='',roomWasActive=false;
  const shell=document.createElement('div');shell.id='gameShell';
  shell.innerHTML=`
    <section id="titleScreen" class="game-screen title-screen" aria-label="游戏主菜单">
      <div class="menu-decoration"><span>◉</span> AN ANIMAL PHOTO ADVENTURE</div>
      <div class="title-content"><p class="game-overline">W I L D F R A M E</p><h1>野有镜<span>把世界，拍成你的故事。</span></h1><p class="title-description">动物的面孔，人的故事。<br>你是穿梭在世界里的摄影机。</p>
      <div class="title-options"><button id="beginGame" class="menu-primary">开始游戏 <span>↗</span></button><button id="beginParty">多人摄影派对 <small>2—8 PLAYERS</small></button><button id="menuReferences">摄影图鉴 <span>↗</span></button><button id="menuGuide">拍摄指南 <span>?</span></button></div></div>
      <div class="title-footer"><span>自由探索 · 拟人动物 · 地标摄影</span><button id="titleFullscreen">⛶ 全屏体验</button><span>EST. 2026 / KEEP YOUR CURIOSITY</span></div>
    </section>
    <div id="gameHud" class="game-hud" hidden>
      <div class="hud-top"><div class="hud-location"><span class="hud-dot"></span><span id="hudLocation">京都 · 千本鸟居</span><small id="hudMode">自由摄影</small></div><div class="hud-top-actions"><button id="hudFullscreen" aria-label="切换全屏">⛶</button><button id="pauseGame" aria-label="暂停游戏">Ⅱ <small>ESC</small></button></div></div>
      <div class="hud-objective"><p id="hudObjectiveLabel">FREE EXPLORATION</p><strong id="hudObjective">寻找让你心动的角度</strong><span id="hudClock">没有时间限制</span></div>
      <div id="taskDock" class="task-dock" hidden></div><div id="modelDock" class="model-dock"></div>
      <div id="lensDock" class="lens-dock" hidden><button id="closeLens" class="dock-close" aria-label="关闭镜头设置">×</button><p class="game-overline">CAMERA SETTINGS</p></div>
      <div class="hud-bottom"><div class="hud-tools"><button id="hudTravel"><span>⌖</span><small>地图</small></button><button id="hudCast"><span>♧</span><small>模特</small></button><button id="hudLens"><span>◉</span><small>镜头</small></button></div><div id="shutterDock" class="shutter-dock"></div><div class="hud-tools"><button id="hudAlbum"><span>▧</span><small>影集</small></button><button id="hudTasks"><span>☷</span><small>任务</small></button><button id="hudRoom"><span>♧</span><small>联机</small></button></div></div>
      <div class="hud-keyboard">拖动环绕 <i>·</i> WASD 移动 <i>·</i> 滚轮缩放 <i>·</i> SPACE 快门</div>
    </div>
    <section id="pauseScreen" class="game-screen pause-screen" aria-label="暂停菜单" hidden><div class="pause-card"><p class="game-overline">TAKE A BREATH</p><h2 id="pauseTitle">游戏已暂停<span>世界很大，慢慢拍。</span></h2><p id="pauseDescription">相机与操作已冻结，继续后回到刚才的视角。</p><div class="title-options"><button id="resumeGame" class="menu-primary">继续游戏 <span>▷</span></button><button id="pauseGuide">拍摄指南 <span>?</span></button><button id="returnToTitle">返回主菜单 <span>↗</span></button></div><small>已拍摄的照片保存在你的影集中</small></div></section>`;
  document.body.append(shell);

  function panel(id,title,node){
    const dialog=document.createElement('dialog');dialog.id=id;dialog.className='game-panel';
    const heading=document.createElement('div');heading.className='game-panel-heading';
    const h=document.createElement('h2');h.textContent=title;
    const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','关闭'+title);close.onclick=()=>dialog.close();heading.append(h,close);
    const content=document.createElement('div');content.className='game-panel-content';content.append(node);dialog.append(heading,content);document.body.append(dialog);
    dialog.addEventListener('click',e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close();}});
    dialog.addEventListener('close',clearKeys);return dialog;
  }
  panel('travelDialog','选择目的地',document.querySelector('.location-picker'));
  const aside=document.querySelector('.workspace aside');
  const lensLabel=aside.querySelector('.slider-label'),zoom=$('zoom'),rangeLabels=aside.querySelector('.range-label');
  $('lensDock').append(lensLabel,zoom,rangeLabels,aside.querySelector('.angle-controls'));
  $('lensDock').append($('gridBtn'),$('resetBtn'));
  $('shutterDock').append($('captureBtn'));
  panel('castDialog','动物演员',aside);
  $('modelDock').append($('modelControls'));
  $('taskDock').append(document.querySelector('.task-board'));
  panel('roomDialog','摄影派对', $('roomPanel'));
  const referenceContent=document.createElement('div');referenceContent.append(document.querySelector('.challenges'),document.querySelector('.reference-library'));
  panel('referenceDialog','摄影图鉴',referenceContent);
  $('referenceDialog').addEventListener('click',e=>{
    if(e.target.closest('.reference-card button')&&!getRoom()?.active){
      $('referenceDialog').close();enterGame(false); // Keep the selected practice pose and camera.
    }
  });
  $('travelDialog').addEventListener('click',e=>{if(e.target.closest('[data-location]:not(:disabled)'))$('travelDialog').close();});

  function closePanels(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('lensDock').hidden=true;$('taskDock').hidden=true;}
  function paint(){
    document.body.dataset.screen=flow.phase;
    $('titleScreen').hidden=flow.phase!=='title';$('pauseScreen').hidden=flow.phase!=='paused';$('gameHud').hidden=flow.phase==='title';
    $('gameHud').inert=flow.phase!=='playing';
    const room=getRoom(),networkPaused=!!room?.state?.round?.paused;
    $('pauseTitle').firstChild.textContent=networkPaused&&!room.isHost?'房主暂停了对局':'游戏已暂停';
    $('pauseDescription').textContent=networkPaused?'整场摄影赛暂停，剩余拍摄时间已保留。':room?.active?'仅暂停你的操作，联机比赛仍在计时。':'相机与操作已冻结，继续后回到刚才的视角。';
    $('resumeGame').disabled=networkPaused&&!room?.isHost;
    clearKeys();
    if(flow.phase==='paused')($('resumeGame').disabled?$('returnToTitle'):$('resumeGame')).focus();
  }
  function enterGame(reset=true){closePanels();localPaused=false;remotePaused=false;flow.play();if(reset){resetCamera();$('hudObjectiveLabel').textContent='FREE EXPLORATION';$('hudObjective').textContent='寻找让你心动的角度';$('hudClock').textContent='没有时间限制';}paint();}
  function pause(){
    if(!flow.canOperate)return;
    closePanels();localPaused=true;flow.pause();
    const room=getRoom();if(room?.active&&room.isHost&&room.state.round.phase==='shooting')room.send({type:'pause',paused:true});
    paint();
  }
  function resume(){
    const room=getRoom();if(room?.state?.round?.paused&&!room.isHost)return;
    localPaused=false;
    if(room?.state?.round?.paused)room.send({type:'pause',paused:false});
    flow.resume();paint();
  }
  function openPanel(id){if(flow.phase==='paused'&&id!=='guideDialog')return;closePanels();$(id).showModal();clearKeys();}
  function openParty(){if(getRoom()?.active)openPanel('roomDialog');else {closePanels();$('partyOpen').click();}}
  async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('当前窗口未提供系统全屏，游戏仍可正常游玩。');}}
  $('beginGame').onclick=()=>enterGame();$('beginParty').onclick=openParty;
  $('menuReferences').onclick=()=>openPanel('referenceDialog');$('menuGuide').onclick=()=>openPanel('guideDialog');
  $('pauseGame').onclick=pause;$('resumeGame').onclick=resume;$('pauseGuide').onclick=()=>openPanel('guideDialog');
  $('returnToTitle').onclick=()=>{closePanels();getRoom()?.active&&getRoom().leave();flow.menu();localPaused=false;remotePaused=false;paint();};
  $('hudTravel').onclick=()=>openPanel('travelDialog');$('hudCast').onclick=()=>openPanel('castDialog');
  $('hudAlbum').onclick=()=>{closePanels();$('albumNav').click();};$('hudRoom').onclick=openParty;
  $('hudTasks').onclick=()=>{if(!getRoom()?.active){openPanel('referenceDialog');return;}$('taskDock').hidden=!$('taskDock').hidden;$('lensDock').hidden=true;};
  $('hudLens').onclick=()=>{$('lensDock').hidden=!$('lensDock').hidden;$('taskDock').hidden=true;};$('closeLens').onclick=()=>$('lensDock').hidden=true;
  $('hudFullscreen').onclick=$('titleFullscreen').onclick=fullscreen;
  addEventListener('keydown',e=>{
    if(e.code!=='Escape'||document.querySelector('dialog[open]'))return;
    if(flow.phase==='title')return;e.preventDefault();e.stopImmediatePropagation();flow.phase==='paused'?resume():pause();
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&flow.canOperate&&!getRoom()?.active)pause();});
  const locationSource=document.querySelector('.scene-top b');
  const refreshLocation=()=>{$('hudLocation').textContent=locationSource.textContent;};
  new MutationObserver(refreshLocation).observe(locationSource,{childList:true});refreshLocation();
  new MutationObserver(()=>{$('hudClock').textContent=$('roundClock').textContent;}).observe($('roundClock'),{childList:true});
  paint();
  return {
    get phase(){return flow.phase;},
    get canOperate(){return flow.canOperate&&!getRoom()?.state?.round?.paused&&!document.querySelector('dialog[open]');},
    get isTitle(){return flow.phase==='title'&&!document.querySelector('dialog[open]');},
    enterPractice(task){enterGame(false);if(task){$('hudObjectiveLabel').textContent='REFERENCE FRAME PRACTICE';$('hudObjective').textContent=task.title;$('hudClock').textContent=task.hint;}},
    onRoomState(state){
      const room=getRoom();
      if(!state){if($('roomDialog').open)$('roomDialog').close();roomWasActive=false;lastRoundKey='';remotePaused=false;localPaused=false;$('modelControls').hidden=true;$('shutterDock').hidden=false;$('hudMode').textContent='自由摄影';$('hudObjectiveLabel').textContent='FREE EXPLORATION';$('hudObjective').textContent='寻找让你心动的角度';$('hudClock').textContent='没有时间限制';if(flow.phase!=='title')flow.play();paint();return;}
      if(!roomWasActive){enterGame(false);roomWasActive=true;openPanel('roomDialog');}
      $('hudMode').textContent=room.isModel?'模特 · 动作导演':'摄影师';
      $('shutterDock').hidden=room.isModel;
      $('hudObjectiveLabel').textContent=state.round.phase==='shooting'?'COOPERATIVE SHOT LIST':'PHOTOGRAPHY PARTY';
      $('hudObjective').textContent=state.round.phase==='shooting'?$('missionTitle').textContent:state.round.phase==='results'?'本轮作品已揭晓':'朋友已就位，等待房主开拍';
      const key=state.round.id+':'+state.round.phase;
      if(key!==lastRoundKey){
        if(state.round.phase==='shooting'){closePanels();localPaused=false;flow.play();}
        if(state.round.phase==='results'){localPaused=false;flow.play();openPanel('roomDialog');}
        lastRoundKey=key;
      }
      if(state.round.paused){remotePaused=true;closePanels();flow.pause();}
      else if(remotePaused){remotePaused=false;if(!localPaused)flow.resume();}
      // Pose updates arrive frequently. Do not clear held movement keys on each packet.
      document.body.dataset.screen=flow.phase;$('titleScreen').hidden=flow.phase!=='title';$('pauseScreen').hidden=flow.phase!=='paused';$('gameHud').hidden=flow.phase==='title';
      $('gameHud').inert=flow.phase!=='playing';
      if(flow.phase==='paused')paint();
    },
  };
}
