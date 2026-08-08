'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import ThreeGlobe from 'three-globe';
import { Satellite } from '@/lib/types';
import {
  Crosshair,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Radio,
  Zap,
  Gauge,
  AlertTriangle,
  ShieldAlert,
  X,
  Eye,
  EyeOff,
  Maximize2,
  Globe,
  ArrowUpRight,
  Activity,
  Wind,
  Flame,
  GripHorizontal,
} from 'lucide-react';

interface EarthProps {
  satellites?: Satellite[];
  selectedSat?: Satellite | null;
  onSelectSat?: (sat: Satellite) => void;
  dayNightMode?: 'day' | 'night';
  onToggleDayNightMode?: () => void;
}

interface DynamicSatellitePoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  alt: number;
  color: string;
  sat: Satellite;
  baseLng: number;
  baseLat: number;
  speed: number;
  inclination: number;
  phase: number;
}

interface OrbitalPath {
  satId: string;
  name: string;
  isDebris: boolean;
  coords: [number, number, number][];
  color: string;
}

interface HoveredSatInfo {
  sat: Satellite;
  name: string;
  alt: number;
  lat: number;
  lng: number;
  x: number;
  y: number;
}

// Helper hook to sync state refs to prevent Three.js canvas tear-down
function useEarthStateRefs({
  selectedSat,
  popoverSat,
  satellites,
  onSelectSat,
  orbitMode,
  isOptimized,
  showAtmosphericDensity,
  dayNightMode,
}: {
  selectedSat?: Satellite | null;
  popoverSat: Satellite | null;
  satellites: Satellite[];
  onSelectSat?: (sat: Satellite) => void;
  orbitMode: 'all' | 'high_risk';
  isOptimized: boolean;
  showAtmosphericDensity: boolean;
  dayNightMode?: 'day' | 'night';
}) {
  const selectedSatRef = useRef(selectedSat);
  useEffect(() => {
    selectedSatRef.current = selectedSat;
  }, [selectedSat]);

  const popoverSatRef = useRef(popoverSat);
  useEffect(() => {
    popoverSatRef.current = popoverSat;
  }, [popoverSat]);

  const satellitesRef = useRef(satellites);
  useEffect(() => {
    satellitesRef.current = satellites;
  }, [satellites]);

  const onSelectSatRef = useRef(onSelectSat);
  useEffect(() => {
    onSelectSatRef.current = onSelectSat;
  }, [onSelectSat]);

  const orbitModeRef = useRef(orbitMode);
  useEffect(() => {
    orbitModeRef.current = orbitMode;
  }, [orbitMode]);

  const isOptimizedRef = useRef(isOptimized);
  useEffect(() => {
    isOptimizedRef.current = isOptimized;
  }, [isOptimized]);

  const showAtmosphericDensityRef = useRef(showAtmosphericDensity);
  useEffect(() => {
    showAtmosphericDensityRef.current = showAtmosphericDensity;
  }, [showAtmosphericDensity]);

  const dayNightModeRef = useRef(dayNightMode);
  useEffect(() => {
    dayNightModeRef.current = dayNightMode;
  }, [dayNightMode]);

  return {
    selectedSatRef,
    popoverSatRef,
    satellitesRef,
    onSelectSatRef,
    orbitModeRef,
    isOptimizedRef,
    showAtmosphericDensityRef,
    dayNightModeRef,
  };
}

// Pure Helper Functions extracted outside Earth component to reduce Cognitive Complexity (sonarjs/cognitive-complexity)
function checkIsSelected(
  item: { id?: string; name?: string; satId?: string },
  selSat?: Satellite | null,
  popSat?: Satellite | null
): boolean {
  if (selSat && (item.id === selSat.id || item.satId === selSat.id || item.name === selSat.name)) return true;
  if (popSat && (item.id === popSat.id || item.satId === popSat.id || item.name === popSat.name)) return true;
  return false;
}

function getHexTopColor(d: any): string {
  const avg = d.sumWeight / d.points.length;
  if (avg > 0.75) return 'rgba(239, 68, 68, 0.85)';
  if (avg > 0.5) return 'rgba(245, 158, 11, 0.75)';
  return 'rgba(56, 189, 248, 0.55)';
}

function getPathColor(d: any, selSat?: Satellite | null, popSat?: Satellite | null): string[] {
  const isSelected = checkIsSelected(d, selSat, popSat);
  if (isSelected) {
    return d.isDebris
      ? ['rgba(244, 63, 94, 1.0)', 'rgba(255, 255, 255, 1.0)', 'rgba(244, 63, 94, 1.0)']
      : ['rgba(56, 189, 248, 1.0)', 'rgba(255, 255, 255, 1.0)', 'rgba(56, 189, 248, 1.0)'];
  }
  return d.isDebris
    ? ['rgba(244, 63, 94, 0.45)', 'rgba(251, 113, 133, 0.25)', 'rgba(244, 63, 94, 0.45)']
    : ['rgba(56, 189, 248, 0.45)', 'rgba(125, 211, 252, 0.25)', 'rgba(56, 189, 248, 0.45)'];
}

function getPathStroke(d: any, selSat?: Satellite | null, popSat?: Satellite | null): number {
  return checkIsSelected(d, selSat, popSat) ? 4.8 : 1.3;
}

interface RaycastContext {
  e: MouseEvent;
  maxDistanceThreshold: number;
  domElement: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  livePoints: DynamicSatellitePoint[];
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
}

function findClosestSatelliteFromRay({
  e,
  maxDistanceThreshold,
  domElement,
  camera,
  livePoints,
}: RaycastContext): { closestPt: DynamicSatellitePoint | null; minDistance: number } {
  const rect = domElement.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  let minScreenDist = Infinity;
  let closestPt: DynamicSatellitePoint | null = null;

  livePoints.forEach((pt) => {
    const phi = (90 - pt.lat) * (Math.PI / 180);
    const theta = (pt.lng + 180) * (Math.PI / 180);
    const r = 100 * (1 + pt.alt);
    const pos = new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );

    pos.project(camera);

    if (pos.z < 1) {
      const screenX = ((pos.x + 1) / 2) * rect.width;
      const screenY = ((-pos.y + 1) / 2) * rect.height;
      const screenDist = Math.hypot(mouseX - screenX, mouseY - screenY);

      if (screenDist < minScreenDist) {
        minScreenDist = screenDist;
        closestPt = pt;
      }
    }
  });

  const threshold = Math.max(maxDistanceThreshold, 32);
  if (closestPt && minScreenDist < threshold) {
    return { closestPt, minDistance: minScreenDist };
  }
  return { closestPt: null, minDistance: minScreenDist };
}

