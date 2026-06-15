'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type DottedSurfaceProps = React.ComponentProps<'div'>;

export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const SEPARATION = 150;
    const AMOUNTX = 40;
    const AMOUNTY = 60;

    let count = 0;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.001);

    const { width, height } = containerRef.current.getBoundingClientRect();

    const camera = new THREE.PerspectiveCamera(55, (width || window.innerWidth) / (height || window.innerHeight), 1, 10000);
    camera.position.set(0, 200, 800);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width || window.innerWidth, height || window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    containerRef.current.appendChild(renderer.domElement);

    const positions: number[] = [];
    const colors: number[] = [];

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
        const y = 0;
        const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

        positions.push(x, y, z);

        // Always light dots on dark background
        const color = new THREE.Color(0xb4b4b4);
        colors.push(color.r, color.g, color.b);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 8,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    let animationId: number;

    function animate() {
      animationId = requestAnimationFrame(animate);

      const positionAttribute = geometry.attributes.position as THREE.BufferAttribute;
      const positionsArray = positionAttribute.array as Float32Array;

      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          const index = i * 3;
          positionsArray[index + 1] =
            Math.sin((ix + count) * 0.3) * 50 + Math.sin((iy + count) * 0.5) * 50;
          i++;
        }
      }

      positionAttribute.needsUpdate = true;

      renderer.render(scene, camera);
      count += 0.1;
    }

    animate();

    function onWindowResize() {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height);
    }

    window.addEventListener('resize', onWindowResize);

    return () => {
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(animationId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className={`h-full w-full${className ? ` ${className}` : ''}`} {...props} />;
}
