import * as THREE from 'three';
import { SCENE_THEMES } from './sceneThemes';
import type { SceneThemeId } from './sceneThemes';

function addMesh(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1]
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function createArmillary(color: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const ring = new THREE.TorusGeometry(0.72, 0.055, 12, 48);
  const star = new THREE.OctahedronGeometry(0.1, 0);
  const center = new THREE.SphereGeometry(0.18, 16, 12);

  const mainRing = addMesh(group, ring, color, [0, 0, 0]);
  const tiltedRing = addMesh(group, ring, color, [0, 0, 0]);
  tiltedRing.rotation.x = Math.PI / 2;
  const crossRing = addMesh(group, ring, color, [0, 0, 0]);
  crossRing.rotation.y = Math.PI / 2;
  addMesh(group, center, color, [0, 0, 0]);
  const stars: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    stars.push(addMesh(group, star, color, [Math.cos(angle) * 0.72, Math.sin(angle) * 0.72, 0]));
  }
  group.userData.animate = (time: number) => {
    mainRing.rotation.z = time * 0.12;
    tiltedRing.rotation.y = time * 0.16;
    crossRing.rotation.z = -time * 0.1;
    for (let i = 0; i < stars.length; i++) {
      stars[i].rotation.y = time * 0.45 + i;
    }
  };
  return group;
}

function createGear(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const ring = new THREE.TorusGeometry(0.72, 0.12, 10, 32);
  const hub = new THREE.CylinderGeometry(0.22, 0.22, 0.34, 12);
  const tooth = new THREE.BoxGeometry(0.24, 0.2, 0.24);

  addMesh(group, ring, material, [0, 0, 0]);
  const hubMesh = addMesh(group, hub, material, [0, 0, 0]);
  hubMesh.rotation.x = Math.PI / 2;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const mesh = addMesh(group, tooth, material, [
      Math.cos(angle) * 0.78,
      Math.sin(angle) * 0.78,
      0,
    ]);
    mesh.rotation.z = angle;
  }
  return group;
}

function createEmbers(material: THREE.Material): THREE.Points {
  const count = 18;
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    phases[i] = (i / count) * Math.PI * 2;
    speeds[i] = 0.25 + (i % 5) * 0.06;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

  const pointsMaterial = new THREE.PointsMaterial({
    color: 0xffa54a,
    size: 0.08,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, pointsMaterial);
  points.frustumCulled = false;
  points.userData.animate = (time: number) => {
    const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const phase = phases[i] + time * speeds[i];
      positionAttribute.setXYZ(
        i,
        Math.sin(phase * 1.7) * (0.28 + (i % 4) * 0.08),
        ((time * speeds[i] + phases[i] * 0.22) % 1) * 1.6,
        Math.cos(phase) * (0.2 + (i % 3) * 0.1)
      );
    }
    positionAttribute.needsUpdate = true;
  };
  return points;
}

function createShieldGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.48, 0.62);
  shape.lineTo(0.48, 0.62);
  shape.lineTo(0.42, -0.02);
  shape.quadraticCurveTo(0.3, -0.42, 0, -0.68);
  shape.quadraticCurveTo(-0.3, -0.42, -0.42, -0.02);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.045,
    bevelThickness: 0.04,
  });
}

function createAcademy(): THREE.Group {
  const group = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd8b978,
    metalness: 0.62,
    roughness: 0.3,
    emissive: 0x39290d,
    emissiveIntensity: 0.55,
  });
  const pedestal = new THREE.CylinderGeometry(0.36, 0.44, 0.18, 16);
  const pedestalTrim = new THREE.TorusGeometry(0.36, 0.035, 8, 24);
  const sideSigns = [-1, 1];
  const animatedObjects: THREE.Object3D[] = [];

  for (const sign of sideSigns) {
    addMesh(group, pedestal, gold, [sign * 2.15, 0.88, 0.25]);
    addMesh(group, pedestalTrim, gold, [sign * 2.15, 0.97, 0.25]);
    const instrument = createArmillary(gold);
    instrument.position.set(sign * 2.15, 1.72, 0.25);
    instrument.scale.setScalar(0.62);
    group.add(instrument);
    animatedObjects.push(instrument);
  }
  group.userData.animate = (time: number) => {
    for (let i = 0; i < animatedObjects.length; i++) {
      animatedObjects[i].userData.animate(time + i * Math.PI);
    }
  };
  return group;
}

