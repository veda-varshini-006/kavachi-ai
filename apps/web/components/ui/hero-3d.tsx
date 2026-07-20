"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function AbstractShape() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.1;
      meshRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={1.5} floatIntensity={2}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[3, 1]} />
        <meshStandardMaterial 
          color="#D4AF37" // Elegant gold
          wireframe={true}
          transparent
          opacity={0.3}
          emissive="#D4AF37"
          emissiveIntensity={0.8}
        />
      </mesh>
    </Float>
  );
}

export function Hero3D() {
  return (
    <div className="absolute inset-0 z-0 w-full h-full pointer-events-none mix-blend-screen">
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
        <fog attach="fog" args={['#000000', 5, 15]} />
        <ambientLight intensity={0.1} />
        <pointLight position={[5, 5, 5]} intensity={2} color="#D4AF37" />
        <AbstractShape />
      </Canvas>
      {/* Dark overlay to ensure text remains readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/90 pointer-events-none" />
    </div>
  );
}
