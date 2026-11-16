'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GenreId } from '@/lib/db-resolver';

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function disposeSceneResources(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => {
          const mat = m as THREE.MeshStandardMaterial;
          mat.map?.dispose();
          mat.dispose();
        });
      } else {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
    }
  });
  renderer.dispose();
}

/**
 * 1. Real 3D WebGL Studio Lot Scene (AnimatedStudioLotGraphic)
 * Features: 3D studio buildings, volumetric sky spotlights, 3D camera dolly & crane, floating golden particles, smooth orbit/pan camera.
 */
export function AnimatedStudioLotGraphic({
  studioName,
  hasActiveProject,
  activeProjectTitle,
  isFilming,
}: {
  studioName: string;
  hasActiveProject?: boolean;
  activeProjectTitle?: string;
  isFilming?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(container.offsetWidth || 480, 280);
    const height = Math.max(container.offsetHeight || 190, 150);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);
    scene.fog = new THREE.FogExp2(0x0a0a0c, 0.022);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 120);
    camera.position.set(0, 7.5, 19);
    camera.lookAt(0, 2.2, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0a0a0c, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffd700, 2.2);
    keyLight.position.set(10, 16, 12);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe50914, 1.3);
    rimLight.position.set(-12, 8, -10);
    scene.add(rimLight);

    // Ground Plaza
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x12131a,
      roughness: 0.35,
      metalness: 0.4,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Red Carpet Entrance Strip
    const carpetGeo = new THREE.PlaneGeometry(3.2, 10);
    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0xe50914,
      roughness: 0.65,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const carpet = new THREE.Mesh(carpetGeo, carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.03, 5.2);
    scene.add(carpet);

    // Central Grand Soundstage Building (Composite Group)
    const hqGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e202b,
      roughness: 0.35,
      metalness: 0.6,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.18,
      metalness: 0.92,
    });

    const mainHall = new THREE.Mesh(new THREE.BoxGeometry(9.5, 4.8, 5.5), bodyMat);
    mainHall.position.y = 2.4;
    hqGroup.add(mainHall);

    // Golden Art-Deco Roof Crown
    const roofCrown = new THREE.Mesh(new THREE.BoxGeometry(10.1, 0.45, 5.9), goldMat);
    roofCrown.position.y = 4.95;
    hqGroup.add(roofCrown);

    // Arched Vault Roof
    const vaultGeo = new THREE.CylinderGeometry(2.6, 2.6, 9.2, 24, 1, false, 0, Math.PI);
    vaultGeo.rotateZ(Math.PI / 2);
    const vaultMesh = new THREE.Mesh(vaultGeo, bodyMat);
    vaultMesh.position.y = 5.0;
    hqGroup.add(vaultMesh);

    // Flanking Soundstages (Left & Right)
    [-8.2, 8.2].forEach((xPos) => {
      const stageWing = new THREE.Group();
      const wingBox = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.6, 4.6), bodyMat);
      wingBox.position.y = 1.8;
      stageWing.add(wingBox);

      const wingTrim = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.28, 4.8), goldMat);
      wingTrim.position.y = 3.68;
      stageWing.add(wingTrim);

      stageWing.position.set(xPos, 0, -1.2);
      hqGroup.add(stageWing);
    });

    // 3D Spinning Golden Film Reels on Roof
    const reelGroupLeft = new THREE.Group();
    const reelGroupRight = new THREE.Group();
    [reelGroupLeft, reelGroupRight].forEach((rg, idx) => {
      const outerRing = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 1.05, 0.22, 24),
        goldMat
      );
      outerRing.rotation.x = Math.PI / 2;
      rg.add(outerRing);

      for (let i = 0; i < 4; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 0.26), goldMat);
        spoke.rotation.z = (i * Math.PI) / 4;
        rg.add(spoke);
      }
      rg.position.set(idx === 0 ? -3.2 : 3.2, 6.2, 1.5);
      hqGroup.add(rg);
    });

    scene.add(hqGroup);

    // Volumetric Sky Spotlights (Left & Right)
    const beamGeo = new THREE.ConeGeometry(2.8, 18, 24, 1, true);
    beamGeo.translate(0, 9, 0);
    const beamMatGold = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beamMatRed = new THREE.MeshBasicMaterial({
      color: isFilming ? 0xe50914 : 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const beamLeft = new THREE.Mesh(beamGeo, beamMatGold);
    beamLeft.position.set(-7.5, 0.2, 3.5);
    scene.add(beamLeft);

    const beamRight = new THREE.Mesh(beamGeo, beamMatRed);
    beamRight.position.set(7.5, 0.2, 3.5);
    scene.add(beamRight);

    // 3D Cinema Camera Dolly Rig in Foreground
    const cameraDolly = new THREE.Group();
    const dollyBase = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 1.2), goldMat);
    dollyBase.position.y = 0.25;
    cameraDolly.add(dollyBase);

    const camBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.65, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 })
    );
    camBody.position.set(0, 1.15, 0);
    cameraDolly.add(camBody);

    const lensCone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.15, 0.45, 16),
      goldMat
    );
    lensCone.rotation.x = Math.PI / 2;
    lensCone.position.set(0, 1.15, -0.45);
    cameraDolly.add(lensCone);

    cameraDolly.position.set(-2.5, 0, 6.2);
    scene.add(cameraDolly);

    // Floating Golden Particles in the Air
    const particleCount = 90;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 28;
      positions[i * 3 + 1] = Math.random() * 11 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xd4af37,
      size: 0.18,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Interactive Drag Orbit
    let isDragging = false;
    let prevX = 0;
    let targetYaw = 0;
    let currentYaw = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      prevX = e.clientX;
      targetYaw = Math.max(-0.55, Math.min(0.55, targetYaw + dx * 0.005));
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
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
      const dt = Math.min(clock.getDelta(), 0.1);
      const t = clock.getElapsedTime();

      if (!isDragging) {
        targetYaw = Math.sin(t * 0.35) * 0.22;
      }
      currentYaw = THREE.MathUtils.damp(currentYaw, targetYaw, 4, dt);

      camera.position.x = Math.sin(currentYaw) * 19;
      camera.position.z = Math.cos(currentYaw) * 19;
      camera.lookAt(0, 2.3, 0);

      reelGroupLeft.rotation.z = t * 1.4;
      reelGroupRight.rotation.z = -t * 1.4;

      beamLeft.rotation.z = Math.sin(t * 1.1) * 0.38;
      beamRight.rotation.z = -Math.sin(t * 1.05 + 0.8) * 0.38;

      cameraDolly.position.x = -2.5 + Math.sin(t * 0.9) * 2.5;
      particles.rotation.y = t * 0.08;

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    const ro = new ResizeObserver(() => {
      if (!container || disposed) return;
      const w = Math.max(container.offsetWidth, 240);
      const h = Math.max(container.offsetHeight, 140);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      disposeSceneResources(scene, renderer);
    };
  }, [isFilming]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[#0A0A0C] shadow-2xl">
      <div ref={mountRef} className="h-44 w-full cursor-grab active:cursor-grabbing sm:h-52" />
      <div className="pointer-events-none absolute inset-x-3 bottom-2.5 flex items-center justify-between gap-2 rounded-xl border border-[#D4AF37]/30 bg-[#0A0A0C]/85 px-3 py-1.5 text-[11px] font-bold text-slate-200 backdrop-blur-md">
        <span className="truncate text-[#D4AF37]">
          {hasActiveProject
            ? `${studioName} · البلاتوه الرئيسي: «${activeProjectTitle}»`
            : `${studioName} · مدينة الإنتاج جاهزة لانطلاق مشروعك القادم`}
        </span>
        <span className="shrink-0 text-[10px] font-black text-amber-300">
          {isFilming ? 'ON AIR · جاري التصوير' : 'كاميرا تفاعلية'}
        </span>
      </div>
    </div>
  );
}

