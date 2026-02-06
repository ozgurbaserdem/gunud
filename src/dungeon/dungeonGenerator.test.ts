import { describe, it, expect } from 'vitest';
import {
  generateDungeon,
  calculateDistances,
  calculatePar,
  areGridAdjacent,
  getPuzzleNumber,
} from './index';
import type { Room } from '../types';

describe('areGridAdjacent', () => {
  it('returns true for horizontally adjacent rooms (distance 1)', () => {
    const room1: Room = { id: 0, x: 0, y: 0, connections: [] };
    const room2: Room = { id: 1, x: 1, y: 0, connections: [] };
    expect(areGridAdjacent(room1, room2)).toBe(true);
  });

  it('returns true for vertically adjacent rooms (distance 1)', () => {
    const room1: Room = { id: 0, x: 0, y: 0, connections: [] };
    const room2: Room = { id: 1, x: 0, y: 1, connections: [] };
    expect(areGridAdjacent(room1, room2)).toBe(true);
  });

  it('returns true for diagonally adjacent rooms (distance 2)', () => {
    const room1: Room = { id: 0, x: 0, y: 0, connections: [] };
    const room2: Room = { id: 1, x: 1, y: 1, connections: [] };
    expect(areGridAdjacent(room1, room2)).toBe(true);
  });

  it('returns false for rooms 2 apart horizontally', () => {
    const room1: Room = { id: 0, x: 0, y: 0, connections: [] };
    const room2: Room = { id: 1, x: 2, y: 0, connections: [] };
    expect(areGridAdjacent(room1, room2)).toBe(false);
  });

  it('returns false for rooms 2 apart vertically', () => {
    const room1: Room = { id: 0, x: 0, y: 0, connections: [] };
    const room2: Room = { id: 1, x: 0, y: 2, connections: [] };
    expect(areGridAdjacent(room1, room2)).toBe(false);
  });

  it('returns false for rooms 3 apart (could cross through room)', () => {
    const room1: Room = { id: 0, x: 0, y: 0, connections: [] };
    const room2: Room = { id: 1, x: 1, y: 2, connections: [] };
    expect(areGridAdjacent(room1, room2)).toBe(false);
  });

  it('returns false for far apart rooms', () => {
    const room1: Room = { id: 0, x: 0, y: 0, connections: [] };
    const room2: Room = { id: 1, x: 5, y: 5, connections: [] };
    expect(areGridAdjacent(room1, room2)).toBe(false);
  });
});

