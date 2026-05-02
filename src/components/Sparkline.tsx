/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, memo } from 'react';

interface SparklineProps {
  data: number[];
  className?: string;
}

const Sparkline = memo(function Sparkline({ data, className }: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    if (data.length < 2) {
      ctx.clearRect(0, 0, W, H);
      return;
    }

    ctx.clearRect(0, 0, W, H);
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = (max - min) || 1;
    
    const xs = (i: number) => (i / (data.length - 1)) * W;
    const ys = (v: number) => H - 6 - ((v - min) / range) * (H - 12);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(124, 92, 252, 0.4)');
    grad.addColorStop(1, 'rgba(124, 92, 252, 0)');
    
    ctx.beginPath();
    data.forEach((v, i) => i === 0 ? ctx.moveTo(xs(i), ys(v)) : ctx.lineTo(xs(i), ys(v)));
    ctx.lineTo(xs(data.length - 1), H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    data.forEach((v, i) => i === 0 ? ctx.moveTo(xs(i), ys(v)) : ctx.lineTo(xs(i), ys(v)));
    ctx.strokeStyle = '#9B7FFF';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Last dot with glow
    const lx = xs(data.length - 1);
    const ly = ys(data[data.length - 1]);
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#C4ADFF';
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [data]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`w-full h-12 block ${className}`}
    />
  );
});

export default Sparkline;
