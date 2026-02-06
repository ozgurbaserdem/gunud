import type { Dungeon, Clue, ClueCategory, Room } from '../types';
import { calculateDistances } from './graphUtils';
import { createSeededRandom, dateToSeed } from './seedRandom';

export function generateClues(dungeon: Dungeon, dateString: string): Map<number, Clue> {
  const seed = dateToSeed(dateString + '-clues');
  const random = createSeededRandom(seed);
  const { rooms, entranceId, treasureId } = dungeon;
  const treasureRoom = rooms.find(r => r.id === treasureId)!;
  const distFromEntrance = calculateDistances(rooms, entranceId);
  const distFromTreasure = calculateDistances(rooms, treasureId);

  // Sort non-treasure, non-dragon rooms by distance from entrance (closest first)
  const clueRooms = rooms
    .filter(r => r.id !== treasureId && r.id !== dungeon.dragonId)
    .sort((a, b) => (distFromEntrance.get(a.id) || 0) - (distFromEntrance.get(b.id) || 0));

  const categories: ClueCategory[] = ['exits', 'spatial', 'manhattan', 'entrance'];

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
    case 'exits': {
      const n = parseInt(clue.compact);
      return candidate.connections.length === n;
    }
    case 'spatial': {
      const dx = candidate.x - clueRoom.x;
      const dy = candidate.y - clueRoom.y;
      if (clue.compact.includes('Right')) return dx > 0;
      if (clue.compact.includes('Left')) return dx < 0;
      if (clue.compact.includes('Below')) return dy > 0;
      if (clue.compact.includes('Above')) return dy < 0;
      if (clue.compact.includes('Col')) return dx === 0;
      if (clue.compact.includes('Row')) return dy === 0;
      return true;
    }
    case 'manhattan': {
      const n = parseInt(clue.compact);
      const dx = Math.abs(candidate.x - clueRoom.x);
      const dy = Math.abs(candidate.y - clueRoom.y);
      return (dx + dy) === n;
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

function buildSpatialClue(dx: number, dy: number, useX: boolean): Clue {
  const icon = '\u{1F4CD}';

  if (useX) {
    if (dx > 0) return { category: 'spatial', text: 'The gem is to the right of here', compact: '\u2192 Right', icon };
    if (dx < 0) return { category: 'spatial', text: 'The gem is to the left of here', compact: '\u2190 Left', icon };
    return { category: 'spatial', text: 'The gem is in the same column', compact: '↕ Col', icon };
  }

  if (dy > 0) return { category: 'spatial', text: 'The gem is below here', compact: '\u2193 Below', icon };
  if (dy < 0) return { category: 'spatial', text: 'The gem is above here', compact: '\u2191 Above', icon };
  return { category: 'spatial', text: 'The gem is in the same row', compact: '↔ Row', icon };
}

function buildClue(
  category: ClueCategory,
  room: Room,
  treasureRoom: Room,
  distFromTreasure: Map<number, number>,
  random: () => number
): Clue {
  switch (category) {
    case 'exits': {
      const exitCount = treasureRoom.connections.length;
      return {
        category: 'exits',
        text: `The gem chamber has ${exitCount} exit${exitCount !== 1 ? 's' : ''}`,
        compact: `${exitCount} exit${exitCount !== 1 ? 's' : ''}`,
        icon: '\u{1F517}',
      };
    }
    case 'spatial': {
      const dx = treasureRoom.x - room.x;
      const dy = treasureRoom.y - room.y;
      return buildSpatialClue(dx, dy, random() < 0.5);
    }
    case 'manhattan': {
      const manhattan = Math.abs(treasureRoom.x - room.x) + Math.abs(treasureRoom.y - room.y);
      return {
        category: 'manhattan',
        text: `The gem is ${manhattan} grid square${manhattan !== 1 ? 's' : ''} away`,
        compact: `${manhattan} sq.`,
        icon: '\u{1F4CF}',
      };
    }
    case 'entrance': {
      const d = distFromTreasure.get(room.id) || 0;
      return {
        category: 'entrance',
        text: `The gem is ${d} steps from here`,
        compact: `${d} steps`,
        icon: '\u{1F6AA}',
      };
    }
  }
}
