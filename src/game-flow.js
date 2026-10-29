export class GameFlow {
  constructor(){this.phase='title';}
  play(){this.phase='playing';}
  pause(){if(this.phase==='playing')this.phase='paused';}
  resume(){if(this.phase==='paused')this.phase='playing';}
  menu(){this.phase='title';}
  get canOperate(){return this.phase==='playing';}
}
