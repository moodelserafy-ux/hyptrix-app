'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type SceneKind = 'studio' | 'filming' | 'premiere' | 'festival';

interface Cinematic3DStageProps {
  kind: SceneKind;
  title: string;
  subtitle?: string;
  heightClass?: string;
  accent?: string;
}

function material(color: number, roughness = 0.55, metalness = 0.25) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addBox(
  scene: THREE.Scene,
  size: [number, number, number],
  position: [number, number, number],
  mat: THREE.Material,
  castShadow = true
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function addSpotRig(scene: THREE.Scene, x: number, z: number, color: number) {
  const rig = new THREE.Group();
  rig.position.set(x, 8.5, z);
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.24, 0.55, 16),
    material(0x20232c, 0.3, 0.85)
  );
  housing.rotation.x = Math.PI / 2;
  rig.add(housing);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 3.1, 10, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.075,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beam.position.y = -5;
  rig.add(beam);

  const light = new THREE.SpotLight(color, 90, 28, Math.PI / 6, 0.75, 1.2);
  light.position.set(0, -0.15, 0);
  light.target.position.set(0, -7, -2);
  light.castShadow = false;
  rig.add(light, light.target);
  scene.add(rig);
  return rig;
}

function addCamera(scene: THREE.Scene, x: number, z: number, scale = 1) {
  const group = new THREE.Group();
  const bodyMat = material(0x151922, 0.3, 0.8);
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.9,
    roughness: 0.22,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.72, 0.78), bodyMat);
  group.add(body);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.36, 0.55, 24),
    material(0x090d16, 0.2, 0.9)
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.58;
  group.add(lens);
  const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.055, 10, 28), goldMat);
  lensRing.position.z = 0.87;
  group.add(lensRing);
  for (const offset of [-0.32, 0.32]) {
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.13, 24), goldMat);
    reel.rotation.x = Math.PI / 2;
    reel.position.set(offset, 0.55, -0.05);
    group.add(reel);
  }
  const tripod = new THREE.Group();
  const mount = addBoxToGroup(tripod, [0.55, 0.13, 0.55], [0, -0.52, 0], goldMat);
  void mount;
  for (const angle of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 1.25, 8), bodyMat);
    leg.position.set(Math.cos(angle) * 0.34, -1.12, Math.sin(angle) * 0.34);
    leg.rotation.z = Math.cos(angle) * 0.22;
    leg.rotation.x = Math.sin(angle) * 0.22;
    tripod.add(leg);
  }
  group.add(tripod);
  group.position.set(x, 1.65 * scale, z);
  group.scale.setScalar(scale);
  scene.add(group);
  return group;
}

function addBoxToGroup(
  group: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  mat: THREE.Material
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

function addBuilding(scene: THREE.Scene, x: number, z: number, width: number, height: number, color: number, label = false) {
  const buildingGroup = new THREE.Group();
  const building = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 3.4),
    new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.62 })
  );
  building.position.y = height / 2;
  building.castShadow = true;
  building.receiveShadow = true;
  buildingGroup.add(building);

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xf4d77b,
    emissive: 0x8b6414,
    emissiveIntensity: 0.7,
    metalness: 0.5,
    roughness: 0.24,
  });
  const rows = Math.max(2, Math.floor(height / 0.85));
  const cols = Math.max(2, Math.floor(width / 0.8));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 5 === 0) continue;
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.045), windowMat);
      win.position.set(
        -width / 2 + ((c + 0.5) * width) / cols,
        0.55 + r * 0.65,
        1.73
      );
      buildingGroup.add(win);
    }
  }

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.25, 0.2, 3.65),
    material(0xd4af37, 0.25, 0.9)
  );
  roof.position.y = height + 0.12;
  buildingGroup.add(roof);
  if (label) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.62, 0.34, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x17120a, emissive: 0xd4af37, emissiveIntensity: 0.9 })
    );
    sign.position.set(0, height - 0.5, 1.78);
    buildingGroup.add(sign);
  }
  buildingGroup.position.set(x, 0, z);
  scene.add(buildingGroup);
  return buildingGroup;
}

