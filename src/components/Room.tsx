import type { Room as RoomType, Clue } from '../types';

const ARROW_CHARS = /^[←→↑↓|—]/;

function ClueCompact({ text, scale, fill, className }: { text: string; scale: number; fill: string; className?: string }) {
  const match = text.match(ARROW_CHARS);
  if (match) {
    return (
      <text x={0} y={18 * scale} textAnchor="middle" fontSize={13 * scale}
        fontFamily="'Courier New', monospace" fill={fill} fontWeight="bold" className={className}>
        <tspan fontSize={22 * scale} strokeWidth={1.5 * scale} stroke={fill}>{match[0]}</tspan>
        {text.slice(match[0].length)}
      </text>
    );
  }
  return (
    <text x={0} y={18 * scale} textAnchor="middle" fontSize={13 * scale}
      fontFamily="'Courier New', monospace" fill={fill} fontWeight="bold" className={className}>
      {text}
    </text>
  );
}

interface RoomProps {
  room: RoomType;
  clue: Clue | null;
  isCurrent: boolean;
  isVisited: boolean;
  isVisible: boolean;
  isTreasure: boolean;
  isDragon: boolean;
  gameOver: boolean;
  onClick: () => void;
  canClick: boolean;
  scale: number;
}

export function Room({
  room,
  clue,
  isCurrent,
  isVisited,
  isVisible,
  isTreasure,
  isDragon,
  gameOver,
  onClick,
  canClick,
  scale,
}: RoomProps) {
  const size = 84 * scale;
  const pad = 8 * scale;
  const x = room.x * 100 * scale;
  const y = room.y * 100 * scale;
  const clipId = `room-clip-${room.id}`;

  let fillColor = '#2d2d44';
  let strokeColor = '#4a4a6a';
  let strokeWidth = 2;
  let opacity = 0.3;

  if (!isVisible) {
    opacity = 0;
  } else if (isCurrent) {
    fillColor = '#3d3d54';
    strokeColor = '#ffd700';
    strokeWidth = 3;
    opacity = 1;
  } else if (isVisited) {
    fillColor = '#2d2d44';
    strokeColor = '#6a6a8a';
    opacity = 0.7;
  } else {
    fillColor = '#252538';
    strokeColor = '#5a5a7a';
    opacity = 0.5;
  }

  if (isTreasure && (isVisited || isCurrent || gameOver)) {
    fillColor = '#3d3520';
    strokeColor = '#ffd700';
  }

  if (isDragon && (isVisited || isCurrent || gameOver)) {
    fillColor = '#3d2020';
    strokeColor = '#ff4444';
  }

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={canClick ? onClick : undefined}
      style={{ cursor: canClick ? 'pointer' : 'default' }}
      className={isCurrent ? 'current-room' : ''}
    >
      <rect
        x={-size / 2} y={-size / 2}
        width={size} height={size}
        rx={4} ry={4}
        fill={fillColor} stroke={strokeColor}
        strokeWidth={strokeWidth} opacity={opacity}
        style={{ transition: 'fill 0.5s ease-out' }}
      />

      <defs>
        <clipPath id={clipId}>
          <rect x={-size / 2 + pad} y={-size / 2 + pad}
            width={size - pad * 2} height={size - pad * 2} rx={2} ry={2} />
        </clipPath>
      </defs>

      {isTreasure && isCurrent && (
        <>
          <circle cx={0} cy={0} r={30} className="treasure-pulse" />
          <circle cx={0} cy={0} r={30} className="treasure-pulse-delayed" />
        </>
      )}

      {isDragon && isCurrent && (
        <>
          <circle cx={0} cy={0} r={30} className="dragon-pulse" />
          <circle cx={0} cy={0} r={30} className="dragon-pulse-delayed" />
        </>
      )}

      {isVisible && (
        <g clipPath={`url(#${clipId})`}>
          {isDragon && (isVisited || isCurrent || gameOver) ? (
            <text x={0} y={8} textAnchor="middle" fontSize={32 * scale} fill="#ff4444" className="torch-glow">
              🐉
            </text>
          ) : isTreasure && (isCurrent || gameOver) ? (
            <text x={0} y={8} textAnchor="middle" fontSize={32 * scale} fill="#ffd700" className="torch-glow">
              💎
            </text>
          ) : isCurrent && clue ? (
            <>
              <text x={0} y={-6 * scale} textAnchor="middle" fontSize={16 * scale} className="clue-reveal">
                {clue.icon}
              </text>
              <ClueCompact text={clue.compact} scale={scale} fill="#ffd700" className="clue-reveal" />
            </>
          ) : isVisited && clue ? (
            <>
              <text x={0} y={-6 * scale} textAnchor="middle" fontSize={16 * scale}>
                {clue.icon}
              </text>
              <ClueCompact text={clue.compact} scale={scale} fill="#9898b0" />
            </>
          ) : clue && gameOver ? (
            <>
              <text x={0} y={-6 * scale} textAnchor="middle" fontSize={16 * scale}>
                {clue.icon}
              </text>
              <ClueCompact text={clue.compact} scale={scale} fill="#9898b0" />
            </>
          ) : clue ? (
            <text x={0} y={6 * scale} textAnchor="middle" fontSize={22 * scale} opacity={0.6}>
              {clue.icon}
            </text>
          ) : (
            <text x={0} y={10 * scale} textAnchor="middle" fontSize={32 * scale}
              fontFamily="'Courier New', monospace" fontWeight="bold" fill="#505060">
              ?
            </text>
          )}

          {isCurrent && !isTreasure && !isDragon && (
            <text x={0} y={-22 * scale} textAnchor="middle" fontSize={10 * scale}
              fill="#ffd700" fontFamily="'Courier New', monospace">
              YOU
            </text>
          )}
        </g>
      )}

      {canClick && (
        <rect x={-size / 2} y={-size / 2} width={size} height={size}
          rx={4} ry={4} fill="transparent" stroke="#ffd700"
          strokeWidth={2} opacity={0} className="room-hover" />
      )}
    </g>
  );
}
