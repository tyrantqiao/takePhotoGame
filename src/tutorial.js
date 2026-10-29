export const LESSONS = [
  { title: '走近你的主角', text: '按住 W / A / S / D 移动相机。触屏可用双指拖动平移；移动约半米即可。', focus: null },
  { title: '换一个观看世界的角度', text: '在画面上拖动，环绕模特。试着看到主角的另一侧。', focus: '#viewport' },
  { title: '决定画面里的远近', text: '滚轮或双指捏合缩放；也可以打开「镜头」，调整焦距滑块。', focus: '#hudLens' },
  { title: '把镜头放低，向上看', text: '打开「镜头」→「低机位仰拍」，或调低机位，再向上对准模特。', focus: '#hudLens' },
  { title: '拍下第一张达标照片', text: '保留完整轮廓，让主角留在画面中央附近。按空格或圆形快门，拍到 70 分即完成。', focus: '#captureBtn' },
];
export class TutorialProgress {
  constructor(sample) { this.step = 0;this.baseline = structuredClone(sample);this.done = false; }
  observe(sample) {
    if (this.done || this.step === 4) return false;
    const base = this.baseline;
    const distance = Math.hypot(...sample.position.map((v, i) => v - base.position[i]));
    const dot = Math.min(1, Math.abs(sample.quaternion.reduce((sum, v, i) => sum + v * base.quaternion[i], 0)));
    const matches = [distance >= .45, 2 * Math.acos(dot) >= .16, Math.abs(sample.fov - base.fov) >= 3 || Math.abs(sample.distance - base.distance) >= .65, sample.position[1] <= .7 && sample.pitch >= 3][this.step];
    if (!matches) return false;
    this.step++;this.baseline = structuredClone(sample);return true;
  }
  photo(photo) {
    if (this.step !== 4 || this.done || !photo.visible || photo.cropped || photo.score < 70) return false;
    this.done = true;return true;
  }
}

export function createTutorial({ getSample, audio, toast }) {
  let progress = null, visited = false;
  try { visited = !!localStorage.getItem('wildframe-tutorial'); } catch {}
  const card = document.createElement('section');card.id = 'tutorialCard';card.hidden = true;card.setAttribute('aria-label', '新手摄影课');
  card.innerHTML = '<div class="lesson-meta"><span id="lessonCount"></span><button id="skipLesson">跳过引导</button></div><div class="lesson-progress" id="lessonProgress"></div><h2 id="lessonTitle"></h2><p id="lessonText" aria-live="polite"></p><p id="lessonFeedback"></p><button id="lessonFinish" hidden>完成课程 · 自由探索 ↗</button>';
  document.getElementById('gameHud').append(card);
  const $ = id => document.getElementById(id);
  function clearFocus() { document.querySelectorAll('.lesson-focus').forEach(el => el.classList.remove('lesson-focus')); }
  function remember(status) { visited = true;try { localStorage.setItem('wildframe-tutorial', status); } catch {} }
  function stop(save = false) { if (save) remember('skipped');progress = null;card.hidden = true;clearFocus(); }
  function paint() {
    clearFocus();card.hidden = !progress;if (!progress) return;
    const done = progress.done, lesson = LESSONS[progress.step];
    $('lessonCount').textContent = done ? '课程完成 / 新称号解锁' : `新手摄影课 · ${progress.step + 1} / ${LESSONS.length}`;
    $('lessonTitle').textContent = done ? '初见摄影师' : lesson.title;
    $('lessonText').textContent = done ? '你已经学会移动、环绕、变焦与仰拍。下一张照片，交给你的好奇心。' : lesson.text;
    $('lessonFeedback').textContent = ''; $('lessonFinish').hidden = !done;$('skipLesson').hidden = done;
    $('lessonProgress').replaceChildren(...LESSONS.map((_, i) => { const dot = document.createElement('i');dot.className = done || i < progress.step ? 'complete' : i === progress.step ? 'current' : '';return dot; }));
    if (!done && lesson.focus) document.querySelector(lesson.focus)?.classList.add('lesson-focus');
  }
  $('skipLesson').onclick = () => { stop(true);toast('已进入自由摄影，可从主菜单重新开始新手课。'); };
  $('lessonFinish').onclick = () => stop();
  return {
    get active() { return !!progress && !progress.done; },
    get needsIntro() { return !visited; },
    start() { progress = new TutorialProgress(getSample());paint(); },
    stop,
    update() { if (progress?.observe(getSample())) { audio.play('success');paint(); } },
    photo(photo) {
      if (!progress || progress.done) return;
      if (progress.photo(photo)) { remember('completed');paint();audio.play('success'); }
      else if (progress.step === 4) $('lessonFeedback').textContent = `本张 ${photo.score} 分 · ${!photo.visible ? '先让模特回到画面中。' : photo.cropped ? '轮廓被裁切，试着拉远一点。' : '让人物居中，调整远近，再试一次。'}`;
    },
  };
}
