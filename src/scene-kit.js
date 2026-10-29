import * as THREE from 'three';

const materials = new Map();
export function material(color, toon = false) {
  const key = `${color}:${toon}`;
  if (!materials.has(key)) materials.set(key, toon
    ? new THREE.MeshToonMaterial({ color })
    : new THREE.MeshStandardMaterial({ color, roughness: .9 }));
  return materials.get(key);
}
export function mesh(parent, geometry, color, position, scale = [1, 1, 1], toon = false) {
  const object = new THREE.Mesh(geometry, material(color, toon));
  object.position.set(...position); object.scale.set(...scale);
  object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
}
export const ellipsoid = (parent, color, position, scale, toon = false) => mesh(parent, new THREE.SphereGeometry(1, 24, 16), color, position, scale, toon);
export const block = (parent, color, position, size, toon = false) => mesh(parent, new THREE.BoxGeometry(...size), color, position, [1, 1, 1], toon);
export const column = (parent, color, position, top, bottom, height, sides = 12) => mesh(parent, new THREE.CylinderGeometry(top, bottom, height, sides), color, position);
export function beam(parent, color, from, to, radius = .05, sides = 8) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), direction = b.clone().sub(a);
  const object = mesh(parent, new THREE.CylinderGeometry(radius, radius, direction.length(), sides), color, a.clone().add(b).multiplyScalar(.5).toArray());
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); return object;
}
export function pivot(parent, position) {
  const group = new THREE.Group(); group.position.set(...position); parent.add(group); return group;
}
