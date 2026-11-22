import * as THREE from 'three';

export interface OutdoorParkOptions {
  boardSurfaceY?: number;
  boardHalfWidth?: number;
  maxAnisotropy?: number;
}

export interface EnvironmentHandle {
  group: THREE.Group;
  dispose: () => void;
}

export function createOutdoorParkEnvironment(
  scene: THREE.Scene,
  options: OutdoorParkOptions = {}
): EnvironmentHandle {
  const boardSurfaceY = options.boardSurfaceY ?? 0.775;
  const boardHalfWidth = options.boardHalfWidth ?? 1.36;
  const maxAniso = options.maxAnisotropy ?? 8;

  const envGroup = new THREE.Group();
  envGroup.name = 'OutdoorParkEnvironment';

  const disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[]; textures: THREE.Texture[] } = {
    geometries: [],
    materials: [],
    textures: [],
  };

  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    disposables.geometries.push(geo);
    return geo;
  };
  const trackMat = <T extends THREE.Material>(mat: T): T => {
    disposables.materials.push(mat);
    return mat;
  };
  const trackTex = <T extends THREE.Texture>(tex: T): T => {
    disposables.textures.push(tex);
    return tex;
  };

  // -------------------------------------------------------------------------
  // 1. Procedural NYC Central Park Textures (Hexagonal Bluestone Pavers & Turf)
  // -------------------------------------------------------------------------
  const paverTexture = trackTex(createHexPaverTexture(maxAniso));
  const grassTexture = trackTex(createParkGrassTexture(maxAniso));

  // Shared Park Materials (varied roughness & metalness >= 0.25 contrast)
  const plazaMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: paverTexture,
      color: 0xc2c0b8,
      roughness: 0.88,
      metalness: 0.04,
    })
  );
  const promenadeMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: paverTexture,
      color: 0xb6b4ac,
      roughness: 0.9,
      metalness: 0.03,
    })
  );
  const grassMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: grassTexture,
      roughness: 0.94,
      metalness: 0.0,
    })
  );
  const graniteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8e9399,
      roughness: 0.78,
      metalness: 0.06,
    })
  );
  const darkGraniteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x565c64,
      roughness: 0.68,
      metalness: 0.1,
    })
  );
  const limestoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xcbc6ba,
      roughness: 0.8,
      metalness: 0.03,
    })
  );
  const castIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1d2621,
      roughness: 0.36,
      metalness: 0.82,
    })
  );
  const parkBenchGreenIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1f3d2b,
      roughness: 0.42,
      metalness: 0.72,
    })
  );
  const benchWoodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8b5e3c,
      roughness: 0.78,
      metalness: 0.04,
    })
  );
  const trunkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5d493a,
      roughness: 0.92,
      metalness: 0.02,
    })
  );
  const foliageMats = [
    trackMat(new THREE.MeshStandardMaterial({ color: 0x4c7c3d, roughness: 0.86, metalness: 0.0 })),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x5f8f47, roughness: 0.84, metalness: 0.0 })),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x3f6b34, roughness: 0.88, metalness: 0.0 })),
  ];
  const parasolCanopyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe27e28,
      roughness: 0.76,
      metalness: 0.04,
      side: THREE.DoubleSide,
    })
  );
  const parasolTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4ead8,
      roughness: 0.7,
      metalness: 0.05,
    })
  );
  const lampPoleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x222629,
      roughness: 0.34,
      metalness: 0.84,
    })
  );
  const lampGlobeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfff8e8,
      emissive: 0xffe4a8,
      emissiveIntensity: 0.28,
      roughness: 0.22,
      metalness: 0.05,
    })
  );
  const skylineMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8ba2ba,
      roughness: 0.88,
      metalness: 0.12,
    })
  );

  // -------------------------------------------------------------------------
  // 2. Central Park Bluestone Plaza, Promenades & Great Lawn Ground Layers
  // -------------------------------------------------------------------------
  // Outer Great Lawn ground plane (offset at y = -0.04 so zero Z-fighting)
  const lawnGeo = trackGeo(new THREE.CircleGeometry(68, 48));
  const lawn = new THREE.Mesh(lawnGeo, grassMat);
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = -0.04;
  lawn.receiveShadow = true;
  envGroup.add(lawn);

  // Main Octagonal Central Park Chess Plaza slab (top flush at y = 0.00)
  const plazaRadius = 11.4;
  const plazaGeo = trackGeo(new THREE.CylinderGeometry(plazaRadius, plazaRadius + 0.15, 0.08, 8));
  const plaza = new THREE.Mesh(plazaGeo, plazaMat);
  plaza.rotation.y = Math.PI / 8;
  plaza.position.y = -0.04;
  plaza.receiveShadow = true;
  envGroup.add(plaza);

  // Subtle sunken circular stone medallion inlay around the chess table (y = 0.006)
  const ringInlayGeo = trackGeo(new THREE.RingGeometry(2.75, 3.05, 32));
  const ringInlay = new THREE.Mesh(ringInlayGeo, darkGraniteMat);
  ringInlay.rotation.x = -Math.PI / 2;
  ringInlay.position.y = 0.006;
  ringInlay.receiveShadow = true;
  envGroup.add(ringInlay);

  // Cardinal Promenade Walkways connecting the Chess Plaza into Central Park
  const walkGeo = trackGeo(new THREE.BoxGeometry(3.4, 0.04, 34));
  for (const rotY of [0, Math.PI / 2]) {
    const walk = new THREE.Mesh(walkGeo, promenadeMat);
    walk.rotation.y = rotY;
    walk.position.y = -0.022;
    walk.receiveShadow = true;
    envGroup.add(walk);
  }

  // -------------------------------------------------------------------------
  // 3. Architectural Central Park Stone Chess Pedestal (y = 0 -> BOARD_SURFACE_Y)
  // -------------------------------------------------------------------------
  const tableTopY = boardSurfaceY - 0.036; // Flush under 64 inlaid squares (0.739m)
  const tableGroup = createCentralParkChessPedestal(
    tableTopY,
    boardHalfWidth,
    limestoneMat,
    darkGraniteMat,
    graniteMat,
    trackGeo
  );
  envGroup.add(tableGroup);

  // -------------------------------------------------------------------------
  // 4. Two Iconic Central Park Cast-Iron & Wood Benches Facing the Board
  // -------------------------------------------------------------------------
  const benchNorth = createCentralParkBench(parkBenchGreenIronMat, benchWoodMat, trackGeo);
  benchNorth.position.set(0, 0, -2.52);
  benchNorth.rotation.y = 0;
  envGroup.add(benchNorth);

  const benchSouth = createCentralParkBench(parkBenchGreenIronMat, benchWoodMat, trackGeo);
  benchSouth.position.set(0, 0, 2.52);
  benchSouth.rotation.y = Math.PI;
  envGroup.add(benchSouth);

  // Perimeter resting benches along the plaza sides
  const sideBenchPositions: [number, number, number][] = [
    [-7.6, -4.2, Math.PI * 0.34],
    [7.6, -4.2, -Math.PI * 0.34],
    [-7.6, 4.2, Math.PI * 0.66],
    [7.6, 4.2, -Math.PI * 0.66],
  ];
  for (const [bx, bz, rotY] of sideBenchPositions) {
    const b = createCentralParkBench(parkBenchGreenIronMat, benchWoodMat, trackGeo);
    b.position.set(bx, 0, bz);
    b.rotation.y = rotY;
    envGroup.add(b);
  }

  // -------------------------------------------------------------------------
  // 5. Low Granite Perimeter Wall & Cast-Iron Central Park Bollard Railings
  // -------------------------------------------------------------------------
  const perimeterR = 10.65;
  const wallAngles = [
    Math.PI * 0.25,
    Math.PI * 0.75,
    Math.PI * 1.25,
    Math.PI * 1.75,
  ];
  const wallSegGeo = trackGeo(new THREE.BoxGeometry(5.8, 0.44, 0.36));
  const wallCapGeo = trackGeo(new THREE.BoxGeometry(5.95, 0.08, 0.46));
  const railBarGeo = trackGeo(new THREE.CylinderGeometry(0.024, 0.024, 5.7, 8));
  const postGeo = trackGeo(new THREE.CylinderGeometry(0.045, 0.055, 0.56, 8));
  const finialGeo = trackGeo(new THREE.SphereGeometry(0.065, 10, 8));

  for (const ang of wallAngles) {
    const segGroup = new THREE.Group();
    const wx = Math.cos(ang) * perimeterR;
    const wz = Math.sin(ang) * perimeterR;
    segGroup.position.set(wx, 0, wz);
    segGroup.rotation.y = -ang + Math.PI / 2;

    const baseWall = new THREE.Mesh(wallSegGeo, graniteMat);
    baseWall.position.y = 0.22;
    baseWall.castShadow = true;
    baseWall.receiveShadow = true;
    segGroup.add(baseWall);

    const cap = new THREE.Mesh(wallCapGeo, limestoneMat);
    cap.position.y = 0.48;
    cap.castShadow = true;
    cap.receiveShadow = true;
    segGroup.add(cap);

    const rail = new THREE.Mesh(railBarGeo, castIronMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.y = 0.92;
    rail.castShadow = true;
    segGroup.add(rail);

    for (const px of [-2.8, 0, 2.8]) {
      const post = new THREE.Mesh(postGeo, castIronMat);
      post.position.set(px, 0.76, 0);
      post.castShadow = true;
      segGroup.add(post);

      const finial = new THREE.Mesh(finialGeo, castIronMat);
      finial.position.set(px, 1.07, 0);
      segGroup.add(finial);
    }
    envGroup.add(segGroup);
  }

  // -------------------------------------------------------------------------
  // 6. Central Park Victorian Cast-Iron Streetlamps (Luminaires)
  // -------------------------------------------------------------------------
  const lampCoords: [number, number][] = [
    [-5.8, -5.8],
    [5.8, -5.8],
    [-5.8, 5.8],
    [5.8, 5.8],
  ];
  for (const [lx, lz] of lampCoords) {
    const lamp = createCentralParkLamp(lampPoleMat, lampGlobeMat, trackGeo);
    lamp.position.set(lx, 0, lz);
    envGroup.add(lamp);
  }

  // -------------------------------------------------------------------------
  // 7. Orange Park Café Parasols & Stone Bistro Tables (Backdrop Detail)
  // -------------------------------------------------------------------------
  const parasolCoords: [number, number][] = [
    [-6.6, -8.4],
    [0, -9.4],
    [6.6, -8.4],
  ];
  for (const [px, pz] of parasolCoords) {
    const parasol = createParkParasolSet(
      castIronMat,
      limestoneMat,
      parasolCanopyMat,
      parasolTrimMat,
      trackGeo
    );
    parasol.position.set(px, 0, pz);
    envGroup.add(parasol);
  }

  // -------------------------------------------------------------------------
  // 8. Lush London Plane & Elm Trees Casting Sunlit Dappled Shadows
  // -------------------------------------------------------------------------
  // Carefully positioned relative to sunPos (11, 16, 8) so canopy edges frame the plaza
  // with dappled shadows while keeping the 64 chessboard tiles clear and legible
  const treeConfigs: [number, number, number, number][] = [
    [7.8, 4.3, 1.18, 0.4],
    [-8.6, 5.1, 1.24, 1.3],
    [-9.6, -7.8, 1.32, 2.1],
    [9.8, -7.4, 1.28, 0.9],
    [-14.5, 0.8, 1.45, 2.7],
    [14.2, -1.2, 1.38, 1.8],
    [-5.2, 13.8, 1.34, 0.6],
    [5.6, 13.4, 1.4, 2.4],
    [-4.8, -14.8, 1.42, 1.1],
    [4.9, -14.5, 1.35, 3.0],
  ];
  for (const [tx, tz, scale, rotY] of treeConfigs) {
    const tree = createCentralParkTree(scale, trunkMat, foliageMats, trackGeo);
    tree.position.set(tx, 0, tz);
    tree.rotation.y = rotY;
    envGroup.add(tree);
  }

  // -------------------------------------------------------------------------
  // 9. Distant Midtown Manhattan Skyline Silhouettes (Central Park Horizon)
  // -------------------------------------------------------------------------
  const skylineRing = createManhattanSkylineRing(skylineMat, trackGeo);
  envGroup.add(skylineRing);

  scene.add(envGroup);

  return {
    group: envGroup,
    dispose: () => {
      scene.remove(envGroup);
      for (const geo of disposables.geometries) {
        geo.dispose();
      }
      for (const mat of disposables.materials) {
        mat.dispose();
      }
      for (const tex of disposables.textures) {
        tex.dispose();
      }
    },
  };
}

