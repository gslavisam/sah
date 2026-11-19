import * as THREE from 'three';
import type { PersonaId } from './geminiService';

export type HologramReactionType =
  | 'idle'
  | 'materialize'
  | 'playerMove'
  | 'aiMove'
  | 'playerCapture'
  | 'aiCapture'
  | 'check'
  | 'victory'
  | 'defeat'
  | 'draw'
  | 'undo';

interface PersonaVisualSpec {
  primaryHex: number;
  accentHex: number;
  eyeHex: number;
  scanSpeed: number;
  baseGlitch: number;
}

const PERSONA_SPECS: Record<PersonaId, PersonaVisualSpec> = {
  mentor: {
    primaryHex: 0x5da9ff,
    accentHex: 0xf5d76e,
    eyeHex: 0x9be2ff,
    scanSpeed: 4.5,
    baseGlitch: 0.002,
  },
  roast: {
    primaryHex: 0x3be87a,
    accentHex: 0xff7838,
    eyeHex: 0xd9ff54,
    scanSpeed: 9.2,
    baseGlitch: 0.016,
  },
  rival: {
    primaryHex: 0x9c75e8,
    accentHex: 0xe3dcff,
    eyeHex: 0xff5a8a,
    scanSpeed: 5.8,
    baseGlitch: 0.005,
  },
};

const ALTAR_HOLOGRAM_Y = 0.748;
const OPPONENT_SIDE_Z = 1.86;
const PARTICLE_COUNT = 38;

const _tmpColorA = new THREE.Color();
const _tmpColorB = new THREE.Color();

function createRadialGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 126);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.28, 'rgba(255, 255, 255, 0.65)');
    grad.addColorStop(0.62, 'rgba(255, 255, 255, 0.18)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createHologramShaderMaterial(
  primaryHex: number,
  accentHex: number,
  scanSpeed: number,
  baseOpacity = 0.78
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(primaryHex) },
      uAccentColor: { value: new THREE.Color(accentHex) },
      uOpacity: { value: baseOpacity },
      uPulse: { value: 0 },
      uGlitch: { value: 0 },
      uScanSpeed: { value: scanSpeed },
      uDissolve: { value: 0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uGlitch;
      uniform float uPulse;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vWorldPos;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec3 pos = position;

        // Subtle holographic jitter + scan-band glitch
        float band = step(0.65, sin(pos.y * 22.0 + uTime * 19.0));
        float jitter = sin(uTime * 43.0 + pos.y * 37.0) * uGlitch * (0.45 + band * 1.4);
        pos.x += jitter;
        pos += normal * (uPulse * 0.012);

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        vec4 mvPosition = viewMatrix * worldPos;
        vViewPos = -mvPosition.xyz;
        vNormalView = normalize(normalMatrix * normal);

        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uAccentColor;
      uniform float uOpacity;
      uniform float uPulse;
      uniform float uScanSpeed;
      uniform float uDissolve;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vWorldPos;
      varying vec2 vUv;

      void main() {
        vec3 viewDir = normalize(vViewPos);
        float ndotv = abs(dot(normalize(vNormalView), viewDir));
        float fresnel = pow(1.0 - clamp(ndotv, 0.0, 1.0), 2.15);

        // Animated horizontal holographic scanlines + slow upward sweep
        float scan = 0.72 + 0.28 * sin(vWorldPos.y * 85.0 - uTime * uScanSpeed);
        float sweep = smoothstep(0.0, 1.0, sin(vWorldPos.y * 7.5 - uTime * 2.2) * 0.5 + 0.5);

        vec3 baseCol = mix(uColor, uAccentColor, fresnel * 0.65 + uPulse * 0.35 + sweep * 0.14);
        float intensity = (0.34 + fresnel * 1.15 + uPulse * 0.55) * scan;

        // Optional shatter/dissolve fade on defeat
        float alphaNoise = fract(sin(dot(vWorldPos.xy * 18.0, vec2(12.9898, 78.233))) * 43758.5453);
        if (uDissolve > 0.01 && alphaNoise < uDissolve) {
          discard;
        }

        float alpha = clamp((0.26 + fresnel * 0.74) * scan * uOpacity * (1.0 + uPulse * 0.35), 0.0, 0.96);
        gl_FragColor = vec4(baseCol * intensity, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

function createStarShape(outerR: number, innerR: number, points = 4): THREE.Shape {
  const shape = new THREE.Shape();
  const total = points * 2;
  for (let i = 0; i <= total; i++) {
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function createShieldShape(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-0.22, 0.28);
  shape.lineTo(0.22, 0.28);
  shape.lineTo(0.19, -0.02);
  shape.quadraticCurveTo(0.14, -0.22, 0, -0.34);
  shape.quadraticCurveTo(-0.14, -0.22, -0.19, -0.02);
  shape.closePath();
  return shape;
}

function createSwordBladeShape(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-0.022, -0.22);
  shape.lineTo(0.022, -0.22);
  shape.lineTo(0.018, 0.24);
  shape.lineTo(0, 0.34);
  shape.lineTo(-0.018, 0.24);
  shape.closePath();
  return shape;
}

function createGoblinEarGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.03);
  shape.quadraticCurveTo(0.1, -0.01, 0.21, 0.09);
  shape.quadraticCurveTo(0.09, 0.07, 0, 0.045);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.006,
    bevelThickness: 0.006,
  });
}

function createKnightPlumeGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.02, 0);
  shape.quadraticCurveTo(-0.08, 0.16, -0.03, 0.26);
  shape.quadraticCurveTo(0.07, 0.22, 0.14, 0.06);
  shape.quadraticCurveTo(0.08, 0.03, 0.02, -0.04);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.026,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.008,
    bevelThickness: 0.008,
  });
}

function createMentorCharacter(
  bodyMat: THREE.ShaderMaterial,
  accentMat: THREE.ShaderMaterial,
  eyeMat: THREE.MeshBasicMaterial
): { root: THREE.Group; crest: THREE.Group; innerCore: THREE.Mesh } {
  const root = new THREE.Group();

  // Flowing archmage mantle & shoulder cape
  const mantleProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.28, 0.0),
    new THREE.Vector2(0.24, 0.14),
    new THREE.Vector2(0.2, 0.28),
    new THREE.Vector2(0.11, 0.36),
    new THREE.Vector2(0.0, 0.37),
  ];
  const mantle = new THREE.Mesh(new THREE.LatheGeometry(mantleProfile, 32), bodyMat);
  mantle.position.y = 0.14;
  root.add(mantle);

  // Inner chest arcane crystal
  const innerCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), accentMat);
  innerCore.position.set(0, 0.36, 0.11);
  root.add(innerCore);

  // Flowing beard silhouette
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.22, 16), bodyMat);
  beard.rotation.x = Math.PI;
  beard.position.set(0, 0.43, 0.07);
  root.add(beard);

  // Head + hood sphere
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), bodyMat);
  head.position.set(0, 0.55, 0);
  root.add(head);

  // Glowing arcane eyes
  const eyeGeo = new THREE.SphereGeometry(0.017, 10, 8);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(s * 0.038, 0.56, 0.095);
    eye.scale.set(1.25, 0.7, 0.6);
    root.add(eye);
  }

  // Pointed wizard hat brim + curved spire
  const hatProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.21, 0.015),
    new THREE.Vector2(0.19, 0.035),
    new THREE.Vector2(0.11, 0.06),
    new THREE.Vector2(0.075, 0.16),
    new THREE.Vector2(0.028, 0.28),
    new THREE.Vector2(0.0, 0.34),
  ];
  const hat = new THREE.Mesh(new THREE.LatheGeometry(hatProfile, 28), bodyMat);
  hat.position.set(0, 0.61, -0.01);
  hat.rotation.x = -0.14;
  root.add(hat);

  // Floating astrolabe crest behind shoulders
  const crest = new THREE.Group();
  crest.position.set(0, 0.54, -0.18);

  const outerAstrolabe = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.014, 10, 48), accentMat);
  const innerAstrolabe = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.011, 10, 40), accentMat);
  innerAstrolabe.rotation.y = Math.PI / 3;
  crest.add(outerAstrolabe, innerAstrolabe);

  const starGeo = new THREE.ExtrudeGeometry(createStarShape(0.22, 0.055, 4), {
    depth: 0.016,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.005,
    bevelThickness: 0.005,
  });
  starGeo.center();
  const starA = new THREE.Mesh(starGeo, accentMat);
  const starB = new THREE.Mesh(starGeo, accentMat);
  starB.rotation.z = Math.PI / 4;
  starB.scale.setScalar(0.74);
  crest.add(starA, starB);

  crest.userData.outerRing = outerAstrolabe;
  crest.userData.innerRing = innerAstrolabe;
  root.add(crest);

  return { root, crest, innerCore };
}

