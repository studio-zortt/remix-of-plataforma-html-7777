interface MiniPitchProps {
  variant: "quadra" | "society" | "campo" | "custom";
  selected?: boolean;
}

const formations: Record<string, [number, number][]> = {
  quadra: [
    [0.45, 0.3], [0.45, 0.7],
    [0.78, 0.3], [0.78, 0.7],
  ],
  society: [
    [0.4, 0.25], [0.4, 0.75],
    [0.6, 0.5],
    [0.78, 0.2], [0.78, 0.5], [0.78, 0.8],
  ],
  campo: [
    [0.32, 0.2], [0.32, 0.5], [0.32, 0.8],
    [0.5, 0.25], [0.5, 0.5], [0.5, 0.75],
    [0.7, 0.2], [0.7, 0.5], [0.7, 0.8],
    [0.86, 0.5],
  ],
};

export const MiniPitch = ({ variant, selected }: MiniPitchProps) => {
  const W = 200;
  const H = 110;
  const stroke = selected ? "hsl(142 71% 45% / 0.9)" : "hsl(142 30% 55% / 0.55)";
  const pitch = selected ? "hsl(142 55% 22%)" : "hsl(142 25% 16%)";
  const dotFill = "hsl(220 25% 10%)";
  const dotStroke = selected ? "hsl(142 71% 50%)" : "hsl(214 15% 70%)";
  const numColor = "hsl(0 0% 100%)";

  const positions = variant === "custom" ? [] : formations[variant];
  const gk: [number, number] = [0.08, 0.5];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* Pitch */}
      <rect x="2" y="2" width={W - 4} height={H - 4} rx="10" fill={pitch} stroke={stroke} strokeWidth="1.5" />
      {/* Center line */}
      <line x1={W / 2} y1="4" x2={W / 2} y2={H - 4} stroke={stroke} strokeWidth="1" />
      {/* Center circle */}
      <circle cx={W / 2} cy={H / 2} r="11" fill="none" stroke={stroke} strokeWidth="1" />
      {/* Left goal area */}
      <rect x="2" y={H / 2 - 22} width="18" height="44" fill="none" stroke={stroke} strokeWidth="1" />
      {/* Right goal area */}
      <rect x={W - 20} y={H / 2 - 22} width="18" height="44" fill="none" stroke={stroke} strokeWidth="1" />

      {variant === "custom" ? (
        <text
          x={W / 2}
          y={H / 2 + 22}
          textAnchor="middle"
          fontSize="64"
          fontWeight="800"
          fill={selected ? "hsl(142 71% 60%)" : "hsl(214 15% 80%)"}
          fontFamily="DM Sans, sans-serif"
        >
          ?
        </text>
      ) : (
        <>
          {/* Goalkeeper */}
          <g>
            <circle cx={gk[0] * W} cy={gk[1] * H} r="7.5" fill={dotFill} stroke={dotStroke} strokeWidth="1.2" />
            <text
              x={gk[0] * W}
              y={gk[1] * H + 3}
              textAnchor="middle"
              fontSize="8"
              fontWeight="700"
              fill={numColor}
              fontFamily="DM Sans, sans-serif"
            >
              1
            </text>
          </g>
          {/* Line players */}
          {positions.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x * W} cy={y * H} r="7.5" fill={dotFill} stroke={dotStroke} strokeWidth="1.2" />
              <text
                x={x * W}
                y={y * H + 3}
                textAnchor="middle"
                fontSize="8"
                fontWeight="700"
                fill={numColor}
                fontFamily="DM Sans, sans-serif"
              >
                {i + 2}
              </text>
            </g>
          ))}
        </>
      )}
    </svg>
  );
};
