'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { DISCOVERY_CATALOG, ROOM_ANCHORS } from '@/lib/catalog';
import { PlacedObjectState } from '@/lib/types';

interface ThreeRoomProps {
  placedObjects: PlacedObjectState[];
  selectedObjectId: string | null;
  onSelectObject: (objectId: string) => void;
  onSlotClick?: (slotIndex: number) => void;
  highlightSlotIndex?: number | null;
  reducedMotion?: boolean;
  onContextError?: () => void;
}

export default function ThreeRoom({
  placedObjects,
  selectedObjectId,
  onSelectObject,
  onSlotClick,
  highlightSlotIndex,
  reducedMotion = false,
  onContextError,
}: ThreeRoomProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const objectMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const anchorRingsRef = useRef<THREE.Mesh[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#f5f3ee');

    // 2. Camera setup - Orthographic isometric view
    const aspect = container.clientWidth / container.clientHeight;
    const frustumSize = 4.2;
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100
    );
    camera.position.set(4, 3.8, 4);
    camera.lookAt(0, 0.65, 0);
    cameraRef.current = camera;

    // 3. Renderer with soft shadow map
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      onContextError?.();
      return;
    }

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Lighting - Soft daylight key and cool ambient fill
    const ambientLight = new THREE.AmbientLight('#fff8f0', 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#fffaf2', 1.35);
    sunLight.position.set(5, 7, 3);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 20;
    const d = 3.5;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight('#dce6f0', 0.45);
    fillLight.position.set(-4, 3, -4);
    scene.add(fillLight);

    // 5. Room geometry (Floor and two walls forming open diorama)
    const floorGeo = new THREE.BoxGeometry(3.6, 0.15, 3.6);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#e8e3d8',
      roughness: 0.75,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.075, 0);
    floor.receiveShadow = true;
    scene.add(floor);

    // Left wall
    const wallMat = new THREE.MeshStandardMaterial({
      color: '#f6f2e8',
      roughness: 0.85,
    });
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 3.6), wallMat);
    leftWall.position.set(-1.8, 1.125, 0);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Back wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 0.12), wallMat);
    backWall.position.set(0, 1.125, -1.8);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Window recess on back wall
    const windowFrameMat = new THREE.MeshStandardMaterial({
      color: '#fdfefe',
      roughness: 0.5,
    });
    const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 0.14), windowFrameMat);
    windowFrame.position.set(-0.6, 1.45, -1.78);
    scene.add(windowFrame);

    const windowGlassMat = new THREE.MeshBasicMaterial({ color: '#eef6f9' });
    const windowGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), windowGlassMat);
    windowGlass.position.set(-0.6, 1.45, -1.7);
    scene.add(windowGlass);

    // Furniture: Minimalist Wooden Desk
    const deskMat = new THREE.MeshStandardMaterial({
      color: '#d6c3ad',
      roughness: 0.65,
    });
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.1), deskMat);
    deskTop.position.set(0.15, 0.58, 0.15);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    scene.add(deskTop);

    // Desk legs
    const legMat = new THREE.MeshStandardMaterial({ color: '#53616c', roughness: 0.5 });
    const legPositions = [
      [-0.85, 0.29, -0.3],
      [1.15, 0.29, -0.3],
      [-0.85, 0.29, 0.6],
      [1.15, 0.29, 0.6],
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.58, 16), legMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      scene.add(leg);
    });

    // Low wooden floor shelf
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.45), deskMat);
    shelf.position.set(-0.9, 0.125, 0.6);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    scene.add(shelf);

    // High wall shelf
    const highShelf = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.28), deskMat);
    highShelf.position.set(0.9, 1.25, -0.6);
    highShelf.castShadow = true;
    scene.add(highShelf);

    // Anchor visualizer rings for empty slots
    const ringGeo = new THREE.RingGeometry(0.12, 0.16, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#245cc5',
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });

    const rings: THREE.Mesh[] = [];
    ROOM_ANCHORS.forEach((anchor) => {
      const ring = new THREE.Mesh(ringGeo, ringMat.clone());
      ring.position.set(anchor.position[0], anchor.position[1] + 0.005, anchor.position[2]);
      ring.visible = false;
      ring.userData = { isAnchor: true, slotIndex: anchor.slotIndex };
      scene.add(ring);
      rings.push(ring);
    });
    anchorRingsRef.current = rings;

    // Handle Raycaster for object & anchor selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      for (const hit of intersects) {
        let cur: THREE.Object3D | null = hit.object;
        while (cur && cur !== scene) {
          if (cur.userData?.isAnchor) {
            onSlotClick?.(cur.userData.slotIndex);
            return;
          }
          if (cur.userData?.objectId) {
            onSelectObject(cur.userData.objectId);
            return;
          }
          cur = cur.parent;
        }
      }
    };

    const handlePointerMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      let foundId: string | null = null;
      for (const hit of intersects) {
        let cur: THREE.Object3D | null = hit.object;
        while (cur && cur !== scene) {
          if (cur.userData?.objectId) {
            foundId = cur.userData.objectId;
            break;
          }
          cur = cur.parent;
        }
        if (foundId) break;
      }
      setHoveredObjectId(foundId);
    };

    renderer.domElement.addEventListener('click', handlePointerDown);
    renderer.domElement.addEventListener('mousemove', handlePointerMove);

    // Resize listener
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const newAspect = w / h;
      cameraRef.current.left = (-frustumSize * newAspect) / 2;
      cameraRef.current.right = (frustumSize * newAspect) / 2;
      cameraRef.current.top = frustumSize / 2;
      cameraRef.current.bottom = -frustumSize / 2;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Render loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Subtle float on selected object if motion enabled
      if (!reducedMotion && selectedObjectId) {
        const mesh = objectMeshesRef.current.get(selectedObjectId);
        if (mesh) {
          mesh.position.y = (mesh.userData.baseY || 0.65) + Math.sin(clock.getElapsedTime() * 3) * 0.02;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handlePointerDown);
      renderer.domElement.removeEventListener('mousemove', handlePointerMove);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [reducedMotion]);

  // Update placed objects whenever placedObjects or selectedObjectId change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear existing object meshes
    objectMeshesRef.current.forEach((mesh) => {
      scene.remove(mesh);
    });
    objectMeshesRef.current.clear();

    // Spawn current placed objects
    placedObjects.forEach((placed) => {
      const catalogObj = DISCOVERY_CATALOG.find((c) => c.id === placed.objectId);
      if (!catalogObj) return;

      const anchor = ROOM_ANCHORS.find((a) => a.slotIndex === placed.slotIndex);
      const pos = anchor ? anchor.position : [0, 0.65, 0];

      const mesh = createMiniatureObjectMesh(catalogObj.geometryType, catalogObj.color, catalogObj.secondaryColor);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.userData = { objectId: catalogObj.id, baseY: pos[1] };

      // Highlight selected object
      if (catalogObj.id === selectedObjectId) {
        addSelectionHalo(mesh);
      }

      scene.add(mesh);
      objectMeshesRef.current.set(catalogObj.id, mesh);
    });

    // Update anchor rings visibility
    const placedSlots = new Set(placedObjects.map((p) => p.slotIndex));
    anchorRingsRef.current.forEach((ring) => {
      const slot = ring.userData.slotIndex;
      const isOccupied = placedSlots.has(slot);
      const isTarget = highlightSlotIndex === slot;

      ring.visible = !isOccupied;
      if (isTarget) {
        (ring.material as THREE.MeshBasicMaterial).color.set('#245cc5');
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.85;
      } else {
        (ring.material as THREE.MeshBasicMaterial).color.set('#53616c');
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.25;
      }
    });
  }, [placedObjects, selectedObjectId, highlightSlotIndex]);

  return (
    <div className="relative w-full h-full min-h-[380px] select-none overflow-hidden touch-none">
      <div ref={mountRef} className="w-full h-full cursor-pointer" />
      {hoveredObjectId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none px-3 py-1.5 rounded-full bg-paper/90 border border-ink/10 shadow-sm text-xs font-semibold text-ink backdrop-blur-md">
          {DISCOVERY_CATALOG.find((c) => c.id === hoveredObjectId)?.label || hoveredObjectId}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Procedural Low-Poly Tactile Object Geometries (Porcelain Style)
// -------------------------------------------------------------
function createMiniatureObjectMesh(
  type: string,
  primaryColor: string,
  secondaryColor: string
): THREE.Group {
  const group = new THREE.Group();

  switch (type) {
    case 'laptop': {
      // Base chassis
      const baseGeo = new THREE.BoxGeometry(0.38, 0.02, 0.26);
      const baseMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.4 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.castShadow = true;
      group.add(base);

      // Angled screen
      const screenGeo = new THREE.BoxGeometry(0.38, 0.24, 0.015);
      const screenMesh = new THREE.Mesh(screenGeo, baseMat);
      screenMesh.position.set(0, 0.11, -0.12);
      screenMesh.rotation.x = -0.32;
      screenMesh.castShadow = true;
      group.add(screenMesh);

      // Glowing display panel
      const displayGeo = new THREE.PlaneGeometry(0.34, 0.2);
      const displayMat = new THREE.MeshBasicMaterial({ color: '#bad3cf' });
      const display = new THREE.Mesh(displayGeo, displayMat);
      display.position.set(0, 0.11, -0.11);
      display.rotation.x = -0.32;
      group.add(display);
      break;
    }

    case 'controller': {
      // Controller body
      const bodyGeo = new THREE.BoxGeometry(0.28, 0.06, 0.18);
      const bodyMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.35 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      group.add(body);

      // Grip handles
      const gripGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.18, 16);
      const leftGrip = new THREE.Mesh(gripGeo, bodyMat);
      leftGrip.position.set(-0.13, -0.02, 0.05);
      leftGrip.rotation.x = Math.PI / 6;
      group.add(leftGrip);

      const rightGrip = leftGrip.clone();
      rightGrip.position.x = 0.13;
      group.add(rightGrip);

      // Thumbsticks
      const stickMat = new THREE.MeshStandardMaterial({ color: secondaryColor, roughness: 0.6 });
      const stickGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.04, 16);
      const stick1 = new THREE.Mesh(stickGeo, stickMat);
      stick1.position.set(-0.05, 0.04, 0.02);
      group.add(stick1);

      const stick2 = stick1.clone();
      stick2.position.x = 0.05;
      group.add(stick2);
      break;
    }

    case 'parcel': {
      // Cardboard box
      const boxGeo = new THREE.BoxGeometry(0.32, 0.22, 0.28);
      const boxMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.8 });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.castShadow = true;
      group.add(box);

      // Packing tape band
      const tapeGeo = new THREE.BoxGeometry(0.06, 0.224, 0.284);
      const tapeMat = new THREE.MeshStandardMaterial({ color: secondaryColor, roughness: 0.5 });
      const tape = new THREE.Mesh(tapeGeo, tapeMat);
      group.add(tape);
      break;
    }

    case 'screen': {
      // Thin stand
      const standGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.22, 16);
      const standMat = new THREE.MeshStandardMaterial({ color: '#53616c', roughness: 0.4 });
      const stand = new THREE.Mesh(standGeo, standMat);
      stand.position.set(0, 0.11, 0);
      group.add(stand);

      // Bezel frame
      const frameGeo = new THREE.BoxGeometry(0.48, 0.32, 0.02);
      const frameMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.3 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(0, 0.24, 0);
      frame.castShadow = true;
      group.add(frame);

      // Display panel with red accent
      const panelGeo = new THREE.PlaneGeometry(0.44, 0.28);
      const panelMat = new THREE.MeshBasicMaterial({ color: '#10151c' });
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(0, 0.24, 0.012);
      group.add(panel);

      const redAccent = new THREE.Mesh(
        new THREE.PlaneGeometry(0.08, 0.08),
        new THREE.MeshBasicMaterial({ color: secondaryColor })
      );
      redAccent.position.set(0, 0.24, 0.014);
      group.add(redAccent);
      break;
    }

    case 'chip': {
      // Circuit board card
      const pcbGeo = new THREE.BoxGeometry(0.26, 0.015, 0.26);
      const pcbMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.5 });
      const pcb = new THREE.Mesh(pcbGeo, pcbMat);
      pcb.castShadow = true;
      group.add(pcb);

      // Silicon die in center
      const dieGeo = new THREE.BoxGeometry(0.12, 0.025, 0.12);
      const dieMat = new THREE.MeshStandardMaterial({
        color: secondaryColor,
        metalness: 0.8,
        roughness: 0.2,
      });
      const die = new THREE.Mesh(dieGeo, dieMat);
      die.position.set(0, 0.01, 0);
      group.add(die);
      break;
    }

    case 'mug': {
      // Ceramic cup body
      const cupGeo = new THREE.CylinderGeometry(0.08, 0.065, 0.16, 24);
      const cupMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.2 });
      const cup = new THREE.Mesh(cupGeo, cupMat);
      cup.position.set(0, 0.08, 0);
      cup.castShadow = true;
      group.add(cup);

      // Curved handle
      const handleGeo = new THREE.TorusGeometry(0.045, 0.014, 12, 24, Math.PI);
      const handleMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.2 });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.set(0.08, 0.08, 0);
      handle.rotation.z = -Math.PI / 2;
      group.add(handle);

      // Dark coffee surface inside
      const coffeeGeo = new THREE.CircleGeometry(0.07, 24);
      coffeeGeo.rotateX(-Math.PI / 2);
      const coffeeMat = new THREE.MeshBasicMaterial({ color: secondaryColor });
      const coffee = new THREE.Mesh(coffeeGeo, coffeeMat);
      coffee.position.set(0, 0.15, 0);
      group.add(coffee);
      break;
    }

    default: {
      const defaultMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        new THREE.MeshStandardMaterial({ color: primaryColor })
      );
      group.add(defaultMesh);
    }
  }

  return group;
}

function addSelectionHalo(mesh: THREE.Group) {
  const haloGeo = new THREE.RingGeometry(0.24, 0.28, 32);
  haloGeo.rotateX(-Math.PI / 2);
  const haloMat = new THREE.MeshBasicMaterial({
    color: '#245cc5',
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.position.set(0, -0.02, 0);
  mesh.add(halo);
}
