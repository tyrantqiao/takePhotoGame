export function clampAboveGround(camera,target,floor=.15){
  if(camera.position.y<floor){camera.position.y=floor;camera.lookAt(target);}
}