function createWorkshop(): THREE.Group {
  const group = new THREE.Group();
  const iron = new THREE.MeshStandardMaterial({ color: 0x455448, metalness: 0.72, roughness: 0.38 });
  const forge = new THREE.MeshStandardMaterial({
    color: 0x743c22,
    emissive: 0xe8863a,
    emissiveIntensity: 0.4,
    roughness: 0.46,
  });
  const arch = new THREE.TorusGeometry(0.38, 0.1, 10, 32);
  const chimney = new THREE.CylinderGeometry(0.16, 0.23, 1.8, 8);
  const barrel = new THREE.CylinderGeometry(0.46, 0.52, 0.9, 10);
  const fireCore = new THREE.MeshStandardMaterial({
    color: 0xff9a42,
    emissive: 0xe84c13,
    emissiveIntensity: 1.8,
    roughness: 0.3,
  });
  const sideSigns = [-1, 1];
  const animatedObjects: THREE.Object3D[] = [];

  for (const sign of sideSigns) {
    const display = new THREE.Group();
    addMesh(display, arch, forge, [0, 1.45, 0]);
    addMesh(display, chimney, iron, [0, 1.45, -1.45]);
    addMesh(display, chimney, iron, [0, 1.45, 1.45]);
    const gear = createGear(iron);
    gear.position.set(0, 2.65, 0);
    display.add(gear);
    const embers = createEmbers(fireCore);
    embers.position.set(0, 0.65, 0);
    display.add(embers);
    animatedObjects.push(gear, embers);
    addMesh(display, barrel, iron, [0, 0.45, -2.3]);
    addMesh(display, barrel, iron, [0, 0.45, 2.3]);
    display.position.set(sign * 2.3, 0, 0);
    display.scale.setScalar(0.62);
    group.add(display);
  }
  group.userData.animate = (time: number) => {
    for (let i = 0; i < animatedObjects.length; i += 2) {
      animatedObjects[i].rotation.z = Math.sin(time * 0.35 + i) * 0.08;
      animatedObjects[i + 1].userData.animate(time + i);
    }
  };
  return group;
}

function createDuelHall(): THREE.Group {
  const group = new THREE.Group();
  const purple = new THREE.MeshStandardMaterial({
    color: 0x7455a6,
    emissive: 0x271747,
    emissiveIntensity: 0.72,
    roughness: 0.38,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd8b978,
    metalness: 0.68,
    roughness: 0.3,
    emissive: 0x241408,
    emissiveIntensity: 0.3,
  });
  const bannerShape = new THREE.Shape();
  bannerShape.moveTo(-0.48, 0.95);
  bannerShape.lineTo(0.48, 0.95);
  bannerShape.lineTo(0.48, -0.55);
  bannerShape.lineTo(0, -0.9);
  bannerShape.lineTo(-0.48, -0.55);
  bannerShape.closePath();
  const bannerGeometry = new THREE.ShapeGeometry(bannerShape);
  const shieldGeometry = createShieldGeometry();
  const pole = new THREE.CylinderGeometry(0.028, 0.028, 2.1, 8);
  const finial = new THREE.SphereGeometry(0.085, 12, 8);
  const sideSigns = [-1, 1];
  const standards: THREE.Group[] = [];

  for (const sign of sideSigns) {
    const standard = new THREE.Group();
    addMesh(standard, pole, gold, [0, 0, 0]);
    addMesh(standard, finial, gold, [0, 1.15, 0]);
    addMesh(standard, bannerGeometry, purple, [0.36, 0.32, 0.02]);
    const shield = addMesh(standard, shieldGeometry, gold, [0.36, 0.32, 0.08]);
    shield.scale.set(0.42, 0.42, 0.42);
    standard.position.set(sign * 2.45, 1.95, -3.2);
    standard.scale.setScalar(0.78);
    group.add(standard);
    standards.push(standard);
  }
  group.userData.animate = (time: number) => {
    for (let i = 0; i < standards.length; i++) {
      standards[i].rotation.z = Math.sin(time * 0.7 + i * Math.PI) * 0.035;
    }
  };
  return group;
}

export function createSceneEnvironments(): Record<SceneThemeId, THREE.Group> {
  const environments: Record<SceneThemeId, THREE.Group> = {
    mentor: createAcademy(),
    roast: createWorkshop(),
    rival: createDuelHall(),
  };

  for (const [themeId, group] of Object.entries(environments) as [SceneThemeId, THREE.Group][]) {
    group.name = `environment-${themeId}`;
    group.visible = false;
    group.userData.themeName = SCENE_THEMES[themeId].name;
  }

  return environments;
}
