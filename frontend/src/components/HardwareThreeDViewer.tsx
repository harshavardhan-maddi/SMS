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
    let bladesGroup: THREE.Group | null = null;

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

    } else if (normalizedType.includes('FAN')) {
      // 3D Ceiling Fan Model
      const fanGroup = new THREE.Group();

      // Top Canopy Mount
      const canopyGeo = new THREE.ConeGeometry(0.18, 0.12, 16);
      const canopyMesh = new THREE.Mesh(canopyGeo, metallicGrey);
      canopyMesh.position.y = 0.55;
      fanGroup.add(canopyMesh);

      // Downrod (Vertical bar)
      const rodGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 16);
      const rodMesh = new THREE.Mesh(rodGeo, metallicGrey);
      rodMesh.position.y = 0.28;
      fanGroup.add(rodMesh);

      // Motor Hub Housing
      const motorGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.16, 24);
      const motorMesh = new THREE.Mesh(motorGeo, activeIndigo);
      motorMesh.position.y = 0.0;
      fanGroup.add(motorMesh);

      // Bottom Decorative Dome
      const domeGeo = new THREE.SphereGeometry(0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const domeMesh = new THREE.Mesh(domeGeo, metallicGrey);
      domeMesh.position.y = -0.08;
      domeMesh.rotation.x = Math.PI;
      fanGroup.add(domeMesh);

      // Aerodynamic Blades (3 blades at 120 degrees)
      bladesGroup = new THREE.Group();
      bladesGroup.position.y = 0.0;

      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        const bladeGeo = new THREE.BoxGeometry(0.85, 0.015, 0.16);
        const bladeMesh = new THREE.Mesh(bladeGeo, metallicGrey);
        bladeMesh.position.set(Math.cos(angle) * 0.48, 0, Math.sin(angle) * 0.48);
        bladeMesh.rotation.y = -angle;
        bladeMesh.rotation.z = 0.08; // Pitch angle
        bladesGroup.add(bladeMesh);

        // Blade attachment bracket
        const bracketGeo = new THREE.BoxGeometry(0.14, 0.03, 0.06);
        const bracketMesh = new THREE.Mesh(bracketGeo, activeIndigo);
        bracketMesh.position.set(Math.cos(angle) * 0.22, 0.01, Math.sin(angle) * 0.22);
        bracketMesh.rotation.y = -angle;
        bladesGroup.add(bracketMesh);
      }
      fanGroup.add(bladesGroup);
      modelGroup.add(fanGroup);

    } else if (normalizedType.includes('LIGHT') || normalizedType.includes('TUBE')) {
      // 3D Tube Light Fixture
      const lightGroup = new THREE.Group();

      // Slim Mounting Rail / Backplate
      const railGeo = new THREE.BoxGeometry(1.65, 0.06, 0.2);
      const railMesh = new THREE.Mesh(railGeo, metallicGrey);
      railMesh.position.set(0, 0.05, -0.06);
      lightGroup.add(railMesh);

      // Luminescent Glowing Tube Material
      const tubeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        emissive: 0x93c5fd,
        emissiveIntensity: 1.8,
        roughness: 0.1,
        metalness: 0.1,
        clearcoat: 1.0,
      });

      // Horizontal Glass Tube
      const tubeGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.46, 24);
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMaterial);
      tubeMesh.rotation.z = Math.PI / 2;
      tubeMesh.position.set(0, 0, 0);
      lightGroup.add(tubeMesh);

      // Left & Right Sockets / End Caps
      const capGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.08, 16);
      const leftCap = new THREE.Mesh(capGeo, activeIndigo);
      leftCap.rotation.z = Math.PI / 2;
      leftCap.position.set(-0.75, 0, 0);
      lightGroup.add(leftCap);

      const rightCap = new THREE.Mesh(capGeo, activeIndigo);
      rightCap.rotation.z = Math.PI / 2;
      rightCap.position.set(0.75, 0, 0);
      lightGroup.add(rightCap);

      // Soft glow point light
      const pointLight = new THREE.PointLight(0x60a5fa, 1.2, 2.5);
      pointLight.position.set(0, 0, 0.15);
      lightGroup.add(pointLight);

      modelGroup.add(lightGroup);

    } else if (
      normalizedType === 'AC' ||
      normalizedType.includes('AIR CONDITIONER') ||
      normalizedType.includes('AC UNIT') ||
      normalizedType.startsWith('AC')
    ) {
      // 3D Split AC Indoor Unit
      const acGroup = new THREE.Group();

      // Main AC Chassis
      const acChassisGeo = new THREE.BoxGeometry(1.6, 0.65, 0.42);
      const acChassisMesh = new THREE.Mesh(acChassisGeo, metallicGrey);
      acGroup.add(acChassisMesh);

      // Front Curved Panel Accent
      const frontPanelGeo = new THREE.BoxGeometry(1.58, 0.58, 0.06);
      const frontPanelMesh = new THREE.Mesh(frontPanelGeo, activeIndigo);
      frontPanelMesh.position.set(0, -0.02, 0.22);
      acGroup.add(frontPanelMesh);

      // Top Air Intake Louvers (Slats)
      for (let i = 0; i < 4; i++) {
        const slatGeo = new THREE.BoxGeometry(1.4, 0.015, 0.25);
        const slatMesh = new THREE.Mesh(slatGeo, screenMaterial);
        slatMesh.position.set(0, 0.33, -0.1 + i * 0.07);
        acGroup.add(slatMesh);
      }

      // Bottom Air Swing Louver / Discharge Flap
      const flapGeo = new THREE.BoxGeometry(1.45, 0.03, 0.15);
      const flapMesh = new THREE.Mesh(flapGeo, screenMaterial);
      flapMesh.position.set(0, -0.32, 0.16);
      flapMesh.rotation.x = 0.35;
      acGroup.add(flapMesh);

      // Digital LED Temperature Readout (Glowing cyan display)
      const ledDisplayMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const displayGeo = new THREE.BoxGeometry(0.16, 0.08, 0.02);
      const displayMesh = new THREE.Mesh(displayGeo, ledDisplayMat);
      displayMesh.position.set(0.55, 0.05, 0.26);
      acGroup.add(displayMesh);

      // Chrome Branding Line
      const stripGeo = new THREE.BoxGeometry(1.5, 0.015, 0.01);
      const stripMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
      const stripMesh = new THREE.Mesh(stripGeo, stripMat);
      stripMesh.position.set(0, -0.18, 0.26);
      acGroup.add(stripMesh);

      modelGroup.add(acGroup);

    } else if (normalizedType.includes('ELECTRICAL')) {
      // Electrical Box / Transformer / Fixture
      const electricalAmber = new THREE.MeshPhysicalMaterial({
        color: 0xf59e0b,
        metalness: 0.7,
        roughness: 0.2,
        clearcoat: 0.6,
      });
      const electricYellow = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

      // Main Electrical Box Body
      const boxGeo = new THREE.BoxGeometry(0.9, 1.1, 0.5);
      const boxMesh = new THREE.Mesh(boxGeo, electricalAmber);
      modelGroup.add(boxMesh);

      // Top Insulators (Bushings)
      for (let i = -1; i <= 1; i += 1) {
        const insGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.25, 12);
        const insMesh = new THREE.Mesh(insGeo, metallicGrey);
        insMesh.position.set(i * 0.25, 0.65, 0);
        modelGroup.add(insMesh);
      }

      // Front Warning / Electrical Flash Symbol Accent
      const flashGeo = new THREE.BoxGeometry(0.3, 0.4, 0.04);
      const flashMesh = new THREE.Mesh(flashGeo, electricYellow);
      flashMesh.position.set(0, 0.0, 0.27);
      modelGroup.add(flashMesh);
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

      // Dynamic blade rotation for Fan
      if (bladesGroup) {
        bladesGroup.rotation.y += 0.08;
      }

      // Rotate model
      modelGroup.rotation.y += 0.015;
      modelGroup.rotation.x = Math.sin(Date.now() * 0.001) * 0.08;

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
    <div ref={containerRef} className="w-full h-full flex items-center justify-center pointer-events-none" />
  );
};
