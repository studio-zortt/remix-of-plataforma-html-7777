import React, { useState, useEffect, useCallback } from 'react';

interface VSCinematicAnimationProps {
  size?: 'desktop' | 'mobile';
  className?: string;
  isTied?: boolean;
}

interface Bolt {
  id: number;
  mainPathPoints: number[][];
  branches: number[][][];
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const VSCinematicAnimation: React.FC<VSCinematicAnimationProps> = ({ 
  size = 'desktop',
  className = '',
  isTied = false
}) => {
  const [bolts, setBolts] = useState<Bolt[]>([]);
  const [thunderIntensity, setThunderIntensity] = useState(0.1);
  const [shake, setShake] = useState({ x: 0, y: 0 });

  // Dynamic colors based on isTied state
  const primaryColor = isTied ? '#F59E0B' : '#21C45D';
  const primaryRgb = isTied ? '245, 158, 11' : '33, 196, 93';
  const secondaryColor = isTied ? '#FDE68A' : '#a5f3c0';

  // Increased dimensions: desktop 240px, mobile 280px (increased for better visibility)
  const dimensions = size === 'desktop' ? 240 : 280;
  const viewBox = 400;
  const scale = dimensions / viewBox;

  // Thunder effect - randomly pulsing light
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const thunderLoop = () => {
      if (!mounted) return;
      
      const pattern = Math.random();
      
      if (pattern > 0.7) {
        setThunderIntensity(0.6 + Math.random() * 0.4);
        setTimeout(() => mounted && setThunderIntensity(0.2 + Math.random() * 0.2), 50);
        setTimeout(() => mounted && setThunderIntensity(0.5 + Math.random() * 0.3), 120);
        setTimeout(() => mounted && setThunderIntensity(0.1 + Math.random() * 0.15), 200);
        setTimeout(() => mounted && setThunderIntensity(0.3 + Math.random() * 0.2), 280);
        setTimeout(() => mounted && setThunderIntensity(0.05 + Math.random() * 0.1), 400);
      } else if (pattern > 0.4) {
        setThunderIntensity(0.3 + Math.random() * 0.3);
        setTimeout(() => mounted && setThunderIntensity(0.15 + Math.random() * 0.1), 80);
        setTimeout(() => mounted && setThunderIntensity(0.05 + Math.random() * 0.1), 200);
      } else {
        setThunderIntensity(0.15 + Math.random() * 0.2);
        setTimeout(() => mounted && setThunderIntensity(0.05 + Math.random() * 0.08), 150);
      }
      
      const nextThunder = 500 + Math.random() * 2000;
      timeoutId = setTimeout(thunderLoop, nextThunder);
    };

    thunderLoop();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Random shake effect
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    let shakeIntervalId: ReturnType<typeof setTimeout>;

    const shakeLoop = () => {
      if (!mounted) return;
      
      const shouldShake = Math.random() > 0.6;
      
      if (shouldShake) {
        const intensity = 2 + Math.random() * 6;
        const duration = 100 + Math.random() * 200;
        const shakeCount = 3 + Math.floor(Math.random() * 5);
        
        let currentShake = 0;
        shakeIntervalId = setInterval(() => {
          if (!mounted || currentShake >= shakeCount) {
            clearInterval(shakeIntervalId);
            if (mounted) setShake({ x: 0, y: 0 });
            return;
          }
          
          setShake({
            x: (Math.random() - 0.5) * intensity,
            y: (Math.random() - 0.5) * intensity
          });
          currentShake++;
        }, duration / shakeCount);
      }
      
      const nextShake = 800 + Math.random() * 3000;
      timeoutId = setTimeout(shakeLoop, nextShake);
    };

    shakeLoop();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      clearInterval(shakeIntervalId);
    };
  }, []);

  // Generate realistic lightning path
  const generateBoltPath = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    const points: number[][] = [[startX, startY]];
    const segments = 8 + Math.floor(Math.random() * 6);
    
    const dx = (endX - startX) / segments;
    const dy = (endY - startY) / segments;
    
    for (let i = 1; i < segments; i++) {
      const variance = 30 + Math.random() * 20;
      const angle = Math.random() * Math.PI * 2;
      
      const x = startX + dx * i + Math.cos(angle) * variance * (Math.random() - 0.5) * 2;
      const y = startY + dy * i + Math.sin(angle) * variance * (Math.random() - 0.5) * 2;
      
      points.push([x, y]);
    }
    
    points.push([endX, endY]);
    return points;
  }, []);

  // Generate lightning branches
  const generateBranches = useCallback((mainPath: number[][]) => {
    const branches: number[][][] = [];
    const numBranches = 2 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < numBranches; i++) {
      const startIndex = 1 + Math.floor(Math.random() * (mainPath.length - 2));
      const startPoint = mainPath[startIndex];
      
      const angle = Math.random() * Math.PI * 2;
      const length = 30 + Math.random() * 50;
      
      const branchPoints: number[][] = [startPoint];
      const segments = 2 + Math.floor(Math.random() * 3);
      
      for (let j = 1; j <= segments; j++) {
        const progress = j / segments;
        const variance = 15 * (1 - progress);
        branchPoints.push([
          startPoint[0] + Math.cos(angle) * length * progress + (Math.random() - 0.5) * variance,
          startPoint[1] + Math.sin(angle) * length * progress + (Math.random() - 0.5) * variance
        ]);
      }
      
      branches.push(branchPoints);
    }
    
    return branches;
  }, []);

  // Create a new bolt
  const createBolt = useCallback((): Bolt => {
    const side = Math.floor(Math.random() * 4);
    let startX: number, startY: number, endX: number, endY: number;
    
    const centerX = 200;
    const centerY = 200;
    const offset = 50 + Math.random() * 30;
    
    switch (side) {
      case 0:
        startX = 50 + Math.random() * 300;
        startY = 0;
        endX = centerX + (Math.random() - 0.5) * offset;
        endY = centerY + (Math.random() - 0.5) * offset;
        break;
      case 1:
        startX = 400;
        startY = 50 + Math.random() * 300;
        endX = centerX + (Math.random() - 0.5) * offset;
        endY = centerY + (Math.random() - 0.5) * offset;
        break;
      case 2:
        startX = 50 + Math.random() * 300;
        startY = 400;
        endX = centerX + (Math.random() - 0.5) * offset;
        endY = centerY + (Math.random() - 0.5) * offset;
        break;
      default:
        startX = 0;
        startY = 50 + Math.random() * 300;
        endX = centerX + (Math.random() - 0.5) * offset;
        endY = centerY + (Math.random() - 0.5) * offset;
    }

    const mainPathPoints = generateBoltPath(startX, startY, endX, endY);
    const branches = generateBranches(mainPathPoints);
    
    const uniqueId = Date.now() + Math.random();
    
    return {
      id: uniqueId,
      mainPathPoints,
      branches,
      startX,
      startY,
      endX,
      endY
    };
  }, [generateBoltPath, generateBranches]);

  // Lightning animation loop
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const spawnBolt = () => {
      if (!mounted) return;
      
      const newBolt = createBolt();
      setBolts(prev => [...prev, newBolt]);
      
      setTimeout(() => {
        if (mounted) setBolts(prev => prev.filter(b => b.id !== newBolt.id));
      }, 50 + Math.random() * 100);
      
      if (Math.random() > 0.6) {
        setTimeout(() => {
          if (!mounted) return;
          const secondBolt = createBolt();
          setBolts(prev => [...prev, secondBolt]);
          setTimeout(() => {
            if (mounted) setBolts(prev => prev.filter(b => b.id !== secondBolt.id));
          }, 50 + Math.random() * 80);
        }, 30 + Math.random() * 50);
      }
    };

    const scheduleNext = () => {
      const delay = 200 + Math.random() * 800;
      timeoutId = setTimeout(() => {
        if (!mounted) return;
        spawnBolt();
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [createBolt]);

  const createPathFromPoints = (points: number[][]) => {
    if (points.length < 2) return '';
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i][0]} ${points[i][1]}`;
    }
    return d;
  };

  return (
    <div 
      className={`relative ${className}`}
      style={{ 
        width: dimensions, 
        height: dimensions,
        pointerEvents: 'none',
      }}
    >
      {/* Background base - smooth fade without hard edges */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(${primaryRgb}, 0.3) 0%, rgba(${primaryRgb}, 0.2) 20%, rgba(${primaryRgb}, 0.08) 40%, rgba(${primaryRgb}, 0.02) 55%, transparent 70%)`,
        }}
      />

      {/* Thunder background effect - soft bloom, no hard ring */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(${primaryRgb}, ${thunderIntensity * 0.6}) 0%, rgba(${primaryRgb}, ${thunderIntensity * 0.3}) 25%, rgba(${primaryRgb}, ${thunderIntensity * 0.1}) 45%, transparent 65%)`,
          transition: 'background 0.05s ease-out'
        }}
      />

      {/* Flash layer - softer transition */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, ${thunderIntensity * 0.2}) 0%, rgba(255, 255, 255, ${thunderIntensity * 0.05}) 30%, transparent 50%)`,
          transition: 'background 0.03s ease-out'
        }}
      />

      {/* Main container with shake */}
      <div
        style={{
          transform: `translate(${shake.x * scale}px, ${shake.y * scale}px)`,
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
      >
        {/* Lightning SVG */}
        <svg 
          viewBox={`0 0 ${viewBox} ${viewBox}`}
          className="absolute inset-0 w-full h-full"
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <defs>
            <filter id={`vs-glow-main-${isTied ? 'tied' : 'normal'}`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feFlood floodColor={primaryColor} floodOpacity="0.8" />
              <feComposite in2="coloredBlur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id={`vs-glow-soft-${isTied ? 'tied' : 'normal'}`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feFlood floodColor={primaryColor} floodOpacity="0.6" />
              <feComposite in2="blur" operator="in" />
            </filter>

            {/* Static reusable filter for lightning bolts */}
            <filter id="vs-bolt-glow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="3" result="blur1" />
              <feGaussianBlur stdDeviation="6" result="blur2" />
              <feGaussianBlur stdDeviation="12" result="blur3" />
              <feMerge>
                <feMergeNode in="blur3" />
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer glow layers */}
          {bolts.map((bolt) => (
            <g key={`glow1-${bolt.id}`}>
              <path
                d={createPathFromPoints(bolt.mainPathPoints)}
                stroke={primaryColor}
                strokeWidth="20"
                fill="none"
                opacity="0.15"
              />
            </g>
          ))}

          {bolts.map((bolt) => (
            <g key={`glow2-${bolt.id}`}>
              <path
                d={createPathFromPoints(bolt.mainPathPoints)}
                stroke={primaryColor}
                strokeWidth="10"
                fill="none"
                opacity="0.3"
              />
            </g>
          ))}

          {bolts.map((bolt) => (
            <g key={`glow3-${bolt.id}`}>
              <path
                d={createPathFromPoints(bolt.mainPathPoints)}
                stroke={primaryColor}
                strokeWidth="5"
                fill="none"
                opacity="0.5"
              />
            </g>
          ))}

          {/* Main lightning bolts */}
          {bolts.map((bolt) => (
            <g key={`main-${bolt.id}`} filter="url(#vs-bolt-glow)">
              <path
                d={createPathFromPoints(bolt.mainPathPoints)}
                stroke={secondaryColor}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={createPathFromPoints(bolt.mainPathPoints)}
                stroke="#ffffff"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Branches */}
              {bolt.branches.map((branch, i) => (
                <g key={i}>
                  <path
                    d={createPathFromPoints(branch)}
                    stroke={primaryColor}
                    strokeWidth="2"
                    fill="none"
                    opacity="0.7"
                    strokeLinecap="round"
                  />
                  <path
                    d={createPathFromPoints(branch)}
                    stroke="#ffffff"
                    strokeWidth="0.8"
                    fill="none"
                    opacity="0.9"
                    strokeLinecap="round"
                  />
                </g>
              ))}
            </g>
          ))}
        </svg>

        {/* Shockwaves - soft glow waves instead of hard borders */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div 
            className="absolute w-28 h-28 rounded-full vs-shockwave"
            style={{ 
              animationDelay: '0s',
              background: `radial-gradient(circle, transparent 50%, rgba(${primaryRgb}, 0.15) 60%, transparent 70%)`,
              boxShadow: `0 0 20px rgba(${primaryRgb}, 0.2)`
            }}
          />
          <div 
            className="absolute w-28 h-28 rounded-full vs-shockwave"
            style={{ 
              animationDelay: '0.5s',
              background: `radial-gradient(circle, transparent 50%, rgba(${primaryRgb}, 0.1) 60%, transparent 70%)`,
              boxShadow: `0 0 15px rgba(${primaryRgb}, 0.15)`
            }}
          />
        </div>

        {/* Central energy circle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div 
            className="w-16 h-16 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(${primaryRgb}, ${0.4 + thunderIntensity * 0.4}) 0%, rgba(${primaryRgb}, ${0.1 + thunderIntensity * 0.2}) 50%, transparent 70%)`,
              boxShadow: `0 0 ${20 + thunderIntensity * 30}px rgba(${primaryRgb}, ${0.3 + thunderIntensity * 0.4})`
            }}
          />
          <div 
            className="absolute w-10 h-10 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(255, 255, 255, ${0.3 + thunderIntensity * 0.3}) 0%, transparent 60%)`
            }}
          />
          <div 
            className="absolute w-8 h-8 rounded-full bg-white/50"
            style={{
              filter: `blur(${2 + thunderIntensity * 2}px)`
            }}
          />
        </div>

        {/* Rotating ring */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div 
            className={`w-20 h-20 rounded-full border ${isTied ? 'border-warning-yellow/20' : 'border-primary/20'} vs-spin`}
            style={{
              borderTopColor: `rgba(${primaryRgb}, ${0.4 + thunderIntensity * 0.4})`
            }}
          />
        </div>

        {/* VS Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="tracking-tight"
            style={{
              fontSize: size === 'desktop' ? '60px' : '64px',
              fontWeight: 900,
              color: '#ffffff',
              textShadow: `
                0 0 ${10 + thunderIntensity * 25}px rgba(${primaryRgb}, ${0.8 + thunderIntensity * 0.2}),
                0 0 ${20 + thunderIntensity * 50}px rgba(${primaryRgb}, ${0.6 + thunderIntensity * 0.4}),
                0 0 ${40 + thunderIntensity * 80}px rgba(${primaryRgb}, ${0.4 + thunderIntensity * 0.3}),
                0 2px 4px rgba(0, 0, 0, 0.3)
              `,
              filter: `brightness(${1 + thunderIntensity * 0.4})`,
              WebkitTextStroke: `2px rgba(${primaryRgb}, 0.5)`
            }}
          >
            VS
          </span>
        </div>
      </div>

      <style>{`
        @keyframes vs-shockwave {
          0% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }

        @keyframes vs-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .vs-shockwave {
          animation: vs-shockwave 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .vs-spin {
          animation: vs-spin 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default VSCinematicAnimation;