function createRoastCharacter(
  bodyMat: THREE.ShaderMaterial,
  accentMat: THREE.ShaderMaterial,
  eyeMat: THREE.MeshBasicMaterial
): { root: THREE.Group; crest: THREE.Group; innerCore: THREE.Mesh } {
  const root = new THREE.Group();

  // Hunched mischievous goblin mantle
  const torsoProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.24, 0.0),
    new THREE.Vector2(0.21, 0.12),
    new THREE.Vector2(0.18, 0.25),
    new THREE.Vector2(0.13, 0.31),
    new THREE.Vector2(0.0, 0.32),
  ];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 24), bodyMat);
  torso.position.set(0, 0.14, 0.02);
  torso.rotation.x = 0.14;
  root.add(torso);

  // Alchemical collar sparks / core
  const innerCore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.068, 0), accentMat);
  innerCore.position.set(0, 0.34, 0.13);
  root.add(innerCore);

  // Goblin head (slightly wider/angular)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.112, 20, 16), bodyMat);
  head.position.set(0, 0.51, 0.04);
  head.scale.set(1.12, 0.94, 1.05);
  root.add(head);

  // Sharp pointed goblin ears
  const earGeo = createGoblinEarGeometry();
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, bodyMat);
    ear.position.set(s * 0.095, 0.52, 0.02);
    ear.rotation.y = s === 1 ? -0.25 : Math.PI + 0.25;
    ear.rotation.z = 0.22;
    root.add(ear);
  }

  // Mischievous glowing eyes + tinker goggles
  const eyeGeo = new THREE.SphereGeometry(0.022, 10, 8);
  const goggleRingGeo = new THREE.TorusGeometry(0.036, 0.008, 8, 20);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(s * 0.048, 0.52, 0.135);
    eye.scale.set(1.2, 0.8, 0.6);
    root.add(eye);

    const goggle = new THREE.Mesh(goggleRingGeo, accentMat);
    goggle.position.set(s * 0.046, 0.565, 0.125);
    goggle.rotation.x = -0.35;
    root.add(goggle);
  }

  // Crooked grin arc
  const grin = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 6, 16, Math.PI * 0.8), accentMat);
  grin.position.set(0, 0.465, 0.125);
  grin.rotation.z = Math.PI + 0.35;
  root.add(grin);

  // Tilted spiked goblin crown
  const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.055, 12, 1, true), accentMat);
  crownBase.position.set(0.015, 0.62, 0.02);
  crownBase.rotation.z = -0.18;
  root.add(crownBase);

  // Floating chaotic gear & flame-spike crest behind
  const crest = new THREE.Group();
  crest.position.set(0, 0.53, -0.18);

  const gearRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.024, 8, 28), accentMat);
  crest.add(gearRing);

  const toothGeo = new THREE.BoxGeometry(0.055, 0.07, 0.024);
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const tooth = new THREE.Mesh(toothGeo, accentMat);
    tooth.position.set(Math.cos(angle) * 0.32, Math.sin(angle) * 0.32, 0);
    tooth.rotation.z = angle + Math.PI / 2;
    crest.add(tooth);
  }

  const bombCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), bodyMat);
  crest.add(bombCore);

  crest.userData.gearRing = crest;
  root.add(crest);

  return { root, crest, innerCore };
}

