export const EXPRESSIONS = { neutral:'自然', smile:'微笑', joy:'开怀大笑', surprise:'惊讶', sleepy:'困困眼', wink:'俏皮眨眼', determined:'认真脸' };
export const MOTIONS = { still:'定格摆姿', breathe:'呼吸与眨眼', wave:'连续招手', nod:'点头回应', dance:'摇摆小舞步', hop:'原地蹦跳' };
export function motionTime(model, at) {
  if (!model.motion || model.motion === 'still') return 0;
  return model.frozen ? model.heldTime : Math.max(0, (at - model.motionEpoch) / 1000);
}
export function validShotTime(model, time, at) {
  if (!Number.isFinite(time) || time < 0) return false;
  const current = motionTime(model, at);
  return !model.motion || model.motion === 'still' || model.frozen ? Math.abs(time - current) < .01 : time >= Math.max(0,current - 1.5) && time <= current + .25;
}