function createTrophy(scene: THREE.Scene) {
  const trophy = new THREE.Group();
  const gold = new THREE.MeshPhysicalMaterial({
    color: 0xe7bd49,
    metalness: 1,
    roughness: 0.13,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
  const profile = [
    new THREE.Vector2(0.2, 0),
    new THREE.Vector2(0.42, 0.12),
    new THREE.Vector2(0.62, 0.48),
    new THREE.Vector2(0.7, 1.1),
    new THREE.Vector2(0.58, 1.36),
    new THREE.Vector2(0.36, 1.48),
    new THREE.Vector2(0.26, 1.2),
    new THREE.Vector2(0.22, 0.72),
  ];
  const cup = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), gold);
  cup.position.y = 1.15;
  trophy.add(cup);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.075, 12, 48), gold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 2.62;
  trophy.add(rim);
  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 12, 32, Math.PI), gold);
    handle.position.set(side * 0.62, 2.13, 0);
    handle.rotation.z = side * Math.PI / 2;
    trophy.add(handle);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.23, 0.6, 24), gold);
  stem.position.y = 0.98;
  trophy.add(stem);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.32, 32), material(0x261d0a, 0.25, 0.85));
  base.position.y = 0.55;
  trophy.add(base);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.24, 1.05), gold);
  plinth.position.y = 0.26;
  trophy.add(plinth);
  trophy.position.set(0, 0.03, -1.5);
  trophy.scale.setScalar(1.12);
  scene.add(trophy);
  return trophy;
}

