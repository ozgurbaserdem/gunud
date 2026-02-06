import { useMemo, useRef } from 'react';
import type { GameState } from '../../types';
import { Room } from './Room';
import { Door } from './Door';
import { useAnimatedViewBox } from '../../hooks/useAnimatedViewBox';

interface DungeonMapProps {
  gameState: GameState;
  onMoveToRoom: (roomId: number) => void;
  canMoveTo: (roomId: number) => boolean;
  isRoomVisible: (roomId: number) => boolean;
}

export function DungeonMap({
  gameState,
  onMoveToRoom,
  canMoveTo,
  isRoomVisible,
}: DungeonMapProps) {
  const { dungeon, currentRoomId, visitedRoomIds, clues, hasWon, hasLost } = gameState;
  const gameOver = hasWon || hasLost;

  // Full dungeon bounds (used for game over)
  const fullBounds = useMemo(() => {
    const xs = dungeon.rooms.map((r) => r.x);
    const ys = dungeon.rooms.map((r) => r.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [dungeon.rooms]);

  // Visible-only bounds (used during active gameplay)
  const visibleBounds = useMemo(() => {
    const visibleRooms = dungeon.rooms.filter((r) => isRoomVisible(r.id));
    if (visibleRooms.length === 0) return fullBounds;
    const xs = visibleRooms.map((r) => r.x);
    const ys = visibleRooms.map((r) => r.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [dungeon.rooms, isRoomVisible, fullBounds]);

  const bounds = gameOver ? fullBounds : visibleBounds;

  const scale = 1;
  const padding = 50;
  const gridW = bounds.maxX - bounds.minX + 1;
  const gridH = bounds.maxY - bounds.minY + 1;
  const width = gridW * 100 * scale + padding * 2;
  const height = gridH * 100 * scale + padding * 2;

  const offsetX = -bounds.minX * 100 * scale + padding;
  const offsetY = -bounds.minY * 100 * scale + padding;

  // Generate unique door connections (avoid duplicates)
  const doors = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ room1Id: number; room2Id: number }> = [];

    for (const room of dungeon.rooms) {
      for (const connectedId of room.connections) {
        const key = [Math.min(room.id, connectedId), Math.max(room.id, connectedId)].join('-');
        if (!seen.has(key)) {
          seen.add(key);
          result.push({ room1Id: room.id, room2Id: connectedId });
        }
      }
    }

    return result;
  }, [dungeon.rooms]);

  const aspectRatio = width / height;

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  useAnimatedViewBox(svgRef, gRef, { width, height, offsetX, offsetY });

  return (
    <div className="w-full flex justify-center">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[600px]"
        style={{ aspectRatio, maxHeight: '70vh' }}
      >
        <g ref={gRef} transform={`translate(${offsetX}, ${offsetY})`}>
          {doors.map(({ room1Id, room2Id }) => {
            const room1 = dungeon.rooms.find((r) => r.id === room1Id)!;
            const room2 = dungeon.rooms.find((r) => r.id === room2Id)!;
            const bothVisited = visitedRoomIds.has(room1Id) && visitedRoomIds.has(room2Id);
            const oneIsCurrent = room1Id === currentRoomId || room2Id === currentRoomId;
            const isVisible = gameOver || bothVisited || oneIsCurrent;
            const canTraverse =
              (currentRoomId === room1Id && canMoveTo(room2Id)) ||
              (currentRoomId === room2Id && canMoveTo(room1Id));

            return (
              <Door
                key={`${room1Id}-${room2Id}`}
                room1={room1}
                room2={room2}
                isVisible={isVisible}
                canTraverse={canTraverse}
                onClick={() => {
                  if (currentRoomId === room1Id) {
                    onMoveToRoom(room2Id);
                  } else {
                    onMoveToRoom(room1Id);
                  }
                }}
                scale={scale}
              />
            );
          })}

          {dungeon.rooms.map((room) => {
            const clue = clues.get(room.id) ?? null;
            const isCurrent = room.id === currentRoomId;
            const isVisited = visitedRoomIds.has(room.id);
            const isVisible = isRoomVisible(room.id);
            const isTreasure = room.id === dungeon.treasureId;
            const isDragon = room.id === dungeon.dragonId;
            const canClick = canMoveTo(room.id);

            return (
              <Room
                key={room.id}
                room={room}
                clue={clue}
                isCurrent={isCurrent}
                isVisited={isVisited}
                isVisible={isVisible}
                isTreasure={isTreasure}
                isDragon={isDragon}
                gameOver={gameOver}
                onClick={() => onMoveToRoom(room.id)}
                canClick={canClick}
                scale={scale}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