function createCentralParkChessPedestal(
  tableTopY: number,
  boardHalfWidth: number,
  limestoneMat: THREE.Material,
  darkGraniteMat: THREE.Material,
  graniteMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const group = new THREE.Group();
  const tableWidth = boardHalfWidth * 2 + 0.72; // ~3.44m stone chess table slab

  // 1. Stepped octagonal plinth on ground
  const plinth = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.18, 1.32, 0.14, 8)), graniteMat);
  plinth.rotation.y = Math.PI / 8;
  plinth.position.y = 0.07;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  // 2. Sculpted central stone column shaft
  const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.68, 0.84, 0.44, 8)), limestoneMat);
  shaft.rotation.y = Math.PI / 8;
  shaft.position.y = 0.36;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);

  // 3. Carved stone capital corbel supporting the tabletop
  const corbel = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(tableWidth * 0.72, 0.09, tableWidth * 0.72)),
    darkGraniteMat
  );
  corbel.position.y = tableTopY - 0.13;
  corbel.castShadow = true;
  corbel.receiveShadow = true;
  group.add(corbel);

  // 4. Main stone chess tabletop slab (top strictly at tableTopY = 0.739m)
  const slabH = 0.09;
  const tabletop = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(tableWidth, slabH, tableWidth)),
    limestoneMat
  );
  tabletop.position.y = tableTopY - slabH * 0.5;
  tabletop.castShadow = true;
  tabletop.receiveShadow = true;
  group.add(tabletop);

  // 5. Recessed granite bevel trim around tabletop outer rim
  const trim = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(tableWidth + 0.08, 0.045, tableWidth + 0.08)),
    darkGraniteMat
  );
  trim.position.y = tableTopY - 0.068;
  trim.receiveShadow = true;
  group.add(trim);

  return group;
}

