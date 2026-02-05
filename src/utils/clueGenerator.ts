import type { Dungeon, Clue, ClueCategory, Room } from '../types';
import { calculateDistances, createSeededRandom, dateToSeed } from './dungeonGenerator';

export function generateClues(dungeon: Dungeon, dateString: string): Map<number, Clue> {
  const seed = dateToSeed(dateString + '-clues');
  const random = createSeededRandom(seed);
  const { rooms, entranceId, treasureId } = dungeon;
  const treasureRoom = rooms.find(r => r.id === treasureId)!;
  const distFromEntrance = calculateDistances(rooms, entranceId);
  const distFromTreasure = calculateDistances(rooms, treasureId);

  // Sort non-treasure rooms by distance from entrance (closest first)
  const clueRooms = rooms
    .filter(r => r.id !== treasureId)
    .sort((a, b) => (distFromEntrance.get(a.id) || 0) - (distFromEntrance.get(b.id) || 0));

  const categories: ClueCategory[] = ['connection', 'spatial', 'relational', 'entrance'];

  // Retry loop: reshuffle assignments until clues uniquely identify treasure
  const maxAttempts = 10;
  let lastClues: Map<number, Clue> = new Map();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const assignments = new Map<number, ClueCategory>();

    // Guarantee: first 4 closest rooms each get a different category (shuffled)
    const guaranteed = clueRooms.slice(0, 4);
    const shuffledCats = [...categories].sort(() => random() - 0.5);
    for (let i = 0; i < guaranteed.length; i++) {
      assignments.set(guaranteed[i].id, shuffledCats[i]);
    }

    // Remaining rooms get random categories
    for (const room of clueRooms.slice(4)) {
      assignments.set(room.id, categories[Math.floor(random() * categories.length)]);
    }

    // Generate clue content for each room
    lastClues = new Map<number, Clue>();
    for (const room of clueRooms) {
      const category = assignments.get(room.id)!;
      lastClues.set(room.id, buildClue(category, room, treasureRoom, distFromTreasure, random));
    }

    // Check solvability: all clues combined must uniquely identify treasure
    if (isSolvable(lastClues, rooms, treasureId)) {
      return lastClues;
    }
  }

  // Return last attempt even if not perfectly solvable (safety net)
  return lastClues;
}

function isSolvable(
  clues: Map<number, Clue>,
  rooms: Room[],
  treasureId: number
): boolean {
  let candidates = rooms.map(r => r.id);

  for (const [roomId, clue] of clues) {
    const clueRoom = rooms.find(r => r.id === roomId)!;
    candidates = candidates.filter(id => {
      const candidate = rooms.find(r => r.id === id)!;
      return roomMatchesClue(candidate, clue, clueRoom, rooms);
    });
  }

  return candidates.length === 1 && candidates[0] === treasureId;
}

export function roomMatchesClue(
  candidate: Room,
  clue: Clue,
  clueRoom: Room,
  rooms: Room[]
): boolean {
  switch (clue.category) {
    case 'connection': {
      const n = parseInt(clue.compact);
      const distFromCandidate = calculateDistances(rooms, candidate.id);
      const clueRoomDist = distFromCandidate.get(clueRoom.id) || 0;
      const closerExits = clueRoom.connections.filter(connId => {
        const connDist = distFromCandidate.get(connId);
        return connDist !== undefined && connDist < clueRoomDist;
      }).length;
      return closerExits === n;
    }
    case 'spatial': {
      const dx = candidate.x - clueRoom.x;
      const dy = candidate.y - clueRoom.y;
      if (clue.compact.includes('Right')) return dx > 0;
      if (clue.compact.includes('Left')) return dx < 0;
      if (clue.compact.includes('Below')) return dy > 0;
      if (clue.compact.includes('Above')) return dy < 0;
      if (clue.compact.includes('Same col')) return dx === 0;
      if (clue.compact.includes('Same row')) return dy === 0;
      return true;
    }
    case 'relational': {
      const isAdj = clueRoom.connections.includes(candidate.id);
      return clue.compact === 'Adjacent!' ? isAdj : !isAdj;
    }
    case 'entrance': {
      const d = parseInt(clue.compact);
      const distFromClueRoom = calculateDistances(rooms, clueRoom.id);
      return distFromClueRoom.get(candidate.id) === d;
    }
    default:
      return true;
  }
}

function buildClue(
  category: ClueCategory,
  room: Room,
  treasureRoom: Room,
  distFromTreasure: Map<number, number>,
  random: () => number
): Clue {
  switch (category) {
    case 'connection': {
      const roomDist = distFromTreasure.get(room.id) || 0;
      const n = room.connections.filter(connId => {
        const connDist = distFromTreasure.get(connId);
        return connDist !== undefined && connDist < roomDist;
      }).length;
      return {
        category: 'connection',
        text: `${n} of your exits lead${n === 1 ? 's' : ''} toward the relic`,
        compact: `${n} path${n !== 1 ? 's' : ''} closer`,
        icon: '\u{1F517}',
      };
    }
    case 'spatial': {
      const dx = treasureRoom.x - room.x;
      const dy = treasureRoom.y - room.y;
      const useX = random() < 0.5;

      if (useX) {
        if (dx > 0) return { category: 'spatial', text: 'The treasure is to the right of here', compact: '\u2192 Right', icon: '\u{1F4CD}' };
        if (dx < 0) return { category: 'spatial', text: 'The treasure is to the left of here', compact: '\u2190 Left', icon: '\u{1F4CD}' };
        return { category: 'spatial', text: 'The treasure is in the same column', compact: '| Same col', icon: '\u{1F4CD}' };
      } else {
        if (dy > 0) return { category: 'spatial', text: 'The treasure is below here', compact: '\u2193 Below', icon: '\u{1F4CD}' };
        if (dy < 0) return { category: 'spatial', text: 'The treasure is above here', compact: '\u2191 Above', icon: '\u{1F4CD}' };
        return { category: 'spatial', text: 'The treasure is in the same row', compact: '\u2014 Same row', icon: '\u{1F4CD}' };
      }
    }
    case 'relational': {
      const isAdj = room.connections.includes(treasureRoom.id);
      return isAdj
        ? { category: 'relational', text: 'The treasure IS adjacent to this room', compact: 'Adjacent!', icon: '\u{1F441}' }
        : { category: 'relational', text: 'The treasure is NOT adjacent to this room', compact: 'Not adj.', icon: '\u{1F441}' };
    }
    case 'entrance': {
      const d = distFromTreasure.get(room.id) || 0;
      return {
        category: 'entrance',
        text: `The treasure is ${d} steps from here`,
        compact: `${d} steps`,
        icon: '\u{1F6AA}',
      };
    }
  }
}