function createRivalCharacter(
  bodyMat: THREE.ShaderMaterial,
  accentMat: THREE.ShaderMaterial,
  eyeMat: THREE.MeshBasicMaterial
): { root: THREE.Group; crest: THREE.Group; innerCore: THREE.Mesh } {
  const root = new THREE.Group();

  // Armored knight chestplate & gorget
  const armorProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.26, 0.0),
    new THREE.Vector2(0.25, 0.15),
    new THREE.Vector2(0.23, 0.27),
    new THREE.Vector2(0.13, 0.35),
    new THREE.Vector2(0.0, 0.36),
  ];
  const armor = new THREE.Mesh(new THREE.LatheGeometry(armorProfile, 24), bodyMat);
  armor.position.y = 0.14;
  root.add(armor);

  // Broad beveled pauldrons
  const pauldronGeo = new THREE.SphereGeometry(0.125, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58);
  for (const s of [-1, 1]) {
    const pauldron = new THREE.Mesh(pauldronGeo, bodyMat);
    pauldron.position.set(s * 0.22, 0.36, 0);
    pauldron.rotation.z = -s * 0.42;
    pauldron.scale.set(1.15, 0.9, 1.05);
    root.add(pauldron);
  }

  // Chest heraldic diamond core
  const innerCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.072, 0), accentMat);
  innerCore.position.set(0, 0.35, 0.15);
  innerCore.scale.set(0.9, 1.25, 0.6);
  root.add(innerCore);

  // Knight great-helm
  const helmProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.112, 0.0),
    new THREE.Vector2(0.114, 0.12),
    new THREE.Vector2(0.095, 0.19),
    new THREE.Vector2(0.045, 0.225),
    new THREE.Vector2(0.0, 0.232),
  ];
  const helm = new THREE.Mesh(new THREE.LatheGeometry(helmProfile, 24), bodyMat);
  helm.position.set(0, 0.48, 0);
  root.add(helm);

  // Glowing T-visor slit
  const visorH = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.02), eyeMat);
  visorH.position.set(0, 0.59, 0.105);
  const visorV = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.085, 0.02), eyeMat);
  visorV.position.set(0, 0.56, 0.105);
  root.add(visorH, visorV);

  // Swept royal helm plume
  const plumeGeo = createKnightPlumeGeometry();
  plumeGeo.center();
  const plume = new THREE.Mesh(plumeGeo, accentMat);
  plume.position.set(0, 0.75, -0.02);
  plume.rotation.y = Math.PI / 2;
  root.add(plume);

  // Floating Heraldic Kite Shield + Crossed Spectral Blades crest
  const crest = new THREE.Group();
  crest.position.set(0, 0.54, -0.2);

  const shieldGeo = new THREE.ExtrudeGeometry(createShieldShape(), {
    depth: 0.022,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.01,
    bevelThickness: 0.01,
  });
  shieldGeo.center();
  const shield = new THREE.Mesh(shieldGeo, bodyMat);
  crest.add(shield);

  const bladeGeo = new THREE.ExtrudeGeometry(createSwordBladeShape(), {
    depth: 0.012,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.004,
    bevelThickness: 0.004,
  });
  bladeGeo.center();
  const guardGeo = new THREE.BoxGeometry(0.11, 0.018, 0.024);

  for (const s of [-1, 1]) {
    const sword = new THREE.Group();
    const blade = new THREE.Mesh(bladeGeo, accentMat);
    const guard = new THREE.Mesh(guardGeo, accentMat);
    guard.position.y = -0.17;
    sword.add(blade, guard);
    sword.rotation.z = s * 0.62;
    sword.position.z = -0.03;
    crest.add(sword);
  }

  root.add(crest);
  return { root, crest, innerCore };
}

export interface OpponentHologramSystem {
  group: THREE.Group;
  setPersona: (personaId: PersonaId) => void;
  setPlayerSide: (playerColor: 'w' | 'b', immediate?: boolean) => void;
  setModeVisible: (visible: boolean) => void;
  setCameraView: (view: string) => void;
  setThinking: (thinking: boolean) => void;
  triggerReaction: (type: HologramReactionType) => void;
  update: (dt: number, elapsedTime: number) => void;
  getState: () => {
    persona: PersonaId;
    playerColor: 'w' | 'b';
    reaction: HologramReactionType;
    targetZ: number;
    currentZ: number;
    visible: boolean;
  };
  dispose: () => void;
}