/**
 * 2. Illustrated Character Portrait SVG for Actors, Directors & Technical Crew
 */
export function TalentCharacterPortraitSvg({
  name,
  gender = 'male',
  role = 'actor',
  tier = 'B',
  age = 35,
  isRising = false,
}: {
  name: string;
  gender?: 'male' | 'female' | 'M' | 'F';
  role?: string;
  tier?: string;
  age?: number;
  isRising?: boolean;
}) {
  const seed = hashString(name);
  const isFemale = gender === 'female' || gender === 'F';

  const skinTones = ['#F5CBA7', '#F0B27A', '#E59866', '#FAD7A0', '#D4AC6E'];
  const hairColors = ['#1E293B', '#0F172A', '#3E2723', '#4A2311', '#334155'];
  const suitColors = [
    '#16161D',
    '#311042',
    '#0F172A',
    '#7F1D1D',
    '#1E1B4B',
    '#064E3B',
  ];

  const skin = skinTones[seed % skinTones.length];
  const hair = age >= 58 ? '#94A3B8' : hairColors[(seed >> 2) % hairColors.length];
  const outfit = suitColors[(seed >> 4) % suitColors.length];
  const hasGlasses = role === 'director' || seed % 5 === 0;
  const hasBeard = !isFemale && seed % 2 === 0;

  const bgGradId = `avatar_bg_${seed % 9999}`;

  const topColor =
    tier === 'S'
      ? '#451A03'
      : tier === 'A'
      ? '#2E1065'
      : isRising
      ? '#7C2D12'
      : '#0F172A';
  const bottomColor =
    tier === 'S'
      ? '#D4AF37'
      : tier === 'A'
      ? '#7C3AED'
      : isRising
      ? '#EA580C'
      : '#1E293B';

  return (
    <svg viewBox="0 0 80 80" className="h-full w-full" aria-label={name}>
      <defs>
        <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={topColor} />
          <stop offset="100%" stopColor={bottomColor} />
        </linearGradient>
      </defs>

      <rect width="80" height="80" rx="14" fill={`url(#${bgGradId})`} />
      <circle cx="40" cy="36" r="27" fill="#D4AF37" fillOpacity="0.14" />

      {/* Shoulders / Suit / Gown */}
      <path d="M14 80 Q16 56 40 56 Q64 56 66 80 Z" fill={outfit} />
      <polygon points="32,57 40,69 48,57" fill="#F8FAFC" />
      {!isFemale ? (
        <polygon points="38,61 42,61 41,76 39,76" fill="#E50914" />
      ) : (
        <circle cx="40" cy="63" r="3.5" fill="#D4AF37" />
      )}

      {/* Neck */}
      <rect x="35" y="46" width="10" height="12" rx="4" fill={skin} />

      {/* Back Hair for Female */}
      {isFemale && (
        <path d="M20 34 Q18 56 26 60 L54 60 Q62 56 60 34 Z" fill={hair} />
      )}

      {/* Face / Head */}
      <ellipse cx="40" cy="35" rx="15" ry="17" fill={skin} />

      {/* Top Hair */}
      {isFemale ? (
        <path
          d="M24 32 Q26 14 40 15 Q56 14 56 32 Q48 23 40 25 Q30 23 24 32 Z"
          fill={hair}
        />
      ) : (
        <path
          d="M25 30 Q25 15 40 15 Q55 15 55 30 Q49 22 40 23 Q31 22 25 30 Z"
          fill={hair}
        />
      )}

      {/* Eyes & Eyebrows */}
      <path d="M31 29 Q34 27 37 29" stroke={hair} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M43 29 Q46 27 49 29" stroke={hair} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="34" cy="33" r="2" fill="#0F172A" />
      <circle cx="46" cy="33" r="2" fill="#0F172A" />
      <circle cx="34.6" cy="32.4" r="0.6" fill="#FFFFFF" />
      <circle cx="46.6" cy="32.4" r="0.6" fill="#FFFFFF" />

      {hasGlasses && (
        <g>
          <rect
            x="28.5"
            y="29.5"
            width="10"
            height="7"
            rx="2"
            fill={role === 'director' ? '#0F172A' : 'none'}
            fillOpacity={role === 'director' ? '0.75' : '0'}
            stroke="#D4AF37"
            strokeWidth="1.6"
          />
          <rect
            x="41.5"
            y="29.5"
            width="10"
            height="7"
            rx="2"
            fill={role === 'director' ? '#0F172A' : 'none'}
            fillOpacity={role === 'director' ? '0.75' : '0'}
            stroke="#D4AF37"
            strokeWidth="1.6"
          />
          <line x1="38.5" y1="33" x2="41.5" y2="33" stroke="#D4AF37" strokeWidth="1.6" />
        </g>
      )}

      {hasBeard && (
        <path
          d="M28 40 Q40 50 52 40 Q50 50 40 51 Q30 50 28 40 Z"
          fill={hair}
          fillOpacity="0.85"
        />
      )}

      <path
        d="M35 42 Q40 46 45 42"
        stroke={isFemale ? '#E11D48' : '#78350F'}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * 3. Real 3D WebGL Soundstage Filming Set (AnimatedFilmingSetGraphic)
 * Features: 3D soundstage truss, dynamic volumetric studio lamps, 3D camera dolly on rails, 3D performers & clapperboard.
 */
export function AnimatedFilmingSetGraphic({
  title,
  genre,
  leadName,
  directorName,
  dayCurrent,
  dayTotal,
  isComplete,
}: {
  title: string;
  genre: GenreId;
  leadName: string;
  directorName: string;
  dayCurrent: number;
  dayTotal: number;
  isComplete?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(container.offsetWidth || 480, 260);
    const height = Math.max(container.offsetHeight || 165, 135);

    const genreColorMap: Record<string, number> = {
      action: 0xe50914,
      superhero: 0xf59e0b,
      heist: 0x38bdf8,
      psychological_horror: 0x9333ea,
      supernatural_horror: 0xc084fc,
      sci_fi: 0x06b6d4,
      fantasy: 0xec4899,
      historical: 0xd4af37,
      biography: 0xfbbf24,
      comedy: 0xfacc15,
      light_comedy: 0x38bdf8,
      romance: 0xf43f5e,
      crime_mystery: 0x22d3ee,
      popular_drama: 0xd4af37,
    };
    const accentHex = genreColorMap[genre] || 0xd4af37;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);
    scene.fog = new THREE.FogExp2(0x0a0a0c, 0.03);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 90);
    camera.position.set(0, 4.5, 13.5);
    camera.lookAt(0, 2.0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(accentHex, 0x0a0a0c, 0.9));
    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.4);
    keyLight.position.set(6, 12, 8);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(accentHex, 8, 22);
    rimLight.position.set(0, 4.5, -3);
    scene.add(rimLight);

    // Soundstage Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x14151f, roughness: 0.28, metalness: 0.5 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Cyclorama Set Backdrop Wall
    const backdrop = new THREE.Mesh(
      new THREE.BoxGeometry(11, 5.5, 0.35),
      new THREE.MeshStandardMaterial({
        color: 0x16161d,
        emissive: accentHex,
        emissiveIntensity: 0.18,
        roughness: 0.4,
      })
    );
    backdrop.position.set(0, 2.75, -3.2);
    scene.add(backdrop);

    // Overhead Lighting Truss & Volumetric Cones
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.22,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.92,
      roughness: 0.18,
    });

    const trussBar = new THREE.Mesh(new THREE.BoxGeometry(13, 0.3, 0.3), metalMat);
    trussBar.position.set(0, 5.8, -0.5);
    scene.add(trussBar);

    const coneGeo = new THREE.ConeGeometry(2.4, 6.2, 20, 1, true);
    coneGeo.translate(0, -3.1, 0);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const spotLeft = new THREE.Mesh(coneGeo, coneMat);
    spotLeft.position.set(-2.5, 5.7, -0.5);
    scene.add(spotLeft);

    const spotRight = new THREE.Mesh(coneGeo, coneMat);
    spotRight.position.set(2.5, 5.7, -0.5);
    scene.add(spotRight);

    // Performers on Set (Composite 3D Figures)
    const actorsGroup = new THREE.Group();
    [-1.2, 1.2].forEach((x, idx) => {
      const actorFig = new THREE.Group();
      const torso = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.36, 0.95, 8, 16),
        new THREE.MeshStandardMaterial({
          color: idx === 0 ? 0xd4af37 : 0xe50914,
          roughness: 0.35,
          metalness: 0.4,
        })
      );
      torso.position.y = 1.05;
      actorFig.add(torso);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xf5cba7, roughness: 0.5 })
      );
      head.position.y = 1.95;
      actorFig.add(head);

      actorFig.position.set(x, 0, -0.8);
      actorsGroup.add(actorFig);
    });
    scene.add(actorsGroup);

    // 3D Cinema Camera on Dolly Track
    const dollyGroup = new THREE.Group();
    const trackRail1 = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.08, 0.1), metalMat);
    trackRail1.position.set(0, 0.04, 3.2);
    scene.add(trackRail1);
    const trackRail2 = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.08, 0.1), metalMat);
    trackRail2.position.set(0, 0.04, 3.9);
    scene.add(trackRail2);

    const cart = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 1.0), goldMat);
    cart.position.y = 0.2;
    dollyGroup.add(cart);

    const camBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.65, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 })
    );
    camBox.position.y = 1.35;
    dollyGroup.add(camBox);

    const reel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 16), goldMat);
    reel1.rotation.z = Math.PI / 2;
    reel1.position.set(0, 1.82, -0.15);
    dollyGroup.add(reel1);

    const reel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 16), goldMat);
    reel2.rotation.z = Math.PI / 2;
    reel2.position.set(0, 1.82, 0.25);
    dollyGroup.add(reel2);

    dollyGroup.position.set(0, 0, 3.55);
    scene.add(dollyGroup);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
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
      const t = clock.getElapsedTime();

      dollyGroup.position.x = Math.sin(t * 0.85) * 2.4;
      spotLeft.rotation.z = Math.sin(t * 1.2) * 0.18;
      spotRight.rotation.z = -Math.sin(t * 1.2) * 0.18;
      actorsGroup.children.forEach((child, idx) => {
        child.position.y = Math.abs(Math.sin(t * 2.2 + idx)) * 0.12;
        child.rotation.y = Math.sin(t * 1.5 + idx) * 0.25;
      });

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    const ro = new ResizeObserver(() => {
      if (!container || disposed) return;
      const w = Math.max(container.offsetWidth, 240);
      const h = Math.max(container.offsetHeight, 120);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      disposeSceneResources(scene, renderer);
    };
  }, [genre]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[#0A0A0C] text-white shadow-xl">
      <div ref={mountRef} className="h-36 w-full sm:h-44" />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#D4AF37]/25 bg-[#16161D]/90 px-3.5 py-2 text-[11px] font-bold">
        <span className="text-[#D4AF37]">
          بلاتوه «{title}» · مشهد {dayCurrent}/{dayTotal} {isComplete ? '(اكتمل التصوير ✓)' : '(REC ●)'}
        </span>
        <span className="text-slate-300">
          إخراج: {directorName} · بطولة: {leadName}
        </span>
      </div>
    </div>
  );
}

