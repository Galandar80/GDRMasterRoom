"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { playUiDiceRoll } from "@/lib/sound-generator";
import * as THREE from "three";
import * as CANNON from "cannon-es";

type DiceTrayProps = {
  diceCount: number;
  diceSides: number;
  results: number[];
  reason: string;
  rollerName: string;
  onComplete: () => void;
  onClose: () => void;
};

interface Die3D {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  finalValue: number;
  isSettled: boolean;
  settleTimer: number;
}

export function DiceTray({
  diceCount,
  diceSides,
  results,
  reason,
  rollerName,
  onComplete,
  onClose
}: DiceTrayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDone, setIsDone] = useState(false);
  const [settledNumbers, setSettledNumbers] = useState<{ id: number; value: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get container dimensions
    const width = 500;
    const height = 300;
    canvas.width = width;
    canvas.height = height;

    // 1. THREE.JS SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#14532d"); // Dark felt green background fallback

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 11, 0); // Position directly above looking down
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.2); // Warm light
    dirLight.position.set(5, 12, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    const d = 8;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Floor Mesh (Green Felt)
    const floorGeo = new THREE.PlaneGeometry(24, 16);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x14532d,
      roughness: 0.8,
      metalness: 0.1
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Ornate watermark details in 3D floor
    const watermarkGeo = new THREE.RingGeometry(2.0, 2.05, 32);
    const watermarkMat = new THREE.MeshBasicMaterial({ color: 0xc8a35d, transparent: true, opacity: 0.12 });
    const watermark = new THREE.Mesh(watermarkGeo, watermarkMat);
    watermark.rotation.x = -Math.PI / 2;
    watermark.position.set(0, -1.99, 0);
    scene.add(watermark);

    // 2. CANNON.JS PHYSICS SETUP
    const world = new CANNON.World();
    world.gravity.set(0, -14, 0); // Snappy gravity

    // Physics Materials
    const groundMaterial = new CANNON.Material("ground");
    const wallMaterial = new CANNON.Material("wall");
    const diceMaterial = new CANNON.Material("dice");

    // Contact Materials
    world.addContactMaterial(new CANNON.ContactMaterial(groundMaterial, diceMaterial, { friction: 0.3, restitution: 0.35 }));
    world.addContactMaterial(new CANNON.ContactMaterial(wallMaterial, diceMaterial, { friction: 0.1, restitution: 0.4 }));
    world.addContactMaterial(new CANNON.ContactMaterial(diceMaterial, diceMaterial, { friction: 0.25, restitution: 0.3 }));

    // Floor Body
    const floorBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: groundMaterial });
    floorBody.position.set(0, -2, 0);
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(floorBody);

    // Boundaries Box Walls
    const wallThickness = 1;
    const trayWidth = 8.5;
    const trayHeight = 5.2;

    // Left wall
    const wallL = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(wallThickness, 5, trayHeight)), material: wallMaterial });
    wallL.position.set(-trayWidth - wallThickness, 0, 0);
    world.addBody(wallL);

    // Right wall
    const wallR = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(wallThickness, 5, trayHeight)), material: wallMaterial });
    wallR.position.set(trayWidth + wallThickness, 0, 0);
    world.addBody(wallR);

    // Back wall
    const wallB = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(trayWidth, 5, wallThickness)), material: wallMaterial });
    wallB.position.set(0, 0, -trayHeight - wallThickness);
    world.addBody(wallB);

    // Front wall
    const wallF = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(trayWidth, 5, wallThickness)), material: wallMaterial });
    wallF.position.set(0, 0, trayHeight + wallThickness);
    world.addBody(wallF);

    // 3. PROGRAMMATIC GEOMETRIES HELPERS
    function preparePolyhedronGeometry(geom: THREE.BufferGeometry) {
      const nonIndexed = geom.index ? geom.toNonIndexed() : geom;
      const posAttr = nonIndexed.getAttribute("position");
      const vertexCount = posAttr.count;
      const faceCount = vertexCount / 3;

      const uvs = new Float32Array(faceCount * 6);
      for (let i = 0; i < faceCount; i++) {
        uvs[i * 6 + 0] = 0.5;
        uvs[i * 6 + 1] = 1.0;
        uvs[i * 6 + 2] = 0.0;
        uvs[i * 6 + 3] = 0.0;
        uvs[i * 6 + 4] = 1.0;
        uvs[i * 6 + 5] = 0.0;

        nonIndexed.addGroup(i * 3, 3, i);
      }
      nonIndexed.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
      nonIndexed.computeVertexNormals();
      return nonIndexed;
    }

    function createPentagonalBipyramid(radius: number) {
      const geom = new THREE.BufferGeometry();
      const vertices: number[] = [];
      const h = radius * 1.15; 
      const r = radius * 0.95; 

      const eqPoints: [number, number, number][] = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5;
        eqPoints.push([r * Math.cos(angle), 0, r * Math.sin(angle)]);
      }

      for (let i = 0; i < 5; i++) {
        vertices.push(0, h, 0);
        vertices.push(...eqPoints[i]);
        vertices.push(...eqPoints[(i + 1) % 5]);
      }

      for (let i = 0; i < 5; i++) {
        vertices.push(0, -h, 0);
        vertices.push(...eqPoints[(i + 1) % 5]);
        vertices.push(...eqPoints[i]);
      }

      geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices), 3));
      return geom;
    }

    function createFaceCanvas(value: number, sides: number, bgColor: string, textColor: string) {
      const canvasFace = document.createElement("canvas");
      canvasFace.width = 128;
      canvasFace.height = 128;
      const ctx = canvasFace.getContext("2d");
      if (!ctx) return canvasFace;

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 128, 128);

      ctx.strokeStyle = "#c8a35d"; // Gold frame
      ctx.lineWidth = 6;

      if (sides === 6) {
        ctx.strokeRect(6, 6, 116, 116);
      } else {
        ctx.beginPath();
        ctx.moveTo(64, 8);
        ctx.lineTo(8, 120);
        ctx.lineTo(120, 120);
        ctx.closePath();
        ctx.stroke();
      }

      ctx.fillStyle = textColor;
      ctx.font = "bold 52px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const yOffset = sides === 6 ? 64 : 82;
      ctx.fillText(String(value), 64, yOffset);

      return canvasFace;
    }

    // 4. DICE STYLING SETUP
    let bodyColor = "#ef4444"; // default red
    let textColor = "#ffffff";
    if (diceSides === 20) {
      bodyColor = "#1e293b"; // Dark slate
      textColor = "#c8a35d"; // Gold numbers
    } else if (diceSides === 6) {
      bodyColor = "#c2410c"; // warm copper orange
    } else if (diceSides === 10 || diceSides === 100) {
      bodyColor = "#581c87"; // purple
      textColor = "#e9d5ff";
    } else if (diceSides === 4) {
      bodyColor = "#0f766e"; // teal
    } else if (diceSides === 8) {
      bodyColor = "#065f46"; // dark green
    }

    const diceList: Die3D[] = [];
    const size = 0.65; // Visual size

    // Initialize dice
    for (let i = 0; i < diceCount; i++) {
      const finalVal = results[i] || Math.floor(Math.random() * diceSides) + 1;

      // Visual Geometry
      let geometry: THREE.BufferGeometry;
      let faceCount = diceSides;

      if (diceSides === 6) {
        geometry = new THREE.BoxGeometry(size * 1.5, size * 1.5, size * 1.5);
        faceCount = 6;
      } else if (diceSides === 4) {
        geometry = preparePolyhedronGeometry(new THREE.TetrahedronGeometry(size * 1.3));
        faceCount = 4;
      } else if (diceSides === 8) {
        geometry = preparePolyhedronGeometry(new THREE.OctahedronGeometry(size * 1.25));
        faceCount = 8;
      } else if (diceSides === 10 || diceSides === 100) {
        geometry = preparePolyhedronGeometry(createPentagonalBipyramid(size * 1.25));
        faceCount = 10;
      } else if (diceSides === 12) {
        const baseGeom = new THREE.DodecahedronGeometry(size * 1.2);
        const nonIndexed = baseGeom.index ? baseGeom.toNonIndexed() : baseGeom;
        for (let g = 0; g < 12; g++) {
          nonIndexed.addGroup(g * 9, 9, g);
        }
        geometry = nonIndexed;
        faceCount = 12;
      } else {
        // Default D20
        geometry = preparePolyhedronGeometry(new THREE.IcosahedronGeometry(size * 1.2));
        faceCount = 20;
      }

      // Materials array
      const materials: THREE.MeshStandardMaterial[] = [];
      for (let m = 0; m < faceCount; m++) {
        // Each face gets its unique display number
        const displayValue = diceSides === 100 ? m * 10 : m + 1;
        const textureCanvas = createFaceCanvas(displayValue, diceSides, bodyColor, textColor);
        const texture = new THREE.CanvasTexture(textureCanvas);
        
        const mat = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.15,
          metalness: 0.2
        });
        mat.userData = { value: displayValue };
        materials.push(mat);
      }

      const mesh = new THREE.Mesh(geometry, materials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      // Physics body
      // We approximate all dice collisions with Box shape for extreme stability and settling
      const boxSize = size * 0.72;
      const diceShape = new CANNON.Box(new CANNON.Vec3(boxSize, boxSize, boxSize));
      
      const body = new CANNON.Body({
        mass: 1.2,
        shape: diceShape,
        material: diceMaterial
      });

      // Scatter start positions near top
      body.position.set(-2 + i * 1.2 + Math.random() * 0.5, 5.5 + Math.random() * 0.5, -1.5 + Math.random() * 3.0);
      
      // Inject strong initial velocity and spinning torque
      body.velocity.set(3 + Math.random() * 4, -4 - Math.random() * 3, 2 + Math.random() * 4);
      body.angularVelocity.set(-8 + Math.random() * 16, -8 + Math.random() * 16, -8 + Math.random() * 16);
      
      world.addBody(body);

      // Save references
      diceList.push({
        mesh,
        body,
        finalValue: finalVal,
        isSettled: false,
        settleTimer: 0
      });
    }

    // Sound triggers
    let lastSoundTime = 0;
    const playBounceSound = () => {
      const now = Date.now();
      if (now - lastSoundTime > 120) {
        playUiDiceRoll();
        lastSoundTime = now;
      }
    };

    // Listen for collisions to play bouncing sounds
    for (const d of diceList) {
      d.body.addEventListener("collide", (e: any) => {
        const relativeVelocity = e.contact.getImpactVelocityAlongNormal();
        if (Math.abs(relativeVelocity) > 1.8) {
          playBounceSound();
        }
      });
    }

    // Animation Loop
    let animationFrameId: number;
    let startTime = Date.now();
    const rollDuration = 1800; // minimum tumbling phase

    const animate = () => {
      world.fixedStep();
      const elapsed = Date.now() - startTime;
      const isSettlingPhase = elapsed > rollDuration;

      // Sync position/rotation from physics to meshes
      for (const d of diceList) {
        d.mesh.position.copy(d.body.position as any);
        d.mesh.quaternion.copy(d.body.quaternion as any);

        if (!d.isSettled) {
          // Check if velocity is very low to declare settled
          const vel = d.body.velocity;
          const ang = d.body.angularVelocity;
          const speed = Math.hypot(vel.x, vel.y, vel.z);
          const rotSpeed = Math.hypot(ang.x, ang.y, ang.z);

          if (isSettlingPhase && speed < 0.25 && rotSpeed < 0.25) {
            d.settleTimer += 16;
            if (d.settleTimer > 250) {
              d.isSettled = true;
              d.body.velocity.set(0, 0, 0);
              d.body.angularVelocity.set(0, 0, 0);

              // 5. ALIGN AND SWAP TEXTURE FOR TOP FACE
              let maxUp = -1;
              let topFaceIndex = 0;
              const geom = d.mesh.geometry;
              const positionAttr = geom.getAttribute("position");
              const normal = new THREE.Vector3();

              const groupCount = geom.groups.length;
              for (let g = 0; g < groupCount; g++) {
                const group = geom.groups[g];
                const startVertex = group.start;

                const vA = new THREE.Vector3().fromBufferAttribute(positionAttr, startVertex);
                const vB = new THREE.Vector3().fromBufferAttribute(positionAttr, startVertex + 1);
                const vC = new THREE.Vector3().fromBufferAttribute(positionAttr, startVertex + 2);

                normal.subVectors(vB, vA).cross(new THREE.Vector3().subVectors(vC, vA)).normalize();
                normal.applyQuaternion(d.mesh.quaternion);

                if (normal.y > maxUp) {
                  maxUp = normal.y;
                  topFaceIndex = g;
                }
              }

              // Swap top face material with the correct rolled value
              const matArray = d.mesh.material as THREE.MeshStandardMaterial[];
              let rolledMatIndex = -1;
              for (let m = 0; m < matArray.length; m++) {
                if (matArray[m].userData.value === d.finalValue) {
                  rolledMatIndex = m;
                  break;
                }
              }

              if (rolledMatIndex !== -1 && rolledMatIndex !== topFaceIndex) {
                const topMat = matArray[topFaceIndex];
                const rolledMat = matArray[rolledMatIndex];
                
                const tempMap = topMat.map;
                const tempVal = topMat.userData.value;

                topMat.map = rolledMat.map;
                topMat.userData.value = rolledMat.userData.value;

                rolledMat.map = tempMap;
                rolledMat.userData.value = tempVal;

                topMat.needsUpdate = true;
                rolledMat.needsUpdate = true;
              }
            }
          }
        }
      }

      renderer.render(scene, camera);

      // Check if all dice have settled to show the results
      const allSettled = diceList.every((d) => d.isSettled) || elapsed > 4500;
      if (allSettled) {
        setIsDone(true);
        // Expose settled values
        const currentSettled = diceList.map((d, index) => ({
          id: index,
          value: d.finalValue
        }));
        setSettledNumbers(currentSettled);
      } else {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      for (const d of diceList) {
        const mats = d.mesh.material as THREE.MeshStandardMaterial[];
        for (const mat of mats) {
          mat.map?.dispose();
          mat.dispose();
        }
        d.mesh.geometry.dispose();
      }
      floorGeo.dispose();
      floorMat.dispose();
      watermarkGeo.dispose();
      watermarkMat.dispose();
    };
  }, [diceCount, diceSides, results]);

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/70 p-4 animate-fade-in">
      <div 
        ref={containerRef}
        className="relative w-full max-w-[530px] rounded-xl border border-brass/40 glass-panel p-4 shadow-[0_15px_40px_rgba(0,0,0,0.8)] text-white"
      >

        <header className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brass">Vassoio Dadi 3D</p>
            <h3 className="font-serif text-sm text-stone-200">{rollerName} sta lanciando i dadi</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-stone-400 hover:text-white transition"
            aria-label="Chiudi vassoio dadi"
          >
            <X size={16} />
          </button>
        </header>

        {/* 3D wooden tray boundary container */}
        <div className="relative mt-4 overflow-hidden rounded-lg border-[10px] border-[#3e2723] bg-[#1b120c] shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)]">
          {/* Inner shadow overlay */}
          <div className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_2px_10px_rgba(0,0,0,0.9)]" />
          <canvas ref={canvasRef} className="block w-full h-[300px]" />
          
          {/* Glowing floating numbers on settled dadi */}
          {isDone && settledNumbers.length > 0 && (
            <div className="absolute inset-0 z-30 pointer-events-none flex flex-wrap items-center justify-center gap-3 bg-black/40 animate-fade-in">
              {settledNumbers.map((num) => (
                <div
                  key={num.id}
                  className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-brass bg-stone-950/90 text-brass shadow-[0_0_15px_rgba(200,163,93,0.6)] animate-[premium-rise_0.4s_ease_both]"
                >
                  <span className="font-serif text-xl font-bold">{num.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="mt-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-bold">Lancio richiesto per</span>
            <span className="block truncate text-xs text-stone-300 italic">
              {reason || "Test ordinario"}
            </span>
          </div>

          <button
            type="button"
            onClick={onComplete}
            disabled={!isDone}
            className={`rounded-lg px-4 py-2 font-serif text-xs font-bold uppercase tracking-wider text-stone-900 transition ${
              isDone
                ? "bg-gradient-to-r from-amber-400 to-amber-500 hover:scale-105 active:scale-100 shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer"
                : "bg-stone-700 text-stone-500 cursor-not-allowed opacity-50"
            }`}
          >
            {isDone ? "Mostra in Chat" : "Lancio in corso..."}
          </button>
        </footer>
        <span className="mysterium-corners-br" />
      </div>
    </div>
  );
}
