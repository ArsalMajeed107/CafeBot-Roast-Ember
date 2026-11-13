import * as THREE from 'three';
import {
  createContactShadowTexture,
  createLatteArtTexture,
  createPressureGaugeTexture,
  createTileBacksplashTexture,
  createWalnutWoodTextures,
} from './proceduralTextures.ts';

export interface SteamParticle {
  mesh: THREE.Mesh;
  phase: number;
  speed: number;
  radius: number;
}

export interface CafeSceneAssets {
  root: THREE.Group;
  cupGroup: THREE.Group;
  brewIndicatorMat: THREE.MeshStandardMaterial;
  steamParticles: SteamParticle[];
  dispose: () => void;
}

export function buildCafeCounterModels(
  isSoftwareGl: boolean,
  maxAnisotropy: number
): CafeSceneAssets {
  const disposables: Array<{dispose: () => void}> = [];
  const track = <T extends {dispose: () => void}>(resource: T): T => {
    disposables.push(resource);
    return resource;
  };

  const root = new THREE.Group();
  root.name = 'Cafe Barista Counter Station';

  // Shared procedural textures
  const walnutTextures = createWalnutWoodTextures(maxAnisotropy);
  track(walnutTextures.map);
  track(walnutTextures.roughnessMap);

  const gaugeTexture = track(createPressureGaugeTexture(maxAnisotropy));
  const latteTexture = track(createLatteArtTexture(maxAnisotropy));
  const contactShadowTex = track(createContactShadowTexture());
  const tileTexture = track(createTileBacksplashTexture(maxAnisotropy));

  // Materials (varied roughness >= 0.25 & metalness across adjacent parts)
  const walnutMat = track(
    new THREE.MeshStandardMaterial({
      map: walnutTextures.map,
      roughnessMap: walnutTextures.roughnessMap,
      roughness: 0.42,
      metalness: 0.04,
    })
  );

  const flutedOakMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b2618,
      roughness: 0.72,
      metalness: 0.0,
    })
  );

  const slateBaseMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.85,
      metalness: 0.05,
    })
  );

  const brushedSteelMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xd4d4d8,
      metalness: 0.92,
      roughness: 0.2,
      anisotropy: 0.75,
      anisotropyRotation: Math.PI / 2,
    })
  );

  const matteObsidianMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1e1b1a,
      metalness: 0.15,
      roughness: 0.78,
    })
  );

  const brassMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd4a359,
      metalness: 0.88,
      roughness: 0.24,
    })
  );

  const ceramicMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xf7f3eb,
      roughness: 0.18,
      metalness: 0.0,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
    })
  );

  const darkCeramicMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.32,
      metalness: 0.05,
    })
  );

  const clocheGlassMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      metalness: 0.0,
      roughness: 0.06,
      transmission: isSoftwareGl ? 0 : 0.9,
      transparent: true,
      opacity: isSoftwareGl ? 0.34 : 1.0,
      ior: 1.5,
      thickness: 0.08,
      clearcoat: 1.0,
      depthWrite: false,
    })
  );

  const contactShadowMat = track(
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    })
  );

  const addContactShadow = (
    parent: THREE.Object3D,
    width: number,
    depth: number,
    y = 0.002
  ) => {
    const plane = new THREE.Mesh(
      track(new THREE.PlaneGeometry(width, depth)),
      contactShadowMat
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = y;
    plane.renderOrder = 1;
    parent.add(plane);
  };

  // ===========================================================================
  // 1. CAFE BAR COUNTER (6-part composite, bottom-center pivoted at y = 0)
  // ===========================================================================
  const counterGroup = new THREE.Group();
  counterGroup.name = 'Cafe Bar Counter';
  const COUNTER_W = 1.65;
  const COUNTER_D = 0.68;
  const COUNTER_H = 0.92;

  // Part 1: Dark slate plinth
  const plinth = new THREE.Mesh(
    track(new THREE.BoxGeometry(COUNTER_W - 0.08, 0.1, COUNTER_D - 0.08)),
    slateBaseMat
  );
  plinth.position.y = 0.05;
  plinth.receiveShadow = true;
  counterGroup.add(plinth);

  // Part 2: Fluted oak front body
  const body = new THREE.Mesh(
    track(new THREE.BoxGeometry(COUNTER_W - 0.06, COUNTER_H - 0.15, COUNTER_D - 0.06)),
    flutedOakMat
  );
  body.position.y = 0.1 + (COUNTER_H - 0.15) / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  counterGroup.add(body);

  // Part 3: Vertical oak slats (InstancedMesh for crisp fluted craftsmanship)
  const slatCount = 24;
  const slatGeo = track(new THREE.BoxGeometry(0.025, COUNTER_H - 0.19, 0.02));
  const slats = new THREE.InstancedMesh(slatGeo, walnutMat, slatCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < slatCount; i++) {
    const x = -COUNTER_W * 0.44 + (i / (slatCount - 1)) * (COUNTER_W * 0.88);
    dummy.position.set(x, 0.1 + (COUNTER_H - 0.15) / 2, (COUNTER_D - 0.04) / 2);
    dummy.updateMatrix();
    slats.setMatrixAt(i, dummy.matrix);
  }
  slats.instanceMatrix.needsUpdate = true;
  slats.computeBoundingSphere();
  slats.castShadow = true;
  slats.receiveShadow = true;
  counterGroup.add(slats);

  // Part 4: Beveled walnut countertop slab (ExtrudeGeometry)
  const topShape = new THREE.Shape();
  const hw = COUNTER_W / 2;
  const hd = COUNTER_D / 2;
  topShape.moveTo(-hw, -hd);
  topShape.lineTo(hw, -hd);
  topShape.lineTo(hw, hd);
  topShape.lineTo(-hw, hd);
  topShape.closePath();
  const topGeo = track(
    new THREE.ExtrudeGeometry(topShape, {
      depth: 0.042,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 3,
    })
  );
  topGeo.rotateX(Math.PI / 2);
  const counterTop = new THREE.Mesh(topGeo, walnutMat);
  counterTop.position.y = COUNTER_H;
  counterTop.castShadow = true;
  counterTop.receiveShadow = true;
  counterGroup.add(counterTop);

  // Part 5: Brushed brass footrail
  const railCurve = new THREE.LineCurve3(
    new THREE.Vector3(-COUNTER_W * 0.45, 0.16, COUNTER_D / 2 + 0.06),
    new THREE.Vector3(COUNTER_W * 0.45, 0.16, COUNTER_D / 2 + 0.06)
  );
  const footRail = new THREE.Mesh(
    track(new THREE.TubeGeometry(railCurve, 8, 0.015, 12, false)),
    brassMat
  );
  footRail.castShadow = true;
  counterGroup.add(footRail);

  // Part 6: Warm ceramic backsplash dwarf wall behind counter
  const backsplashMat = track(
    new THREE.MeshStandardMaterial({
      map: tileTexture,
      roughness: 0.38,
      metalness: 0.02,
    })
  );
  const backsplash = new THREE.Mesh(
    track(new THREE.BoxGeometry(COUNTER_W + 0.3, 1.35, 0.06)),
    backsplashMat
  );
  backsplash.position.set(0, 0.675, -COUNTER_D / 2 - 0.18);
  backsplash.receiveShadow = true;
  counterGroup.add(backsplash);

  // Floor contact shadow beneath counter
  addContactShadow(counterGroup, COUNTER_W + 0.35, COUNTER_D + 0.35, 0.003);
  root.add(counterGroup);

  // ===========================================================================
  // 2. ARTISAN ESPRESSO MACHINE (9-part composite, bottom-center on countertop)
  // ===========================================================================
  const espressoGroup = new THREE.Group();
  espressoGroup.name = 'Espresso Machine';
  espressoGroup.position.set(-0.34, COUNTER_H + 0.008, -0.04);

  // Part 1: Matte obsidian base chassis
  const machineBase = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.46, 0.055, 0.38)),
    matteObsidianMat
  );
  machineBase.position.y = 0.0275;
  machineBase.castShadow = true;
  machineBase.receiveShadow = true;
  espressoGroup.add(machineBase);

  // Part 2: Brushed stainless steel main boiler body
  const machineBody = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.42, 0.31, 0.28)),
    brushedSteelMat
  );
  machineBody.position.set(0, 0.055 + 0.155, -0.03);
  machineBody.castShadow = true;
  machineBody.receiveShadow = true;
  espressoGroup.add(machineBody);

  // Part 3: Perforated stainless drip tray grate
  const dripTray = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.41, 0.014, 0.12)),
    brushedSteelMat
  );
  dripTray.position.set(0, 0.062, 0.13);
  dripTray.receiveShadow = true;
  espressoGroup.add(dripTray);

  // Part 4 & 5: Twin group heads & brass/walnut portafilters
  [-0.1, 0.1].forEach((offsetX) => {
    const groupHead = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.038, 0.042, 0.055, 24)),
      brushedSteelMat
    );
    groupHead.position.set(offsetX, 0.24, 0.125);
    groupHead.castShadow = true;
    espressoGroup.add(groupHead);

    const basket = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.034, 0.026, 0.03, 20)),
      brassMat
    );
    basket.position.set(offsetX, 0.2, 0.125);
    basket.castShadow = true;
    espressoGroup.add(basket);

    const handle = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.01, 0.013, 0.11, 14)),
      walnutMat
    );
    handle.rotation.x = Math.PI / 2 - 0.15;
    handle.position.set(offsetX, 0.195, 0.19);
    handle.castShadow = true;
    espressoGroup.add(handle);
  });

  // Part 6: Articulated steam wand (TubeGeometry)
  const wandCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.16, 0.27, 0.1),
    new THREE.Vector3(0.185, 0.22, 0.14),
    new THREE.Vector3(0.19, 0.13, 0.15),
  ]);
  const steamWand = new THREE.Mesh(
    track(new THREE.TubeGeometry(wandCurve, 16, 0.0055, 10, false)),
    brushedSteelMat
  );
  espressoGroup.add(steamWand);

  // Part 7: Top cup warmer guard rail
  const railLoop = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.4, 0.028, 0.24)),
    brassMat
  );
  railLoop.position.set(0, 0.378, -0.03);
  espressoGroup.add(railLoop);

  // Part 8: Procedural Boiler Pressure Gauge Dial
  const gaugeBezel = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.032, 0.032, 0.015, 24)),
    brassMat
  );
  gaugeBezel.rotation.x = Math.PI / 2;
  gaugeBezel.position.set(0, 0.31, 0.112);
  espressoGroup.add(gaugeBezel);

  const gaugeFace = new THREE.Mesh(
    track(new THREE.CircleGeometry(0.027, 24)),
    track(
      new THREE.MeshBasicMaterial({
        map: gaugeTexture,
      })
    )
  );
  gaugeFace.position.set(0, 0.31, 0.121);
  espressoGroup.add(gaugeFace);

  // Part 9: Warm amber brew status indicator
  const brewIndicatorMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 1.4,
      roughness: 0.25,
    })
  );
  const brewLed = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.009, 14, 14)),
    brewIndicatorMat
  );
  brewLed.position.set(-0.16, 0.31, 0.113);
  espressoGroup.add(brewLed);

  addContactShadow(espressoGroup, 0.54, 0.46, 0.002);
  root.add(espressoGroup);

  // ===========================================================================
  // 3. ARTISAN CERAMIC CUP & SAUCER (5-part composite + animated steam)
  // ===========================================================================
  const cupGroup = new THREE.Group();
  cupGroup.name = 'Artisan Latte Cup';
  cupGroup.position.set(0.08, COUNTER_H + 0.008, 0.08);

  // Part 1: LatheGeometry ceramic saucer
  const saucerPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.045, 0.0),
    new THREE.Vector2(0.072, 0.012),
    new THREE.Vector2(0.074, 0.017),
    new THREE.Vector2(0.042, 0.007),
    new THREE.Vector2(0.0, 0.007),
  ];
  const saucer = new THREE.Mesh(
    track(new THREE.LatheGeometry(saucerPts, 32)),
    ceramicMat
  );
  saucer.castShadow = true;
  saucer.receiveShadow = true;
  cupGroup.add(saucer);

  // Part 2: LatheGeometry tulip cup body
  const cupPts = [
    new THREE.Vector2(0.0, 0.007),
    new THREE.Vector2(0.026, 0.007),
    new THREE.Vector2(0.042, 0.042),
    new THREE.Vector2(0.048, 0.078),
    new THREE.Vector2(0.043, 0.078),
    new THREE.Vector2(0.036, 0.04),
    new THREE.Vector2(0.0, 0.013),
  ];
  const cupBody = new THREE.Mesh(
    track(new THREE.LatheGeometry(cupPts, 32)),
    ceramicMat
  );
  cupBody.castShadow = true;
  cupBody.receiveShadow = true;
  cupGroup.add(cupBody);

  // Part 3: TubeGeometry curved ear handle
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.043, 0.064, 0),
    new THREE.Vector3(0.068, 0.064, 0),
    new THREE.Vector3(0.066, 0.036, 0),
    new THREE.Vector3(0.035, 0.026, 0),
  ]);
  const cupHandle = new THREE.Mesh(
    track(new THREE.TubeGeometry(handleCurve, 18, 0.0055, 10, false)),
    ceramicMat
  );
  cupHandle.castShadow = true;
  cupGroup.add(cupHandle);

  // Part 4: Latte art crema surface
  const cremaMat = track(
    new THREE.MeshStandardMaterial({
      map: latteTexture,
      roughness: 0.25,
      metalness: 0.0,
    })
  );
  const crema = new THREE.Mesh(
    track(new THREE.CircleGeometry(0.041, 28)),
    cremaMat
  );
  crema.rotation.x = -Math.PI / 2;
  crema.position.y = 0.068;
  cupGroup.add(crema);

  // Part 5: Soft contact shadow & rising steam wisps
  addContactShadow(cupGroup, 0.18, 0.18, 0.002);

  const steamGeo = track(new THREE.SphereGeometry(0.014, 10, 10));
  const steamParticles: SteamParticle[] = [];
  for (let i = 0; i < 6; i++) {
    const sMat = track(
      new THREE.MeshBasicMaterial({
        color: 0xfef7ed,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      })
    );
    const wisp = new THREE.Mesh(steamGeo, sMat);
    wisp.position.set(0, 0.085, 0);
    cupGroup.add(wisp);
    steamParticles.push({
      mesh: wisp,
      phase: (i / 6) * Math.PI * 2,
      speed: 0.45 + (i % 3) * 0.1,
      radius: 0.008 + (i % 2) * 0.006,
    });
  }
  root.add(cupGroup);

  // ===========================================================================
  // 4. PASTRY DISPLAY CLOCHE (6-part composite, bottom-center on countertop)
  // ===========================================================================
  const pastryGroup = new THREE.Group();
  pastryGroup.name = 'Pastry Display Cloche';
  pastryGroup.position.set(0.36, COUNTER_H + 0.008, -0.02);

  // Part 1: Walnut serving platter
  const platter = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.14, 0.13, 0.018, 32)),
    walnutMat
  );
  platter.position.y = 0.009;
  platter.castShadow = true;
  platter.receiveShadow = true;
  pastryGroup.add(platter);

  // Part 2: Ceramic cake pedestal
  const pedestal = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.105, 0.095, 0.025, 28)),
    darkCeramicMat
  );
  pedestal.position.y = 0.03;
  pastryGroup.add(pedestal);

  // Part 3: Burnt Basque Cheesecake / Artisan Pastry inside
  const cakeBody = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.072, 0.076, 0.052, 24)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0xe6b87d,
        roughness: 0.65,
      })
    )
  );
  cakeBody.position.y = 0.068;
  cakeBody.castShadow = true;
  pastryGroup.add(cakeBody);

  const cakeCaramelTop = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.07, 0.072, 0.008, 24)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0x6b3410,
        roughness: 0.35,
      })
    )
  );
  cakeCaramelTop.position.y = 0.096;
  pastryGroup.add(cakeCaramelTop);

  // Part 4: Glass cloche dome (LatheGeometry + depthWrite: false)
  const domePts: THREE.Vector2[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const angle = t * (Math.PI / 2);
    const r = Math.cos(angle) * 0.118;
    const y = 0.018 + Math.sin(angle) * 0.145;
    domePts.push(new THREE.Vector2(r, y));
  }
  const clocheDome = new THREE.Mesh(
    track(new THREE.LatheGeometry(domePts.reverse(), 32)),
    clocheGlassMat
  );
  clocheDome.renderOrder = 2;
  pastryGroup.add(clocheDome);

  // Part 5: Brushed brass finial knob
  const knob = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.014, 16, 16)),
    brassMat
  );
  knob.position.y = 0.172;
  pastryGroup.add(knob);

  addContactShadow(pastryGroup, 0.32, 0.32, 0.002);
  root.add(pastryGroup);

  // ===========================================================================
  // 5. STUDIO FLOOR GROUNDING DISC (matte espresso slate floor)
  // ===========================================================================
  const floor = new THREE.Mesh(
    track(new THREE.CircleGeometry(4.5, 48)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0x1b1511,
        roughness: 0.9,
        metalness: 0.02,
      })
    )
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  return {
    root,
    cupGroup,
    brewIndicatorMat,
    steamParticles,
    dispose: () => {
      for (const item of disposables) {
        item.dispose();
      }
    },
  };
}
