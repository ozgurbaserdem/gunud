import type { Dungeon, Room } from '../types';

// Seeded random number generator (Mulberry32)
function createSeededRandom(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convert date string to seed number
function dateToSeed(dateString: string): number {
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Get today's date string in YYYY-MM-DD format
export function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Calculate puzzle number (days since launch)
export function getPuzzleNumber(dateString: string): number {
  const launchDate = new Date('2026-02-05');
  const currentDate = new Date(dateString);
  const diffTime = currentDate.getTime() - launchDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

// Count loops (cycles) in the graph using DFS
function countLoops(rooms: Room[]): number {
  const visited = new Set<number>();
  const parent = new Map<number, number>();
  let loopCount = 0;

  function dfs(roomId: number, parentId: number): void {
    visited.add(roomId);
    parent.set(roomId, parentId);

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
function ensureLoops(rooms: Room[], _random: () => number, minLoops: number): void {
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

          // Connect room to candidate (creates a triangle/loop)
          room.connections.push(candidateId);
          const candidate = rooms.find((r) => r.id === candidateId)!;
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
function getMaxDistance(rooms: Room[], entranceId: number): number {
  const distances = calculateDistances(rooms, entranceId);
  let maxDist = 0;
  for (const dist of distances.values()) {
    if (dist > maxDist) maxDist = dist;
  }
  return maxDist;
}

// Check if graph stays connected after removing an edge
function isConnectedWithoutEdge(
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

// Ensure minimum distance by removing shortcut connections
function ensureMinimumDistance(rooms: Room[], entranceId: number, minDist: number): void {
  const maxAttempts = 20;
  let attempts = 0;

  while (getMaxDistance(rooms, entranceId) < minDist && attempts < maxAttempts) {
    attempts++;

    // Find a non-MST edge to remove (rooms with 2+ connections)
    // Prioritize removing edges from rooms close to entrance (they create shortcuts)
    const distances = calculateDistances(rooms, entranceId);
    const roomsByDistance = [...rooms].sort((a, b) => {
      const distA = distances.get(a.id) || 0;
      const distB = distances.get(b.id) || 0;
      return distA - distB;
    });

    let removed = false;
    for (const room of roomsByDistance) {
      if (room.connections.length <= 1) continue; // Keep at least 1 connection

      for (const neighborId of [...room.connections]) {
        const neighbor = rooms.find((r) => r.id === neighborId)!;
        if (neighbor.connections.length <= 1) continue; // Neighbor needs connections too

        // Check if removing this edge keeps graph connected
        if (isConnectedWithoutEdge(rooms, room.id, neighborId)) {
          // Remove the edge
          room.connections = room.connections.filter((id) => id !== neighborId);
          neighbor.connections = neighbor.connections.filter((id) => id !== room.id);
          removed = true;
          break;
        }
      }
      if (removed) break;
    }

    if (!removed) break; // No more edges can be safely removed
  }
}

// Add dead-end rooms that branch off the optimal path
function addDeadEnds(
  rooms: Room[],
  entranceId: number,
  treasureId: number,
  random: () => number,
  usedPositions: Set<string>
): void {
  const deadEndCount = Math.floor(random() * 3) + 3; // 3-5 dead ends

  // Find rooms on or near optimal path
  const distances = calculateDistances(rooms, entranceId);
  const treasureDist = distances.get(treasureId) || 0;

  // Get rooms that are on potential optimal paths (distance from entrance + distance to treasure = optimal)
  const distancesToTreasure = calculateDistances(rooms, treasureId);
  const optimalPathRooms = rooms.filter((r) => {
    const fromEntrance = distances.get(r.id) || 0;
    const toTreasure = distancesToTreasure.get(r.id) || 0;
    // Room is on optimal path if distances sum to total optimal distance
    // Also include rooms 1 step off optimal path
    return fromEntrance + toTreasure <= treasureDist + 1;
  });

  // Prefer rooms in the middle of the path (not entrance or near treasure)
  const middleRooms = optimalPathRooms.filter((r) => {
    const fromEntrance = distances.get(r.id) || 0;
    return fromEntrance >= 1 && fromEntrance < treasureDist - 1;
  });

  const candidateParents = middleRooms.length > 0 ? middleRooms : optimalPathRooms;

  for (let i = 0; i < deadEndCount && candidateParents.length > 0; i++) {
    const parentRoom = candidateParents[Math.floor(random() * candidateParents.length)];

    // Find an empty adjacent grid position
    const adjacentOffsets = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];

    // Shuffle offsets for variety
    for (let j = adjacentOffsets.length - 1; j > 0; j--) {
      const k = Math.floor(random() * (j + 1));
      [adjacentOffsets[j], adjacentOffsets[k]] = [adjacentOffsets[k], adjacentOffsets[j]];
    }

    for (const [dx, dy] of adjacentOffsets) {
      const newX = parentRoom.x + dx;
      const newY = parentRoom.y + dy;
      const posKey = `${newX},${newY}`;

      if (newX >= 0 && newY >= 0 && !usedPositions.has(posKey)) {
        // Create dead-end room
        const newRoom: Room = {
          id: rooms.length,
          x: newX,
          y: newY,
          connections: [parentRoom.id],
        };

        rooms.push(newRoom);
        parentRoom.connections.push(newRoom.id);
        usedPositions.add(posKey);
        break;
      }
    }
  }
}

// Generate dungeon from date seed
export function generateDungeon(dateString: string): Dungeon {
  const seed = dateToSeed(dateString);
  const random = createSeededRandom(seed);

  // Determine room count (10-14 to ensure enough distance for treasure)
  const roomCount = Math.floor(random() * 5) + 10;

  // Generate room positions in a grid-like layout (larger grid for more spread)
  const rooms: Room[] = [];
  const gridSize = Math.ceil(Math.sqrt(roomCount * 3));
  const usedPositions = new Set<string>();

  for (let i = 0; i < roomCount; i++) {
    let x: number, y: number;
    let attempts = 0;

    do {
      x = Math.floor(random() * gridSize);
      y = Math.floor(random() * gridSize);
      attempts++;
    } while (usedPositions.has(`${x},${y}`) && attempts < 100);

    usedPositions.add(`${x},${y}`);
    rooms.push({ id: i, x, y, connections: [] });
  }

  // Connect rooms to form a connected graph
  // First, create a minimum spanning tree using Prim's algorithm
  const inTree = new Set<number>([0]);
  const edges: Array<{ from: number; to: number; dist: number }> = [];

  while (inTree.size < roomCount) {
    let bestEdge: { from: number; to: number; dist: number } | null = null;

    for (const fromId of inTree) {
      for (let toId = 0; toId < roomCount; toId++) {
        if (inTree.has(toId)) continue;

        const from = rooms[fromId];
        const to = rooms[toId];
        const dist = Math.abs(from.x - to.x) + Math.abs(from.y - to.y);

        if (!bestEdge || dist < bestEdge.dist) {
          bestEdge = { from: fromId, to: toId, dist };
        }
      }
    }

    if (bestEdge) {
      edges.push(bestEdge);
      inTree.add(bestEdge.to);
      rooms[bestEdge.from].connections.push(bestEdge.to);
      rooms[bestEdge.to].connections.push(bestEdge.from);
    }
  }

  // Add extra connections for variety and multiple route options (3-6 connections)
  const extraConnections = Math.floor(random() * 4) + 3;
  for (let i = 0; i < extraConnections; i++) {
    const fromId = Math.floor(random() * roomCount);
    const candidates = rooms.filter((r) => {
      if (r.id === fromId) return false;
      if (rooms[fromId].connections.includes(r.id)) return false;
      const dist = Math.abs(rooms[fromId].x - r.x) + Math.abs(rooms[fromId].y - r.y);
      return dist <= 3; // Connect rooms within distance 3 for longer "shortcuts"
    });

    if (candidates.length > 0) {
      const toRoom = candidates[Math.floor(random() * candidates.length)];
      rooms[fromId].connections.push(toRoom.id);
      rooms[toRoom.id].connections.push(fromId);
    }
  }

  // Ensure at least 2 loops exist for circular paths
  ensureLoops(rooms, random, 2);

  // Entrance is room 0
  const entranceId = 0;

  // Ensure minimum distance of 4 by removing connections if needed
  ensureMinimumDistance(rooms, entranceId, 4);

  // Find treasure room: must be at least 4 rooms away from entrance (par 4+)
  const distances = calculateDistances(rooms, entranceId);

  // Sort all rooms by distance (descending) - farthest first
  const allRoomsSortedByDistance = [...rooms]
    .filter((r) => r.id !== entranceId) // exclude entrance
    .sort((a, b) => {
      const distA = distances.get(a.id) || 0;
      const distB = distances.get(b.id) || 0;
      return distB - distA;
    });

  // Filter for rooms at least 4 steps away
  const validTreasureRooms = allRoomsSortedByDistance.filter((r) => {
    const dist = distances.get(r.id);
    return dist !== undefined && dist >= 4;
  });

  let treasureRoom: Room;

  if (validTreasureRooms.length > 0) {
    // Pick from top half of farthest valid rooms for challenge
    const topHalf = validTreasureRooms.slice(0, Math.max(1, Math.ceil(validTreasureRooms.length / 2)));
    treasureRoom = topHalf[Math.floor(random() * topHalf.length)];
  } else {
    // Fallback: pick the farthest room available (even if < 4 steps)
    // This ensures treasure is always as far as possible
    treasureRoom = allRoomsSortedByDistance[0];
  }

  // Add dead-end branches off the optimal path for misleading wrong turns
  addDeadEnds(rooms, entranceId, treasureRoom.id, random, usedPositions);

  return {
    rooms,
    entranceId,
    treasureId: treasureRoom.id,
  };
}

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

// Calculate par (optimal moves) for a dungeon
export function calculatePar(dungeon: Dungeon): number {
  const distances = calculateDistances(dungeon.rooms, dungeon.entranceId);
  return distances.get(dungeon.treasureId) || 0;
}
