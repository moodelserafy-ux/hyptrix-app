'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  StudioFacilityId,
  StudioFacilitiesLevels,
  DEFAULT_FACILITIES_LEVELS,
  STUDIO_FACILITY_CONFIGS,
  getFacilityUpgradeCost,
  formatMoney,
} from '@/lib/game-engine';
import {
  ArrowUpCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Building2,
} from 'lucide-react';

interface StudioCampus3DProps {
  studioName: string;
  cash: number;
  facilitiesLevels: StudioFacilitiesLevels;
  onUpgradeFacility: (id: StudioFacilityId) => { ok: boolean; message: string };
  isFilmingActive?: boolean;
  compactHeight?: boolean;
}

const FACILITY_POSITIONS: Record<
  StudioFacilityId,
  { pos: [number, number, number]; camPos: [number, number, number] }
> = {
  soundstage: {
    pos: [-5.2, 0, -2.2],
    camPos: [-8.5, 5.2, 4.8],
  },
  camera_rig: {
    pos: [0, 0, 0.8],
    camPos: [0, 4.2, 7.6],
  },
  vfx_tower: {
    pos: [5.2, 0, -2.2],
    camPos: [8.8, 5.8, 4.8],
  },
  audio_stage: {
    pos: [-4.6, 0, 3.6],
    camPos: [-7.8, 4.5, 9.2],
  },
  marketing_hub: {
    pos: [4.6, 0, 3.6],
    camPos: [7.8, 4.5, 9.2],
  },
};

const OVERVIEW_CAM_POS: [number, number, number] = [0, 9.5, 14.5];
const OVERVIEW_TARGET: [number, number, number] = [0, 0.8, 0.5];

// Pre-allocated math helpers outside the animation loop (Zero GC)
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();