function createCentralParkBench(
  ironMat: THREE.Material,
  woodMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const bench = new THREE.Group();
  const width = 1.85;

  // 3 Cast-iron bench frame legs + scrolled armrests
  const legGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.44, 0.56));
  const backPostGeo = trackGeo(new THREE.BoxGeometry(0.05, 0.48, 0.06));
  const armGeo = trackGeo(new THREE.BoxGeometry(0.07, 0.04, 0.52));
  for (const lx of [-width * 0.46, 0, width * 0.46]) {
    const leg = new THREE.Mesh(legGeo, ironMat);
    leg.position.set(lx, 0.22, 0);
    leg.castShadow = true;
    leg.receiveShadow = true;
    bench.add(leg);

    const backPost = new THREE.Mesh(backPostGeo, ironMat);
    backPost.position.set(lx, 0.64, -0.24);
    backPost.rotation.x = -0.18;
    backPost.castShadow = true;
    bench.add(backPost);

    if (lx !== 0) {
      const arm = new THREE.Mesh(armGeo, ironMat);
      arm.position.set(lx, 0.62, 0.02);
      arm.castShadow = true;
      bench.add(arm);
    }
  }

  // 3 Wooden seat slats
  const seatSlatGeo = trackGeo(new THREE.BoxGeometry(width, 0.038, 0.13));
  for (const sz of [-0.14, 0.02, 0.18]) {
    const slat = new THREE.Mesh(seatSlatGeo, woodMat);
    slat.position.set(0, 0.44, sz);
    slat.castShadow = true;
    slat.receiveShadow = true;
    bench.add(slat);
  }

  // 3 Wooden backrest slats
  const backSlatGeo = trackGeo(new THREE.BoxGeometry(width, 0.1, 0.036));
  for (let i = 0; i < 3; i++) {
    const slat = new THREE.Mesh(backSlatGeo, woodMat);
    slat.position.set(0, 0.56 + i * 0.13, -0.22 - i * 0.022);
    slat.rotation.x = -0.18;
    slat.castShadow = true;
    slat.receiveShadow = true;
    bench.add(slat);
  }

  return bench;
}

