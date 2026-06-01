import { useEffect, useRef } from 'react';

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

const CHARS = '01アイウカサシスタナハマヤラ∂ΩAF';

export default function CyberBackground({ color = '#00e5ff' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const FONT = 14;
    const cols = Math.floor(window.innerWidth / FONT);
    const drops = Array.from({ length: cols }, () => Math.random() * -200);
    const spds  = Array.from({ length: cols }, () => 0.06 + Math.random() * 0.08);

    const [r, g, b] = hexToRgb(color.startsWith('#') ? color : '#00e5ff');

    const draw = () => {
      ctx.fillStyle = 'rgba(3,1,10,0.025)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${FONT}px "Roboto Mono", monospace`;

      drops.forEach((y, i) => {
        const x = i * FONT, yPx = y * FONT;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, yPx);
        for (let t = 1; t <= 6; t++) {
          ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0,(1-t/6)*0.35)})`;
          ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, yPx - t * FONT);
        }
        drops[i] += spds[i];
        if (yPx > canvas.height && Math.random() > 0.97) drops[i] = Math.random() * -120;
      });

      animId = requestAnimationFrame(draw);
    };

    const tid = setTimeout(() => { animId = requestAnimationFrame(draw); }, 120);
    return () => { clearTimeout(tid); cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [color]);

  return (
    <>
      <canvas ref={canvasRef} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', opacity:0.01 }} />
      <div style={{ position:'fixed', inset:'-20px', zIndex:1, pointerEvents:'none',
        backgroundImage:`linear-gradient(${color}0e 1px,transparent 1px),linear-gradient(90deg,${color}0e 1px,transparent 1px)`,
        backgroundSize:'30px 30px' }} />
      <div style={{ position:'fixed', inset:0, zIndex:2, pointerEvents:'none',
        background:'radial-gradient(ellipse at 50% 50%, transparent 58%, rgba(5,2,14,0.7) 100%)' }} />
    </>
  );
}