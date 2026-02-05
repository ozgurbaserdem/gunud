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

// Check if two rooms are grid-adjacent (Manhattan distance 1 or 2)
// Distance 2 allowed only for diagonal connections (different x AND y)
export function areGridAdjacent(room1: Room, room2: Room): boolean {
  const dx = Math.abs(room1.x - room2.x);
  const dy = Math.abs(room1.y - room2.y);
  const dist = dx + dy;
  // Allow distance 1 (directly adjacent) or distance 2 diagonal
  return dist === 1 || (dist === 2 && dx === 1 && dy === 1);
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

// Ensure distance to farthest room is within range [minDist, maxDist]
function ensureDistanceRange(rooms: Room[], entranceId: number, minDist: number, maxDist: number): void {
  const maxAttempts = 20;

  // First, increase distance if too short (remove shortcuts)
  let attempts = 0;
  while (getMaxDistance(rooms, entranceId) < minDist && attempts < maxAttempts) {
    attempts++;

    const distances = calculateDistances(rooms, entranceId);
    const roomsByDistance = [...rooms].sort((a, b) => {
      const distA = distances.get(a.id) || 0;
      const distB = distances.get(b.id) || 0;
      return distA - distB;
    });

    let removed = false;
    for (const room of roomsByDistance) {
      if (room.connections.length <= 1) continue;

      for (const neighborId of [...room.connections]) {
        const neighbor = rooms.find((r) => r.id === neighborId)!;
        if (neighbor.connections.length <= 1) continue;

        if (isConnectedWithoutEdge(rooms, room.id, neighborId)) {
          room.connections = room.connections.filter((id) => id !== neighborId);
          neighbor.connections = neighbor.connections.filter((id) => id !== room.id);
          removed = true;
          break;
        }
      }
      if (removed) break;
    }

    if (!removed) break;
  }

  // Then, decrease distance if too long (add shortcuts to far rooms)
  attempts = 0;
  while (getMaxDistance(rooms, entranceId) > maxDist && attempts < maxAttempts) {
    attempts++;

    const distances = calculateDistances(rooms, entranceId);

    // Find a room that's too far
    const farRooms = rooms.filter((r) => (distances.get(r.id) || 0) > maxDist);
    if (farRooms.length === 0) break;

    const farRoom = farRooms[0];
    const farRoomDist = distances.get(farRoom.id) || 0;

    // Find a grid-adjacent room closer to entrance that we can connect to
    let added = false;
    for (const room of rooms) {
      if (room.id === farRoom.id) continue;
      if (farRoom.connections.includes(room.id)) continue;
      if (!areGridAdjacent(farRoom, room)) continue; // Must be grid-adjacent

      const roomDist = distances.get(room.id) || 0;
      // Connect if this would make the far room closer but still within range
      if (roomDist < farRoomDist - 1 && roomDist >= minDist - 2) {
        farRoom.connections.push(room.id);
        room.connections.push(farRoom.id);
        added = true;
        break;
      }
    }

    if (!added) break;
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

  // Generate rooms using growth algorithm - each new room is adjacent to existing
  // This guarantees all connections are grid-adjacent
  const rooms: Room[] = [];
  const usedPositions = new Set<string>();

  // Start with room 0 at origin
  rooms.push({ id: 0, x: 0, y: 0, connections: [] });
  usedPositions.add('0,0');

  // Adjacent offsets (4 cardinal directions)
  const adjacentOffsets = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];

  // Grow dungeon by adding rooms adjacent to existing ones
  for (let i = 1; i < roomCount; i++) {
    let placed = false;
    let attempts = 0;
    const maxAttempts = 100;

    while (!placed && attempts < maxAttempts) {
      attempts++;

      // Pick a random existing room to grow from
      const parentRoom = rooms[Math.floor(random() * rooms.length)];

      // Shuffle adjacent positions for variety
      const shuffledOffsets = [...adjacentOffsets].sort(() => random() - 0.5);

      for (const [dx, dy] of shuffledOffsets) {
        const newX = parentRoom.x + dx;
        const newY = parentRoom.y + dy;
        const posKey = `${newX},${newY}`;

        if (!usedPositions.has(posKey)) {
          // Create new room and connect to parent
          const newRoom: Room = {
            id: i,
            x: newX,
            y: newY,
            connections: [parentRoom.id],
          };
          parentRoom.connections.push(i);

          rooms.push(newRoom);
          usedPositions.add(posKey);
          placed = true;
          break;
        }
      }
    }

    // Fallback: if we couldn't place adjacent, find any empty adjacent spot
    if (!placed) {
      for (const room of rooms) {
        for (const [dx, dy] of adjacentOffsets) {
          const newX = room.x + dx;
          const newY = room.y + dy;
          const posKey = `${newX},${newY}`;

          if (!usedPositions.has(posKey)) {
            const newRoom: Room = {
              id: i,
              x: newX,
              y: newY,
              connections: [room.id],
            };
            room.connections.push(i);

            rooms.push(newRoom);
            usedPositions.add(posKey);
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
    }
  }

  // Add extra connections for variety and multiple route options (3-6 connections)
  const extraConnections = Math.floor(random() * 4) + 3;
  for (let i = 0; i < extraConnections; i++) {
    const fromId = Math.floor(random() * roomCount);
    const candidates = rooms.filter((r) => {
      if (r.id === fromId) return false;
      if (rooms[fromId].connections.includes(r.id)) return false;
      return areGridAdjacent(rooms[fromId], r); // Only connect grid-adjacent rooms
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

  // Ensure treasure distance is within 4-6 range
  ensureDistanceRange(rooms, entranceId, 4, 6);

  // Find treasure room: must be at least 4 rooms away from entrance (par 4+)
  const distances = calculateDistances(rooms, entranceId);

  // Filter for rooms in valid distance range (4-6 steps)
  const validTreasureRooms = rooms.filter((r) => {
    if (r.id === entranceId) return false;
    const dist = distances.get(r.id);
    return dist !== undefined && dist >= 4 && dist <= 6;
  });

  // Sort valid rooms by distance (descending) - farthest first
  validTreasureRooms.sort((a, b) => {
    const distA = distances.get(a.id) || 0;
    const distB = distances.get(b.id) || 0;
    return distB - distA;
  });

  let treasureRoom: Room;

  if (validTreasureRooms.length > 0) {
    // Pick randomly from valid rooms (all are in 4-6 range)
    treasureRoom = validTreasureRooms[Math.floor(random() * validTreasureRooms.length)];
  } else {
    // Fallback: pick room closest to target range
    const allOtherRooms = rooms.filter((r) => r.id !== entranceId);
    allOtherRooms.sort((a, b) => {
      const distA = distances.get(a.id) || 0;
      const distB = distances.get(b.id) || 0;
      // Prefer rooms closer to the 4-6 range
      const scoreA = distA < 4 ? 4 - distA : distA > 6 ? distA - 6 : 0;
      const scoreB = distB < 4 ? 4 - distB : distB > 6 ? distB - 6 : 0;
      return scoreA - scoreB;
    });
    treasureRoom = allOtherRooms[0];
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
