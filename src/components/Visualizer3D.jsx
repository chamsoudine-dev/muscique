import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const SoundSphere = ({ analyser }) => {
  const mesh = useRef();
  
  useFrame(() => {
    if (analyser && mesh.current) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b) / data.length;
      const scale = 1 + (avg / 150);
      mesh.current.scale.set(scale, scale, scale);
      mesh.current.rotation.x += 0.01;
      mesh.current.rotation.y += 0.01;
    }
  });

  return (
    <Sphere ref={mesh} args={[1, 64, 64]}>
      <MeshDistortMaterial
        color="#ffd700"
        speed={2}
        distort={0.4}
        metalness={1}
        roughness={0}
      />
    </Sphere>
  );
};

export const Visualizer3D = ({ analyser }) => {
  return (
    <div id="canvas-container">
      <Canvas camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} color="#ff00ff" />
        <pointLight position={[-10, -10, -10]} color="#00e5ff" />
        <SoundSphere analyser={analyser} />
        <OrbitControls enableZoom={false} autoRotate />
      </Canvas>
    </div>
  );
};