function calculateOrbitPos(theta: number, baseLngDeg: number, inclinationDeg: number) {
  const inc = (inclinationDeg * Math.PI) / 180;
  const raan = (baseLngDeg * Math.PI) / 180;

  const x = Math.cos(theta) * Math.cos(raan) - Math.sin(theta) * Math.sin(raan) * Math.cos(inc);
  const y = Math.cos(theta) * Math.sin(raan) + Math.sin(theta) * Math.cos(raan) * Math.cos(inc);
  const z = Math.sin(theta) * Math.sin(inc);

  const lat = Math.asin(Math.max(-1, Math.min(1, z))) * (180 / Math.PI);
  let lng = Math.atan2(y, x) * (180 / Math.PI);

  return { lat, lng };
}

function createSatellite3DMesh(isDebris: boolean, isSelected: boolean) {
  const group = new THREE.Group();

  if (isDebris) {
    const geo = new THREE.DodecahedronGeometry(2.0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0x991b1b,
      emissiveIntensity: 0.9,
      roughness: 0.5,
      metalness: 0.8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
  } else {
    const bodyGeo = new THREE.BoxGeometry(2.0, 2.0, 3.0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: isSelected ? 0x38bdf8 : 0xf1f5f9,
      emissive: isSelected ? 0x0284c7 : 0x0369a1,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.2,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(bodyMesh);

    const wingGeo = new THREE.BoxGeometry(9.0, 0.15, 2.0);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      emissive: 0x2563eb,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.1,
    });
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    group.add(wingMesh);

    const dishGeo = new THREE.ConeGeometry(1.2, 0.5, 12);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.1,
    });
    const dishMesh = new THREE.Mesh(dishGeo, dishMat);
    dishMesh.rotation.x = Math.PI / 2;
    dishMesh.position.set(0, 0, 1.8);
    group.add(dishMesh);

    const beaconGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
    });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.set(0, 1.3, 0);
    group.add(beaconMesh);
  }

  const scale = isSelected ? 1.3 : 1.0;
  group.scale.set(scale, scale, scale);
  return group;
}

function generateAtmosphericDensityPoints() {
  const pts = [];
  for (let lat = -70; lat <= 70; lat += 10) {
    for (let lng = -180; lng <= 180; lng += 12) {
      const latRad = (lat * Math.PI) / 180;
      const lngRad = ((lng + 30) * Math.PI) / 180;
      const solarBulge = Math.max(0.1, Math.cos(latRad) * Math.cos(lngRad));
      const weight = 0.25 + 0.75 * solarBulge;
      pts.push({
        lat,
        lng,
        weight,
      });
    }
  }
  return pts;
}

// Sub-Satellite Telemetry Custom Hook
function useSatelliteTelemetry(
  popoverSat: Satellite | null,
  selectedSat: Satellite | null | undefined,
  satellites: Satellite[]
) {
  const [telemetry, setTelemetry] = useState({
    targetName: 'ISS (ZARYA)',
    lat: '28.57° N',
    lon: '80.64° W',
    alt: '420.4 km',
    speed: '7.662 km/s',
  });

  useEffect(() => {
    const activeSat = popoverSat || selectedSat || satellites[0] || { name: 'ISS (ZARYA)', altitudeKm: 420, id: '1' };

    let step = 0;
    const interval = setInterval(() => {
      step += 0.05;
      const latVal = Math.sin(step * 0.8) * 51.6;
      let lonVal = (step * 12 - 80.64) % 360;
      if (lonVal > 180) lonVal -= 360;
      if (lonVal < -180) lonVal += 360;

      const altVal = activeSat.altitudeKm + Math.sin(step * 2) * 1.8;
      const spdVal = 7.66 + Math.cos(step * 1.5) * 0.024;

      setTelemetry({
        targetName: activeSat.name,
        lat: `${Math.abs(latVal).toFixed(2)}° ${latVal >= 0 ? 'N' : 'S'}`,
        lon: `${Math.abs(lonVal).toFixed(2)}° ${lonVal >= 0 ? 'E' : 'W'}`,
        alt: `${altVal.toFixed(1)} km`,
        speed: `${spdVal.toFixed(3)} km/s`,
      });
    }, 100);

    return () => clearInterval(interval);
  }, [popoverSat, selectedSat, satellites]);

  return telemetry;
}

// Draggable Card Custom Hook
function useDraggableCard(mountRef: React.RefObject<HTMLDivElement | null>) {
  const [cardPos, setCardPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  const handleCardPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDraggingCard(true);
    const containerRect = mountRef.current?.getBoundingClientRect();
    const cardElem = e.currentTarget.closest('.draggable-card') as HTMLElement;
    const cardRect = cardElem?.getBoundingClientRect();

    if (containerRect && cardRect) {
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startX: cardRect.left - containerRect.left,
        startY: cardRect.top - containerRect.top,
      };
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [mountRef]);

  const handleCardPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingCard) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    setCardPos({
      x: Math.max(10, dragStartRef.current.startX + dx),
      y: Math.max(10, dragStartRef.current.startY + dy),
    });
  }, [isDraggingCard]);

  const handleCardPointerUp = useCallback(() => {
    if (isDraggingCard) {
      setIsDraggingCard(false);
    }
  }, [isDraggingCard]);

  return {
    cardPos,
    handleCardPointerDown,
    handleCardPointerMove,
    handleCardPointerUp,
  };
}