function buildScene(scene: THREE.Scene, kind: SceneKind, accent: string) {
  const animateGroups: THREE.Object3D[] = [];
  const floorMat = material(0x11131b, 0.8, 0.25);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(42, 34), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(42, 42, 0x6b5521, 0x27232a);
  grid.position.y = -0.025;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.32;
  scene.add(grid);

  const goldSpot = addSpotRig(scene, -7, -3, 0xd4af37);
  const redSpot = addSpotRig(scene, 7, -3, 0xe50914);
  animateGroups.push(goldSpot, redSpot);

  if (kind === 'studio') {
    addBuilding(scene, -7.2, -4.2, 4.2, 5.2, 0x242833);
    addBuilding(scene, 7.2, -4.2, 4.2, 6.5, 0x1d2634);
    const headquarter = addBuilding(scene, 0, -6.6, 6.4, 7.7, 0x27252b, true);
    animateGroups.push(headquarter);
    addBox(scene, [17, 0.2, 0.18], [0, 0.15, 1.2], material(0xd4af37, 0.2, 0.9));
    addCamera(scene, -4.7, 2.2, 0.82);
    addCamera(scene, 4.4, 2.5, 0.72);
    for (let i = 0; i < 5; i++) {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3.2, 12), material(0x5a4930, 0.32, 0.82));
      column.position.set(-8 + i * 4, 1.6, 5.8);
      scene.add(column);
    }
    const heroLogo = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.08, 12, 48),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0x8b6414, emissiveIntensity: 0.5, metalness: 0.9 })
    );
    heroLogo.position.set(0, 5.7, -2.9);
    animateGroups.push(heroLogo);
    scene.add(heroLogo);
  }

  if (kind === 'filming') {
    addBox(scene, [11.5, 6.2, 0.35], [0, 3.15, -6.4], new THREE.MeshStandardMaterial({ color: 0x153a2c, roughness: 0.75 }));
    addBox(scene, [11.8, 0.18, 1.1], [0, 0.12, -5.8], material(0xd4af37, 0.25, 0.8));
    addCamera(scene, -4.7, 1.8, 1.05);
    addCamera(scene, 4.7, 2.8, 0.82);
    const dolly = new THREE.Group();
    const rail = addBoxToGroup(dolly, [7.5, 0.12, 0.22], [0, 0.12, 0], material(0x737985, 0.3, 0.9));
    void rail;
    for (const x of [-3, -1, 1, 3]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 18), material(0x090b11, 0.3, 0.8));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, -0.08, 0.2);
      dolly.add(wheel);
    }
    dolly.position.set(0, 0, 4.6);
    scene.add(dolly);
    animateGroups.push(dolly);
    const boom = new THREE.Group();
    const boomArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 8, 10), material(0x9ba4b2, 0.35, 0.85));
    boomArm.rotation.z = -0.62;
    boomArm.position.set(0, 0, 0);
    boom.add(boomArm);
    const mic = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.65, 5, 12), material(0xe50914, 0.38, 0.45));
    mic.rotation.z = -0.62;
    mic.position.set(-3.6, 1.9, 0);
    boom.add(mic);
    boom.position.set(2.5, 7, 1.6);
    scene.add(boom);
    animateGroups.push(boom);
  }

  if (kind === 'premiere') {
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(13.2, 6.2),
      new THREE.MeshStandardMaterial({
        color: 0x4e3b76,
        emissive: 0x271a58,
        emissiveIntensity: 1.4,
        roughness: 0.3,
        metalness: 0.2,
      })
    );
    screen.position.set(0, 5.3, -7.3);
    scene.add(screen);
    const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(13.6, 6.6, 0.35), material(0xd4af37, 0.22, 0.9));
    screenFrame.position.set(0, 5.3, -7.55);
    scene.add(screenFrame);
    screen.position.z = -7.3;
    addBox(scene, [2.7, 7.5, 0.3], [-8.2, 3.75, -6.8], material(0x550d1c, 0.7, 0.12));
    addBox(scene, [2.7, 7.5, 0.3], [8.2, 3.75, -6.8], material(0x550d1c, 0.7, 0.12));
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 9; col++) {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.9, 0.9), material(0x651327, 0.6, 0.15));
        seat.position.set(-7.2 + col * 1.8, 0.5 + row * 0.1, 3.2 + row * 2.2);
        seat.castShadow = true;
        scene.add(seat);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), material(0x222631, 0.8, 0.1));
        head.position.set(-7.2 + col * 1.8, 1.42 + row * 0.1, 3.2 + row * 2.2);
        scene.add(head);
      }
    }
    const projector = new THREE.Mesh(new THREE.ConeGeometry(2.6, 11, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xe8d8a2, transparent: true, opacity: 0.045, side: THREE.DoubleSide, depthWrite: false }));
    projector.position.set(0, 3.2, -0.1);
    projector.rotation.x = Math.PI / 2;
    scene.add(projector);
    animateGroups.push(projector);
  }

  if (kind === 'festival') {
    const carpetMat = new THREE.MeshStandardMaterial({ color: 0x9e071c, roughness: 0.58, metalness: 0.12, emissive: 0x230008, emissiveIntensity: 0.5 });
    addBox(scene, [5.5, 0.12, 23], [0, 0.03, 1.6], carpetMat);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 1.15, 16), material(0xd4af37, 0.18, 0.92));
        post.position.set(side * 3.55, 0.58, -7 + i * 2.7);
        scene.add(post);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), material(0xe5bf52, 0.18, 0.9));
        cap.position.set(side * 3.55, 1.2, -7 + i * 2.7);
        scene.add(cap);
      }
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 18, 10), material(0x9e071c, 0.7, 0.15));
      rope.rotation.x = Math.PI / 2;
      rope.position.set(side * 3.55, 0.93, 1.2);
      scene.add(rope);
      addCamera(scene, side * 8.3, 3.8, 0.64);
    }
    const trophy = createTrophy(scene);
    animateGroups.push(trophy);
    for (const x of [-10, -5, 5, 10]) {
      const flash = new THREE.PointLight(0xffffff, 0, 12, 2);
      flash.position.set(x, 4.2, 2.8);
      scene.add(flash);
      (flash as THREE.PointLight & { userData: { flash: boolean } }).userData.flash = true;
      animateGroups.push(flash);
    }
  }

  const particles = new THREE.BufferGeometry();
  const particleCount = 190;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 32;
    positions[i * 3 + 1] = Math.random() * 10 + 0.4;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 24;
  }
  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: new THREE.Color(accent),
    size: 0.055,
    transparent: true,
    opacity: 0.72,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particleCloud = new THREE.Points(particles, particleMaterial);
  scene.add(particleCloud);
  animateGroups.push(particleCloud);

  return animateGroups;
}

