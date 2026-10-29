export const POSE_NAMES = { stand:'自然站姿', lean:'侧头回眸', celebrate:'张臂欢呼', wave:'抬手招呼', point:'侧身指向', guard:'双手护在胸前' };
export const MISSIONS = [
  { id:'backlight', title:'逆光也有春天', x:0,z:0,yaw:-.45,pose:'lean',frame:{x:.66,y:.56,size:.7,height:.45,pitch:18}, reference:'user-backlight', hint:'模特站中心、侧头回眸；相机降到膝盖以下，向上仰拍。' },
  { id:'hello', title:'街角打个招呼', x:-1.4,z:.8,yaw:.2,pose:'wave',frame:{x:.33,y:.52,size:.62,height:1.5,pitch:4}, reference:'big-brother', hint:'模特到左前方抬手，摄影师把人物放在左三分线。' },
  { id:'hero', title:'稳了，这张一定出片', x:1.4,z:0,yaw:-.6,pose:'point',frame:{x:.67,y:.5,size:.48,height:.75,pitch:12}, reference:'toxic-milk', hint:'模特到右侧指向远处；低机位拍出自信的气势。' },
  { id:'guardian', title:'我来守护这张合影', x:0,z:-1.5,yaw:0,pose:'guard',frame:{x:.5,y:.5,size:.65,height:1.6,pitch:0}, reference:'space-commander', hint:'后方站位，双手护胸，正面肖像保留完整轮廓。' },
  { id:'silence', title:'今天不被截图', x:-1.5,z:-1.2,yaw:.45,pose:'stand',frame:{x:.38,y:.5,size:.75,height:2,pitch:0}, reference:'no-screenshot', hint:'左后方自然站姿，靠近拍一张克制的表情。' },
  { id:'celebrate', title:'这次真的是完美发挥', x:1.5,z:1.2,yaw:-.3,pose:'celebrate',frame:{x:.6,y:.52,size:.62,height:1,pitch:8}, reference:'guild-meeting', hint:'右前方张臂欢呼，退后给双手留出空间。' },
  { id:'world', title:'小小的，大世界', x:0,z:-2,yaw:.5,pose:'lean',frame:{x:.5,y:.6,size:.3,height:3.8,pitch:-7}, reference:'earthrise', hint:'后方回眸；拉远，让环境承担故事。' },
  { id:'quiet', title:'目光里的故事', x:-1,z:1.5,yaw:0,pose:'guard',frame:{x:.5,y:.46,size:.8,height:2.1,pitch:0}, reference:'migrant-mother', hint:'左前方护胸，平视拍摄，把注意力留给眼神。' },
  { id:'finale', title:'收工之前再来一张', x:1,z:-1.5,yaw:-.5,pose:'wave',frame:{x:.65,y:.5,size:.5,height:.5,pitch:16}, reference:'user-backlight', hint:'右后方招手告别，再用仰拍为九宫格收尾。' },
];
export function missionAt(index) { return MISSIONS[index] || MISSIONS[0]; }
export function modelReadiness(pose, mission) {
  const distance=Math.hypot(pose.x-mission.x,pose.z-mission.z);
  const angle=Math.abs(Math.atan2(Math.sin(pose.yaw-mission.yaw),Math.cos(pose.yaw-mission.yaw)));
  return {distance,angle,poseMatches:pose.pose===mission.pose,ready:distance<=.55&&angle<=.65&&pose.pose===mission.pose};
}
export function scoreMission(metrics, pose, mission, pitch) {
  const ready=modelReadiness(pose,mission), f=mission.frame;
  const composition=Math.max(0,100-Math.hypot(metrics.x-f.x,metrics.y-f.y)*200);
  const framing=Math.max(0,100-Math.abs(metrics.size-f.size)*150);
  const angle=Math.max(0,100-Math.abs(metrics.height-f.height)*20-Math.abs(pitch-f.pitch)*1.6);
  const position=Math.max(0,100-ready.distance*70), facing=Math.max(0,100-ready.angle*60);
  let score=Math.round(composition*.35+framing*.2+angle*.15+position*.15+(ready.poseMatches?100:0)*.1+facing*.05);
  if(!ready.ready)score=Math.min(score,54);
  if(metrics.cropped)score=Math.min(score,50);
  if(!metrics.visible)score=0;
  return {score,details:[Math.round(composition),Math.round(framing),Math.round(angle)],cooperation:[Math.round(position),ready.poseMatches?100:0,Math.round(facing)],visible:metrics.visible,cropped:metrics.cropped,ready:ready.ready};
}
