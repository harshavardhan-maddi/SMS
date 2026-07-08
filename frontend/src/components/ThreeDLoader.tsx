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
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.z = 5;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. Materials
    const brandMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x6366f1, // Brand Purple
      metalness: 0.8,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      flatShading: false,
    });

    const darkMetalMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1e1b4b, // Deep indigo
      metalness: 0.9,
      roughness: 0.2,
      clearcoat: 0.8,
    });

    const screenMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a, // Slate-900 look
      roughness: 0.1,
    });

    const emissiveGreen = new THREE.MeshBasicMaterial({ color: 0x10b981 }); // Active indicator green

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });

    // 5. Procedural 3D Asset Creators
    
    // -- MONITOR --
    const createMonitor = () => {
      const group = new THREE.Group();
      
      const screenGeo = new THREE.BoxGeometry(1.6, 1.0, 0.08);
      const screen = new THREE.Mesh(screenGeo, screenMaterial);
      const screenWire = new THREE.Mesh(screenGeo, glowMaterial);
      screen.add(screenWire);
      screen.position.y = 0.35;
      screen.userData = { finalY: 0.35, startY: 1.2, wire: screenWire };
      group.add(screen);

      const neckGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.4);
      const neck = new THREE.Mesh(neckGeo, darkMetalMaterial);
      const neckWire = new THREE.Mesh(neckGeo, glowMaterial);
      neck.add(neckWire);
      neck.position.y = -0.2;
      neck.userData = { finalY: -0.2, startY: -0.8, wire: neckWire };
      group.add(neck);

      const baseGeo = new THREE.BoxGeometry(0.7, 0.04, 0.5);
      const base = new THREE.Mesh(baseGeo, brandMaterial);
      const baseWire = new THREE.Mesh(baseGeo, glowMaterial);
      base.add(baseWire);
      base.position.y = -0.4;
      base.userData = { finalY: -0.4, startY: -1.3, wire: baseWire };
      group.add(base);

      return group;
    };

    // -- CPU --
    const createCPU = () => {
      const group = new THREE.Group();

      const bodyGeo = new THREE.BoxGeometry(0.7, 1.4, 1.3);
      const body = new THREE.Mesh(bodyGeo, darkMetalMaterial);
      const bodyWire = new THREE.Mesh(bodyGeo, glowMaterial);
      body.add(bodyWire);
      body.position.set(0, 0, 0);
      body.userData = { finalZ: 0, startZ: 0, wire: bodyWire };
      group.add(body);

      const panelGeo = new THREE.BoxGeometry(0.72, 1.38, 0.06);
      const panel = new THREE.Mesh(panelGeo, brandMaterial);
      const panelWire = new THREE.Mesh(panelGeo, glowMaterial);
      panel.add(panelWire);
      panel.position.set(0, 0, 0.66);
      panel.userData = { finalZ: 0.66, startZ: 1.3, wire: panelWire };
      group.add(panel);

      const btnGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.05);
      const btn = new THREE.Mesh(btnGeo, emissiveGreen);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, 0.45, 0.7);
      btn.userData = { finalZ: 0.7, startZ: 1.7 };
      group.add(btn);

      return group;
    };

    // -- KEYBOARD --
    const createKeyboard = () => {
      const group = new THREE.Group();

      const boardGeo = new THREE.BoxGeometry(1.6, 0.06, 0.6);
      const board = new THREE.Mesh(boardGeo, darkMetalMaterial);
      const boardWire = new THREE.Mesh(boardGeo, glowMaterial);
      board.add(boardWire);
      board.position.y = 0;
      board.userData = { finalY: 0, startY: 0, wire: boardWire };
      group.add(board);

      const leftGeo = new THREE.BoxGeometry(0.65, 0.04, 0.45);
      const leftKeys = new THREE.Mesh(leftGeo, brandMaterial);
      const leftKeysWire = new THREE.Mesh(leftGeo, glowMaterial);
      leftKeys.add(leftKeysWire);
      leftKeys.position.set(-0.35, 0.04, 0);
      leftKeys.userData = { finalY: 0.04, startY: 0.6, wire: leftKeysWire };
      group.add(leftKeys);

      const rightGeo = new THREE.BoxGeometry(0.65, 0.04, 0.45);
      const rightKeys = new THREE.Mesh(rightGeo, brandMaterial);
      const rightKeysWire = new THREE.Mesh(rightGeo, glowMaterial);
      rightKeys.add(rightKeysWire);
      rightKeys.position.set(0.35, 0.04, 0);
      rightKeys.userData = { finalY: 0.04, startY: 0.6, wire: rightKeysWire };
      group.add(rightKeys);

      return group;
    };

    // -- MOUSE --
    const createMouse = () => {
      const group = new THREE.Group();

      const bodyGeo = new THREE.SphereGeometry(0.35, 32, 16);
      const body = new THREE.Mesh(bodyGeo, darkMetalMaterial);
      const bodyWire = new THREE.Mesh(bodyGeo, glowMaterial);
      body.add(bodyWire);
      body.scale.set(1, 0.5, 1.4);
      body.position.set(0, 0, 0);
      body.userData = { finalY: 0, startY: 0, wire: bodyWire };
      group.add(body);

      const lBtnGeo = new THREE.BoxGeometry(0.12, 0.05, 0.35);
      const lBtn = new THREE.Mesh(lBtnGeo, brandMaterial);
      const lBtnWire = new THREE.Mesh(lBtnGeo, glowMaterial);
      lBtn.add(lBtnWire);
      lBtn.position.set(-0.1, 0.13, 0.25);
      lBtn.userData = { finalY: 0.13, finalZ: 0.25, startY: 0.55, startZ: 0.6, wire: lBtnWire };
      group.add(lBtn);

      const rBtnGeo = new THREE.BoxGeometry(0.12, 0.05, 0.35);
      const rBtn = new THREE.Mesh(rBtnGeo, brandMaterial);
      const rBtnWire = new THREE.Mesh(rBtnGeo, glowMaterial);
      rBtn.add(rBtnWire);
      rBtn.position.set(0.1, 0.13, 0.25);
      rBtn.userData = { finalY: 0.13, finalZ: 0.25, startY: 0.55, startZ: 0.6, wire: rBtnWire };
      group.add(rBtn);

      return group;
    };

    // -- POWER CABLE --
    const createPowerCable = () => {
      const group = new THREE.Group();

      // Tube representing curved cord
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.0, -0.4, 0),
        new THREE.Vector3(-0.4, 0.3, 0.2),
        new THREE.Vector3(0.4, -0.3, -0.2),
        new THREE.Vector3(1.0, 0.4, 0)
      ]);
      const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.06, 8, false);
      const tube = new THREE.Mesh(tubeGeo, darkMetalMaterial);
      const tubeWire = new THREE.Mesh(tubeGeo, glowMaterial);
      tube.add(tubeWire);
      tube.position.set(0, 0, 0);
      tube.userData = { finalY: 0, startY: 0, wire: tubeWire };
      group.add(tube);

      // Connectors at the ends
      const plug1Geo = new THREE.BoxGeometry(0.18, 0.18, 0.35);
      const plug1 = new THREE.Mesh(plug1Geo, brandMaterial);
      const plug1Wire = new THREE.Mesh(plug1Geo, glowMaterial);
      plug1.add(plug1Wire);
      plug1.position.set(-1.0, -0.4, 0);
      plug1.userData = { finalX: -1.0, finalY: -0.4, startX: -1.6, startY: -0.8, wire: plug1Wire };
      group.add(plug1);

      const plug2Geo = new THREE.BoxGeometry(0.18, 0.18, 0.35);
      const plug2 = new THREE.Mesh(plug2Geo, brandMaterial);
      const plug2Wire = new THREE.Mesh(plug2Geo, glowMaterial);
      plug2.add(plug2Wire);
      plug2.position.set(1.0, 0.4, 0);
      plug2.userData = { finalX: 1.0, finalY: 0.4, startX: 1.6, startY: 0.8, wire: plug2Wire };
      group.add(plug2);

      return group;
    };

    // Instantiate and store all repair groups
    const items = [
      createMonitor(),
      createCPU(),
      createKeyboard(),
      createMouse(),
      createPowerCable()
    ];

    // Hide all initially
    items.forEach(item => {
      item.scale.set(0, 0, 0);
      scene.add(item);
    });

    // 6. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 1.2);
    dirLight2.position.set(-5, -5, 5);
    scene.add(dirLight2);

    // 7. Animation Loop
    const startTime = Date.now();
    const durationPerItem = 2.5; // seconds per item

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = (Date.now() - startTime) / 1000;
      const index = Math.floor(elapsed / durationPerItem) % items.length;
      const progress = (elapsed % durationPerItem) / durationPerItem; // 0.0 to 1.0

      // Animate active item
      items.forEach((item, idx) => {
        if (idx === index) {
          // Phase 1: Entry scale & Assemble (t: 0.0 to 0.4)
          // Phase 2: Show solid assembled & rotate (t: 0.4 to 0.8)
          // Phase 3: Exit scale (t: 0.8 to 1.0)
          
          let scale = 1.0;
          if (progress < 0.15) {
            scale = progress / 0.15; // smooth scale-in
          } else if (progress > 0.85) {
            scale = (1.0 - progress) / 0.15; // smooth scale-out
          }
          item.scale.set(scale, scale, scale);

          // Animate sub-parts assembly
          const assemblyTime = Math.min(1.0, progress / 0.45); // finishes assembly at 45% of lifecycle
          const glowFade = Math.min(1.0, progress / 0.6); // wireframe glows down to 60% of lifecycle

          item.children.forEach(part => {
            // Check exploded layout configs
            if (part.userData.startY !== undefined) {
              if (part.userData.finalY !== undefined) {
                part.position.y = THREE.MathUtils.lerp(part.userData.startY, part.userData.finalY, assemblyTime);
              }
              if (part.userData.finalZ !== undefined) {
                part.position.z = THREE.MathUtils.lerp(part.userData.startZ, part.userData.finalZ, assemblyTime);
              }
              if (part.userData.finalX !== undefined) {
                part.position.x = THREE.MathUtils.lerp(part.userData.startX, part.userData.finalX, assemblyTime);
              }
            }

            // Fade wireframe overlay to reveal fully repaired physical material
            if (part.userData.wire) {
              const wireMesh = part.userData.wire as THREE.Mesh;
              const wireMat = wireMesh.material as THREE.Material;
              wireMat.opacity = Math.max(0, 0.8 * (1.0 - glowFade));
            }
          });

          // Gentle rotation during view
          item.rotation.x = Math.sin(progress * Math.PI) * 0.15 + 0.2;
          item.rotation.y = elapsed * 1.5;

        } else {
          // Instantly reset unselected components
          item.scale.set(0, 0, 0);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // 8. Handle Window Resize
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
      brandMaterial.dispose();
      darkMetalMaterial.dispose();
      screenMaterial.dispose();
      emissiveGreen.dispose();
      glowMaterial.dispose();
      items.forEach(item => {
        item.children.forEach(part => {
          const meshPart = part as THREE.Mesh;
          if (meshPart.geometry) meshPart.geometry.dispose();
          if (meshPart.children && meshPart.children[0]) {
            const wire = meshPart.children[0] as THREE.Mesh;
            if (wire.geometry) wire.geometry.dispose();
          }
        });
      });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/30 backdrop-blur-md">
        <div className="bg-white border border-slate-200/80 p-8 rounded-3xl shadow-premium max-w-sm w-full mx-4 flex flex-col items-center text-center">
          <div ref={containerRef} className="w-48 h-48 mb-2" />
          <h3 className="text-sm font-black text-slate-800 tracking-tight">{message}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 w-full h-[280px] relative">
      <div ref={containerRef} className="w-48 h-48" />
      <div className="text-center mt-1 z-10">
        <h4 className="text-xs font-black text-slate-700 tracking-tight">{message}</h4>
      </div>
    </div>
  );
};
