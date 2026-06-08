"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import * as THREE from "three";

// Suppress THREE.Clock deprecation warning from R3F internals (fixed in future R3F release)
if (typeof window !== "undefined") {
  const _warn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("THREE.Clock")) return;
    _warn(...args);
  };
}

function BreadLoaf({ position }: { position: [number, number, number] }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (mesh.current) {
      mesh.current.rotation.y += delta * 0.3;
      mesh.current.rotation.x += delta * 0.1;
    }
  });
  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1.2}>
      <mesh ref={mesh} position={position} castShadow>
        <boxGeometry args={[0.6, 0.4, 0.35]} />
        <meshStandardMaterial
          color="#8B4513"
          roughness={0.8}
          metalness={0.0}
          emissive="#3d1a06"
          emissiveIntensity={0.3}
        />
      </mesh>
    </Float>
  );
}

function Croissant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (mesh.current) {
      mesh.current.rotation.z += delta * 0.25;
    }
  });
  return (
    <Float speed={2} rotationIntensity={0.8} floatIntensity={1.5}>
      <mesh ref={mesh} position={position} scale={scale} castShadow>
        <torusGeometry args={[0.3, 0.12, 8, 20]} />
        <meshStandardMaterial
          color="#D2691E"
          roughness={0.7}
          metalness={0.05}
          emissive="#5c2800"
          emissiveIntensity={0.4}
        />
      </mesh>
    </Float>
  );
}

function BreadRoll({ position }: { position: [number, number, number] }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (mesh.current) {
      mesh.current.rotation.x += delta * 0.2;
      mesh.current.rotation.y += delta * 0.35;
    }
  });
  return (
    <Float speed={1.8} rotationIntensity={1} floatIntensity={1}>
      <mesh ref={mesh} position={position} castShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial
          color="#C68642"
          roughness={0.85}
          metalness={0.0}
          emissive="#4a2800"
          emissiveIntensity={0.35}
        />
      </mesh>
    </Float>
  );
}

function SteamParticles() {
  const count = 120;
  const meshRef = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 3;
      vel[i * 3] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 1] = Math.random() * 0.008 + 0.003;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
    }
    return { positions: pos, velocities: vel };
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const posAttr = meshRef.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      posAttr.array[i * 3] += velocities[i * 3];
      posAttr.array[i * 3 + 1] += velocities[i * 3 + 1];
      posAttr.array[i * 3 + 2] += velocities[i * 3 + 2];
      if ((posAttr.array as Float32Array)[i * 3 + 1] > 6) {
        (posAttr.array as Float32Array)[i * 3 + 1] = -5;
        (posAttr.array as Float32Array)[i * 3] = (Math.random() - 0.5) * 16;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#f59e0b"
        transparent
        opacity={0.35}
        sizeAttenuation
      />
    </points>
  );
}

function AmbientGlow() {
  return (
    <>
      <ambientLight intensity={0.15} color="#1a0a00" />
      <pointLight position={[5, 5, 2]} intensity={1.8} color="#f59e0b" distance={20} />
      <pointLight position={[-6, -3, 1]} intensity={1.2} color="#c2410c" distance={18} />
      <pointLight position={[0, -5, 3]} intensity={0.8} color="#78350f" distance={15} />
    </>
  );
}

function Scene() {
  return (
    <>
      <AmbientGlow />
      <Stars radius={80} depth={60} count={2000} factor={3} saturation={0} fade speed={0.5} />
      <SteamParticles />

      <BreadLoaf position={[-5, 2, -3]} />
      <BreadLoaf position={[4.5, -1.5, -4]} />
      <BreadLoaf position={[-2, -3, -2]} />

      <Croissant position={[3, 2.5, -2]} scale={1.3} />
      <Croissant position={[-4, -2, -3]} scale={0.9} />
      <Croissant position={[6, 0, -5]} scale={1.1} />
      <Croissant position={[-1, 3.5, -4]} scale={0.8} />

      <BreadRoll position={[1.5, -2.5, -2]} />
      <BreadRoll position={[-3.5, 1.5, -3]} />
      <BreadRoll position={[5, -3, -4]} />
      <BreadRoll position={[-6, 0.5, -5]} />
    </>
  );
}

export default function BakeryScene() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
