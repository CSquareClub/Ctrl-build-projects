import React, { useEffect, useRef } from 'react';
import './CursorGlow.css';

const CursorGlow = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const trailElements = Array.from(containerRef.current.children);
    
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let isHovering = false;

    const trails = trailElements.map(() => ({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      scale: 1,
    }));

    let animationFrameId;

    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    // Detect interactions with elements such as Buttons, Cards, Inputs, Tables
    const handleMouseOver = (e) => {
      if (e.target.closest('button, a, input, .glass-panel, .stat-card, .table-row, .drop-zone')) {
        isHovering = true;
        if (containerRef.current) containerRef.current.classList.add('glow-hover-active');
      }
    };

    const handleMouseOut = (e) => {
      if (e.target.closest('button, a, input, .glass-panel, .stat-card, .table-row, .drop-zone')) {
        isHovering = false;
        if (containerRef.current) containerRef.current.classList.remove('glow-hover-active');
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    const animate = () => {
      trails.forEach((trail, i) => {
        const targetX = i === 0 ? mouseX : trails[i - 1].x;
        const targetY = i === 0 ? mouseY : trails[i - 1].y;

        const dx = targetX - trail.x;
        const dy = targetY - trail.y;

        const speed = [0.25, 0.15, 0.08, 0.04][i] || 0.1;
        
        trail.x += dx * speed;
        trail.y += dy * speed;

        if (i === 0) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Enhanced dynamic velocity scale
          let targetScale = 1 + Math.min(dist * 0.015, 1.2);
          
          if (isHovering) {
            targetScale *= 1.35;
          }
          
          trail.scale += (targetScale - trail.scale) * 0.15;
          
          // CPU/GPU Overhead fix: Removed dynamic global variable broadcasting (--mouse-x, --glow-hue)
          // Doing this inside requestAnimationFrame was forcing 100vw global gradient DOM repaints
        } else {
          trail.scale += (trails[0].scale - trail.scale) * 0.1;
        }

        trailElements[i].style.transform = `translate3d(${trail.x}px, ${trail.y}px, 0) translate(-50%, -50%) scale(${trail.scale})`;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="cursor-glow-container pointer-events-none">
      <div className="cursor-layer base"></div>
      <div className="cursor-layer trail-1"></div>
    </div>
  );
};

export default CursorGlow;