export function StudioCampus3D({
  studioName,
  cash,
  facilitiesLevels = DEFAULT_FACILITIES_LEVELS,
  onUpgradeFacility,
  isFilmingActive = false,
  compactHeight = false,
}: StudioCampus3DProps) {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<StudioFacilityId>('soundstage');
  const [cameraMode, setCameraMode] = useState<'overview' | 'focus'>('overview');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Store mutable refs for the WebGL loop without tearing down the canvas
  const levelsRef = useRef<StudioFacilitiesLevels>(facilitiesLevels);
  const selectedRef = useRef<StudioFacilityId>(selectedFacility);
  const cameraModeRef = useRef<'overview' | 'focus'>(cameraMode);
  const isFilmingRef = useRef<boolean>(isFilmingActive);
  const rebuildFacilityFnRef = useRef<(() => void) | null>(null);
  const cameraTransitionActiveRef = useRef<boolean>(false);

  useEffect(() => {
    levelsRef.current = facilitiesLevels;
    if (rebuildFacilityFnRef.current) {
      rebuildFacilityFnRef.current();
    }
  }, [facilitiesLevels]);

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

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x0f172a);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0x0f172a, 0.028);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 120);
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
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Studio Environment Map (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Balanced 3-Point Studio & Outdoor Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.85);
    hemiLight.position.set(0, 25, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3d1, 2.2);
    keyLight.position.set(12, 18, 10);
    keyLight.castShadow = !isSoftwareGl;
    const d = 14;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 45;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rimLight.position.set(-14, 10, -10);
    scene.add(rimLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.minPolarAngle = 0.25;
    controls.minDistance = 4.5;
    controls.maxDistance = 26;
    controls.target.set(...OVERVIEW_TARGET);

    controls.addEventListener('start', () => {
      cameraTransitionActiveRef.current = false;
    });

    // Shared PBR Material Library
    const matGround = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.88,
      metalness: 0.08,
    });
    const matRoad = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.75,
      metalness: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const matWallConcrete = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.65,
      metalness: 0.1,
    });
    const matDarkSteel = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.35,
      metalness: 0.82,
    });
    const matBrushedGold = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.92,
      clearcoat: 0.6,
    });
    const matGlass = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.12,
      metalness: 0.15,
      transmission: isSoftwareGl ? 0 : 0.75,
      transparent: true,
      opacity: isSoftwareGl ? 0.55 : 0.92,
      clearcoat: 1.0,
    });
    const matRedCarpet = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      roughness: 0.8,
      metalness: 0.05,
    });
    const matEmissiveCyan = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    const matEmissiveAmber = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });

    // 4. Studio Campus Ground & Roads
    const groundMesh = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 0.4, 48), matGround);
    groundMesh.position.y = -0.2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const mainRoad = new THREE.Mesh(new THREE.BoxGeometry(18, 0.04, 2.4), matRoad);
    mainRoad.position.set(0, 0.02, 0.8);
    mainRoad.receiveShadow = true;
    scene.add(mainRoad);

    const crossRoad = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 14), matRoad);
    crossRoad.position.set(0, 0.025, 0);
    crossRoad.receiveShadow = true;
    scene.add(crossRoad);

    // 5. Outdoor Perimeter Trees (InstancedMesh > 20 items)
    const treeCount = 24;
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.1, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const foliageGeo = new THREE.ConeGeometry(0.75, 1.8, 8);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.65 });

    const trunkInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const foliageInstanced = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const radius = 12.2 + (i % 3) * 1.1;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius;
      const scale = 0.85 + (i % 4) * 0.1;

      dummy.position.set(tx, 0.55 * scale, tz);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunkInstanced.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tx, 1.6 * scale, tz);
      dummy.updateMatrix();
      foliageInstanced.setMatrixAt(i, dummy.matrix);
    }
    trunkInstanced.instanceMatrix.needsUpdate = true;
    foliageInstanced.instanceMatrix.needsUpdate = true;
    trunkInstanced.computeBoundingSphere();
    foliageInstanced.computeBoundingSphere();
    scene.add(trunkInstanced);
    scene.add(foliageInstanced);

    // 6. Dynamic Facility Groups & Raycast Proxies
    const facilitiesRoot = new THREE.Group();
    scene.add(facilitiesRoot);

    const clickableProxies: THREE.Mesh[] = [];
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });

    // Selection ring indicator on ground
    const selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(2.1, 2.38, 36),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
      })
    );
    selectionRing.rotation.x = -Math.PI / 2;
    selectionRing.position.y = 0.05;
    scene.add(selectionRing);

    // Animated actors references
    let droneGroup: THREE.Group | null = null;
    let craneArmGroup: THREE.Group | null = null;
    let radarDishGroup: THREE.Group | null = null;
    let searchlightBeam1: THREE.Mesh | null = null;
    let searchlightBeam2: THREE.Mesh | null = null;

    const buildFacilitiesMeshes = () => {
      // Clear previous children
      while (facilitiesRoot.children.length > 0) {
        const child = facilitiesRoot.children[0];
        facilitiesRoot.remove(child);
      }
      clickableProxies.length = 0;

      const lvls = levelsRef.current || DEFAULT_FACILITIES_LEVELS;

      // Helper to register raycast proxy for each building
      const registerProxy = (id: StudioFacilityId, pos: [number, number, number], h: number) => {
        const proxy = new THREE.Mesh(new THREE.BoxGeometry(3.8, h, 3.8), proxyMat);
        proxy.position.set(pos[0], h / 2, pos[2]);
        proxy.userData.facilityId = id;
        proxy.layers.set(1);
        facilitiesRoot.add(proxy);
        clickableProxies.push(proxy);
      };

      // =======================================================================
      // A. SOUNDSTAGE BUILDING (البلاتوه السينمائي الرئيسي) - 6 to 10 parts
      // =======================================================================
      {
        const lvl = lvls.soundstage || 1;
        const group = new THREE.Group();
        const [px, , pz] = FACILITY_POSITIONS.soundstage.pos;
        group.position.set(px, 0, pz);

        const baseH = 1.8 + lvl * 0.25;
        // 1. Primary Hangar Body
        const hangar = new THREE.Mesh(new THREE.BoxGeometry(3.4, baseH, 2.6), matWallConcrete);
        hangar.position.y = baseH / 2;
        hangar.castShadow = true;
        hangar.receiveShadow = true;
        group.add(hangar);

        // 2. Arched Acoustic Barrel Roof
        const barrelRoof = new THREE.Mesh(
          new THREE.CylinderGeometry(1.3, 1.3, 3.44, 20, 1, false, 0, Math.PI),
          matDarkSteel
        );
        barrelRoof.rotation.z = Math.PI / 2;
        barrelRoof.position.y = baseH;
        barrelRoof.castShadow = true;
        group.add(barrelRoof);

        // 3. Sliding Soundproof Hangar Doors
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.35, 0.12), matBrushedGold);
        door.position.set(0, 0.68, 1.32);
        group.add(door);

        // 4. Illuminated "STAGE 1" Signboard
        const sign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.1), matEmissiveAmber);
        sign.position.set(0, baseH + 0.35, 1.25);
        group.add(sign);

        // 5. Level 2+: Acoustic Gold Structural Ribs
        if (lvl >= 2) {
          for (let r = -1.2; r <= 1.2; r += 0.8) {
            const rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, baseH + 0.2, 2.72), matBrushedGold);
            rib.position.set(r, baseH / 2, 0);
            group.add(rib);
          }
        }

        // 6. Level 3+: Second Connected Soundstage Wing & HVAC Chillers
        if (lvl >= 3) {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6, baseH * 0.85, 2.2), matWallConcrete);
          wing.position.set(-2.3, (baseH * 0.85) / 2, -0.2);
          wing.castShadow = true;
          group.add(wing);

          const hvac = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.7), matDarkSteel);
          hvac.position.set(-0.8, baseH + 0.7, -0.3);
          group.add(hvac);
        }

        // 7. Level 4+: Rooftop Solar Array & Skybridge
        if (lvl >= 4) {
          const solar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.1), matGlass);
          solar.position.set(0.3, baseH + 0.85, 0.2);
          solar.rotation.x = 0.22;
          group.add(solar);
        }

        // 8. Level 5: Imperial Golden Crown Beacon
        if (lvl >= 5) {
          const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), matBrushedGold);
          crown.position.set(0, baseH + 1.55, 0);
          group.add(crown);
        }

        facilitiesRoot.add(group);
        registerProxy('soundstage', FACILITY_POSITIONS.soundstage.pos, baseH + 1.6);
      }

      // =======================================================================
      // B. CAMERA & IMAX TECHNOCRANE RIG (أسطول كاميرات IMAX والدرون) - 7 parts
      // =======================================================================
      {
        const lvl = lvls.camera_rig || 1;
        const group = new THREE.Group();
        const [px, , pz] = FACILITY_POSITIONS.camera_rig.pos;
        group.position.set(px, 0, pz);

        // 1. Dolly Track Platform & Rails
        const platform = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 2.2), matDarkSteel);
        platform.position.y = 0.08;
        platform.receiveShadow = true;
        group.add(platform);

        const rail1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.0, 12), matBrushedGold);
        rail1.rotation.z = Math.PI / 2;
        rail1.position.set(0, 0.2, 0.55);
        group.add(rail1);

        const rail2 = rail1.clone();
        rail2.position.set(0, 0.2, -0.55);
        group.add(rail2);

        // 2. Technocrane Turret Base
        const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.58, 0.9, 16), matDarkSteel);
        turret.position.set(-0.4, 0.55, 0);
        turret.castShadow = true;
        group.add(turret);

        // 3. Articulated Technocrane Boom Arm + IMAX Camera Head
        craneArmGroup = new THREE.Group();
        craneArmGroup.position.set(-0.4, 1.0, 0);

        const armLength = 1.8 + lvl * 0.28;
        const boom = new THREE.Mesh(new THREE.BoxGeometry(armLength, 0.18, 0.18), matBrushedGold);
        boom.position.set(armLength * 0.35, 0.3, 0);
        boom.rotation.z = 0.28;
        craneArmGroup.add(boom);

        const camBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.38), matDarkSteel);
        camBody.position.set(armLength * 0.82, 0.65, 0);
        craneArmGroup.add(camBody);

        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.35, 16), matGlass);
        lens.rotation.z = Math.PI / 2;
        lens.position.set(armLength * 0.82 + 0.36, 0.65, 0);
        craneArmGroup.add(lens);

        group.add(craneArmGroup);

        // 4. Level 2+: Studio LED Softbox Towers
        if (lvl >= 2) {
          for (const side of [-1, 1]) {
            const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.6, 8), matDarkSteel);
            stand.position.set(1.1, 0.8, side * 0.85);
            group.add(stand);

            const panel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.75), matEmissiveCyan);
            panel.position.set(1.1, 1.65, side * 0.85);
            group.add(panel);
          }
        }

        // 5. Hovering Cinema Drone Overhead
        droneGroup = new THREE.Group();
        droneGroup.position.set(0, 2.7 + lvl * 0.25, 0);
        const droneCore = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.55), matDarkSteel);
        droneGroup.add(droneCore);
        const droneGimbal = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), matEmissiveCyan);
        droneGimbal.position.y = -0.15;
        droneGroup.add(droneGimbal);

        for (const [rx, rz] of [
          [-0.4, -0.4],
          [0.4, -0.4],
          [-0.4, 0.4],
          [0.4, 0.4],
        ]) {
          const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 12), matBrushedGold);
          rotor.position.set(rx, 0.1, rz);
          droneGroup.add(rotor);
        }
        group.add(droneGroup);

        facilitiesRoot.add(group);
        registerProxy('camera_rig', FACILITY_POSITIONS.camera_rig.pos, 3.2);
      }

      // =======================================================================
      // C. VFX & POST-PRODUCTION TOWER (برج الخدع البصرية والمونتاج) - 7 parts
      // =======================================================================
      {
        const lvl = lvls.vfx_tower || 1;
        const group = new THREE.Group();
        const [px, , pz] = FACILITY_POSITIONS.vfx_tower.pos;
        group.position.set(px, 0, pz);

        const towerH = 2.0 + lvl * 0.55;

        // 1. Podium Base
        const podium = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.6, 2.6), matDarkSteel);
        podium.position.y = 0.3;
        podium.castShadow = true;
        podium.receiveShadow = true;
        group.add(podium);

        // 2. Glass & Steel High-Tech Tower Core
        const core = new THREE.Mesh(new THREE.BoxGeometry(2.1, towerH, 1.9), matGlass);
        core.position.y = 0.6 + towerH / 2;
        core.castShadow = true;
        group.add(core);

        // 3. Structural Floor Tiers
        for (let i = 1; i <= lvl + 1; i++) {
          const slab = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.1, 2.06), matWallConcrete);
          slab.position.y = 0.6 + (i / (lvl + 2)) * towerH;
          group.add(slab);
        }

        // 4. Level 2+: Glowing LED Volume Curved Wall Annex
        if (lvl >= 2) {
          const ledVolume = new THREE.Mesh(
            new THREE.CylinderGeometry(1.15, 1.15, 1.4, 20, 1, true, 0, Math.PI * 1.1),
            matEmissiveCyan
          );
          ledVolume.position.set(-0.9, 1.3, 0.9);
          group.add(ledVolume);
        }

        // 5. Rotating Satellite / Cybersecurity Uplink Dish on Roof
        radarDishGroup = new THREE.Group();
        radarDishGroup.position.set(0, 0.6 + towerH + 0.25, 0);

        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.5, 10), matDarkSteel);
        radarDishGroup.add(mast);

        const dish = new THREE.Mesh(
          new THREE.ConeGeometry(0.55, 0.3, 18, 1, true),
          matBrushedGold
        );
        dish.rotation.x = -Math.PI / 3;
        dish.position.y = 0.35;
        radarDishGroup.add(dish);

        group.add(radarDishGroup);

        facilitiesRoot.add(group);
        registerProxy('vfx_tower', FACILITY_POSITIONS.vfx_tower.pos, towerH + 1.4);
      }

      // =======================================================================
      // D. DOLBY ATMOS SCORING STAGE (قاعة الصوت والموسيقى التصويرية) - 6 parts
      // =======================================================================
      {
        const lvl = lvls.audio_stage || 1;
        const group = new THREE.Group();
        const [px, , pz] = FACILITY_POSITIONS.audio_stage.pos;
        group.position.set(px, 0, pz);

        const rotundaH = 1.2 + lvl * 0.22;

        // 1. Cylindrical Acoustic Hall
        const hall = new THREE.Mesh(
          new THREE.CylinderGeometry(1.55, 1.7, rotundaH, 28),
          matWallConcrete
        );
        hall.position.y = rotundaH / 2;
        hall.castShadow = true;
        hall.receiveShadow = true;
        group.add(hall);

        // 2. Golden Acoustic Dome Roof
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(1.52, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
          matBrushedGold
        );
        dome.position.y = rotundaH;
        dome.castShadow = true;
        group.add(dome);

        // 3. Concentric Sound-Wave Acoustic Rings
        for (let r = 1; r <= Math.min(4, lvl); r++) {
          const torus = new THREE.Mesh(
            new THREE.TorusGeometry(1.58, 0.05, 10, 32),
            r % 2 === 0 ? matEmissiveCyan : matBrushedGold
          );
          torus.rotation.x = Math.PI / 2;
          torus.position.y = (r / (lvl + 1)) * rotundaH;
          group.add(torus);
        }

        // 4. Broadcast Spire
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.1, 1.2, 10), matDarkSteel);
        spire.position.y = rotundaH + 1.5;
        group.add(spire);

        const spireBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), matEmissiveAmber);
        spireBeacon.position.y = rotundaH + 2.15;
        group.add(spireBeacon);

        facilitiesRoot.add(group);
        registerProxy('audio_stage', FACILITY_POSITIONS.audio_stage.pos, rotundaH + 2.3);
      }

      // =======================================================================
      // E. MARKETING & RED CARPET PAVILION (جناح التسويق والسجادة الحمراء) - 7 parts
      // =======================================================================
      {
        const lvl = lvls.marketing_hub || 1;
        const group = new THREE.Group();
        const [px, , pz] = FACILITY_POSITIONS.marketing_hub.pos;
        group.position.set(px, 0, pz);

        const bldgH = 1.3 + lvl * 0.22;

        // 1. Main Media Pavilion Building
        const pavilion = new THREE.Mesh(new THREE.BoxGeometry(2.6, bldgH, 2.0), matWallConcrete);
        pavilion.position.y = bldgH / 2;
        pavilion.castShadow = true;
        pavilion.receiveShadow = true;
        group.add(pavilion);

        // 2. Red Carpet Walkway
        const carpet = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 2.2), matRedCarpet);
        carpet.position.set(0, 0.03, 1.5);
        group.add(carpet);

        // 3. Golden VIP Archway
        const archPillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.3, 12), matBrushedGold);
        archPillarL.position.set(-0.55, 0.65, 2.1);
        group.add(archPillarL);

        const archPillarR = archPillarL.clone();
        archPillarR.position.set(0.55, 0.65, 2.1);
        group.add(archPillarR);

        const archTop = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.22, 0.22), matBrushedGold);
        archTop.position.set(0, 1.3, 2.1);
        group.add(archTop);

        // 4. Golden Trophy Monument on Roof
        const trophyCup = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.85, 16), matBrushedGold);
        trophyCup.position.set(0, bldgH + 0.55, 0);
        trophyCup.rotation.x = Math.PI;
        group.add(trophyCup);

        // 5. Level 2+: Sky Searchlight Beams
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        });
        searchlightBeam1 = new THREE.Mesh(new THREE.ConeGeometry(0.65, 5.5, 16, 1, true), beamMat);
        searchlightBeam1.position.set(-1.0, bldgH + 2.4, 0.6);
        searchlightBeam1.rotation.z = 0.25;
        group.add(searchlightBeam1);

        if (lvl >= 3) {
          searchlightBeam2 = new THREE.Mesh(new THREE.ConeGeometry(0.65, 5.5, 16, 1, true), beamMat);
          searchlightBeam2.position.set(1.0, bldgH + 2.4, 0.6);
          searchlightBeam2.rotation.z = -0.25;
          group.add(searchlightBeam2);
        } else {
          searchlightBeam2 = null;
        }

        facilitiesRoot.add(group);
        registerProxy('marketing_hub', FACILITY_POSITIONS.marketing_hub.pos, bldgH + 2.0);
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
      if (dist > 6) return; // Ignore drag-orbit gestures

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableProxies, false);
      if (hits.length > 0) {
        const facId = hits[0].object.userData.facilityId as StudioFacilityId | undefined;
        if (facId) {
          setSelectedFacility(facId);
          setCameraMode('focus');
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // 8. Responsive Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 9. Paced Animation Loop (Hardware rAF vs Software WebGL fenceSync afterDraw)
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

      // Update selection ring position smoothly
      const activeFac = selectedRef.current;
      const facCoords = FACILITY_POSITIONS[activeFac].pos;
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

      // Animate drone, technocrane, radar dish, and searchlights
      if (droneGroup) {
        const speed = isFilmingRef.current ? 1.8 : 0.75;
        droneGroup.position.x = Math.sin(elapsed * speed) * 1.4;
        droneGroup.position.z = Math.cos(elapsed * speed) * 1.1;
        droneGroup.position.y =
          2.6 + (levelsRef.current.camera_rig || 1) * 0.22 + Math.sin(elapsed * 2.5) * 0.12;
      }
      if (craneArmGroup) {
        craneArmGroup.rotation.y = Math.sin(elapsed * 0.65) * 0.45;
      }
      if (radarDishGroup) {
        radarDishGroup.rotation.y = elapsed * 0.5;
      }
      if (searchlightBeam1) {
        searchlightBeam1.rotation.z = 0.2 + Math.sin(elapsed * 1.1) * 0.22;
      }
      if (searchlightBeam2) {
        searchlightBeam2.rotation.z = -0.2 + Math.cos(elapsed * 1.1) * 0.22;
      }

      // Smooth camera transition damping when user selects a building or overview
      if (cameraTransitionActiveRef.current) {
        if (cameraModeRef.current === 'focus') {
          const spec = FACILITY_POSITIONS[activeFac];
          _targetPos.set(...spec.camPos);
          _targetLook.set(spec.pos[0], 1.1, spec.pos[2]);
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
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  const activeConfig =
    STUDIO_FACILITY_CONFIGS.find((f) => f.id === selectedFacility) ||
    STUDIO_FACILITY_CONFIGS[0];
  const currentLvl = facilitiesLevels[selectedFacility] || 1;
  const isMaxLevel = currentLvl >= activeConfig.maxLevel;
  const upgradeCost = getFacilityUpgradeCost(selectedFacility, currentLvl);
  const canAfford = cash >= upgradeCost;

  const handleUpgradeClick = () => {
    const res = onUpgradeFacility(selectedFacility);
    setFeedbackBanner(res.message);
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-lg ${
        compactHeight ? 'h-[360px] sm:h-[400px]' : 'h-[480px] sm:h-[540px]'
      }`}
    >
      {/* Isolated WebGL Canvas Mount Container */}
      <div ref={canvasMountRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

      {/* Minimal Top-Right Spec Header & Camera Reset (Zero Viewport Occlusion) */}
      <div className="pointer-events-none absolute top-3 right-3 left-3 z-10 flex items-center justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900/90 px-3 py-1.5 text-xs">
          <Building2 className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="font-display font-bold text-white">{studioName}</span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span className="text-slate-300">المدينة الإنتاجية 3D</span>
        </div>

        <button
          type="button"
          onClick={() => setCameraMode(cameraMode === 'overview' ? 'focus' : 'overview')}
          className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
          <span>{cameraMode === 'focus' ? 'مشهد شامل للمدينة' : 'تقريب الكاميرا للمبنى'}</span>
        </button>
      </div>

      {/* Toast Feedback Banner */}
      {feedbackBanner && (
        <div className="pointer-events-none absolute top-14 right-1/2 z-20 translate-x-1/2 rounded-xl border border-emerald-400/40 bg-slate-900/95 px-4 py-2 text-xs font-semibold text-emerald-300 shadow-lg whitespace-nowrap">
          {feedbackBanner}
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (Follows Three.js Skill Section 5) */}
      <div
        className="pointer-events-none absolute bottom-3 left-1/2 z-10 w-[94%] max-w-[860px] -translate-x-1/2"
      >
        <div className="flex justify-center mb-1.5">
          <button
            type="button"
            onClick={() => setDockCollapsed(!dockCollapsed)}
            className="pointer-events-auto flex items-center gap-1 rounded-lg border border-white/15 bg-slate-900/95 px-3 py-1 text-[11px] font-medium text-slate-300 transition hover:text-white whitespace-nowrap shrink-0"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 text-cyan-400" />
                <span>إظهار تطوير المباني والمعدات</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 text-cyan-400" />
                <span>إخفاء اللوحة لمشاهدة الاستوديو 3D</span>
              </>
            )}
          </button>
        </div>

        {!dockCollapsed && (
          <div className="pointer-events-auto rounded-2xl border border-white/15 bg-slate-900/95 p-3 shadow-2xl">
            {/* 5 Facility Selection Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-800">
              {STUDIO_FACILITY_CONFIGS.map((fac) => {
                const lvl = facilitiesLevels[fac.id] || 1;
                const isSelected = selectedFacility === fac.id;
                return (
                  <button
                    key={fac.id}
                    type="button"
                    onClick={() => {
                      setSelectedFacility(fac.id);
                      setCameraMode('focus');
                    }}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800/90 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{fac.shortLabel}</span>
                    <span className="text-[11px] opacity-80 tabular-nums">
                      Lv.{lvl}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Facility Inspector & Upgrade Action */}
            <div className="mt-2.5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="font-display text-sm font-bold text-white">
                    {activeConfig.name}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-400 tabular-nums">
                    المستوى {currentLvl} من {activeConfig.maxLevel} ({activeConfig.levelTitles[currentLvl - 1]})
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-300 line-clamp-1">
                  {activeConfig.impactSummary(currentLvl)}
                </p>
              </div>

              <div className="shrink-0">
                {isMaxLevel ? (
                  <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-emerald-300 whitespace-nowrap">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>مكتمل التطوير</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={handleUpgradeClick}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-45 whitespace-nowrap shrink-0"
                  >
                    <ArrowUpCircle className="h-4 w-4 shrink-0" />
                    <span className="tabular-nums">
                      تطوير للمستوى {currentLvl + 1} ({formatMoney(upgradeCost)} ج.م)
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