function createCentralParkLamp(
  poleMat: THREE.Material,
  globeMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const lamp = new THREE.Group();

  const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.16, 0.22, 0.55, 8)), poleMat);
  base.position.y = 0.275;
  base.castShadow = true;
  base.receiveShadow = true;
  lamp.add(base);

  const collar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.14, 0.032, 8, 16)), poleMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.56;
  lamp.add(collar);

  const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.095, 2.75, 10)), poleMat);
  shaft.position.y = 1.92;
  shaft.castShadow = true;
  lamp.add(shaft);

  const neck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.16, 0.07, 0.18, 10)), poleMat);
  neck.position.y = 3.32;
  lamp.add(neck);

  const globe = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.24, 14, 12)), globeMat);
  globe.position.y = 3.58;
  lamp.add(globe);

  const cap = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.2, 0.16, 10)), poleMat);
  cap.position.y = 3.84;
  lamp.add(cap);

  return lamp;
}

function createParkParasolSet(
  ironMat: THREE.Material,
  stoneMat: THREE.Material,
  canopyMat: THREE.Material,
  trimMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const group = new THREE.Group();

  // Heavy cast-iron parasol base
  const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.36, 0.08, 12)), ironMat);
  base.position.y = 0.04;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Café table pedestal & stone tabletop
  const tableLeg = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.08, 0.72, 10)), ironMat);
  tableLeg.position.y = 0.38;
  tableLeg.castShadow = true;
  group.add(tableLeg);

  const tabletop = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.72, 0.72, 0.06, 18)), stoneMat);
  tabletop.position.y = 0.76;
  tabletop.castShadow = true;
  tabletop.receiveShadow = true;
  group.add(tabletop);

  // Two small stone-top café stools
  const stoolLegGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.05, 0.44, 8));
  const stoolTopGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 12));
  for (const sx of [-1.05, 1.05]) {
    const sLeg = new THREE.Mesh(stoolLegGeo, ironMat);
    sLeg.position.set(sx, 0.22, 0);
    sLeg.castShadow = true;
    group.add(sLeg);

    const sTop = new THREE.Mesh(stoolTopGeo, stoneMat);
    sTop.position.set(sx, 0.46, 0);
    sTop.castShadow = true;
    sTop.receiveShadow = true;
    group.add(sTop);
  }

  // Tall center pole + terracotta orange canopy + cream finial trim
  const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 2.75, 10)), ironMat);
  pole.position.y = 1.4;
  pole.castShadow = true;
  group.add(pole);

  const canopy = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.72, 0.62, 12)), canopyMat);
  canopy.position.y = 2.66;
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  group.add(canopy);

  const valance = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.72, 1.72, 0.11, 12, 1, true)), canopyMat);
  valance.position.y = 2.3;
  valance.castShadow = true;
  group.add(valance);

  const finial = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.08, 10, 8)), trimMat);
  finial.position.y = 3.0;
  group.add(finial);

  return group;
}

