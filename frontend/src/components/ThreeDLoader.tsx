import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeDLoaderProps {
  message?: string;
  isFullScreen?: boolean;
}

export const ThreeDLoader: React.FC<ThreeDLoaderProps> = ({ 
  message = 'Synchronizing database and metrics...', 
  isFullScreen = false 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 200;
    const height = container.clientHeight || 200;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4.5;

    // 3. Renderer setup with antialiasing and transparency
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. Geometry: Beautiful Torus Knot representing dynamic buffering
    const geometry = new THREE.TorusKnotGeometry(0.8, 0.22, 120, 16, 2, 3);

    // 5. Premium Physical Material (Shiny metallic/glass look with brand colors)
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x6366f1, // Brand Purple
      metalness: 0.9,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      emissive: 0x221c5f, // Subtle deep blue emissive glow
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 6. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    directionalLight1.position.set(5, 5, 5);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x818cf8, 1.2);
    directionalLight2.position.set(-5, -5, 5);
    scene.add(directionalLight2);

    // 7. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Rotate torus knot dynamically
      mesh.rotation.x += 0.015;
      mesh.rotation.y += 0.02;
      mesh.rotation.z += 0.005;

      renderer.render(scene, camera);
    };
    animate();

    // 8. Handle Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 9. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md">
        <div className="bg-white border border-slate-200/80 p-8 rounded-3xl shadow-premium max-w-sm w-full mx-4 flex flex-col items-center text-center">
          <div ref={containerRef} className="w-48 h-48 mb-4 animate-pulse-subtle" />
          <h3 className="text-base font-extrabold text-slate-800 tracking-tight">{message}</h3>
          <p className="text-[10px] text-brand-purple font-black uppercase tracking-wider mt-2 animate-pulse">
            Rendering 3D System Registry...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 w-full h-[300px] relative">
      <div ref={containerRef} className="w-48 h-48 animate-pulse-subtle" />
      <div className="text-center space-y-1 mt-1 z-10">
        <h4 className="text-xs font-black text-slate-700 tracking-tight">{message}</h4>
        <p className="text-[10px] text-brand-purple font-extrabold uppercase tracking-wider animate-pulse">
          Rendering 3D System Registry...
        </p>
      </div>
    </div>
  );
};