/**
 * 4. Real 3D WebGL Cinema Premiere Auditorium (AnimatedCinemaPremiereGraphic)
 * Features: Giant glowing 3D cinema screen with procedural CanvasTexture, projector volumetric light beam, velvet curtains, 3D auditorium seats.
 */
export function AnimatedCinemaPremiereGraphic({
  title,
  isSeries,
  currentStep,
  maxSteps,
  liveRevenueFormatted,
  rank,
  criticScore,
}: {
  title: string;
  isSeries: boolean;
  currentStep: number;
  maxSteps: number;
  liveRevenueFormatted: string;
  rank: number;
  criticScore: number;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(container.offsetWidth || 480, 260);
    const height = Math.max(container.offsetHeight || 165, 135);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08080c);
    scene.fog = new THREE.FogExp2(0x08080c, 0.025);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 80);
    camera.position.set(0, 2.8, 12.5);
    camera.lookAt(0, 2.7, -3);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const screenGlowLight = new THREE.PointLight(0xd4af37, 12, 22);
    screenGlowLight.position.set(0, 3.2, -1);
    scene.add(screenGlowLight);

    // Dynamic Procedural Screen Texture
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 512;
    screenCanvas.height = 256;
    const ctx = screenCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 512, 256);
      grad.addColorStop(0, '#16161D');
      grad.addColorStop(0.5, '#1E1B4B');
      grad.addColorStop(1, '#311042');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 8;
      ctx.strokeRect(8, 8, 496, 240);

      ctx.fillStyle = '#D4AF37';
      ctx.font = '900 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        isSeries
          ? `بث الحلقات · الحلقة ${currentStep} من ${maxSteps}`
          : `شباك التذاكر · اليوم ${currentStep} من ${maxSteps}`,
        256,
        58
      );

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 36px system-ui, sans-serif';
      ctx.fillText(`« ${title.slice(0, 22)} »`, 256, 120);

      ctx.fillStyle = '#34D399';
      ctx.font = '900 30px system-ui, sans-serif';
      ctx.fillText(`${liveRevenueFormatted} ج.م`, 256, 174);

      ctx.fillStyle = '#FDE047';
      ctx.font = '800 20px system-ui, sans-serif';
      ctx.fillText(`المركز #${rank} بالموسم · تقييم النقاد ${criticScore}/10`, 256, 218);
    }

    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.colorSpace = THREE.SRGBColorSpace;
    screenTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // Giant Glowing 3D Cinema Screen
    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(11.2, 5.4),
      new THREE.MeshBasicMaterial({ map: screenTexture })
    );
    screenMesh.position.set(0, 3.4, -3.5);
    scene.add(screenMesh);

    // Golden Frame around Cinema Screen
    const frameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(11.6, 5.8, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 })
    );
    frameMesh.position.set(0, 3.4, -3.65);
    scene.add(frameMesh);

    // Red Velvet Side Curtains
    const curtainMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.75,
      metalness: 0.1,
    });
    [-6.3, 6.3].forEach((x) => {
      const curtain = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 6.4, 16), curtainMat);
      curtain.position.set(x, 3.2, -3.2);
      scene.add(curtain);
    });

    // Volumetric Projector Beam from Back Booth
    const projConeGeo = new THREE.ConeGeometry(4.8, 14, 24, 1, true);
    projConeGeo.rotateX(Math.PI / 2);
    const projCone = new THREE.Mesh(
      projConeGeo,
      new THREE.MeshBasicMaterial({
        color: 0xd4af37,
        transparent: true,
        opacity: 0.11,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    projCone.position.set(0, 3.8, 3.5);
    scene.add(projCone);

    // 3D Auditorium Seats (InstancedMesh)
    const seatGeo = new THREE.BoxGeometry(0.75, 0.75, 0.65);
    const seatMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      roughness: 0.6,
      metalness: 0.2,
    });
    const seatRows = 3;
    const seatsPerRow = 9;
    const seatsInst = new THREE.InstancedMesh(seatGeo, seatMat, seatRows * seatsPerRow);
    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let r = 0; r < seatRows; r++) {
      for (let c = 0; c < seatsPerRow; c++) {
        dummy.position.set((c - 4) * 1.15, 0.35 + r * 0.25, 2.2 + r * 1.6);
        dummy.updateMatrix();
        seatsInst.setMatrixAt(idx++, dummy.matrix);
      }
    }
    seatsInst.computeBoundingSphere();
    scene.add(seatsInst);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
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
      const t = clock.getElapsedTime();
      camera.position.x = Math.sin(t * 0.45) * 1.2;
      camera.lookAt(0, 3.1, -3.5);

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    const ro = new ResizeObserver(() => {
      if (!container || disposed) return;
      const w = Math.max(container.offsetWidth, 240);
      const h = Math.max(container.offsetHeight, 120);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      screenTexture.dispose();
      disposeSceneResources(scene, renderer);
    };
  }, [title, isSeries, currentStep, maxSteps, liveRevenueFormatted, rank, criticScore]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-[#0A0A0C] text-white shadow-xl">
      <div ref={mountRef} className="h-36 w-full sm:h-44" />
    </div>
  );
}