function createCentralParkTree(
  scale: number,
  trunkMat: THREE.Material,
  foliageMats: THREE.Material[],
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const tree = new THREE.Group();

  // Root flare + primary trunk
  const rootFlare = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.24 * scale, 0.44 * scale, 0.6 * scale, 8)),
    trunkMat
  );
  rootFlare.position.y = 0.3 * scale;
  rootFlare.castShadow = true;
  rootFlare.receiveShadow = true;
  tree.add(rootFlare);

  const trunk = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.18 * scale, 0.26 * scale, 3.0 * scale, 8)),
    trunkMat
  );
  trunk.position.y = 1.8 * scale;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  // Two angled structural limbs
  const limbGeo = trackGeo(new THREE.CylinderGeometry(0.09 * scale, 0.14 * scale, 1.55 * scale, 7));
  const limbL = new THREE.Mesh(limbGeo, trunkMat);
  limbL.position.set(-0.5 * scale, 3.25 * scale, 0.15 * scale);
  limbL.rotation.z = 0.56;
  limbL.castShadow = true;
  tree.add(limbL);

  const limbR = new THREE.Mesh(limbGeo, trunkMat);
  limbR.position.set(0.48 * scale, 3.3 * scale, -0.18 * scale);
  limbR.rotation.z = -0.52;
  limbR.castShadow = true;
  tree.add(limbR);

  // Layered multi-tone deciduous canopy
  const crowns: [number, number, number, number, number][] = [
    [0, 4.35, 0, 1.72, 0],
    [-1.12, 3.85, 0.45, 1.28, 1],
    [1.08, 3.92, -0.38, 1.32, 2],
    [0.18, 5.15, 0.25, 1.25, 1],
    [-0.25, 3.7, -0.92, 1.18, 2],
  ];
  for (const [cx, cy, cz, cr, matIdx] of crowns) {
    const crown = new THREE.Mesh(
      trackGeo(new THREE.DodecahedronGeometry(cr * scale, 1)),
      foliageMats[matIdx % foliageMats.length]
    );
    crown.position.set(cx * scale, cy * scale, cz * scale);
    crown.castShadow = true;
    crown.receiveShadow = true;
    tree.add(crown);
  }

  return tree;
}