// ThreeGlobe Scene Setup Custom Hook
function useGlobeSceneSetup({
  mountRef,
  controlsRef,
  globeRef,
  rendererRef,
  ambientLightRef,
  sunLightRef,
  livePointsRef,
  cameraTargetRef,
  isOptimizedRef,
  dayNightModeRef,
  showAtmosphericDensityRef,
  atmosphericDensityPointsRef,
  initialSatellitePoints,
  selectedSatRef,
  popoverSatRef,
  orbitalPaths,
  orbitModeRef,
  onSelectSatRef,
  setIsGlobeLoaded,
  setHoveredSat,
  setPopoverSat,
  satellitesRef,
}: {
  mountRef: React.RefObject<HTMLDivElement | null>;
  controlsRef: React.RefObject<OrbitControls | null>;
  globeRef: React.RefObject<ThreeGlobe | null>;
  rendererRef: React.RefObject<THREE.WebGLRenderer | null>;
  ambientLightRef: React.RefObject<THREE.AmbientLight | null>;
  sunLightRef: React.RefObject<THREE.DirectionalLight | null>;
  livePointsRef: React.RefObject<DynamicSatellitePoint[]>;
  cameraTargetRef: React.RefObject<{ x: number; y: number; z: number } | null>;
  isOptimizedRef: React.RefObject<boolean>;
  dayNightModeRef: React.RefObject<'day' | 'night' | undefined>;
  showAtmosphericDensityRef: React.RefObject<boolean>;
  atmosphericDensityPointsRef: React.RefObject<{ lat: number; lng: number; weight: number }[]>;
  initialSatellitePoints: DynamicSatellitePoint[];
  selectedSatRef: React.RefObject<Satellite | null | undefined>;
  popoverSatRef: React.RefObject<Satellite | null>;
  orbitalPaths: OrbitalPath[];
  orbitModeRef: React.RefObject<'all' | 'high_risk'>;
  onSelectSatRef: React.RefObject<((sat: Satellite) => void) | undefined>;
  setIsGlobeLoaded: (loaded: boolean) => void;
  setHoveredSat: (info: HoveredSatInfo | null) => void;
  setPopoverSat: (sat: Satellite | null) => void;
  satellitesRef: React.RefObject<Satellite[]>;
}) {
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 40, 310);

    const renderer = new THREE.WebGLRenderer({ antialias: !isOptimizedRef.current, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isOptimizedRef.current ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.85;
    controls.zoomSpeed = 1.0;
    controls.minDistance = 120;
    controls.maxDistance = 550;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, dayNightModeRef.current === 'day' ? 2.5 : 0.8);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const sunLight = new THREE.DirectionalLight(0xfffaed, dayNightModeRef.current === 'day' ? 3.8 : 1.6);
    sunLight.position.set(250, 160, 200);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
    fillLight.position.set(-200, -100, -200);
    scene.add(fillLight);

    const globeTexture =
      dayNightModeRef.current === 'day'
        ? 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
        : 'https://unpkg.com/three-globe/example/img/earth-night.jpg';

    const Globe = new ThreeGlobe()
      .globeImageUrl(globeTexture)
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
      .showAtmosphere(true)
      .atmosphereColor('#38bdf8')
      .atmosphereAltitude(0.22)
      .hexBinPointsData(showAtmosphericDensityRef.current ? atmosphericDensityPointsRef.current : [])
      .hexBinPointWeight('weight')
      .hexBinResolution(3)
      .hexMargin(0.12)
      .hexTopCurvatureResolution(2)
      .hexTopColor(getHexTopColor)
      .hexSideColor(() => 'rgba(239, 68, 68, 0.25)')
      .hexAltitude((d: any) => 0.02 + (d.sumWeight / d.points.length) * 0.07)
      .pointsData(initialSatellitePoints)
      .pointLat('lat')
      .pointLng('lng')
      .pointAltitude('alt')
      .pointColor('color')
      .pointRadius((d: any) => (d.color === '#f43f5e' ? 1.4 : 1.2))
      .pointResolution(isOptimizedRef.current ? 12 : 24)
      .objectsData(initialSatellitePoints)
      .objectLat('lat')
      .objectLng('lng')
      .objectAltitude('alt')
      .objectThreeObject((d: any) => {
        const isDebris = d.name.includes('DEB') || d.name.includes('COSMOS') || d.name.includes('FENGYUN');
        const isSelected = checkIsSelected(d, selectedSatRef.current, popoverSatRef.current);
        return createSatellite3DMesh(isDebris, isSelected);
      })
      .labelsData(initialSatellitePoints)
      .labelLat('lat')
      .labelLng('lng')
      .labelAltitude((d: any) => d.alt + 0.04)
      .labelText((d: any) => d.name)
      .labelSize(1.5)
      .labelDotRadius(0)
      .labelColor((d: any) => (d.color === '#f43f5e' ? '#f87171' : '#38bdf8'))
      .labelResolution(3)
      .ringsData(initialSatellitePoints)
      .ringLat('lat')
      .ringLng('lng')
      .ringColor((d: any) => (d.color === '#f43f5e' ? 'rgba(244, 63, 94, 0.75)' : 'rgba(56, 189, 248, 0.75)'))
      .ringMaxRadius((d: any) => (d.color === '#f43f5e' ? 6.5 : 4.5))
      .ringPropagationSpeed(3)
      .ringRepeatPeriod(1400)
      .pathsData(orbitalPaths)
      .pathPoints((d: any) => d.coords)
      .pathPointLat((p: any) => p[0])
      .pathPointLng((p: any) => p[1])
      .pathPointAlt((p: any) => p[2])
      .pathColor((d: any) => getPathColor(d, selectedSatRef.current, popoverSatRef.current))
      .pathStroke((d: any) => getPathStroke(d, selectedSatRef.current, popoverSatRef.current))
      .pathDashLength(0.35)
      .pathDashGap(0.06)
      .pathDashAnimateTime(9000);

    scene.add(Globe);
    globeRef.current = Globe;
    setIsGlobeLoaded(true);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const { closestPt } = findClosestSatelliteFromRay({
        e,
        maxDistanceThreshold: 28,
        domElement: renderer.domElement,
        camera,
        scene,
        livePoints: livePointsRef.current,
        raycaster,
        mouse,
      });

      if (closestPt) {
        setHoveredSat({
          sat: closestPt.sat,
          name: closestPt.name,
          alt: closestPt.sat.altitudeKm,
          lat: closestPt.lat,
          lng: closestPt.lng,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        renderer.domElement.style.cursor = 'pointer';
        return;
      }
      setHoveredSat(null);
      renderer.domElement.style.cursor = 'grab';
    };

    const onPointerDown = (e: MouseEvent) => {
      const { closestPt } = findClosestSatelliteFromRay({
        e,
        maxDistanceThreshold: 35,
        domElement: renderer.domElement,
        camera,
        scene,
        livePoints: livePointsRef.current,
        raycaster,
        mouse,
      });

      if (closestPt) {
        const selected = closestPt.sat;
        if (onSelectSatRef.current) onSelectSatRef.current(selected);
        setPopoverSat(selected);
      } else if (onSelectSatRef.current && satellitesRef.current.length > 0) {
        const fallback = satellitesRef.current[0];
        onSelectSatRef.current(fallback);
        setPopoverSat(fallback);
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('mousemove', onPointerMove);
    domElem.addEventListener('click', onPointerDown);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    let livePoints = [...initialSatellitePoints];
    livePointsRef.current = livePoints;
    let animId: number;
    let lastRenderTime = performance.now();
    let tickCount = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();

      if (isOptimizedRef.current && now - lastRenderTime < 32) {
        return;
      }
      lastRenderTime = now;

      if (cameraTargetRef.current && controlsRef.current) {
        const cam = controlsRef.current.object;
        cam.position.x += (cameraTargetRef.current.x - cam.position.x) * 0.08;
        cam.position.y += (cameraTargetRef.current.y - cam.position.y) * 0.08;
        cam.position.z += (cameraTargetRef.current.z - cam.position.z) * 0.08;

        const dx = cameraTargetRef.current.x - cam.position.x;
        const dy = cameraTargetRef.current.y - cam.position.y;
        const dz = cameraTargetRef.current.z - cam.position.z;
        if (Math.hypot(dx, dy, dz) < 1.5) {
          cameraTargetRef.current = null;
        }
      }

      tickCount += 0.003;

      livePoints = livePoints.map((pt) => {
        const theta = tickCount * pt.speed + pt.phase;
        const pos = calculateOrbitPos(theta, pt.baseLng, pt.inclination);

        return {
          ...pt,
          lat: pos.lat,
          lng: pos.lng,
        };
      });

      livePointsRef.current = livePoints;

      const activePts =
        orbitModeRef.current === 'high_risk'
          ? livePoints.filter((p) => p.color === '#f43f5e' || p.name.includes('ISS'))
          : livePoints;

      Globe.pointsData(activePts);
      Globe.objectsData(activePts);
      Globe.labelsData(activePts);
      Globe.ringsData(activePts);

      const issPt = livePoints.find((p) => p.name.includes('ISS')) || livePoints[0];
      const cosmosPt = livePoints.find((p) => p.color === '#f43f5e') || livePoints[1];

      if (issPt && cosmosPt) {
        Globe.arcsData([
          {
            startLat: issPt.lat,
            startLng: issPt.lng,
            endLat: cosmosPt.lat,
            endLng: cosmosPt.lng,
            color: ['rgba(244, 63, 94, 0.95)', 'rgba(56, 189, 248, 0.95)'],
            stroke: 2.2,
            dashLength: 0.35,
            dashGap: 0.2,
            dashAnimateTime: 1600,
          },
        ]);
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      domElem.removeEventListener('mousemove', onPointerMove);
      domElem.removeEventListener('click', onPointerDown);
      domElem.remove();
      renderer.dispose();
      rendererRef.current = null;
      globeRef.current = null;
    };
  }, [
    initialSatellitePoints,
    orbitalPaths,
    mountRef,
    controlsRef,
    globeRef,
    rendererRef,
    ambientLightRef,
    sunLightRef,
    livePointsRef,
    cameraTargetRef,
    isOptimizedRef,
    dayNightModeRef,
    showAtmosphericDensityRef,
    atmosphericDensityPointsRef,
    selectedSatRef,
    popoverSatRef,
    orbitModeRef,
    onSelectSatRef,
    setIsGlobeLoaded,
    setHoveredSat,
    setPopoverSat,
    satellitesRef,
  ]);
}

// Helper Generators extracted outside Earth component to reduce Cognitive Complexity
function generateInitialSatellitePoints(satellites: Satellite[]): DynamicSatellitePoint[] {
  const defaultCoords = [
    { lat: 28.57, lng: -80.64, alt: 0.22, color: '#38bdf8', speed: 0.05, inclination: 51.6 },
    { lat: 51.64, lng: 12.50, alt: 0.18, color: '#f43f5e', speed: -0.06, inclination: 65.0 },
    { lat: 40.71, lng: -74.00, alt: 0.28, color: '#38bdf8', speed: 0.04, inclination: 53.0 },
    { lat: -33.86, lng: 151.20, alt: 0.35, color: '#10b981', speed: 0.03, inclination: 28.5 },
    { lat: 35.67, lng: 139.65, alt: 0.20, color: '#f59e0b', speed: 0.05, inclination: 41.5 },
    { lat: -22.90, lng: -43.17, alt: 0.25, color: '#f43f5e', speed: -0.07, inclination: 98.6 },
  ];

  return satellites.map((sat, idx) => {
    const coord = defaultCoords[idx % defaultCoords.length];
    const isDebris = sat.name.includes('DEB') || sat.name.includes('COSMOS') || sat.name.includes('FENGYUN');
    const phase = (idx * Math.PI) / 3;
    const initialPos = calculateOrbitPos(phase, coord.lng, coord.inclination);

    return {
      id: sat.id,
      name: sat.name,
      lat: initialPos.lat,
      lng: initialPos.lng,
      alt: 0.16 + (sat.altitudeKm / 1000) * 0.22,
      color: isDebris ? '#f43f5e' : '#38bdf8',
      sat,
      baseLng: coord.lng,
      baseLat: coord.lat,
      speed: coord.speed,
      inclination: coord.inclination,
      phase,
    };
  });
}

function generateOrbitalPaths(initialSatellitePoints: DynamicSatellitePoint[], isOptimized: boolean): OrbitalPath[] {
  return initialSatellitePoints.map((point) => {
    const coords: [number, number, number][] = [];
    const steps = isOptimized ? 60 : 120;
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      const pos = calculateOrbitPos(theta, point.baseLng, point.inclination);
      coords.push([pos.lat, pos.lng, point.alt]);
    }
    const isDebris = point.name.includes('DEB') || point.name.includes('COSMOS') || point.name.includes('FENGYUN');
    return {
      satId: point.id,
      name: point.name,
      isDebris,
      coords,
      color: point.color,
    };
  });
}

