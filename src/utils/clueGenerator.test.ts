import { describe, it, expect } from 'vitest';
import { generateClues, roomMatchesClue } from './clueGenerator';
import { generateDungeon, calculateDistances } from './dungeonGenerator';
import type { ClueCategory } from '../types';

describe('generateClues', () => {
  const dateString = '2026-02-05';
  const dungeon = generateDungeon(dateString);
  const clues = generateClues(dungeon, dateString);

  it('generates a clue for every non-treasure room', () => {
    const nonTreasure = dungeon.rooms.filter(r => r.id !== dungeon.treasureId);
    for (const room of nonTreasure) {
      expect(clues.has(room.id)).toBe(true);
    }
  });

  it('does not generate a clue for the treasure room', () => {
    expect(clues.has(dungeon.treasureId)).toBe(false);
  });

  it('includes at least one of each clue category', () => {
    const cats = new Set<ClueCategory>();
    for (const clue of clues.values()) cats.add(clue.category);
    expect(cats.has('connection')).toBe(true);
    expect(cats.has('spatial')).toBe(true);
    expect(cats.has('relational')).toBe(true);
    expect(cats.has('entrance')).toBe(true);
  });

  it('is deterministic — same inputs produce same output', () => {
    const clues2 = generateClues(dungeon, dateString);
    for (const [roomId, clue] of clues) {
      const clue2 = clues2.get(roomId)!;
      expect(clue2.category).toBe(clue.category);
      expect(clue2.text).toBe(clue.text);
      expect(clue2.compact).toBe(clue.compact);
    }
  });

  it('connection clues match treasure room exit count', () => {
    const treasure = dungeon.rooms.find(r => r.id === dungeon.treasureId)!;
    for (const clue of clues.values()) {
      if (clue.category === 'connection') {
        expect(clue.text).toContain(`${treasure.connections.length} exit`);
      }
    }
  });

  it('spatial clues have correct direction', () => {
    const treasure = dungeon.rooms.find(r => r.id === dungeon.treasureId)!;
    for (const [roomId, clue] of clues) {
      if (clue.category !== 'spatial') continue;
      const room = dungeon.rooms.find(r => r.id === roomId)!;
      const dx = treasure.x - room.x;
      const dy = treasure.y - room.y;
      if (clue.compact.includes('Right')) expect(dx).toBeGreaterThan(0);
      else if (clue.compact.includes('Left')) expect(dx).toBeLessThan(0);
      else if (clue.compact.includes('Below')) expect(dy).toBeGreaterThan(0);
      else if (clue.compact.includes('Above')) expect(dy).toBeLessThan(0);
      else if (clue.compact.includes('Same col')) expect(dx).toBe(0);
      else if (clue.compact.includes('Same row')) expect(dy).toBe(0);
    }
  });

  it('relational clues correctly report adjacency', () => {
    for (const [roomId, clue] of clues) {
      if (clue.category !== 'relational') continue;
      const room = dungeon.rooms.find(r => r.id === roomId)!;
      const isAdj = room.connections.includes(dungeon.treasureId);
      if (clue.compact === 'Adjacent!') expect(isAdj).toBe(true);
      else expect(isAdj).toBe(false);
    }
  });

  it('entrance clues match BFS distance', () => {
    const dist = calculateDistances(dungeon.rooms, dungeon.entranceId);
    const expected = dist.get(dungeon.treasureId)!;
    for (const clue of clues.values()) {
      if (clue.category === 'entrance') {
        expect(clue.text).toContain(`${expected} steps`);
      }
    }
  });

  it('all clues have valid icon and non-empty text', () => {
    const validIcons = ['🔗', '📍', '👁', '🚪'];
    for (const clue of clues.values()) {
      expect(validIcons).toContain(clue.icon);
      expect(clue.text.length).toBeGreaterThan(0);
      expect(clue.compact.length).toBeGreaterThan(0);
    }
  });

  it('produces different clue assignments for different dates', () => {
    const other = generateClues(dungeon, '2026-03-15');
    let diffs = 0;
    for (const [id, clue] of clues) {
      const o = other.get(id);
      if (o && o.category !== clue.category) diffs++;
    }
    expect(diffs).toBeGreaterThan(0);
  });

  // Solvability: all clues combined must uniquely identify treasure
  describe('solvability', () => {
    const dates = [
      '2026-02-05', '2026-02-06', '2026-02-07',
      '2026-02-08', '2026-02-09', '2026-02-10',
      '2026-03-01', '2026-04-15', '2026-06-30',
      '2026-12-25',
    ];

    for (const date of dates) {
      it(`puzzle ${date} is solvable — clues uniquely identify treasure`, () => {
        const d = generateDungeon(date);
        const c = generateClues(d, date);
        const distFromEntrance = calculateDistances(d.rooms, d.entranceId);

        let candidates = d.rooms.map(r => r.id);
        for (const [roomId, clue] of c) {
          const clueRoom = d.rooms.find(r => r.id === roomId)!;
          candidates = candidates.filter(id => {
            const candidate = d.rooms.find(r => r.id === id)!;
            return roomMatchesClue(candidate, clue, clueRoom, distFromEntrance);
          });
        }

        expect(candidates).toContain(d.treasureId);
        expect(candidates.length).toBe(1);
      });
    }
  });
});