function createManhattanSkylineRing(
  skylineMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ManhattanSkylineBackdrop';
  const count = 26;
  const radius = 42;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2;
    const width = 2.6 + ((i * 7) % 3) * 0.9;
    const depth = 2.6 + ((i * 5) % 3) * 0.8;
    const height = 8 + ((i * 11) % 13) * 1.15;
    const tower = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(width, height, depth)), skylineMat);
    tower.position.set(Math.cos(ang) * radius, height * 0.5 - 0.1, Math.sin(ang) * radius);
    tower.rotation.y = -ang;
    group.add(tower);

    // Classic Manhattan stepped setback crown on every third tower
    if (i % 3 === 0) {
      const crownH = 2.8 + (i % 4) * 0.8;
      const crown = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(width * 0.58, crownH, depth * 0.58)),
        skylineMat
      );
      crown.position.set(
        Math.cos(ang) * radius,
        height + crownH * 0.5 - 0.1,
        Math.sin(ang) * radius
      );
      crown.rotation.y = -ang;
      group.add(crown);
    }
  }
  return group;
}

function createHexPaverTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#7c7a73';
  ctx.fillRect(0, 0, size, size);

  // Subtle NYC bluestone tile variation & crisp ashlar paver grid (a shade darker for better board contrast)
  const step = 64;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const shade = (((x / step) * 7 + (y / step) * 13) % 5) - 2;
      const base = 132 + shade * 6;
      ctx.fillStyle = `rgb(${base - 3}, ${base - 2}, ${base + 2})`;
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
    }
  }

  ctx.strokeStyle = '#52514b';
  ctx.lineWidth = 3;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Fine mineral stone speckle
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(30,32,36,0.06)';
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.anisotropy = maxAniso;
  return tex;
}

function createParkGrassTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#537b43';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle =
      i % 3 === 0
        ? 'rgba(122, 165, 86, 0.18)'
        : i % 3 === 1
          ? 'rgba(54, 88, 42, 0.18)'
          : 'rgba(155, 178, 96, 0.1)';
    ctx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 22);
  tex.anisotropy = maxAniso;
  return tex;
}