export function createOpponentHologramSystem(): OpponentHologramSystem {
  const group = new THREE.Group();
  group.name = 'opponent-hologram-rig';

  let activePersona: PersonaId = 'mentor';
  let currentPlayerColor: 'w' | 'b' = 'w';
  let hasPositionedOnce = false;
  let isModeVisible = true;
  let currentCameraView = 'player';
  let isThinking = false;

  let targetZ = -OPPONENT_SIDE_Z;
  let targetYaw = 0;
  let currentZ = targetZ;
  let currentYaw = targetYaw;

  let currentOpacityScale = 1;
  let targetOpacityScale = 1;

  // Reaction state machine
  let reactionType: HologramReactionType = 'idle';
  let reactionStrength = 0;
  let shockwaveProgress = 1;
  let defeatDissolve = 0;
  let victoryBeamBoost = 0;

  const glowTexture = createRadialGlowTexture();

  const bodyMaterial = createHologramShaderMaterial(
    PERSONA_SPECS.mentor.primaryHex,
    PERSONA_SPECS.mentor.accentHex,
    PERSONA_SPECS.mentor.scanSpeed,
    0.84
  );
  const accentMaterial = createHologramShaderMaterial(
    PERSONA_SPECS.mentor.accentHex,
    0xffffff,
    PERSONA_SPECS.mentor.scanSpeed * 1.15,
    0.92
  );
  const eyeMaterial = new THREE.MeshBasicMaterial({
    color: PERSONA_SPECS.mentor.eyeHex,
    transparent: true,
    opacity: 0.95,
  });

  // Base projection pad (runic concentric rings + ground aura + shockwave + light pillar)
  const basePadGroup = new THREE.Group();
  group.add(basePadGroup);

  const outerRingMat = new THREE.MeshBasicMaterial({
    color: PERSONA_SPECS.mentor.primaryHex,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: PERSONA_SPECS.mentor.accentHex,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const outerBaseRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.012, 8, 48), outerRingMat);
  outerBaseRing.rotation.x = Math.PI / 2;
  basePadGroup.add(outerBaseRing);

  const innerRuneRing = new THREE.Group();
  const innerTorus = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.009, 8, 36), innerRingMat);
  innerTorus.rotation.x = Math.PI / 2;
  innerRuneRing.add(innerTorus);

  const runeTickGeo = new THREE.BoxGeometry(0.022, 0.01, 0.075);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const tick = new THREE.Mesh(runeTickGeo, innerRingMat);
    tick.position.set(Math.cos(angle) * 0.39, 0.005, Math.sin(angle) * 0.39);
    tick.rotation.y = -angle + Math.PI / 2;
    innerRuneRing.add(tick);
  }
  basePadGroup.add(innerRuneRing);

  const groundGlowMat = new THREE.MeshBasicMaterial({
    map: glowTexture,
    color: PERSONA_SPECS.mentor.primaryHex,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const groundGlowDisc = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 1.18), groundGlowMat);
  groundGlowDisc.rotation.x = -Math.PI / 2;
  groundGlowDisc.position.y = -0.01;
  basePadGroup.add(groundGlowDisc);

  // Vertical projection cone beam
  const beamMat = new THREE.MeshBasicMaterial({
    color: PERSONA_SPECS.mentor.primaryHex,
    transparent: true,
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const projectionBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.24, 0.85, 24, 1, true),
    beamMat
  );
  projectionBeam.position.y = 0.42;
  basePadGroup.add(projectionBeam);

  // Expanding shockwave ring for captures / checks / checkmate
  const shockwaveMat = new THREE.MeshBasicMaterial({
    color: PERSONA_SPECS.mentor.accentHex,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const shockwaveRing = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.31, 40), shockwaveMat);
  shockwaveRing.rotation.x = -Math.PI / 2;
  shockwaveRing.position.y = 0.02;
  basePadGroup.add(shockwaveRing);

  // Subtle holographic point light illuminating the back rim of the board
  const auraLight = new THREE.PointLight(PERSONA_SPECS.mentor.primaryHex, 0.9, 2.8, 2);
  auraLight.position.set(0, 0.58, 0.12);
  group.add(auraLight);

  // Ascending magical motes
  const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  const particlePhases = new Float32Array(PARTICLE_COUNT);
  const particleRadii = new Float32Array(PARTICLE_COUNT);
  const particleSpeeds = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particlePhases[i] = (i / PARTICLE_COUNT) * Math.PI * 2;
    particleRadii[i] = 0.18 + ((i * 37) % 100) * 0.0028;
    particleSpeeds[i] = 0.35 + ((i * 19) % 10) * 0.045;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    map: glowTexture,
    color: PERSONA_SPECS.mentor.accentHex,
    size: 0.075,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  particles.frustumCulled = false;
  group.add(particles);

  // Character hologram containers
  const avatarPivot = new THREE.Group();
  group.add(avatarPivot);

  const characters: Record<
    PersonaId,
    { root: THREE.Group; crest: THREE.Group; innerCore: THREE.Mesh }
  > = {
    mentor: createMentorCharacter(bodyMaterial, accentMaterial, eyeMaterial),
    roast: createRoastCharacter(bodyMaterial, accentMaterial, eyeMaterial),
    rival: createRivalCharacter(bodyMaterial, accentMaterial, eyeMaterial),
  };

  for (const [id, char] of Object.entries(characters) as [
    PersonaId,
    { root: THREE.Group; crest: THREE.Group; innerCore: THREE.Mesh }
  ][]) {
    char.root.visible = id === activePersona;
    avatarPivot.add(char.root);
  }

  function syncTargetOpacity() {
    if (!isModeVisible) {
      targetOpacityScale = 0;
    } else if (currentCameraView === 'top') {
      targetOpacityScale = 0.55;
    } else {
      targetOpacityScale = 1;
    }
  }

  function applyPersonaPalette(personaId: PersonaId) {
    const spec = PERSONA_SPECS[personaId] || PERSONA_SPECS.mentor;
    bodyMaterial.uniforms.uColor.value.setHex(spec.primaryHex);
    bodyMaterial.uniforms.uAccentColor.value.setHex(spec.accentHex);
    bodyMaterial.uniforms.uScanSpeed.value = spec.scanSpeed;

    accentMaterial.uniforms.uColor.value.setHex(spec.accentHex);
    accentMaterial.uniforms.uAccentColor.value.setHex(0xffffff);
    accentMaterial.uniforms.uScanSpeed.value = spec.scanSpeed * 1.15;

    eyeMaterial.color.setHex(spec.eyeHex);
    outerRingMat.color.setHex(spec.primaryHex);
    innerRingMat.color.setHex(spec.accentHex);
    groundGlowMat.color.setHex(spec.primaryHex);
    beamMat.color.setHex(spec.primaryHex);
    shockwaveMat.color.setHex(spec.accentHex);
    particleMat.color.setHex(spec.accentHex);
    auraLight.color.setHex(spec.primaryHex);
  }

  function setPersona(personaId: PersonaId) {
    const next: PersonaId = personaId in characters ? personaId : 'mentor';
    const changed = next !== activePersona;
    activePersona = next;
    for (const [id, char] of Object.entries(characters) as [
      PersonaId,
      { root: THREE.Group; crest: THREE.Group; innerCore: THREE.Mesh }
    ][]) {
      char.root.visible = id === activePersona;
    }
    applyPersonaPalette(activePersona);
    if (changed) {
      triggerReaction('materialize');
    }
  }

  function setPlayerSide(playerColor: 'w' | 'b', immediate = false) {
    currentPlayerColor = playerColor === 'b' ? 'b' : 'w';
    targetZ = currentPlayerColor === 'w' ? -OPPONENT_SIDE_Z : OPPONENT_SIDE_Z;
    targetYaw = currentPlayerColor === 'w' ? 0 : Math.PI;
    if (immediate || !hasPositionedOnce) {
      currentZ = targetZ;
      currentYaw = targetYaw;
      hasPositionedOnce = true;
    }
    group.position.set(0, ALTAR_HOLOGRAM_Y, currentZ);
    group.rotation.y = currentYaw;
  }

  function setModeVisible(visible: boolean) {
    isModeVisible = Boolean(visible);
    syncTargetOpacity();
    if (!isModeVisible) {
      group.visible = false;
      currentOpacityScale = 0;
    } else {
      group.visible = true;
    }
  }

  function setCameraView(view: string) {
    currentCameraView = view;
    syncTargetOpacity();
  }

  function setThinking(thinking: boolean) {
    isThinking = Boolean(thinking);
  }

  function triggerReaction(type: HologramReactionType) {
    reactionType = type;
    defeatDissolve = 0;
    victoryBeamBoost = 0;

    if (type === 'materialize') {
      reactionStrength = 0.85;
      shockwaveProgress = 0;
    } else if (type === 'playerMove') {
      reactionStrength = 0.28;
    } else if (type === 'aiMove') {
      reactionStrength = 0.52;
    } else if (type === 'playerCapture') {
      reactionStrength = 0.82;
      shockwaveProgress = 0;
    } else if (type === 'aiCapture') {
      reactionStrength = 1.0;
      shockwaveProgress = 0;
    } else if (type === 'check') {
      reactionStrength = 1.05;
      shockwaveProgress = 0;
    } else if (type === 'victory') {
      reactionStrength = 1.3;
      shockwaveProgress = 0;
      victoryBeamBoost = 1;
    } else if (type === 'defeat') {
      reactionStrength = 1.15;
      shockwaveProgress = 0;
      defeatDissolve = 0.05;
    } else if (type === 'draw' || type === 'undo') {
      reactionStrength = 0.65;
      shockwaveProgress = 0;
    }
  }

  // Initialize default placement
  setPlayerSide('w', true);
  applyPersonaPalette('mentor');

  function update(dt: number, elapsedTime: number) {
    const safeDt = Math.min(Math.max(dt, 0), 0.1);
    currentOpacityScale = THREE.MathUtils.damp(currentOpacityScale, targetOpacityScale, 7, safeDt);
    group.visible = currentOpacityScale > 0.02;
    if (!group.visible) return;

    // Smoothly glide hologram across the altar when player switches White <-> Black
    currentZ = THREE.MathUtils.damp(currentZ, targetZ, 5.5, safeDt);
    currentYaw = THREE.MathUtils.damp(currentYaw, targetYaw, 6.5, safeDt);
    group.position.set(0, ALTAR_HOLOGRAM_Y, currentZ);
    group.rotation.y = currentYaw;

    // Decay reaction envelope
    const decayRate =
      reactionType === 'victory' || reactionType === 'defeat'
        ? 0.65
        : reactionType === 'check'
          ? 1.55
          : 2.35;
    reactionStrength = THREE.MathUtils.damp(reactionStrength, 0, decayRate, safeDt);
    if (reactionStrength < 0.02 && shockwaveProgress >= 1) {
      reactionType = 'idle';
    }

    if (shockwaveProgress < 1) {
      shockwaveProgress = Math.min(1, shockwaveProgress + safeDt * 1.45);
      const easeOut = 1 - Math.pow(1 - shockwaveProgress, 3);
      const swScale = 1 + easeOut * 2.4;
      shockwaveRing.scale.setScalar(swScale);
      shockwaveMat.opacity = (1 - shockwaveProgress) * 0.88 * currentOpacityScale;
    } else {
      shockwaveMat.opacity = 0;
    }

    if (reactionType === 'defeat') {
      defeatDissolve = Math.min(0.88, defeatDissolve + safeDt * 0.48);
    } else {
      defeatDissolve = THREE.MathUtils.damp(defeatDissolve, 0, 5, safeDt);
    }

    victoryBeamBoost = THREE.MathUtils.damp(victoryBeamBoost, 0, 0.9, safeDt);

    const spec = PERSONA_SPECS[activePersona] || PERSONA_SPECS.mentor;
    const thinkBoost = isThinking ? 0.35 : 0;
    const pulse = Math.min(1.4, reactionStrength + thinkBoost);
    const isHitReaction = reactionType === 'playerCapture' || reactionType === 'defeat' || reactionType === 'undo';
    const glitch =
      spec.baseGlitch +
      (isHitReaction ? reactionStrength * 0.045 : reactionStrength * 0.012);

    bodyMaterial.uniforms.uTime.value = elapsedTime;
    bodyMaterial.uniforms.uPulse.value = pulse;
    bodyMaterial.uniforms.uGlitch.value = glitch;
    bodyMaterial.uniforms.uOpacity.value = 0.84 * currentOpacityScale * (1 - defeatDissolve * 0.55);
    bodyMaterial.uniforms.uDissolve.value = defeatDissolve;

    accentMaterial.uniforms.uTime.value = elapsedTime;
    accentMaterial.uniforms.uPulse.value = pulse * 1.15;
    accentMaterial.uniforms.uGlitch.value = glitch * 0.8;
    accentMaterial.uniforms.uOpacity.value = 0.92 * currentOpacityScale * (1 - defeatDissolve * 0.45);
    accentMaterial.uniforms.uDissolve.value = defeatDissolve * 0.7;

    // Color flash on check/capture
    _tmpColorA.setHex(spec.accentHex);
    if (reactionType === 'check' || reactionType === 'aiCapture') {
      _tmpColorB.setHex(0xff5252);
      _tmpColorA.lerp(_tmpColorB, Math.min(1, reactionStrength * 0.65));
    } else if (reactionType === 'victory') {
      _tmpColorB.setHex(0xfff0a8);
      _tmpColorA.lerp(_tmpColorB, Math.min(1, reactionStrength * 0.7));
    }
    shockwaveMat.color.copy(_tmpColorA);

    // Levitation & character-specific posture animations
    const hoverAmp = activePersona === 'roast' ? 0.032 : 0.024;
    const hoverFreq = activePersona === 'roast' ? 2.6 : 1.75;
    let yOffset = Math.sin(elapsedTime * hoverFreq) * hoverAmp;
    let pitch = Math.sin(elapsedTime * 1.1) * 0.03;
    let yawWobble = Math.sin(elapsedTime * 0.85) * 0.06;

    if (reactionType === 'aiCapture' || reactionType === 'victory' || reactionType === 'check') {
      pitch += reactionStrength * 0.14;
      yOffset += reactionStrength * 0.06;
    } else if (reactionType === 'playerCapture' || reactionType === 'defeat') {
      pitch -= reactionStrength * 0.12;
      yawWobble += Math.sin(elapsedTime * 34) * reactionStrength * 0.08;
      yOffset -= defeatDissolve * 0.14;
    } else if (reactionType === 'materialize') {
      yOffset -= (1 - Math.max(0, 1 - reactionStrength)) * 0.08;
    }

    avatarPivot.position.y = yOffset;
    avatarPivot.rotation.set(pitch, yawWobble, 0);
    const matScale =
      reactionType === 'materialize'
        ? 0.86 + (1 - Math.min(1, reactionStrength)) * 0.14
        : 1 + reactionStrength * 0.045;
    avatarPivot.scale.setScalar(matScale);

    // Animate base rings & beam
    const spinSpeed = 0.45 + pulse * 1.3;
    outerBaseRing.rotation.z = elapsedTime * 0.25;
    innerRuneRing.rotation.y = -elapsedTime * spinSpeed;
    beamMat.opacity = (0.12 + pulse * 0.14 + victoryBeamBoost * 0.22) * currentOpacityScale;
    projectionBeam.scale.set(1 + victoryBeamBoost * 0.2, 1 + victoryBeamBoost * 0.85, 1 + victoryBeamBoost * 0.2);
    groundGlowMat.opacity = (0.48 + pulse * 0.25) * currentOpacityScale;
    outerRingMat.opacity = (0.58 + pulse * 0.3) * currentOpacityScale;
    innerRingMat.opacity = (0.68 + pulse * 0.28) * currentOpacityScale;
    eyeMaterial.opacity = (0.85 + Math.sin(elapsedTime * 3.2) * 0.12) * currentOpacityScale;
    auraLight.intensity = (0.85 + pulse * 1.35 + victoryBeamBoost * 1.4) * currentOpacityScale;

    // Animate active character crest & inner core
    const activeChar = characters[activePersona];
    if (activeChar) {
      activeChar.innerCore.rotation.y = elapsedTime * (1.2 + pulse * 1.8);
      activeChar.innerCore.rotation.x = elapsedTime * 0.7;

      if (activePersona === 'mentor') {
        const outer = activeChar.crest.userData.outerRing as THREE.Mesh | undefined;
        const inner = activeChar.crest.userData.innerRing as THREE.Mesh | undefined;
        if (outer) {
          outer.rotation.z = elapsedTime * (0.35 + pulse * 0.8);
          outer.rotation.x = Math.sin(elapsedTime * 0.7) * 0.25;
        }
        if (inner) {
          inner.rotation.y = -elapsedTime * (0.55 + pulse * 1.1);
          inner.rotation.z = elapsedTime * 0.3;
        }
        activeChar.crest.rotation.z = elapsedTime * 0.18;
      } else if (activePersona === 'roast') {
        activeChar.crest.rotation.z = -elapsedTime * (0.75 + pulse * 1.8);
        activeChar.crest.rotation.y = Math.sin(elapsedTime * 2.4) * 0.16;
      } else if (activePersona === 'rival') {
        activeChar.crest.rotation.y = Math.sin(elapsedTime * 1.3) * 0.14;
        activeChar.crest.position.y = 0.54 + Math.sin(elapsedTime * 2.0) * 0.025;
      }
    }

    // Update ascending particle motes
    const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
    const swirlMult = 1 + pulse * 1.45;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const phase = particlePhases[i] + elapsedTime * particleSpeeds[i] * swirlMult;
      const heightProg = (elapsedTime * particleSpeeds[i] * 0.55 + i / PARTICLE_COUNT) % 1;
      const radius = particleRadii[i] * (1 + reactionStrength * 0.28 - heightProg * 0.22);
      posAttr.setXYZ(
        i,
        Math.cos(phase * 1.4) * radius,
        0.04 + heightProg * (0.92 + victoryBeamBoost * 0.4),
        Math.sin(phase * 1.4) * radius
      );
    }
    posAttr.needsUpdate = true;
    particleMat.opacity = (0.72 + pulse * 0.24) * currentOpacityScale;
  }

  function dispose() {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose();
      }
    });
    bodyMaterial.dispose();
    accentMaterial.dispose();
    eyeMaterial.dispose();
    outerRingMat.dispose();
    innerRingMat.dispose();
    groundGlowMat.dispose();
    beamMat.dispose();
    shockwaveMat.dispose();
    particleMat.dispose();
    glowTexture.dispose();
  }

  return {
    group,
    setPersona,
    setPlayerSide,
    setModeVisible,
    setCameraView,
    setThinking,
    triggerReaction,
    update,
    getState: () => ({
      persona: activePersona,
      playerColor: currentPlayerColor,
      reaction: reactionType,
      targetZ,
      currentZ,
      visible: group.visible,
    }),
    dispose,
  };
}