/**
 * 5. Real 3D WebGL Red Carpet & Rotating Golden Trophy Scene (AnimatedRedCarpetFestivalGraphic)
 * Features: Rotating 3D metallic gold trophy, red carpet with golden stanchions, paparazzi camera flashes, falling golden confetti.
 */
export function AnimatedRedCarpetFestivalGraphic({
  festivalName,
  year,
  wonCount,
}: {
  festivalName: string;
  year: number;
  wonCount: number;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(container.offsetWidth || 480, 260);
    const height = Math.max(container.offsetHeight || 155, 130);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);
    scene.fog = new THREE.FogExp2(0x0a0a0c, 0.03);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 80);
    camera.position.set(0, 3.4, 9.8);
    camera.lookAt(0, 2.2, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0xfef08a, 0x0a0a0c, 1.0));
    const keyLight = new THREE.DirectionalLight(0xffd700, 3.0);
    keyLight.position.set(6, 12, 8);
    scene.add(keyLight);

    const flashLight = new THREE.PointLight(0xffffff, 0, 25);
    flashLight.position.set(2, 4, 5);
    scene.add(flashLight);

    // Red Carpet Runway
    const carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 22),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.65, metalness: 0.1 })
    );
    carpet.rotation.x = -Math.PI / 2;
    scene.add(carpet);

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.95,
      roughness: 0.12,
    });
    const darkMarbleMat = new THREE.MeshStandardMaterial({
      color: 0x16161d,
      metalness: 0.6,
      roughness: 0.2,
    });

    // Golden Stanchion Posts along the Red Carpet
    [-2.5, 2.5].forEach((x) => {
      for (let z = -3; z <= 4; z += 2.3) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 12), goldMat);
        post.position.set(x, 0.55, z);
        scene.add(post);

        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), goldMat);
        ball.position.set(x, 1.15, z);
        scene.add(ball);
      }
    });

    // 3D Rotating Golden Award Trophy (Composite Group)
    const trophyGroup = new THREE.Group();

    const basePedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.35, 0.6, 24),
      darkMarbleMat
    );
    basePedestal.position.y = 0.3;
    trophyGroup.add(basePedestal);

    const goldRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.05, 0.25, 24),
      goldMat
    );
    goldRing.position.y = 0.72;
    trophyGroup.add(goldRing);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.45, 1.6, 20),
      goldMat
    );
    stem.position.y = 1.6;
    trophyGroup.add(stem);

    const cupGlobe = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.95, 1),
      goldMat
    );
    cupGlobe.position.y = 2.95;
    trophyGroup.add(cupGlobe);

    const outerHalo = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.08, 16, 36),
      goldMat
    );
    outerHalo.position.y = 2.95;
    trophyGroup.add(outerHalo);

    scene.add(trophyGroup);

    // Golden Confetti Particles
    const confCount = 80;
    const confPos = new Float32Array(confCount * 3);
    for (let i = 0; i < confCount; i++) {
      confPos[i * 3] = (Math.random() - 0.5) * 14;
      confPos[i * 3 + 1] = Math.random() * 7 + 0.5;
      confPos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    const confGeo = new THREE.BufferGeometry();
    confGeo.setAttribute('position', new THREE.BufferAttribute(confPos, 3));
    const confetti = new THREE.Points(
      confGeo,
      new THREE.PointsMaterial({
        color: 0xfde047,
        size: 0.16,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      })
    );
    scene.add(confetti);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
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
      const t = clock.getElapsedTime();

      trophyGroup.rotation.y = t * 1.15;
      trophyGroup.position.y = Math.sin(t * 2) * 0.1;
      outerHalo.rotation.x = Math.sin(t * 1.4) * 0.45;
      confetti.rotation.y = -t * 0.25;

      // Periodic paparazzi camera flash bursts
      const flashPulse = Math.sin(t * 7.5) * Math.sin(t * 3.1);
      flashLight.intensity = flashPulse > 0.78 ? 22 : 0;
      flashLight.position.x = Math.sin(t * 4.3) * 4;

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    const ro = new ResizeObserver(() => {
      if (!container || disposed) return;
      const w = Math.max(container.offsetWidth, 240);
      const h = Math.max(container.offsetHeight, 115);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      disposeSceneResources(scene, renderer);
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/45 bg-[#0A0A0C] text-white shadow-xl">
      <div ref={mountRef} className="h-36 w-full sm:h-40" />
      <div className="pointer-events-none absolute inset-x-3 bottom-2 flex items-center justify-between gap-2 rounded-xl border border-[#D4AF37]/35 bg-[#0A0A0C]/85 px-3 py-1.5 text-[11px] font-bold backdrop-blur-md">
        <span className="truncate font-black text-[#D4AF37]">
          {festivalName} · {year}
        </span>
        <span className="shrink-0 text-amber-200">
          {wonCount > 0 ? `تتويج شركتك بـ ${wonCount} جوائز 🏆` : 'السجادة الحمراء والمسرح الذهبي'}
        </span>
      </div>
    </div>
  );
}
