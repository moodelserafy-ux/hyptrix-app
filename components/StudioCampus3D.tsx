'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  StudioFacilityId,
  StudioFacilitiesLevels,
  DEFAULT_FACILITIES_LEVELS,
} from '@/lib/game-engine';

interface StudioCampus3DProps {
  studioName: string;
  facilitiesLevels: StudioFacilitiesLevels;
  selectedFacility: StudioFacilityId | null;
  cameraMode: 'overview' | 'focus';
  onSelectFacility?: (id: StudioFacilityId) => void;
  isFilmingActive?: boolean;
  fullScreenBackground?: boolean;
  isRotated90?: boolean;
}

export const FACILITY_3D_COORDS: Record<
  StudioFacilityId,
  { pos: [number, number, number]; camPos: [number, number, number] }
> = {
  soundstage: {
    pos: [-6.2, 0, -2.6],
    camPos: [-10.2, 5.4, 4.8],
  },
  camera_rig: {
    pos: [0, 0, 1.4],
    camPos: [0, 4.3, 8.4],
  },
  vfx_tower: {
    pos: [6.2, 0, -2.6],
    camPos: [10.4, 6.2, 5.0],
  },
  audio_stage: {
    pos: [-5.6, 0, 4.2],
    camPos: [-9.2, 4.8, 10.2],
  },
  marketing_hub: {
    pos: [5.6, 0, 4.2],
    camPos: [9.2, 4.8, 10.2],
  },
};

const OVERVIEW_CAM_POS: [number, number, number] = [0, 10.8, 16.4];
const OVERVIEW_TARGET: [number, number, number] = [0, 0.8, 0.6];

// Pre-allocated math helpers outside the animation loop (Zero GC)
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();

/**
 * Generates procedural CanvasTextures for Dark Hollywood Gold architectural windows, studio signage, and roads
 */
function createBuildingWindowTexture(
  maxAnisotropy: number,
  bgHex: string,
  litHex1: string,
  litHex2: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 256, 512);

  const cols = 6;
  const rows = 14;
  const padX = 10;
  const padY = 12;
  const w = (256 - padX * (cols + 1)) / cols;
  const h = (512 - padY * (rows + 1)) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = (r * 17 + c * 31) % 7;
      if (seed === 0) {
        ctx.fillStyle = '#0f172a';
      } else if (seed % 2 === 0) {
        ctx.fillStyle = litHex1;
      } else {
        ctx.fillStyle = litHex2;
      }
      ctx.fillRect(padX + c * (w + padX), padY + r * (h + padY), w, h);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createStudioSignTexture(
  maxAnisotropy: number,
  text: string,
  subText: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 128);
  grad.addColorStop(0, '#0A0A0C');
  grad.addColorStop(0.5, '#16161D');
  grad.addColorStop(1, '#0A0A0C');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 504, 120);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = '900 38px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 50);

  ctx.fillStyle = '#D4AF37';
  ctx.font = '800 22px sans-serif';
  ctx.fillText(subText, 256, 94);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createRoadAsphaltTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#111116';
  ctx.fillRect(0, 0, 256, 256);

  // Golden boulevard side lines
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(0, 10, 256, 6);
  ctx.fillRect(0, 240, 256, 6);

  // Dashed center line
  ctx.fillStyle = '#94a3b8';
  for (let x = 16; x < 256; x += 64) {
    ctx.fillRect(x, 124, 36, 8);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  return tex;
}

