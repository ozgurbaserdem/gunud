import type { Dungeon, Room } from '../types';
import { createSeededRandom, dateToSeed } from './seedRandom';
import { calculateDistances, areGridAdjacent, ensureLoops } from './graphUtils';
import { ensureDistanceRange, addDeadEnds, ensureEntranceConnections } from './dungeonBuilder';

// Generate dungeon from date seed
export function generateDungeon(dateString: string): Dungeon {
  const seed = dateToSeed(dateString);
  const random = createSeededRandom(seed);

  // Determine room count (12-16 to ensure enough distance for treasure)
  const roomCount = Math.floor(random() * 5) + 12;

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
  ensureLoops(rooms, 2);

  // Entrance is room 0
  const entranceId = 0;

  // Ensure entrance has at least 3 exits for an interesting opening
  ensureEntranceConnections(rooms, entranceId, usedPositions, 3);

  // Ensure treasure distance is within 5-7 range
  ensureDistanceRange(rooms, entranceId, 5, 7, usedPositions);

  // Find treasure room: must be at least 5 rooms away from entrance (par 5+)
  const distances = calculateDistances(rooms, entranceId);

  // Filter for rooms in valid distance range (5-7 steps)
  const validTreasureRooms = rooms.filter((r) => {
    if (r.id === entranceId) return false;
    const dist = distances.get(r.id);
    return dist !== undefined && dist >= 5 && dist <= 7;
  });

  // Sort valid rooms by distance (descending) - farthest first
  validTreasureRooms.sort((a, b) => {
    const distA = distances.get(a.id) || 0;
    const distB = distances.get(b.id) || 0;
    return distB - distA;
  });

  let treasureRoom: Room;

  if (validTreasureRooms.length > 0) {
    // Pick randomly from valid rooms (all are in 5-7 range)
    treasureRoom = validTreasureRooms[Math.floor(random() * validTreasureRooms.length)];
  } else {
    // Fallback: pick room closest to target range
    const allOtherRooms = rooms.filter((r) => r.id !== entranceId);
    allOtherRooms.sort((a, b) => {
      const distA = distances.get(a.id) || 0;
      const distB = distances.get(b.id) || 0;
      // Prefer rooms closer to the 5-7 range
      const scoreA = distA < 5 ? 5 - distA : distA > 7 ? distA - 7 : 0;
      const scoreB = distB < 5 ? 5 - distB : distB > 7 ? distB - 7 : 0;
      return scoreA - scoreB;
    });
    treasureRoom = allOtherRooms[0];
  }

  // Add dead-end branches off the optimal path for misleading wrong turns
  addDeadEnds(rooms, entranceId, treasureRoom.id, random, usedPositions);

  // Place dragon room near treasure's BFS depth (tempting wrong choice)
  // Dragon must NOT block all paths to treasure (must be bypassable)
  const dragonDistances = calculateDistances(rooms, entranceId);
  const treasureDist = dragonDistances.get(treasureRoom.id) || 0;
  const isBypassable = (candidateId: number): boolean => {
    // BFS from entrance to treasure, excluding the candidate room
    const visited = new Set<number>([candidateId]);
    const queue = [entranceId];
    visited.add(entranceId);
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === treasureRoom.id) return true;
      const currentRoom = rooms.find(r => r.id === current)!;
      for (const neighborId of currentRoom.connections) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
    return false;
  };
  const dragonCandidatesNear = rooms.filter(r => {
    if (r.id === entranceId || r.id === treasureRoom.id) return false;
    if (!isBypassable(r.id)) return false;
    const d = dragonDistances.get(r.id) || 0;
    return d >= treasureDist - 1 && d <= treasureDist + 1;
  });
  const dragonCandidatesAny = dragonCandidatesNear.length > 0
    ? dragonCandidatesNear
    : rooms.filter(r => r.id !== entranceId && r.id !== treasureRoom.id && isBypassable(r.id));
  // Fallback: if every room is a chokepoint, allow any non-entrance/non-treasure room
  const dragonCandidates = dragonCandidatesAny.length > 0
    ? dragonCandidatesAny
    : rooms.filter(r => r.id !== entranceId && r.id !== treasureRoom.id);
  const dragonRoom = dragonCandidates[Math.floor(random() * dragonCandidates.length)];

  return {
    rooms,
    entranceId,
    treasureId: treasureRoom.id,
    dragonId: dragonRoom.id,
  };
}

// Calculate par (optimal moves) for a dungeon
export function calculatePar(dungeon: Dungeon): number {
  const distances = calculateDistances(dungeon.rooms, dungeon.entranceId);
  return distances.get(dungeon.treasureId) || 0;
}
