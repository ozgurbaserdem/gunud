import type { Room } from '../types';

// BFS to calculate shortest path distances from treasure room to all rooms
export function calculateDistancesToTreasure(
  rooms: Room[],
  treasureId: number
): Map<number, number> {
  const distances = new Map<number, number>();
  const queue: number[] = [treasureId];
  distances.set(treasureId, 0);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentDist = distances.get(currentId)!;
    const currentRoom = rooms.find((r) => r.id === currentId)!;

    for (const neighborId of currentRoom.connections) {
      if (!distances.has(neighborId)) {
        distances.set(neighborId, currentDist + 1);
        queue.push(neighborId);
      }
    }
  }

  return distances;
}

// Get adjacent rooms (connected rooms) for a given room
export function getAdjacentRooms(rooms: Room[], roomId: number): Room[] {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) return [];

  return room.connections
    .map((id) => rooms.find((r) => r.id === id))
    .filter((r): r is Room => r !== undefined);
}

// Check if two rooms are connected
export function areRoomsConnected(rooms: Room[], roomId1: number, roomId2: number): boolean {
  const room1 = rooms.find((r) => r.id === roomId1);
  if (!room1) return false;
  return room1.connections.includes(roomId2);
}
