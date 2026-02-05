import { useMemo } from 'react';
import type { GameState } from '../types';
import { Room } from './Room';
import { Door } from './Door';

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
  const { dungeon, currentRoomId, visitedRoomIds, clues } = gameState;

  // Calculate SVG bounds
  const bounds = useMemo(() => {
    const xs = dungeon.rooms.map((r) => r.x);
    const ys = dungeon.rooms.map((r) => r.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [dungeon.rooms]);

  const scale = 1;
  const padding = 60;
  const width = (bounds.maxX - bounds.minX + 1) * 100 * scale + padding * 2;
  const height = (bounds.maxY - bounds.minY + 1) * 100 * scale + padding * 2;

  // Offset to center the dungeon
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

  return (
    <div className="w-full flex justify-center overflow-hidden">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="max-w-full max-h-[60vh]"
        style={{ minHeight: '300px' }}
      >
        <g transform={`translate(${offsetX}, ${offsetY})`}>
          {/* Render doors first (behind rooms) */}
          {doors.map(({ room1Id, room2Id }) => {
            const room1 = dungeon.rooms.find((r) => r.id === room1Id)!;
            const room2 = dungeon.rooms.find((r) => r.id === room2Id)!;
            // Only show door if:
            // 1. Both rooms have been visited, OR
            // 2. One end is the current room (so you can see exits from where you are)
            // This prevents revealing dungeon structure beyond adjacent rooms
            const bothVisited = visitedRoomIds.has(room1Id) && visitedRoomIds.has(room2Id);
            const oneIsCurrent = room1Id === currentRoomId || room2Id === currentRoomId;
            const isVisible = bothVisited || oneIsCurrent;
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

          {/* Render rooms */}
          {dungeon.rooms.map((room) => {
            const clue = clues.get(room.id) ?? null;
            const isCurrent = room.id === currentRoomId;
            const isVisited = visitedRoomIds.has(room.id);
            const isVisible = isRoomVisible(room.id);
            const isTreasure = room.id === dungeon.treasureId;
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
