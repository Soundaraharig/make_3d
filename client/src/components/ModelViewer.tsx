"use client";

import { useRef, Suspense, useState, useEffect, Component, ReactNode } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import * as THREE from "three";

/* ─── Error Boundary for 3D Viewer ─── */
class ViewerErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/* ─── STL Model ─── */
function StlModel({ url }: { url: string }) {
  const geom = useLoader(STLLoader, url);
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  // Center geometry
  geom.computeBoundingBox();
  geom.center();

  // Normalize scale
  const bbox = geom.boundingBox!;
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 2 / maxDim;

  return (
    <mesh ref={meshRef} geometry={geom} scale={[scale, scale, scale]}>
      <meshStandardMaterial
        color="#a78bfa"
        metalness={0.4}
        roughness={0.3}
        emissive="#7c3aed"
        emissiveIntensity={0.1}
      />
    </mesh>
  );
}

/* ─── OBJ Model ─── */
function ObjModel({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  // Center and normalize
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scl = 2 / maxDim;

  obj.position.sub(center);
  obj.scale.set(scl, scl, scl);

  // Apply material to all meshes
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
        color: "#06b6d4",
        metalness: 0.4,
        roughness: 0.3,
        emissive: "#0891b2",
        emissiveIntensity: 0.1,
      });
    }
  });

  return <primitive ref={groupRef} object={obj} />;
}

/* ─── Placeholder Rotating Cube ─── */
function PlaceholderCube() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.4;
      ref.current.rotation.y += delta * 0.6;
    }
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1.2, 1.2, 1.2]} />
      <meshStandardMaterial
        color="#7c3aed"
        metalness={0.5}
        roughness={0.2}
        wireframe
        emissive="#a78bfa"
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}

/* ─── Loading Fallback ─── */
function LoadingFallback() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.5;
      ref.current.rotation.y += delta * 0.7;
    }
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.8, 1]} />
      <meshStandardMaterial
        color="#a78bfa"
        wireframe
        emissive="#7c3aed"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

/* ─── Static Fallback (no WebGL) ─── */
function StaticFallback() {
  return (
    <div className="viewer-container flex items-center justify-center">
      <div className="text-center">
        <svg
          className="mx-auto mb-3 text-foreground/20"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
        <p className="text-xs text-foreground/30">
          3D Preview will appear here
        </p>
      </div>
    </div>
  );
}

/* ─── Main Viewer Component ─── */
interface ModelViewerProps {
  modelUrl: string | null;
  modelType: "stl" | "obj" | null;
}

export default function ModelViewer({ modelUrl, modelType }: ModelViewerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <StaticFallback />;

  return (
    <ViewerErrorBoundary fallback={<StaticFallback />}>
      <div className="viewer-container">
        <Canvas
          camera={{ position: [3, 2, 3], fov: 45 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "default",
            failIfMajorPerformanceCaveat: false,
          }}
          onCreated={({ gl }) => {
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          }}
        >
          {/* Lighting — using simple lights instead of heavy Environment preset */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
          <directionalLight position={[-3, 3, -3]} intensity={0.3} />
          <pointLight position={[-5, 3, -5]} intensity={0.4} color="#06b6d4" />
          <pointLight position={[5, -2, 5]} intensity={0.3} color="#7c3aed" />
          <hemisphereLight
            color="#b4a7d6"
            groundColor="#1a1a2e"
            intensity={0.4}
          />

          {/* Ground shadows */}
          <ContactShadows
            position={[0, -1.5, 0]}
            opacity={0.4}
            scale={8}
            blur={2}
            color="#7c3aed"
          />

          {/* Model or Placeholder */}
          <Suspense fallback={<LoadingFallback />}>
            {modelUrl && modelType === "stl" ? (
              <StlModel url={modelUrl} />
            ) : modelUrl && modelType === "obj" ? (
              <ObjModel url={modelUrl} />
            ) : (
              <PlaceholderCube />
            )}
          </Suspense>

          {/* Controls */}
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            autoRotate={!modelUrl}
            autoRotateSpeed={1.5}
            maxPolarAngle={Math.PI / 1.5}
          />
        </Canvas>
      </div>
    </ViewerErrorBoundary>
  );
}
