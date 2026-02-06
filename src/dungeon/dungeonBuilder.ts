import type { Room } from '../types';
import { calculateDistances, areGridAdjacent, getMaxDistance, isConnectedWithoutEdge } from './graphUtils';

// Ensure distance to farthest room is within range [minDist, maxDist]
export function ensureDistanceRange(rooms: Room[], entranceId: number, minDist: number, maxDist: number, usedPositions?: Set<string>): void {
  const maxAttempts = 20;

  // First, increase distance if too short (remove shortcuts, but protect entrance edges)
  let attempts = 0;
  while (getMaxDistance(rooms, entranceId) < minDist && attempts < maxAttempts) {
    attempts++;

    const distances = calculateDistances(rooms, entranceId);

    // Build list of removable edges, prioritizing those that act as shortcuts
    // Skip entrance edges to preserve entrance connectivity
    const edges: { roomId: number; neighborId: number; distDiff: number }[] = [];
    for (const room of rooms) {
      if (room.connections.length <= 1) continue;
      if (room.id === entranceId) continue;
      for (const neighborId of room.connections) {
        if (neighborId <= room.id) continue; // avoid duplicates
        if (neighborId === entranceId) continue;
        const neighbor = rooms.find((r) => r.id === neighborId)!;
        if (neighbor.connections.length <= 1) continue;
        const distA = distances.get(room.id) || 0;
        const distB = distances.get(neighbor.id) || 0;
        edges.push({ roomId: room.id, neighborId, distDiff: Math.abs(distA - distB) });
      }
    }
    // Remove edges that skip levels first (largest distance difference = biggest shortcuts)
    edges.sort((a, b) => b.distDiff - a.distDiff);

    let removed = false;
    for (const edge of edges) {
      if (isConnectedWithoutEdge(rooms, edge.roomId, edge.neighborId)) {
        const room = rooms.find((r) => r.id === edge.roomId)!;
        const neighbor = rooms.find((r) => r.id === edge.neighborId)!;
        room.connections = room.connections.filter((id) => id !== edge.neighborId);
        neighbor.connections = neighbor.connections.filter((id) => id !== edge.roomId);
        removed = true;
        break;
      }
    }

    if (!removed) break;
  }

  // If still too short, extend the graph by adding rooms at the farthest point
  while (getMaxDistance(rooms, entranceId) < minDist && usedPositions) {
    const distances = calculateDistances(rooms, entranceId);
    const maxDst = Math.max(...distances.values());
    const farthestRoom = rooms.find((r) => distances.get(r.id) === maxDst)!;

    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    let extended = false;
    for (const [dx, dy] of directions) {
      const nx = farthestRoom.x + dx;
      const ny = farthestRoom.y + dy;
      const posKey = `${nx},${ny}`;
      if (usedPositions.has(posKey)) continue;

      const newId = rooms.length;
      const newRoom: Room = { id: newId, x: nx, y: ny, connections: [farthestRoom.id] };
      farthestRoom.connections.push(newId);
      rooms.push(newRoom);
      usedPositions.add(posKey);
      extended = true;
      break;
    }
    if (!extended) break;
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
export function addDeadEnds(
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

// Ensure entrance room has at least minConnections exits
export function ensureEntranceConnections(
  rooms: Room[],
  entranceId: number,
  usedPositions: Set<string>,
  minConnections: number
): void {
  const entrance = rooms.find(r => r.id === entranceId)!;

  while (entrance.connections.length < minConnections) {
    // Try connecting to an existing grid-adjacent room first
    let added = false;
    for (const room of rooms) {
      if (room.id === entranceId) continue;
      if (entrance.connections.includes(room.id)) continue;
      if (!areGridAdjacent(entrance, room)) continue;

      entrance.connections.push(room.id);
      room.connections.push(entranceId);
      added = true;
      break;
    }

    if (added) continue;

    // No existing room to connect — create a new adjacent room
    const offsets = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of offsets) {
      const nx = entrance.x + dx;
      const ny = entrance.y + dy;
      const key = `${nx},${ny}`;
      if (!usedPositions.has(key)) {
        const newRoom: Room = {
          id: rooms.length,
          x: nx,
          y: ny,
          connections: [entranceId],
        };
        rooms.push(newRoom);
        entrance.connections.push(newRoom.id);
        usedPositions.add(key);
        break;
      }
    }

    // Safety: if we couldn't add anything, break to avoid infinite loop
    if (entrance.connections.length < minConnections) break;
  }
}