export function Cinematic3DStage({
  kind,
  title,
  subtitle,
  heightClass = 'h-44 sm:h-52',
  accent = '#d4af37',
}: Cinematic3DStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    setWebglFailed(false);
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer | null = null;
    let frameId = 0;
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090a0e);
    scene.fog = new THREE.FogExp2(0x090a0e, 0.022);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 8, 18.5);
    camera.lookAt(0, 2.1, -1.2);

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.setClearColor(0x090a0e, 1);
      mount.appendChild(renderer.domElement);
    } catch {
      setWebglFailed(true);
      return;
    }

    const ambient = new THREE.HemisphereLight(0xd7d8e8, 0x17121b, 1.2);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffe3a0, 2.3);
    keyLight.position.set(-7, 15, 9);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(new THREE.Color(accent), 48, 32, 2);
    fillLight.position.set(6, 5, 1);
    scene.add(fillLight);
    const redRim = new THREE.PointLight(0xe50914, 28, 22, 2);
    redRim.position.set(-8, 4, -5);
    scene.add(redRim);

    const moving = buildScene(scene, kind, accent);
    const clock = new THREE.Clock();
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointer.targetX = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 1.7;
      pointer.targetY = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 0.55;
    };
    const onPointerLeave = () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
    };
    mount.addEventListener('pointermove', onPointerMove);
    mount.addEventListener('pointerleave', onPointerLeave);

    const resize = () => {
      if (!renderer || disposed) return;
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
    } else {
      window.addEventListener('resize', resize);
    }

    const animate = () => {
      if (disposed || !renderer) return;
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      pointer.x = THREE.MathUtils.damp(pointer.x, pointer.targetX, 2.2, delta);
      pointer.y = THREE.MathUtils.damp(pointer.y, pointer.targetY, 2.2, delta);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 1.15, 1.4, 0.016);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 8 - pointer.y * 1.2, 1.4, 0.016);
      camera.lookAt(pointer.x * 0.32, 2.1 - pointer.y * 0.25, -1.2);
      moving.forEach((object, index) => {
        if (object instanceof THREE.Group && kind === 'festival') {
          if (object.children.some((child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.LatheGeometry)) {
            object.rotation.y = elapsed * 0.52;
            object.position.y = 0.03 + Math.sin(elapsed * 1.55) * 0.08;
          } else {
            object.rotation.y = Math.sin(elapsed * 0.55 + index) * 0.16;
          }
        } else if (object instanceof THREE.Group) {
          object.rotation.y = Math.sin(elapsed * 0.5 + index) * 0.18;
        } else if (object instanceof THREE.PointLight && (object.userData as { flash?: boolean }).flash) {
          object.intensity = Math.max(0, Math.sin(elapsed * (2.7 + index * 0.17)) ** 24) * 42;
        } else if (object instanceof THREE.Points) {
          object.rotation.y = elapsed * 0.018;
          object.position.y = Math.sin(elapsed * 0.45) * 0.14;
        } else if (object instanceof THREE.Mesh && object.geometry instanceof THREE.ConeGeometry) {
          object.rotation.z = Math.sin(elapsed * 0.6 + index) * 0.08;
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      mount.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerleave', onPointerLeave);
      if (renderer) {
        renderer.renderLists.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      }
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((mat) => mat.dispose());
        }
      });
    };
  }, [kind, accent]);

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-amber-500/30 bg-[#090a0e] shadow-[0_20px_55px_rgba(0,0,0,.38)] ${heightClass}`}>
      <div ref={mountRef} className="absolute inset-0 touch-pan-y cursor-grab active:cursor-grabbing" aria-label={title} />
      {webglFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#17131a] via-[#10131e] to-[#090a0e] text-sm font-bold text-amber-200">
          مشهد ثلاثي الأبعاد غير متاح على هذا الجهاز
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/25 to-transparent px-3 pb-2.5 pt-10">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-amber-100 drop-shadow-lg">{title}</div>
            {subtitle && <div className="mt-0.5 truncate text-[10px] font-bold text-slate-300">{subtitle}</div>}
          </div>
          <div className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-white/15">
            <div className="h-full w-2/3 rounded-full bg-amber-400 shadow-[0_0_12px_#d4af37]" />
          </div>
        </div>
      </div>
    </div>
  );
}