function isDebrisThreat(activeSat?: Satellite | null): boolean {
  if (!activeSat) return false;
  return (
    activeSat.name.includes('DEB') ||
    activeSat.name.includes('COSMOS') ||
    activeSat.name.includes('FENGYUN') ||
    (activeSat.riskScore ?? 0) > 50
  );
}

function useGlobeImperativeUpdates({
  globeRef,
  rendererRef,
  ambientLightRef,
  sunLightRef,
  controlsRef,
  selectedSat,
  popoverSat,
  orbitalPaths,
  showAtmosphericDensity,
  atmosphericDensityPoints,
  dayNightMode,
  isOptimized,
}: {
  globeRef: React.RefObject<ThreeGlobe | null>;
  rendererRef: React.RefObject<THREE.WebGLRenderer | null>;
  ambientLightRef: React.RefObject<THREE.AmbientLight | null>;
  sunLightRef: React.RefObject<THREE.DirectionalLight | null>;
  controlsRef: React.RefObject<OrbitControls | null>;
  selectedSat?: Satellite | null;
  popoverSat: Satellite | null;
  orbitalPaths: OrbitalPath[];
  showAtmosphericDensity: boolean;
  atmosphericDensityPoints: { lat: number; lng: number; weight: number }[];
  dayNightMode?: 'day' | 'night';
  isOptimized: boolean;
}) {
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.pathsData(orbitalPaths);
    }
  }, [selectedSat, popoverSat, orbitalPaths, globeRef]);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.hexBinPointsData(showAtmosphericDensity ? atmosphericDensityPoints : []);
    }
  }, [showAtmosphericDensity, atmosphericDensityPoints, globeRef]);

  useEffect(() => {
    const isDay = dayNightMode === 'day';
    if (globeRef.current) {
      const globeTexture = isDay
        ? 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
        : 'https://unpkg.com/three-globe/example/img/earth-night.jpg';
      globeRef.current.globeImageUrl(globeTexture);
      globeRef.current.atmosphereColor(isDay ? '#38bdf8' : '#1d4ed8');
    }
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = isDay ? 2.5 : 0.8;
    }
    if (sunLightRef.current) {
      sunLightRef.current.intensity = isDay ? 3.8 : 1.6;
    }
  }, [dayNightMode, globeRef, ambientLightRef, sunLightRef]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setPixelRatio(isOptimized ? 1 : Math.min(window.devicePixelRatio, 2));
    }
    if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
      controlsRef.current.autoRotateSpeed = 0;
    }
  }, [isOptimized, rendererRef, controlsRef]);
}