describe('generateDungeon', () => {
  // Test with multiple seeds to catch edge cases
  const testSeeds = [
    '2026-01-01',
    '2026-02-05',
    '2026-06-15',
    '2026-12-31',
    'test-seed-1',
    'test-seed-2',
    'dev-12345',
  ];

  describe('connectivity', () => {
    it.each(testSeeds)('generates a fully connected dungeon for seed %s', (seed) => {
      const dungeon = generateDungeon(seed);
      const distances = calculateDistances(dungeon.rooms, dungeon.entranceId);

      // All rooms should be reachable from entrance
      for (const room of dungeon.rooms) {
        expect(distances.has(room.id)).toBe(true);
        expect(distances.get(room.id)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('treasure distance constraints (5-7 range)', () => {
    it.each(testSeeds)('treasure is 5-7 steps from entrance for seed %s', (seed) => {
      const dungeon = generateDungeon(seed);
      const par = calculatePar(dungeon);

      expect(par).toBeGreaterThanOrEqual(5);
      expect(par).toBeLessThanOrEqual(7);
    });
  });

  describe('grid adjacency - all connections must be grid-adjacent', () => {
    it.each(testSeeds)('all connections are grid-adjacent for seed %s', (seed) => {
      const dungeon = generateDungeon(seed);

      for (const room of dungeon.rooms) {
        for (const connectedId of room.connections) {
          const connectedRoom = dungeon.rooms.find((r) => r.id === connectedId)!;
          const isAdjacent = areGridAdjacent(room, connectedRoom);

          if (!isAdjacent) {
            // Provide detailed error message for debugging
            const dx = Math.abs(room.x - connectedRoom.x);
            const dy = Math.abs(room.y - connectedRoom.y);
            throw new Error(
              `Non-adjacent connection found: Room ${room.id} (${room.x},${room.y}) ` +
                `connected to Room ${connectedRoom.id} (${connectedRoom.x},${connectedRoom.y}) ` +
                `- Manhattan distance: ${dx + dy}, dx: ${dx}, dy: ${dy}`
            );
          }

          expect(isAdjacent).toBe(true);
        }
      }
    });
  });

  describe('dungeon structure', () => {
    it('has an entrance at room 0', () => {
      const dungeon = generateDungeon('test');
      expect(dungeon.entranceId).toBe(0);
    });

    it('has a valid treasure room', () => {
      const dungeon = generateDungeon('test');
      expect(dungeon.treasureId).toBeGreaterThanOrEqual(0);
      expect(dungeon.treasureId).toBeLessThan(dungeon.rooms.length);
    });

    it('treasure is not the entrance', () => {
      const dungeon = generateDungeon('test');
      expect(dungeon.treasureId).not.toBe(dungeon.entranceId);
    });

    it('dragon is not the entrance or treasure', () => {
      for (const seed of testSeeds) {
        const dungeon = generateDungeon(seed);
        expect(dungeon.dragonId).not.toBe(dungeon.entranceId);
        expect(dungeon.dragonId).not.toBe(dungeon.treasureId);
      }
    });

    it('dragon does not block all paths to treasure', () => {
      for (const seed of testSeeds) {
        const dungeon = generateDungeon(seed);
        // BFS from entrance to treasure, excluding dragon room
        const visited = new Set<number>([dungeon.dragonId]);
        const queue = [dungeon.entranceId];
        visited.add(dungeon.entranceId);
        let reachable = false;
        while (queue.length > 0) {
          const current = queue.shift()!;
          if (current === dungeon.treasureId) { reachable = true; break; }
          const room = dungeon.rooms.find(r => r.id === current)!;
          for (const neighborId of room.connections) {
            if (!visited.has(neighborId)) {
              visited.add(neighborId);
              queue.push(neighborId);
            }
          }
        }
        expect(reachable).toBe(true);
      }
    });

    it('entrance has at least 3 connections', () => {
      for (const seed of testSeeds) {
        const dungeon = generateDungeon(seed);
        const entrance = dungeon.rooms.find(r => r.id === dungeon.entranceId)!;
        expect(entrance.connections.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('generates at least 10 rooms', () => {
      const dungeon = generateDungeon('test');
      expect(dungeon.rooms.length).toBeGreaterThanOrEqual(10);
    });

    it('all rooms have unique positions', () => {
      const dungeon = generateDungeon('test');
      const positions = new Set<string>();

      for (const room of dungeon.rooms) {
        const key = `${room.x},${room.y}`;
        expect(positions.has(key)).toBe(false);
        positions.add(key);
      }
    });

    it('connections are bidirectional', () => {
      const dungeon = generateDungeon('test');

      for (const room of dungeon.rooms) {
        for (const connectedId of room.connections) {
          const connectedRoom = dungeon.rooms.find((r) => r.id === connectedId)!;
          expect(connectedRoom.connections).toContain(room.id);
        }
      }
    });
  });

  describe('deterministic generation', () => {
    it('same seed produces same dungeon', () => {
      const dungeon1 = generateDungeon('fixed-seed');
      const dungeon2 = generateDungeon('fixed-seed');

      expect(dungeon1.rooms.length).toBe(dungeon2.rooms.length);
      expect(dungeon1.entranceId).toBe(dungeon2.entranceId);
      expect(dungeon1.treasureId).toBe(dungeon2.treasureId);

      for (let i = 0; i < dungeon1.rooms.length; i++) {
        expect(dungeon1.rooms[i].x).toBe(dungeon2.rooms[i].x);
        expect(dungeon1.rooms[i].y).toBe(dungeon2.rooms[i].y);
        expect(dungeon1.rooms[i].connections.sort()).toEqual(dungeon2.rooms[i].connections.sort());
      }
    });

    it('different seeds produce different dungeons', () => {
      const dungeon1 = generateDungeon('seed-a');
      const dungeon2 = generateDungeon('seed-b');

      // At least something should be different (rooms, positions, or connections)
      const isDifferent =
        dungeon1.rooms.length !== dungeon2.rooms.length ||
        dungeon1.treasureId !== dungeon2.treasureId ||
        dungeon1.rooms.some(
          (r, i) =>
            r.x !== dungeon2.rooms[i]?.x ||
            r.y !== dungeon2.rooms[i]?.y ||
            r.connections.length !== dungeon2.rooms[i]?.connections.length
        );

      expect(isDifferent).toBe(true);
    });
  });
});

describe('calculateDistances', () => {
  it('returns 0 for start room', () => {
    const rooms: Room[] = [
      { id: 0, x: 0, y: 0, connections: [1] },
      { id: 1, x: 1, y: 0, connections: [0] },
    ];
    const distances = calculateDistances(rooms, 0);
    expect(distances.get(0)).toBe(0);
  });

  it('calculates correct distances in a chain', () => {
    const rooms: Room[] = [
      { id: 0, x: 0, y: 0, connections: [1] },
      { id: 1, x: 1, y: 0, connections: [0, 2] },
      { id: 2, x: 2, y: 0, connections: [1, 3] },
      { id: 3, x: 3, y: 0, connections: [2] },
    ];
    const distances = calculateDistances(rooms, 0);
    expect(distances.get(0)).toBe(0);
    expect(distances.get(1)).toBe(1);
    expect(distances.get(2)).toBe(2);
    expect(distances.get(3)).toBe(3);
  });

  it('finds shortest path when multiple paths exist', () => {
    // Diamond shape: 0 connects to 1 and 2, both connect to 3
    const rooms: Room[] = [
      { id: 0, x: 0, y: 0, connections: [1, 2] },
      { id: 1, x: 1, y: 0, connections: [0, 3] },
      { id: 2, x: 0, y: 1, connections: [0, 3] },
      { id: 3, x: 1, y: 1, connections: [1, 2] },
    ];
    const distances = calculateDistances(rooms, 0);
    expect(distances.get(3)).toBe(2); // Shortest path is 0->1->3 or 0->2->3
  });
});

describe('getPuzzleNumber', () => {
  it('returns 1 for launch date', () => {
    expect(getPuzzleNumber('2026-02-05')).toBe(1);
  });

  it('returns 2 for day after launch', () => {
    expect(getPuzzleNumber('2026-02-06')).toBe(2);
  });

  it('returns correct number for later dates', () => {
    expect(getPuzzleNumber('2026-02-15')).toBe(11);
  });
});