export function StudioCampus3D({
  studioName,
  facilitiesLevels = DEFAULT_FACILITIES_LEVELS,
  selectedFacility,
  cameraMode,
  onSelectFacility,
  isFilmingActive = false,
  fullScreenBackground = true,
  isRotated90 = false,
}: StudioCampus3DProps) {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  // Mutable refs for the WebGL loop
  const levelsRef = useRef<StudioFacilitiesLevels>(facilitiesLevels);
  const selectedRef = useRef<StudioFacilityId | null>(selectedFacility);
  const cameraModeRef = useRef<'overview' | 'focus'>(cameraMode);
  const isFilmingRef = useRef<boolean>(isFilmingActive);
  const studioNameRef = useRef<string>(studioName);
  const onSelectRef = useRef(onSelectFacility);
  const isRotatedRef = useRef<boolean>(isRotated90);
  const rebuildFacilityFnRef = useRef<(() => void) | null>(null);
  const cameraTransitionActiveRef = useRef<boolean>(false);

  useEffect(() => {
    onSelectRef.current = onSelectFacility;
  }, [onSelectFacility]);

  useEffect(() => {
    isRotatedRef.current = isRotated90;
  }, [isRotated90]);

  useEffect(() => {
    levelsRef.current = facilitiesLevels;
    studioNameRef.current = studioName;
    if (rebuildFacilityFnRef.current) {
      rebuildFacilityFnRef.current();
    }
  }, [facilitiesLevels, studioName]);

  useEffect(() => {
    selectedRef.current = selectedFacility;
    cameraModeRef.current = cameraMode;
    cameraTransitionActiveRef.current = true;
  }, [selectedFacility, cameraMode]);

  useEffect(() => {
    isFilmingRef.current = isFilmingActive;
  }, [isFilmingActive]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software WebGL detection from GPU renderer string
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.offsetWidth || window.innerWidth || 1024;
    const height = container.offsetHeight || window.innerHeight || 600;

    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x0a0a0c);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0x0a0a0c, 0.018);

    const camera = new THREE.PerspectiveCamera(38, width / Math.max(1, height), 0.1, 160);
    camera.position.set(...OVERVIEW_CAM_POS);
    camera.lookAt(...OVERVIEW_TARGET);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // 2. Studio Environment Map (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Dark Hollywood Gold Night Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfef3c7, 0x0a0a0c, 1.0);
    hemiLight.position.set(0, 30, 0);
    scene.add(hemiLight);

    const goldKeyLight = new THREE.DirectionalLight(0xffedd5, 2.3);
    goldKeyLight.position.set(16, 24, 14);
    goldKeyLight.castShadow = !isSoftwareGl;
    const d = 16;
    goldKeyLight.shadow.camera.left = -d;
    goldKeyLight.shadow.camera.right = d;
    goldKeyLight.shadow.camera.top = d;
    goldKeyLight.shadow.camera.bottom = -d;
    goldKeyLight.shadow.camera.near = 1;
    goldKeyLight.shadow.camera.far = 55;
    goldKeyLight.shadow.mapSize.width = 1024;
    goldKeyLight.shadow.mapSize.height = 1024;
    goldKeyLight.shadow.bias = -0.0005;
    goldKeyLight.shadow.normalBias = 0.02;
    scene.add(goldKeyLight);

    const crimsonRimLight = new THREE.DirectionalLight(0xe50914, 1.1);
    crimsonRimLight.position.set(-16, 12, -12);
    scene.add(crimsonRimLight);

    const cyanFillLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    cyanFillLight.position.set(0, 14, -18);
    scene.add(cyanFillLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.minPolarAngle = 0.22;
    controls.minDistance = 5.0;
    controls.maxDistance = 30;
    controls.target.set(...OVERVIEW_TARGET);

    controls.addEventListener('start', () => {
      cameraTransitionActiveRef.current = false;
    });

    // Procedural Textures (Dark Hollywood Gold Illuminated Glass)
    const windowTexCyan = createBuildingWindowTexture(
      maxAniso,
      '#111118',
      '#38bdf8',
      '#D4AF37'
    );
    const windowTexGold = createBuildingWindowTexture(
      maxAniso,
      '#14141d',
      '#D4AF37',
      '#fde047'
    );
    const roadTex = createRoadAsphaltTexture(maxAniso);

    // Shared PBR Material Library (Dark Hollywood Gold Palette)
    const matCampusLawn = new THREE.MeshStandardMaterial({
      color: 0x0c0c12,
      roughness: 0.85,
      metalness: 0.15,
    });
    const matPlazaStone = new THREE.MeshStandardMaterial({
      color: 0x16161d,
      roughness: 0.35,
      metalness: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const matRoad = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.6,
      metalness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const matSoundstageWall = new THREE.MeshStandardMaterial({
      color: 0x1e1e28,
      roughness: 0.38,
      metalness: 0.35,
    });
    const matTowerWindows = new THREE.MeshStandardMaterial({
      map: windowTexCyan,
      roughness: 0.18,
      metalness: 0.55,
    });
    const matExecutiveWindows = new THREE.MeshStandardMaterial({
      map: windowTexGold,
      roughness: 0.2,
      metalness: 0.55,
    });
    const matDarkSteel = new THREE.MeshStandardMaterial({
      color: 0x14141c,
      roughness: 0.3,
      metalness: 0.8,
    });
    const matBrushedGold = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      roughness: 0.18,
      metalness: 0.92,
      clearcoat: 0.85,
    });
    const matGlass = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.2,
      transmission: isSoftwareGl ? 0 : 0.65,
      transparent: true,
      opacity: isSoftwareGl ? 0.7 : 0.88,
      clearcoat: 1.0,
    });
    const matRedCarpet = new THREE.MeshStandardMaterial({
      color: 0xe50914,
      roughness: 0.65,
      metalness: 0.1,
    });
    const matEmissiveCyan = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.1,
      roughness: 0.2,
    });
    const matEmissiveAmber = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xd4af37,
      emissiveIntensity: 1.3,
      roughness: 0.2,
    });

    // 4. Studio Campus Ground, Central Fountain Plaza & Roads
    const groundMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(34, 34, 0.5, 64),
      matCampusLawn
    );
    groundMesh.position.y = -0.25;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const centralPlaza = new THREE.Mesh(
      new THREE.CylinderGeometry(11.8, 12.1, 0.08, 48),
      matPlazaStone
    );
    centralPlaza.position.y = 0.02;
    centralPlaza.receiveShadow = true;
    scene.add(centralPlaza);

    // Golden Perimeter Plaza Ring
    const plazaGoldRing = new THREE.Mesh(
      new THREE.RingGeometry(11.65, 11.9, 64),
      new THREE.MeshBasicMaterial({ color: 0xd4af37, side: THREE.DoubleSide })
    );
    plazaGoldRing.rotation.x = -Math.PI / 2;
    plazaGoldRing.position.y = 0.065;
    scene.add(plazaGoldRing);

    const mainAvenue = new THREE.Mesh(new THREE.BoxGeometry(22, 0.05, 2.5), matRoad);
    mainAvenue.position.set(0, 0.045, 0.8);
    mainAvenue.receiveShadow = true;
    scene.add(mainAvenue);

    const crossAvenue = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.05, 18), matRoad);
    crossAvenue.position.set(0, 0.05, 0.5);
    crossAvenue.receiveShadow = true;
    scene.add(crossAvenue);

    // Central Golden Cinema Globe Fountains
    for (const fx of [-2.6, 2.6]) {
      const fountainPool = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.95, 0.22, 24),
        matBrushedGold
      );
      fountainPool.position.set(fx, 0.11, -0.8);
      scene.add(fountainPool);

      const waterDisk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.76, 0.76, 0.24, 24),
        matEmissiveCyan
      );
      waterDisk.position.set(fx, 0.12, -0.8);
      scene.add(waterDisk);
    }

    // Grand Studio Entrance Archway at the South Road (0, 0, 8.2)
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, 8.2);
    const gatePillarL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.2, 0.65), matDarkSteel);
    gatePillarL.position.set(-2.1, 1.6, 0);
    gatePillarL.castShadow = true;
    gateGroup.add(gatePillarL);

    const gatePillarR = gatePillarL.clone();
    gatePillarR.position.set(2.1, 1.6, 0);
    gateGroup.add(gatePillarR);

    const gateArchBeam = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.85, 0.5), matBrushedGold);
    gateArchBeam.position.set(0, 3.35, 0);
    gateGroup.add(gateArchBeam);
    scene.add(gateGroup);

    // 5. Outdoor Perimeter Palm Trees & Golden Streetlights (InstancedMesh > 20 items)
    const treeCount = 32;
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 1.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const foliageGeo = new THREE.ConeGeometry(0.85, 1.9, 8);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.6 });

    const trunkInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const foliageInstanced = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const radius = 13.5 + (i % 3) * 1.4;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius;
      const scale = 0.85 + (i % 4) * 0.14;

      dummy.position.set(tx, 0.75 * scale, tz);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunkInstanced.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tx, 1.95 * scale, tz);
      dummy.updateMatrix();
      foliageInstanced.setMatrixAt(i, dummy.matrix);
    }
    trunkInstanced.instanceMatrix.needsUpdate = true;
    foliageInstanced.instanceMatrix.needsUpdate = true;
    trunkInstanced.computeBoundingSphere();
    foliageInstanced.computeBoundingSphere();
    scene.add(trunkInstanced);
    scene.add(foliageInstanced);

    // Floating Golden Hollywood Dust Particles in the Night Sky
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 32;
      particlePos[i * 3 + 1] = 1.2 + Math.random() * 11;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 26;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xd4af37,
      size: 0.16,
      transparent: true,
      opacity: 0.75,
    });
    const studioParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(studioParticles);

    // Animated Studio Production Trucks driving along the main avenue
    const truck1 = new THREE.Group();
    const truckCab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.5), matBrushedGold);
    truckCab.position.set(0.45, 0.28, 0);
    const truckTrailer = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.62, 0.56),
      matSoundstageWall
    );
    truckTrailer.position.set(-0.35, 0.36, 0);
    truck1.add(truckCab, truckTrailer);
    truck1.position.set(-8, 0.05, 1.35);
    scene.add(truck1);

    const truck2 = truck1.clone();
    truck2.rotation.y = Math.PI;
    truck2.position.set(8, 0.05, 0.25);
    scene.add(truck2);

    // 6. Dynamic Facility Groups & Raycast Proxies
    const facilitiesRoot = new THREE.Group();
    scene.add(facilitiesRoot);

    const clickableProxies: THREE.Mesh[] = [];
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });

    // Glowing Selection Ring on Ground
    const selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(2.45, 2.75, 48),
      new THREE.MeshBasicMaterial({
        color: 0xd4af37,
        side: THREE.DoubleSide,
      })
    );
    selectionRing.rotation.x = -Math.PI / 2;
    selectionRing.position.y = 0.07;
    scene.add(selectionRing);

    // Animated actors references
    let droneGroup: THREE.Group | null = null;
    let craneArmGroup: THREE.Group | null = null;
    let radarDishGroup: THREE.Group | null = null;
    let searchlightBeam1: THREE.Mesh | null = null;
    let searchlightBeam2: THREE.Mesh | null = null;

    const buildFacilitiesMeshes = () => {
      while (facilitiesRoot.children.length > 0) {
        const child = facilitiesRoot.children[0];
        facilitiesRoot.remove(child);
      }
      clickableProxies.length = 0;

      const lvls = levelsRef.current || DEFAULT_FACILITIES_LEVELS;

      // Update main gate studio sign with player's studio name
      const gateSignTex = createStudioSignTexture(
        maxAniso,
        studioNameRef.current || 'استوديو الإنتاج',
        'HYPTRIX HOLLYWOOD EMPIRE'
      );
      const gateBillboard = new THREE.Mesh(
        new THREE.BoxGeometry(4.6, 0.95, 0.18),
        new THREE.MeshBasicMaterial({ map: gateSignTex })
      );
      gateBillboard.position.set(0, 3.38, 8.42);
      facilitiesRoot.add(gateBillboard);

      const registerProxy = (
        id: StudioFacilityId,
        pos: [number, number, number],
        h: number
      ) => {
        const proxy = new THREE.Mesh(new THREE.BoxGeometry(4.5, h, 4.5), proxyMat);
        proxy.position.set(pos[0], h / 2, pos[2]);
        proxy.userData.facilityId = id;
        proxy.layers.set(1);
        facilitiesRoot.add(proxy);
        clickableProxies.push(proxy);
      };

      // =======================================================================
      // 1. SOUNDSTAGE COMPLEX (البلاتوه السينمائي الرئيسي) - Evolves Lv 1..5
      // =======================================================================
      {
        const lvl = lvls.soundstage || 1;
        const group = new THREE.Group();
        const [px, , pz] = FACILITY_3D_COORDS.soundstage.pos;
        group.position.set(px, 0, pz);

        const baseH = 2.0 + lvl * 0.32;

        // Concrete Foundation Pad
        const pad = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.14, 3.8), matDarkSteel);
        pad.position.y = 0.07;
        group.add(pad);

        // Main Soundstage Hangar 1
        const hangar1 = new THREE.Mesh(
          new THREE.BoxGeometry(3.6, baseH, 2.8),
          matSoundstageWall
        );
        hangar1.position.y = baseH / 2 + 0.14;
        hangar1.castShadow = true;
        hangar1.receiveShadow = true;
        group.add(hangar1);

        // Arched Barrel Roof 1
        const roof1 = new THREE.Mesh(
          new THREE.CylinderGeometry(1.4, 1.4, 3.66, 24, 1, false, 0, Math.PI),
          matDarkSteel
        );
        roof1.rotation.z = Math.PI / 2;
        roof1.position.y = baseH + 0.14;
        roof1.castShadow = true;
        group.add(roof1);

        // Giant Sliding Hangar Doors + Gold Frame
        const doorFrame = new THREE.Mesh(
          new THREE.BoxGeometry(1.75, 1.65, 0.14),
          matBrushedGold
        );
        doorFrame.position.set(0, 0.9, 1.42);
        group.add(doorFrame);

        // Stage Billboard Sign
        const stageSignTex = createStudioSignTexture(
          maxAniso,
          `بلاتوه التصوير · م${lvl}`,
          'STAGE 01 · SOUNDSTAGE'
        );
        const signMesh = new THREE.Mesh(
          new THREE.BoxGeometry(2.3, 0.58, 0.12),
          new THREE.MeshBasicMaterial({ map: stageSignTex })
        );
        signMesh.position.set(0, baseH + 0.45, 1.45);
        group.add(signMesh);

        // Level 2+: Gold Acoustic Buttresses & Exterior Spotlights
        if (lvl >= 2) {
          for (let r = -1.4; r <= 1.4; r += 0.7) {
            const buttress = new THREE.Mesh(
              new THREE.BoxGeometry(0.14, baseH + 0.25, 2.96),
              matBrushedGold
            );
            buttress.position.set(r, baseH / 2 + 0.14, 0);
            group.add(buttress);
          }
        }

        // Level 3+: Twin Parallel Soundstage Hangar 2 + Connecting Skybridge
        if (lvl >= 3) {
          const hangar2 = new THREE.Mesh(
            new THREE.BoxGeometry(2.6, baseH * 0.9, 2.5),
            matExecutiveWindows
          );
          hangar2.position.set(-2.6, (baseH * 0.9) / 2 + 0.14, -0.2);
          hangar2.castShadow = true;
          group.add(hangar2);

          const roof2 = new THREE.Mesh(
            new THREE.CylinderGeometry(1.25, 1.25, 2.64, 20, 1, false, 0, Math.PI),
            matBrushedGold
          );
          roof2.rotation.z = Math.PI / 2;
          roof2.position.set(-2.6, baseH * 0.9 + 0.14, -0.2);
          group.add(roof2);
        }

        // Level 4+: Glass Executive Production Atrium & Solar Roof
        if (lvl >= 4) {
          const atrium = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.75, 1.6), matGlass);
          atrium.position.set(0, baseH + 1.05, 0);
          group.add(atrium);
        }

        // Level 5: Imperial Golden Cinema Beacon & Helipad
        if (lvl >= 5) {
          const spire = new THREE.Mesh(
            new THREE.ConeGeometry(0.55, 1.4, 8),
            matBrushedGold
          );
          spire.position.set(0, baseH + 2.1, 0);
          group.add(spire);
        }

        facilitiesRoot.add(group);
        registerProxy('soundstage', FACILITY_3D_COORDS.soundstage.pos, baseH + 2.2);
      }

      // =======================================================================
      // 2. CAMERA, IMAX TECHNOCRANE & DRONE FLEET (أسطول الكاميرات) - Lv 1..5
      // =======================================================================
      {
        const lvl = lvls.camera_rig || 1;
        const group = new THREE.Group();
        const [px, , pz] = FACILITY_3D_COORDS.camera_rig.pos;
        group.position.set(px, 0, pz);

        // Circular Filming Backlot Stage Pad
        const stagePad = new THREE.Mesh(
          new THREE.CylinderGeometry(2.4, 2.55, 0.18, 36),
          matDarkSteel
        );
        stagePad.position.y = 0.09;
        stagePad.receiveShadow = true;
        group.add(stagePad);

        // Golden Dolly Track Ring
        const trackRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.85, 0.06, 12, 36),
          matBrushedGold
        );
        trackRing.rotation.x = Math.PI / 2;
        trackRing.position.y = 0.2;
        group.add(trackRing);

        // Robotic Technocrane Base
        const turret = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.68, 1.05, 20),
          matDarkSteel
        );
        turret.position.set(-0.5, 0.65, 0);
        turret.castShadow = true;
        group.add(turret);

        // Articulated Crane Arm + IMAX Camera Head
        craneArmGroup = new THREE.Group();
        craneArmGroup.position.set(-0.5, 1.15, 0);

        const armLen = 2.0 + lvl * 0.35;
        const boom = new THREE.Mesh(
          new THREE.BoxGeometry(armLen, 0.22, 0.22),
          matBrushedGold
        );
        boom.position.set(armLen * 0.36, 0.38, 0);
        boom.rotation.z = 0.28;
        craneArmGroup.add(boom);

        const camBox = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.48, 0.44),
          matDarkSteel
        );
        camBox.position.set(armLen * 0.82, 0.78, 0);
        craneArmGroup.add(camBox);

        const lens = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.22, 0.42, 16),
          matEmissiveCyan
        );
        lens.rotation.z = Math.PI / 2;
        lens.position.set(armLen * 0.82 + 0.42, 0.78, 0);
        craneArmGroup.add(lens);

        group.add(craneArmGroup);

        // Level 2+: LED Lighting Towers & Green-Screen Backdrop Wall
        if (lvl >= 2) {
          const greenScreen = new THREE.Mesh(
            new THREE.CylinderGeometry(
              2.15,
              2.15,
              1.6 + lvl * 0.25,
              24,
              1,
              true,
              Math.PI * 0.75,
              Math.PI * 0.85
            ),
            new THREE.MeshStandardMaterial({
              color: 0x10b981,
              emissive: 0x059669,
              emissiveIntensity: 0.55,
              side: THREE.DoubleSide,
            })
          );
          greenScreen.position.y = 0.95;
          group.add(greenScreen);
        }

        // Level 3+: Dual High-Intensity Softbox Towers
        if (lvl >= 3) {
          for (const side of [-1.35, 1.35]) {
            const tower = new THREE.Mesh(
              new THREE.CylinderGeometry(0.06, 0.1, 2.2, 10),
              matDarkSteel
            );
            tower.position.set(1.1, 1.1, side);
            group.add(tower);

            const lamp = new THREE.Mesh(
              new THREE.BoxGeometry(0.16, 0.7, 0.95),
              matEmissiveAmber
            );
            lamp.position.set(1.1, 2.2, side);
            group.add(lamp);
          }
        }

        // Hovering Cinema Drone Fleet
        droneGroup = new THREE.Group();
        droneGroup.position.set(0, 3.1 + lvl * 0.25, 0);
        const droneBody = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.18, 0.65),
          matBrushedGold
        );
        droneGroup.add(droneBody);
        const gimbal = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 14, 14),
          matEmissiveCyan
        );
        gimbal.position.y = -0.18;
        droneGroup.add(gimbal);

        for (const [rx, rz] of [
          [-0.48, -0.48],
          [0.48, -0.48],
          [-0.48, 0.48],
          [0.48, 0.48],
        ]) {
          const rotor = new THREE.Mesh(
            new THREE.CylinderGeometry(0.26, 0.26, 0.04, 12),
            matEmissiveCyan
          );
          rotor.position.set(rx, 0.12, rz);
          droneGroup.add(rotor);
        }
        group.add(droneGroup);

        facilitiesRoot.add(group);
        registerProxy('camera_rig', FACILITY_3D_COORDS.camera_rig.pos, 3.6);
      }

      // =======================================================================
      // 3. VFX & CYBER POST-PRODUCTION SKYSCRAPER (برج الخدع البصرية) - Lv 1..5
      // =======================================================================
      {
        const lvl = lvls.vfx_tower || 1;
        const group = new THREE.Group();
        const [px, , pz] = FACILITY_3D_COORDS.vfx_tower.pos;
        group.position.set(px, 0, pz);

        const towerH = 2.4 + lvl * 0.85;

        // Lobby Podium
        const podium = new THREE.Mesh(
          new THREE.BoxGeometry(3.6, 0.75, 3.2),
          matDarkSteel
        );
        podium.position.y = 0.375;
        podium.castShadow = true;
        group.add(podium);

        // Main Illuminated Window Skyscraper Core
        const skyscraper = new THREE.Mesh(
          new THREE.BoxGeometry(2.5, towerH, 2.3),
          matTowerWindows
        );
        skyscraper.position.y = 0.75 + towerH / 2;
        skyscraper.castShadow = true;
        group.add(skyscraper);

        // Golden Architectural Exo-Frame Fins
        for (const cx of [-1.26, 1.26]) {
          for (const cz of [-1.16, 1.16]) {
            const col = new THREE.Mesh(
              new THREE.BoxGeometry(0.16, towerH + 0.3, 0.16),
              matBrushedGold
            );
            col.position.set(cx, 0.75 + towerH / 2, cz);
            group.add(col);
          }
        }

        // Level 2+: Glowing LED Volume Virtual Production Rotunda
        if (lvl >= 2) {
          const ledDome = new THREE.Mesh(
            new THREE.CylinderGeometry(1.35, 1.35, 1.65, 24),
            matGlass
          );
          ledDome.position.set(-1.3, 1.5, 1.1);
          group.add(ledDome);

          const ledRing = new THREE.Mesh(
            new THREE.TorusGeometry(1.38, 0.06, 10, 28),
            matEmissiveCyan
          );
          ledRing.rotation.x = Math.PI / 2;
          ledRing.position.set(-1.3, 2.3, 1.1);
          group.add(ledRing);
        }

        // Level 4+: Stepped Upper Penthouse Tier
        if (lvl >= 4) {
          const penthouse = new THREE.Mesh(
            new THREE.BoxGeometry(1.75, 1.3, 1.65),
            matGlass
          );
          penthouse.position.y = 0.75 + towerH + 0.65;
          group.add(penthouse);
        }

        // Rotating Satellite Uplink Dish on Top
        radarDishGroup = new THREE.Group();
        const dishY = 0.75 + towerH + (lvl >= 4 ? 1.45 : 0.25);
        radarDishGroup.position.set(0, dishY, 0);

        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.16, 0.6, 10),
          matDarkSteel
        );
        radarDishGroup.add(mast);

        const dish = new THREE.Mesh(
          new THREE.ConeGeometry(0.68, 0.36, 20, 1, true),
          matBrushedGold
        );
        dish.rotation.x = -Math.PI / 3;
        dish.position.y = 0.42;
        radarDishGroup.add(dish);

        group.add(radarDishGroup);

        facilitiesRoot.add(group);
        registerProxy('vfx_tower', FACILITY_3D_COORDS.vfx_tower.pos, dishY + 1.2);
      }

      // =======================================================================
      // 4. DOLBY ATMOS SYMPHONY DOME (قاعة الصوت والموسيقى التصويرية) - Lv 1..5
      // =======================================================================
      {
        const lvl = lvls.audio_stage || 1;
        const group = new THREE.Group();
        const [px, , pz] = FACILITY_3D_COORDS.audio_stage.pos;
        group.position.set(px, 0, pz);

        const hallH = 1.35 + lvl * 0.28;

        // Stepped Circular Plinth
        const plinth = new THREE.Mesh(
          new THREE.CylinderGeometry(2.25, 2.45, 0.24, 36),
          matDarkSteel
        );
        plinth.position.y = 0.12;
        group.add(plinth);

        // Cylindrical Acoustic Concert Hall
        const rotunda = new THREE.Mesh(
          new THREE.CylinderGeometry(1.85, 1.95, hallH, 32),
          matExecutiveWindows
        );
        rotunda.position.y = 0.24 + hallH / 2;
        rotunda.castShadow = true;
        group.add(rotunda);

        // Golden Acoustic Symphony Dome
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(1.82, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2),
          matBrushedGold
        );
        dome.position.y = 0.24 + hallH;
        dome.castShadow = true;
        group.add(dome);

        // Concentric Glowing Sound-Wave Rings
        for (let r = 1; r <= lvl; r++) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.92, 0.055, 12, 36),
            r % 2 === 0 ? matEmissiveCyan : matBrushedGold
          );
          ring.rotation.x = Math.PI / 2;
          ring.position.y = 0.24 + (r / (lvl + 1)) * hallH;
          group.add(ring);
        }

        // Acoustic Spire & Glowing Orb
        const spire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.14, 1.4, 12),
          matDarkSteel
        );
        spire.position.y = 0.24 + hallH + 1.85;
        group.add(spire);

        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 14, 14),
          matEmissiveAmber
        );
        beacon.position.y = 0.24 + hallH + 2.6;
        group.add(beacon);

        facilitiesRoot.add(group);
        registerProxy('audio_stage', FACILITY_3D_COORDS.audio_stage.pos, hallH + 3.0);
      }

      // =======================================================================
      // 5. RED CARPET PREMIERE PALACE & MARKETING HUB (جناح التسويق) - Lv 1..5
      // =======================================================================
      {
        const lvl = lvls.marketing_hub || 1;
        const group = new THREE.Group();
        const [px, , pz] = FACILITY_3D_COORDS.marketing_hub.pos;
        group.position.set(px, 0, pz);

        const palaceH = 1.55 + lvl * 0.3;

        // Grand Media Palace Building
        const palace = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, palaceH, 2.4),
          matExecutiveWindows
        );
        palace.position.y = palaceH / 2;
        palace.castShadow = true;
        group.add(palace);

        // Golden Roof Cornice
        const cornice = new THREE.Mesh(
          new THREE.BoxGeometry(3.4, 0.22, 2.6),
          matBrushedGold
        );
        cornice.position.y = palaceH + 0.11;
        group.add(cornice);

        // Grand Red Carpet Walkway + Gold Stanchion Pillars
        const carpet = new THREE.Mesh(
          new THREE.BoxGeometry(1.35, 0.06, 2.6),
          matRedCarpet
        );
        carpet.position.set(0, 0.04, 1.7);
        group.add(carpet);

        for (const sx of [-0.75, 0.75]) {
          for (const sz of [1.1, 1.8, 2.5]) {
            const post = new THREE.Mesh(
              new THREE.CylinderGeometry(0.05, 0.06, 0.55, 8),
              matBrushedGold
            );
            post.position.set(sx, 0.28, sz);
            group.add(post);
          }
        }

        // Giant Golden Star & Trophy Monument on Roof
        const pedestal = new THREE.Mesh(
          new THREE.CylinderGeometry(0.45, 0.58, 0.5, 16),
          matDarkSteel
        );
        pedestal.position.set(0, palaceH + 0.45, 0);
        group.add(pedestal);

        const statue = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.55 + lvl * 0.06, 0),
          matBrushedGold
        );
        statue.position.set(0, palaceH + 1.25, 0);
        group.add(statue);

        // Volumetric Sky Searchlight Beams Sweeping the Night Sky
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0xd4af37,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        });
        searchlightBeam1 = new THREE.Mesh(
          new THREE.ConeGeometry(0.95, 8.2, 20, 1, true),
          beamMat
        );
        searchlightBeam1.position.set(-1.2, palaceH + 3.4, 0.8);
        searchlightBeam1.rotation.z = 0.25;
        group.add(searchlightBeam1);

        if (lvl >= 2) {
          searchlightBeam2 = new THREE.Mesh(
            new THREE.ConeGeometry(0.95, 8.2, 20, 1, true),
            beamMat
          );
          searchlightBeam2.position.set(1.2, palaceH + 3.4, 0.8);
          searchlightBeam2.rotation.z = -0.25;
          group.add(searchlightBeam2);
        } else {
          searchlightBeam2 = null;
        }

        facilitiesRoot.add(group);
        registerProxy('marketing_hub', FACILITY_3D_COORDS.marketing_hub.pos, palaceH + 2.5);
      }
    };

    rebuildFacilityFnRef.current = buildFacilitiesMeshes;
    buildFacilitiesMeshes();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 7. Raycasting on Click (Restricted to Layer 1)
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let pointerDownX = 0;
    let pointerDownY = 0;

    const onPointerDown = (e: PointerEvent) => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
      if (dist > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      if (isRotatedRef.current) {
        const normX = (e.clientY - rect.top) / Math.max(1, rect.height);
        const normY = 1 - (e.clientX - rect.left) / Math.max(1, rect.width);
        pointer.x = normX * 2 - 1;
        pointer.y = -(normY * 2 - 1);
      } else {
        pointer.x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      }

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableProxies, false);
      if (hits.length > 0) {
        const facId = hits[0].object.userData.facilityId as StudioFacilityId | undefined;
        if (facId && onSelectRef.current) {
          onSelectRef.current(facId);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // 8. Responsive Resize (Uses offsetWidth/offsetHeight so CSS rotation never distorts aspect ratio!)
    const handleResize = () => {
      if (!container) return;
      const w = container.offsetWidth || window.innerWidth || 1024;
      const h = container.offsetHeight || window.innerHeight || 600;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const resizeObs =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    if (resizeObs) resizeObs.observe(container);

    // 9. Paced Animation Loop
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (gl.flush) gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Update selection ring
      const activeFac = selectedRef.current || 'soundstage';
      const facCoords = FACILITY_3D_COORDS[activeFac].pos;
      selectionRing.position.x = THREE.MathUtils.damp(
        selectionRing.position.x,
        facCoords[0],
        8,
        delta
      );
      selectionRing.position.z = THREE.MathUtils.damp(
        selectionRing.position.z,
        facCoords[2],
        8,
        delta
      );

      // Animate floating golden particles
      studioParticles.rotation.y = elapsed * 0.03;

      // Animate production trucks driving along the studio avenue
      truck1.position.x = ((elapsed * 2.2) % 20) - 10;
      truck2.position.x = 10 - ((elapsed * 1.8) % 20);

      // Animate drone, technocrane, radar dish, and sky searchlights
      if (droneGroup) {
        const speed = isFilmingRef.current ? 1.8 : 0.85;
        droneGroup.position.x = Math.sin(elapsed * speed) * 1.6;
        droneGroup.position.z = Math.cos(elapsed * speed) * 1.2;
        droneGroup.position.y =
          3.0 + (levelsRef.current.camera_rig || 1) * 0.25 + Math.sin(elapsed * 2.5) * 0.15;
      }
      if (craneArmGroup) {
        craneArmGroup.rotation.y = Math.sin(elapsed * 0.7) * 0.5;
      }
      if (radarDishGroup) {
        radarDishGroup.rotation.y = elapsed * 0.55;
      }
      if (searchlightBeam1) {
        searchlightBeam1.rotation.z = 0.2 + Math.sin(elapsed * 1.15) * 0.25;
      }
      if (searchlightBeam2) {
        searchlightBeam2.rotation.z = -0.2 + Math.cos(elapsed * 1.15) * 0.25;
      }

      // Smooth camera transition damping
      if (cameraTransitionActiveRef.current) {
        if (cameraModeRef.current === 'focus' && selectedRef.current) {
          const spec = FACILITY_3D_COORDS[selectedRef.current];
          _targetPos.set(...spec.camPos);
          _targetLook.set(spec.pos[0], 1.2, spec.pos[2]);
        } else {
          _targetPos.set(...OVERVIEW_CAM_POS);
          _targetLook.set(...OVERVIEW_TARGET);
        }

        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetPos.x, 4.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetPos.y, 4.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetPos.z, 4.5, delta);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLook.x, 5.5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLook.y, 5.5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLook.z, 5.5, delta);

        if (camera.position.distanceTo(_targetPos) < 0.08) {
          cameraTransitionActiveRef.current = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      if (resizeObs) resizeObs.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={canvasMountRef}
      className={
        fullScreenBackground
          ? 'absolute inset-0 z-0 h-full w-full cursor-grab active:cursor-grabbing'
          : 'relative h-[420px] w-full cursor-grab active:cursor-grabbing rounded-3xl overflow-hidden'
      }
    />
  );
}
