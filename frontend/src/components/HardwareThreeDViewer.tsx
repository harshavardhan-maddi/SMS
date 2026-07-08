import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface HardwareThreeDViewerProps {
  type: string;
}

export const HardwareThreeDViewer: React.FC<HardwareThreeDViewerProps> = ({ type }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 160;
    const height = container.clientHeight || 160;

    // 1. Scene & Camera setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 10);
    camera.position.set(0, 1.2, 3.2);
    camera.lookAt(0, 0, 0);

    // 2. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(3, 4, 3);
    scene.add(dirLight);

    const blueLight = new THREE.DirectionalLight(0x6366f1, 1.2);
    blueLight.position.set(-3, -2, 2);
    scene.add(blueLight);

    // 4. Materials
    const metallicGrey = new THREE.MeshPhysicalMaterial({
      color: 0x334155, // slate-700
      metalness: 0.85,
      roughness: 0.2,
      clearcoat: 0.8,
    });

    const activeIndigo = new THREE.MeshPhysicalMaterial({
      color: 0x6366f1, // indigo-500
      metalness: 0.6,
      roughness: 0.2,
      clearcoat: 0.5,
    });

    const screenMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x020617, // slate-950
      roughness: 0.05,
      metalness: 0.9,
    });

    const ledGreen = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const wireframeGlow = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });

    // 5. Model building based on type
    const modelGroup = new THREE.Group();

    const normalizedType = type.trim().toUpperCase();

    if (normalizedType === 'MONITOR') {
      // Monitor body & screen
      const screenGeo = new THREE.BoxGeometry(1.4, 0.9, 0.06);
      const screenMesh = new THREE.Mesh(screenGeo, screenMaterial);
      screenMesh.position.y = 0.2;
      modelGroup.add(screenMesh);

      const frameGeo = new THREE.BoxGeometry(1.46, 0.96, 0.08);
      const frameMesh = new THREE.Mesh(frameGeo, metallicGrey);
      frameMesh.position.y = 0.2;
      modelGroup.add(frameMesh);

      const standGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4);
      const standMesh = new THREE.Mesh(standGeo, metallicGrey);
      standMesh.position.y = -0.35;
      modelGroup.add(standMesh);

      const baseGeo = new THREE.BoxGeometry(0.6, 0.03, 0.45);
      const baseMesh = new THREE.Mesh(baseGeo, activeIndigo);
      baseMesh.position.y = -0.55;
      modelGroup.add(baseMesh);

    } else if (normalizedType === 'CPU') {
      // CPU Chassis
      const caseGeo = new THREE.BoxGeometry(0.6, 1.2, 1.2);
      const caseMesh = new THREE.Mesh(caseGeo, metallicGrey);
      modelGroup.add(caseMesh);

      const panelGeo = new THREE.BoxGeometry(0.62, 1.16, 0.04);
      const panelMesh = new THREE.Mesh(panelGeo, activeIndigo);
      panelMesh.position.z = 0.6;
      modelGroup.add(panelMesh);

      // Glowing power button
      const btnGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.04);
      const btnMesh = new THREE.Mesh(btnGeo, ledGreen);
      btnMesh.rotation.x = Math.PI / 2;
      btnMesh.position.set(0, 0.35, 0.63);
      modelGroup.add(btnMesh);

    } else if (normalizedType === 'KEYBOARD') {
      // Keyboard base
      const boardGeo = new THREE.BoxGeometry(1.5, 0.06, 0.6);
      const boardMesh = new THREE.Mesh(boardGeo, metallicGrey);
      modelGroup.add(boardMesh);

      // Keyboard key segments
      const keySegmentGeo = new THREE.BoxGeometry(0.65, 0.04, 0.45);
      const leftKeys = new THREE.Mesh(keySegmentGeo, activeIndigo);
      leftKeys.position.set(-0.35, 0.04, 0);
      modelGroup.add(leftKeys);

      const rightKeys = new THREE.Mesh(keySegmentGeo, activeIndigo);
      rightKeys.position.set(0.35, 0.04, 0);
      modelGroup.add(rightKeys);

    } else if (normalizedType === 'MOUSE') {
      // Mouse Body
      const mouseGeo = new THREE.SphereGeometry(0.35, 32, 16);
      const mouseMesh = new THREE.Mesh(mouseGeo, metallicGrey);
      mouseMesh.scale.set(1.0, 0.45, 1.35);
      modelGroup.add(mouseMesh);

      // Buttons
      const clickGeo = new THREE.BoxGeometry(0.12, 0.04, 0.35);
      const lClick = new THREE.Mesh(clickGeo, activeIndigo);
      lClick.position.set(-0.1, 0.12, 0.25);
      modelGroup.add(lClick);

      const rClick = new THREE.Mesh(clickGeo, activeIndigo);
      rClick.position.set(0.1, 0.12, 0.25);
      modelGroup.add(rClick);

    } else if (normalizedType === 'HOTSPOT') {
      // Hotspot / Router base
      const routerGeo = new THREE.BoxGeometry(1.0, 0.15, 0.7);
      const routerMesh = new THREE.Mesh(routerGeo, metallicGrey);
      modelGroup.add(routerMesh);

      // Glowing LED lights
      for (let i = 0; i < 4; i++) {
        const ledGeo = new THREE.SphereGeometry(0.02, 8, 8);
        const ledMesh = new THREE.Mesh(ledGeo, ledGreen);
        ledMesh.position.set(-0.3 + i * 0.2, 0.08, 0.36);
        modelGroup.add(ledMesh);
      }

      // Antenna
      const antGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6);
      const ant1 = new THREE.Mesh(antGeo, activeIndigo);
      ant1.position.set(-0.38, 0.3, -0.32);
      modelGroup.add(ant1);

      const ant2 = new THREE.Mesh(antGeo, activeIndigo);
      ant2.position.set(0.38, 0.3, -0.32);
      modelGroup.add(ant2);

    } else {
      // Default / Others: Crate box representing generic inventory item
      const boxGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
      const boxMesh = new THREE.Mesh(boxGeo, activeIndigo);
      modelGroup.add(boxMesh);

      const wireMesh = new THREE.Mesh(boxGeo, wireframeGlow);
      wireMesh.scale.set(1.05, 1.05, 1.05);
      modelGroup.add(wireMesh);
    }

    scene.add(modelGroup);

    // 6. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Rotate model
      modelGroup.rotation.y += 0.015;
      modelGroup.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;

      renderer.render(scene, camera);
    };
    animate();

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      metallicGrey.dispose();
      activeIndigo.dispose();
      screenMaterial.dispose();
      ledGreen.dispose();
      wireframeGlow.dispose();
      
      modelGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
      });

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [type]);

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-slate-50/50 border border-slate-200/60 rounded-2xl w-full h-[190px] relative overflow-hidden">
      <div ref={containerRef} className="w-[170px] h-[170px]" />
      <div className="absolute bottom-2 text-center">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-200/50 px-2.5 py-0.5 rounded-full">
          Preview: {type}
        </span>
      </div>
    </div>
  );
};
