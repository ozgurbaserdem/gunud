import { useRef, useLayoutEffect } from 'react';

interface ViewBoxTarget {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export function useAnimatedViewBox(
  svgRef: React.RefObject<SVGSVGElement | null>,
  gRef: React.RefObject<SVGGElement | null>,
  { width, height, offsetX, offsetY }: ViewBoxTarget,
): void {
  const animState = useRef({ w: width, h: height, ox: offsetX, oy: offsetY });
  const frameRef = useRef<number>(0);

  useLayoutEffect(() => {
    const target = { w: width, h: height, ox: offsetX, oy: offsetY };
    const start = { ...animState.current };

    // Skip if values haven't changed
    if (
      Math.abs(start.w - target.w) < 0.01 &&
      Math.abs(start.h - target.h) < 0.01 &&
      Math.abs(start.ox - target.ox) < 0.01 &&
      Math.abs(start.oy - target.oy) < 0.01
    ) {
      return;
    }

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const startTime = performance.now();
    const duration = 400;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic

      const current = {
        w: start.w + (target.w - start.w) * eased,
        h: start.h + (target.h - start.h) * eased,
        ox: start.ox + (target.ox - start.ox) * eased,
        oy: start.oy + (target.oy - start.oy) * eased,
      };

      animState.current = current;
      const ar = current.w / current.h;

      if (svgRef.current) {
        svgRef.current.setAttribute('viewBox', `0 0 ${current.w} ${current.h}`);
        svgRef.current.style.aspectRatio = `${ar}`;
      }
      if (gRef.current) {
        gRef.current.setAttribute('transform', `translate(${current.ox}, ${current.oy})`);
      }

      if (t < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    // Set start values immediately (before paint) to prevent flash
    const ar = start.w / start.h;
    if (svgRef.current) {
      svgRef.current.setAttribute('viewBox', `0 0 ${start.w} ${start.h}`);
      svgRef.current.style.aspectRatio = `${ar}`;
    }
    if (gRef.current) {
      gRef.current.setAttribute('transform', `translate(${start.ox}, ${start.oy})`);
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [width, height, offsetX, offsetY, svgRef, gRef]);
}
