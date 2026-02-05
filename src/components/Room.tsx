import type { Room as RoomType, Clue } from '../types';

interface RoomProps {
  room: RoomType;
  clue: Clue | null;
  isCurrent: boolean;
  isVisited: boolean;
  isVisible: boolean;
  isTreasure: boolean;
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

  if (isTreasure && (isVisited || isCurrent)) {
    fillColor = '#3d3520';
    strokeColor = '#ffd700';
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

      {isVisible && (
        <g clipPath={`url(#${clipId})`}>
          {isTreasure && isCurrent ? (
            <text x={0} y={8} textAnchor="middle" fontSize={32 * scale} fill="#ffd700" className="torch-glow">
              🏺
            </text>
          ) : isCurrent && clue ? (
            <>
              <text x={0} y={-2 * scale} textAnchor="middle" fontSize={16 * scale} className="clue-reveal">
                {clue.icon}
              </text>
              <text x={0} y={16 * scale} textAnchor="middle" fontSize={9 * scale}
                fontFamily="'Courier New', monospace" fill="#ffd700" className="clue-reveal">
                {clue.compact}
              </text>
            </>
          ) : isVisited && clue ? (
            <>
              <text x={0} y={-2 * scale} textAnchor="middle" fontSize={16 * scale}>
                {clue.icon}
              </text>
              <text x={0} y={16 * scale} textAnchor="middle" fontSize={9 * scale}
                fontFamily="'Courier New', monospace" fill="#707080">
                {clue.compact}
              </text>
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

          {isCurrent && !isTreasure && (
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
