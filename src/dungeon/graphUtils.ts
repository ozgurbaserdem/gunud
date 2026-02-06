import type { Room } from '../types';

// BFS to calculate distances from a starting room
export function calculateDistances(rooms: Room[], startId: number): Map<number, number> {
  const distances = new Map<number, number>();
  const queue: number[] = [startId];
  distances.set(startId, 0);

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

// Check if two rooms are grid-adjacent (Manhattan distance 1 or 2)
// Distance 2 allowed only for diagonal connections (different x AND y)
export function areGridAdjacent(room1: Room, room2: Room): boolean {
  const dx = Math.abs(room1.x - room2.x);
  const dy = Math.abs(room1.y - room2.y);
  const dist = dx + dy;
  // Allow distance 1 (directly adjacent) or distance 2 diagonal
  return dist === 1 || (dist === 2 && dx === 1 && dy === 1);
}

// Count loops (cycles) in the graph using DFS
export function countLoops(rooms: Room[]): number {
  const visited = new Set<number>();
  let loopCount = 0;

  function dfs(roomId: number, parentId: number): void {
    visited.add(roomId);

    const room = rooms.find((r) => r.id === roomId)!;
    for (const neighborId of room.connections) {
      if (!visited.has(neighborId)) {
        dfs(neighborId, roomId);
      } else if (neighborId !== parentId) {
        loopCount++;
      }
    }
  }

  if (rooms.length > 0) {
    dfs(rooms[0].id, -1);
  }

  // Each loop is counted twice (once from each direction), so divide by 2
  return Math.floor(loopCount / 2);
}

// Ensure minimum number of loops exist by connecting rooms that share neighbors
export function ensureLoops(rooms: Room[], minLoops: number): void {
  let currentLoops = countLoops(rooms);

  while (currentLoops < minLoops) {
    // Find pairs of rooms that share a neighbor but aren't connected (creates triangle)
    let added = false;

    for (const room of rooms) {
      if (added) break;

      for (const neighborId of room.connections) {
        if (added) break;
        const neighbor = rooms.find((r) => r.id === neighborId)!;

        // Find rooms connected to neighbor but not to current room
        for (const candidateId of neighbor.connections) {
          if (candidateId === room.id) continue;
          if (room.connections.includes(candidateId)) continue;

          const candidate = rooms.find((r) => r.id === candidateId)!;
          // Only connect if grid-adjacent (avoids lines crossing rooms)
          if (!areGridAdjacent(room, candidate)) continue;

          // Connect room to candidate (creates a triangle/loop)
          room.connections.push(candidateId);
          candidate.connections.push(room.id);
          added = true;
          break;
        }
      }
    }

    if (!added) break; // No more loops can be added
    currentLoops = countLoops(rooms);
  }
}

// Get max distance from entrance to any room
export function getMaxDistance(rooms: Room[], entranceId: number): number {
  const distances = calculateDistances(rooms, entranceId);
  return Math.max(...distances.values());
}

// Check if graph stays connected after removing an edge
export function isConnectedWithoutEdge(
  rooms: Room[],
  room1Id: number,
  room2Id: number
): boolean {
  // Temporarily remove the edge
  const room1 = rooms.find((r) => r.id === room1Id)!;
  const room2 = rooms.find((r) => r.id === room2Id)!;

  const idx1 = room1.connections.indexOf(room2Id);
  const idx2 = room2.connections.indexOf(room1Id);

  if (idx1 === -1 || idx2 === -1) return true; // Edge doesn't exist

  room1.connections.splice(idx1, 1);
  room2.connections.splice(idx2, 1);

  // BFS to check connectivity
  const visited = new Set<number>();
  const queue = [rooms[0].id];
  visited.add(rooms[0].id);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentRoom = rooms.find((r) => r.id === current)!;
    for (const neighborId of currentRoom.connections) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  const isConnected = visited.size === rooms.length;

  // Restore the edge
  room1.connections.push(room2Id);
  room2.connections.push(room1Id);

  return isConnected;
}