function GlobeHoverTooltip({
  hoveredSat,
  containerWidth = 500,
}: Readonly<{
  hoveredSat: HoveredSatInfo | null;
  containerWidth?: number;
}>) {
  if (!hoveredSat) return null;

  return (
    <div
      style={{
        left: `${Math.min(hoveredSat.x + 12, containerWidth - 200)}px`,
        top: `${Math.max(hoveredSat.y - 70, 10)}px`,
      }}
      className="absolute z-30 pointer-events-none bg-[#091526]/95 backdrop-blur-md border border-cyan-400/80 rounded-lg p-2.5 shadow-2xl font-mono text-[11px] text-slate-200 animate-in fade-in zoom-in-95 duration-100 min-w-[190px]"
    >
      <div className="flex items-center justify-between border-b border-cyan-800/60 pb-1 mb-1">
        <span className="font-bold text-cyan-300 flex items-center gap-1 truncate max-w-[130px]">
          {hoveredSat.name.includes('DEB') || hoveredSat.name.includes('COSMOS') ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          )}
          {hoveredSat.name}
        </span>
        <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
          #{hoveredSat.sat.noradId}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
        <div>
          <span className="text-slate-400">ALTITUDE:</span>{' '}
          <span className="text-white font-bold">{hoveredSat.alt} km</span>
        </div>
        <div>
          <span className="text-slate-400">RISK:</span>{' '}
          <span className={(hoveredSat.sat.riskScore ?? 0) > 50 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
            {hoveredSat.sat.riskScore ?? 0}%
          </span>
        </div>
      </div>
      <div className="text-[9px] text-cyan-300/90 mt-1.5 pt-1 border-t border-cyan-900/50 flex items-center justify-between font-bold">
        <span>CLICK TO INSPECT TELEMETRY</span>
        <ArrowUpRight className="w-3 h-3 text-cyan-400" />
      </div>
    </div>
  );
}

