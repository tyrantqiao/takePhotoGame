import * as THREE from 'three';
import { ellipsoid as oval, block, mesh, pivot, beam } from './scene-kit.js';

// Original clothed, upright animal citizens. Shared pivots keep poses deterministic for judging.
function citizen(animal) {
  const root = new THREE.Group(); root.name = animal;
  const rabbit = animal === 'rabbit';
  const fur = rabbit ? '#d8c9b7' : '#879273';
  const lightFur = rabbit ? '#e7ddce' : '#a4ad84';
  const coat = rabbit ? '#394f59' : '#a47550';
  const trousers = rabbit ? '#45464c' : '#3a4b45';
  const shoes = '#34332f';
  const parts = {};
  // Human hip-to-shoulder anatomy, long trousered legs and distinct shoes.
  oval(root, trousers, [0, 1.35, 0], [.39, .25, .25], true);
  for (const side of [-1, 1]) {
    const leg = pivot(root, [side * .23, 1.37, 0]);
    oval(leg, trousers, [0, -.37, 0], [.17, .47, .19], true);
    oval(leg, trousers, [0, -.91, .025], [.135, .34, .145], true);
    oval(leg, shoes, [0, -1.23, .13], [.16, .13, .29], true);
    block(leg, '#272b29', [0, -1.32, .12], [.31, .055, .46], true);
    parts[side < 0 ? 'leftLeg' : 'rightLeg'] = leg;
  }
  // Tailored jacket, ivory shirt, lapels and copper buttons.
  oval(root, coat, [0, 1.96, 0], [.49, .65, .3], true);
  block(root, coat, [0, 1.64, .015], [.78, .45, .48], true);
  oval(root, '#ded3bc', [0, 2.27, .285], [.23, .32, .05], true);
  for (const side of [-1, 1]) {
    const lapel = block(root, rabbit ? '#536977' : '#be9068', [side * .19, 2.21, .303], [.15, .45, .045], true);
    lapel.rotation.z = side * -.3;
    oval(root, '#bda477', [side * .105, 1.73, .304], [.025, .025, .018], true);
    const arm = pivot(root, [side * .49, 2.33, .005]);
    oval(arm, coat, [0, -.27, 0], [.17, .35, .18], true);
    oval(arm, coat, [side * .025, -.69, .07], [.135, .29, .145], true);
    block(arm, '#ddd2bb', [side * .025, -.93, .07], [.2, .08, .2], true);
    oval(arm, fur, [side * .025, -1.065, .085], [.115, .16, .085], true);
    oval(arm, fur, [-side * .073, -1.02, .13], [.05, .09, .055], true);
    // Small finger grooves read as hands rather than paws.
    for (let i = 0; i < 3; i++) beam(arm, rabbit ? '#b7aa9a' : '#768265', [side * .025 - .055 + i * .045, -1.1, .163], [side * .025 - .055 + i * .045, -1.15, .16], .006, 5);
    arm.rotation.z = side * .11;
    parts[side < 0 ? 'leftArm' : 'rightArm'] = arm;
  }
  if (rabbit) {
    const tie = block(root, '#8a5d4e', [0, 2.2, .346], [.075, .37, .03], true); tie.rotation.z = -.08;
    oval(root, '#b3a28a', [0, 2.43, .335], [.065, .055, .025], true);
    oval(root, lightFur, [0, 1.47, -.36], [.18, .19, .19], true);
  } else {
    // A shell on the back of a standing person, rather than a four-legged turtle.
    oval(root, '#536649', [0, 2, -.34], [.55, .69, .28], true);
    for (let i = 0; i < 6; i++) {
      const angle = i / 6 * Math.PI * 2;
      oval(root, '#6e8057', [Math.sin(angle) * .32, 2 + Math.cos(angle) * .42, -.565], [.21, .24, .065], true);
    }
    oval(root, '#859461', [0, 2, -.62], [.21, .25, .06], true);
    block(root, '#cfba90', [0, 2.45, .04], [.3, .27, .26], true);
  }
  oval(root, fur, [0, 2.63, .015], [.19, .25, .18], true);
  const head = pivot(root, [0, 2.82, .015]); parts.head = head;
  oval(head, fur, [0, .16, 0], rabbit ? [.36, .43, .31] : [.38, .35, .34], true);
  oval(head, lightFur, [0, -.035, .235], rabbit ? [.26, .19, .19] : [.32, .16, .22], true);
  if (rabbit) {
    for (const side of [-1, 1]) {
      const ear = pivot(head, [side * .19, .51, -.025]); ear.rotation.z = side * -.09;
      oval(ear, fur, [0, .36, 0], [.115, .46, .105], true);
      oval(ear, '#b08f87', [0, .39, .092], [.061, .34, .015], true);
      const brow = block(head, '#7f7569', [side * .17, .33, .283], [.15, .027, .032], true); brow.rotation.z = side * -.1;
      oval(head, '#4c403b', [0, .02, .417], [.055, .036, .029], true);
      for (let i = 0; i < 2; i++) beam(head, '#9b8b7c', [side * .17, -.045 + i * .045, .38], [side * .42, -.075 + i * .07, .32], .005, 5);
    }
    // Asymmetric fringe and cheek tufts break the plush-toy silhouette.
    const fringe = oval(head, '#c2b09b', [.1, .48, .12], [.21, .12, .19], true); fringe.rotation.z = -.24;
  } else {
    for (const side of [-1, 1]) {
      const rim = mesh(head, new THREE.TorusGeometry(.132, .014, 6, 32), '#635343', [side * .17, .22, .315]);
      rim.rotation.y = side * .12;
      beam(head, '#635343', [side * .3, .22, .31], [side * .36, .2, -.05], .012);
      block(head, '#687052', [side * .17, .39, .252], [.16, .03, .04], true);
    }
    beam(head, '#635343', [-.04, .23, .34], [.04, .23, .34], .012);
    oval(head, '#626b4e', [-.105, .005, .451], [.018, .013, .012], true);
    oval(head, '#626b4e', [.105, .005, .451], [.018, .013, .012], true);
  }
  for (const side of [-1, 1]) {
    oval(head, '#e7e2d5', [side * .165, .205, .282], [.105, .065, .045], true);
    oval(head, '#514439', [side * .165, .205, .322], [.045, .054, .016], true);
    oval(head, '#1f2927', [side * .165, .207, .335], [.022, .044, .008], true);
    oval(head, '#fff3d7', [side * .15, .226, .34], [.012, .013, .006], true);
  }
  beam(head, '#73675b', [-.09, -.11, .385], [.09, -.11, .385], .008);
  root.userData.parts = parts;
  return root;
}
export function createModels(scene) {
  const rabbit = citizen('rabbit'), turtle = citizen('turtle');
  turtle.visible = false; scene.add(rabbit, turtle); return { rabbit, turtle };
}
export function poseCharacter(model, pose) {
  model.userData.pose = { ...pose };
  model.position.set(pose.x, pose.pose === 'celebrate' ? .15 : 0, pose.z);
  model.rotation.set(0, pose.yaw, 0);
  const { head, leftArm, rightArm, leftLeg, rightLeg } = model.userData.parts;
  head.rotation.z = pose.pose === 'lean' ? -.19 : 0;
  leftArm.rotation.z = pose.pose === 'celebrate' ? -2.25 : -.11;
  rightArm.rotation.z = pose.pose === 'celebrate' ? 2.25 : pose.pose === 'lean' ? .32 : .11;
  leftLeg.rotation.x = pose.pose === 'celebrate' ? -.22 : 0;
  rightLeg.rotation.x = pose.pose === 'celebrate' ? .22 : 0;
  model.updateMatrixWorld(true);
}