function SatelliteTelemetryCard({
  activeSat,
  isDebrisObject,
  cardPos,
  handleCardPointerDown,
  handleCardPointerMove,
  handleCardPointerUp,
  onClose,
  onSelectSat,
  onFocusCamera,
}: Readonly<{
  activeSat?: Satellite | null;
  isDebrisObject: boolean;
  cardPos: { x: number; y: number } | null;
  handleCardPointerDown: (e: React.PointerEvent) => void;
  handleCardPointerMove: (e: React.PointerEvent) => void;
  handleCardPointerUp: () => void;
  onClose: () => void;
  onSelectSat?: (sat: Satellite) => void;
  onFocusCamera: () => void;
}>) {
  if (!activeSat) return null;

  return (
    <div
      style={
        cardPos
          ? { left: `${cardPos.x}px`, top: `${cardPos.y}px` }
          : { top: '80px', right: '12px' }
      }
      className="draggable-card absolute z-20 w-80 bg-[#091326]/95 backdrop-blur-xl border border-cyan-500/50 rounded-xl p-3.5 shadow-2xl space-y-3 font-mono pointer-events-auto transition-shadow animate-in fade-in slide-in-from-right-4 select-none"
    >
      <div
        onPointerDown={handleCardPointerDown}
        onPointerMove={handleCardPointerMove}
        onPointerUp={handleCardPointerUp}
        className="flex items-center justify-between border-b border-[#1b2c48] pb-1.5 cursor-grab active:cursor-grabbing hover:bg-cyan-950/40 px-1.5 py-1 rounded transition-colors group"
        title="Click and drag to move card anywhere on 3D canvas"
      >
        <div className="flex items-center gap-1.5">
          <GripHorizontal className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
          <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
            DRAG CARD TO REPOSITION
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                isDebrisObject
                  ? 'bg-red-950 text-red-300 border border-red-800'
                  : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
              }`}
            >
              {isDebrisObject ? 'Tracked Debris / Threat' : 'Active Primary Payload'}
            </span>
            <span className="text-[10px] text-slate-400">NORAD #{activeSat.noradId}</span>
          </div>
          <h4 className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
            {isDebrisObject ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            {activeSat.name}
          </h4>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-[#050b17] p-2 rounded border border-[#162742]">
          <div className="text-slate-400 text-[9px]">ALTITUDE</div>
          <div className="text-cyan-300 font-bold text-xs">{activeSat.altitudeKm} km</div>
        </div>
        <div className="bg-[#050b17] p-2 rounded border border-[#162742]">
          <div className="text-slate-400 text-[9px]">INCLINATION</div>
          <div className="text-emerald-400 font-bold text-xs">{activeSat.inclinationDeg}°</div>
        </div>
        <div className="bg-[#050b17] p-2 rounded border border-[#162742]">
          <div className="text-slate-400 text-[9px]">ORBIT PERIOD</div>
          <div className="text-slate-200 font-bold text-xs">{activeSat.periodMin} mins</div>
        </div>
        <div className="bg-[#050b17] p-2 rounded border border-[#162742]">
          <div className="text-slate-400 text-[9px]">VELOCITY</div>
          <div className="text-amber-300 font-bold text-xs">7.66 km/s</div>
        </div>
      </div>

      <div className="bg-[#0d1c33] p-2.5 rounded-lg border border-red-900/60 space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between border-b border-red-950/80 pb-1 text-[10px]">
          <span className="text-red-400 font-bold flex items-center gap-1">
            <Activity className="w-3 h-3 text-red-400" /> CONJUNCTION HAZARD
          </span>
          <span className="text-amber-300 font-bold">{activeSat.riskScore}% RISK</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span className="text-slate-400">Target Asset:</span>
          <strong className="text-cyan-300">ISS (ZARYA)</strong>
        </div>
        <div className="flex justify-between text-slate-300">
          <span className="text-slate-400">Miss Dist (TCA):</span>
          <strong className="text-red-400">0.42 km (CRITICAL)</strong>
        </div>
        <div className="flex justify-between text-slate-300">
          <span className="text-slate-400">Prob. ($P_c$):</span>
          <strong className="text-red-300 font-mono">8.4 × 10⁻⁴</strong>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            if (onSelectSat) onSelectSat(activeSat);
          }}
          className="flex-1 py-1.5 px-2 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/80 rounded text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
          <span>PLAN EVASION</span>
        </button>
        <button
          type="button"
          onClick={onFocusCamera}
          className="py-1.5 px-2 bg-[#12223c] hover:bg-[#1a2f52] text-slate-300 border border-[#233c64] rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
          title="Focus 3D View on Object Orbit"
        >
          <Eye className="w-3.5 h-3.5 text-slate-300" />
          <span>FOCUS</span>
        </button>
      </div>
    </div>
  );
}

export function Earth({
  satellites = [],
  selectedSat,
  onSelectSat,
  dayNightMode: propDayNightMode,
  onToggleDayNightMode,
}: Readonly<EarthProps>) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const globeRef = useRef<ThreeGlobe | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const livePointsRef = useRef<DynamicSatellitePoint[]>([]);
  const cameraTargetRef = useRef<{ x: number; y: number; z: number } | null>(null);

  const [popoverSat, setPopoverSat] = useState<Satellite | null>(null);
  const [hoveredSat, setHoveredSat] = useState<HoveredSatInfo | null>(null);
  const [showAtmosphericDensity, setShowAtmosphericDensity] = useState(false);
  const [orbitMode, setOrbitMode] = useState<'all' | 'high_risk'>('all');
  const [isOptimized, setIsOptimized] = useState(false);
  const [isGlobeLoaded, setIsGlobeLoaded] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (mountRef.current && rendererRef.current) {
      const timer = setTimeout(() => {
        if (!mountRef.current || !rendererRef.current) return;
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        rendererRef.current.setSize(width, height);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  const dayNightMode = propDayNightMode;

  const telemetry = useSatelliteTelemetry(popoverSat, selectedSat, satellites);
  const { cardPos, handleCardPointerDown, handleCardPointerMove, handleCardPointerUp } = useDraggableCard(mountRef);

  useEffect(() => {
    if (selectedSat) {
      setPopoverSat(selectedSat);
    }
  }, [selectedSat]);

  const stateRefs = useEarthStateRefs({
    selectedSat,
    popoverSat,
    satellites,
    onSelectSat,
    orbitMode,
    isOptimized,
    showAtmosphericDensity,
    dayNightMode,
  });

  const atmosphericDensityPoints = useMemo(() => generateAtmosphericDensityPoints(), []);

  const atmosphericDensityPointsRef = useRef(atmosphericDensityPoints);
  useEffect(() => {
    atmosphericDensityPointsRef.current = atmosphericDensityPoints;
  }, [atmosphericDensityPoints]);

  const initialSatellitePoints = useMemo(() => generateInitialSatellitePoints(satellites), [satellites]);
  const orbitalPaths = useMemo(() => generateOrbitalPaths(initialSatellitePoints, isOptimized), [initialSatellitePoints, isOptimized]);

  const focusCameraOn = useCallback((lat: number, lng: number, targetDist = 180) => {
    if (!controlsRef.current) return;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(targetDist * Math.sin(phi) * Math.cos(theta));
    const z = targetDist * Math.sin(phi) * Math.sin(theta);
    const y = targetDist * Math.cos(phi);
    cameraTargetRef.current = { x, y, z };
  }, []);

  useGlobeSceneSetup({
    mountRef,
    controlsRef,
    globeRef,
    rendererRef,
    ambientLightRef,
    sunLightRef,
    livePointsRef,
    cameraTargetRef,
    isOptimizedRef: stateRefs.isOptimizedRef,
    dayNightModeRef: stateRefs.dayNightModeRef,
    showAtmosphericDensityRef: stateRefs.showAtmosphericDensityRef,
    atmosphericDensityPointsRef,
    initialSatellitePoints,
    selectedSatRef: stateRefs.selectedSatRef,
    popoverSatRef: stateRefs.popoverSatRef,
    orbitalPaths,
    orbitModeRef: stateRefs.orbitModeRef,
    onSelectSatRef: stateRefs.onSelectSatRef,
    setIsGlobeLoaded,
    setHoveredSat,
    setPopoverSat,
    satellitesRef: stateRefs.satellitesRef,
  });

  useGlobeImperativeUpdates({
    globeRef,
    rendererRef,
    ambientLightRef,
    sunLightRef,
    controlsRef,
    selectedSat,
    popoverSat,
    orbitalPaths,
    showAtmosphericDensity,
    atmosphericDensityPoints,
    dayNightMode,
    isOptimized,
  });

  const handleZoom = (delta: number) => {
    if (!controlsRef.current) return;
    controlsRef.current.object.position.multiplyScalar(delta < 0 ? 0.85 : 1.15);
  };

  const handleResetCamera = () => {
    if (!controlsRef.current) return;
    controlsRef.current.object.position.set(0, 40, 310);
    controlsRef.current.target.set(0, 0, 0);
  };

  const activeSat = popoverSat || selectedSat;
  const isDebrisObject = isDebrisThreat(activeSat);

  return (
    <div
      className={
        isModalOpen
          ? 'fixed inset-0 z-50 p-2 sm:p-5 bg-[#020712]/98 backdrop-blur-2xl flex flex-col justify-between overflow-hidden animate-in fade-in duration-200'
          : 'w-full h-full relative min-h-[500px] flex flex-col justify-between overflow-hidden bg-[#020712]'
      }
    >
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Popup Modal Top Bar when in Modal Mode */}
      {isModalOpen && (
        <div className="relative z-40 bg-[#071328]/90 backdrop-blur-md p-3 rounded-t-xl border border-cyan-500/50 flex items-center justify-between text-white font-mono text-xs">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <Globe className="w-4 h-4 animate-pulse text-cyan-400" />
            <span className="truncate">3D ORBITAL GLOBE PROJECTION (POPUP MODAL)</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowHud(!showHud)}
              className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 hover:bg-cyan-900 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {showHud ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{showHud ? 'HIDE HUD' : 'SHOW HUD'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
              title="Close Fullscreen Modal"
            >
              <X className="w-4 h-4" />
              <span>CLOSE</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {!isGlobeLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#020712]/90 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-3 font-mono text-xs text-cyan-400">
            <Radio className="w-6 h-6 animate-pulse text-cyan-400" />
            <span>INITIALIZING GLOBE 3D CANVAS...</span>
          </div>
        </div>
      )}

      {/* Persistent Mobile Quick HUD & Modal Toolbar */}
      <div className="absolute top-2.5 right-2.5 z-40 flex items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={() => setShowHud(!showHud)}
          title={showHud ? 'Hide HUD Overlays to reveal 3D Globe' : 'Show HUD Overlays'}
          className="px-2.5 py-1.5 rounded-lg bg-[#050b17]/90 hover:bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-lg text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all duration-150 active:scale-95 cursor-pointer"
        >
          {showHud ? <EyeOff className="w-3.5 h-3.5 text-cyan-400" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
          <span>{showHud ? 'HIDE HUD' : 'SHOW HUD'}</span>
        </button>

        {!isModalOpen && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            title="Open 3D Earth Globe in a Pop-up Modal"
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg text-[10px] font-mono font-extrabold flex items-center gap-1.5 transition-all duration-150 active:scale-95 cursor-pointer border-none"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>VIEW 3D MODAL</span>
          </button>
        )}
      </div>

      {/* Top HUD Controls (Conditioned on showHud) */}
      {showHud && (
        <div className="relative z-30 p-3 flex items-start justify-between pointer-events-none flex-wrap gap-2 pr-44 sm:pr-3">
          {/* Realtime Sub-Satellite Telemetry HUD */}
          <div className="bg-[#050b17]/85 backdrop-blur-md px-3.5 py-2.5 rounded-lg border border-cyan-500/40 shadow-lg text-[11px] font-mono space-y-1.5 text-slate-300 pointer-events-auto min-w-[200px] max-w-[280px]">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <Crosshair className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>SUB-SATELLITE POSITION (SSP)</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> MOVING
              </span>
            </div>

            <div className="text-[10px] text-cyan-300 font-semibold truncate">
              TARGET: <span className="text-white">{telemetry.targetName}</span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5">
              <div className="flex justify-between">
                <span className="text-slate-400">LAT:</span>{' '}
                <span className="text-white font-mono font-bold">{telemetry.lat}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">LON:</span>{' '}
                <span className="text-white font-mono font-bold">{telemetry.lon}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ALT:</span>{' '}
                <span className="text-emerald-400 font-mono font-bold">{telemetry.alt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SPD:</span>{' '}
                <span className="text-cyan-400 font-mono font-bold">{telemetry.speed}</span>
              </div>
            </div>
          </div>

          {/* Orbit Filter, Day/Night Toggle & Atmospheric Density Toolbar */}
          <div className="flex flex-col items-end gap-2 pointer-events-auto">
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {/* Atmospheric Density Heatmap Overlay Toggle */}
              <button
                type="button"
                onClick={() => setShowAtmosphericDensity(!showAtmosphericDensity)}
                title="Toggle Real-Time Thermospheric Density Heatmap Overlay (Orbital Decay Layer)"
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                  showAtmosphericDensity
                    ? 'bg-amber-500/35 text-amber-300 border border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.35)] hover:bg-amber-500/50'
                    : 'bg-[#050b17]/85 backdrop-blur-md text-slate-300 hover:text-white hover:bg-amber-900/40 border border-cyan-500/40'
                }`}
              >
                <Wind className={`w-3.5 h-3.5 ${showAtmosphericDensity ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                <span>ATMOSPHERIC DENSITY</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-black ${
                    showAtmosphericDensity ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {showAtmosphericDensity ? 'HEATMAP ON' : 'OFF'}
                </span>
              </button>

              {/* Orbit Filter */}
              <div className="flex items-center gap-1 bg-[#050b17]/85 backdrop-blur-md p-1 rounded-lg border border-cyan-500/40">
                <button
                  type="button"
                  onClick={() => setOrbitMode('all')}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all duration-150 active:scale-95 cursor-pointer border-none ${
                    orbitMode === 'all' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-slate-950 hover:bg-cyan-500/80'
                  }`}
                >
                  ALL ORBITS
                </button>
                <button
                  type="button"
                  onClick={() => setOrbitMode('high_risk')}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all duration-150 active:scale-95 cursor-pointer border-none ${
                    orbitMode === 'high_risk' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-red-600/80'
                  }`}
                >
                  CRITICAL VECTOR
                </button>
              </div>

              {/* GPU ECO Performance Optimization Toggle (1-Click) */}
              <button
                type="button"
                onClick={() => setIsOptimized(!isOptimized)}
                title={
                  isOptimized
                    ? 'Performance Mode Active: 30 FPS Low DPI Mode for smooth rendering on low-spec GPUs'
                    : 'High Fidelity Mode Active: 60 FPS Full Resolution Mode'
                }
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                  isOptimized
                    ? 'bg-emerald-500/35 text-emerald-300 border border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:bg-emerald-500/50'
                    : 'bg-[#050b17]/85 backdrop-blur-md text-slate-300 hover:text-white hover:bg-emerald-900/40 border border-cyan-500/40'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${isOptimized ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                <span>GPU OPTIMIZATION</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-black ${
                    isOptimized ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isOptimized ? 'ECO 30FPS' : '60FPS HD'}
                </span>
              </button>
            </div>

            {/* Zoom & Reset Toolbar */}
            <div className="flex items-center gap-1 bg-[#050b17]/85 backdrop-blur-md p-1 rounded-lg border border-cyan-500/40">
              <button
                type="button"
                onClick={() => handleZoom(-1)}
                title="Zoom In"
                className="p-1.5 text-slate-300 hover:text-slate-950 hover:bg-cyan-400 rounded transition-all duration-150 active:scale-95 cursor-pointer border-none"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleZoom(1)}
                title="Zoom Out"
                className="p-1.5 text-slate-300 hover:text-slate-950 hover:bg-cyan-400 rounded transition-all duration-150 active:scale-95 cursor-pointer border-none"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetCamera}
                title="Reset View"
                className="p-1.5 text-slate-300 hover:text-slate-950 hover:bg-cyan-400 rounded transition-all duration-150 active:scale-95 cursor-pointer border-none"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Atmospheric Density Legend Panel (when Heatmap Overlay is active and showHud is true) */}
      {showHud && showAtmosphericDensity && (
        <div className="absolute bottom-12 left-3 z-20 bg-[#050c1b]/90 backdrop-blur-md p-2.5 rounded-lg border border-amber-500/50 text-[10px] font-mono space-y-1.5 max-w-[290px] shadow-2xl pointer-events-auto animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between text-amber-300 font-bold border-b border-amber-500/30 pb-1">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> DENSITY HEATMAP ($\rho$)
            </span>
            <span className="text-[9px] text-slate-400">LEO DECAY ZONE</span>
          </div>
          <div className="flex items-center justify-between gap-1 text-[9px] pt-0.5">
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> High Drag ($&gt;10^{-11}$)
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Mod Drag
            </span>
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" /> Low Drag
            </span>
          </div>
          <div className="text-[9px] text-slate-300 leading-tight">
            Thermospheric density drag directly causes orbital decay, requiring automated evasion burns for low LEO satellites.
          </div>
        </div>
      )}

      {/* Real-time Hover Tooltip Box */}
      <GlobeHoverTooltip
        hoveredSat={hoveredSat}
        containerWidth={mountRef.current?.clientWidth || 500}
      />

      {/* Interactive Floating Telemetry Side Pop-Over (Conditioned on showHud) */}
      {showHud && (
        <SatelliteTelemetryCard
          activeSat={activeSat}
          isDebrisObject={isDebrisObject}
          cardPos={cardPos}
          handleCardPointerDown={handleCardPointerDown}
          handleCardPointerMove={handleCardPointerMove}
          handleCardPointerUp={handleCardPointerUp}
          onClose={() => setPopoverSat(null)}
          onSelectSat={onSelectSat}
          onFocusCamera={() => focusCameraOn(28.57, -80.64, 170)}
        />
      )}

      {/* Bottom Interactive Legend */}
      <div className="relative z-10 p-3 bg-gradient-to-t from-[#040813] to-transparent flex items-center justify-between text-[11px] text-slate-400 font-mono pointer-events-auto">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Active Payload (Moving)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" /> Tracked Space Debris
          </span>
          <span
            className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono ${
              isOptimized
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
            }`}
          >
            <Gauge className="w-3 h-3" /> {isOptimized ? 'MOBILE ECO (30 FPS)' : 'HIGH FIDELITY (60 FPS)'}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 hidden sm:block">
          Hover to inspect tooltip • Click to zoom & highlight orbit • Drag to rotate globe
        </div>
      </div>
    </div>
  );
}

