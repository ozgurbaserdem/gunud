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
    expect(cats.has('parity')).toBe(true);
    expect(cats.has('spatial')).toBe(true);
    expect(cats.has('manhattan')).toBe(true);
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

  it('parity clues report correct even/odd distance', () => {
    const distFromTreasure = calculateDistances(dungeon.rooms, dungeon.treasureId);
    for (const [roomId, clue] of clues) {
      if (clue.category !== 'parity') continue;
      const d = distFromTreasure.get(roomId)!;
      const isEven = d % 2 === 0;
      expect(clue.compact).toBe(isEven ? 'Even dist.' : 'Odd dist.');
      expect(clue.text).toContain(isEven ? 'even' : 'odd');
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

  it('manhattan clues report correct grid distance', () => {
    const treasure = dungeon.rooms.find(r => r.id === dungeon.treasureId)!;
    for (const [roomId, clue] of clues) {
      if (clue.category !== 'manhattan') continue;
      const room = dungeon.rooms.find(r => r.id === roomId)!;
      const expectedDist = Math.abs(treasure.x - room.x) + Math.abs(treasure.y - room.y);
      expect(clue.compact).toBe(`${expectedDist} sq.`);
      expect(clue.text).toContain(`${expectedDist} square`);
    }
  });

  it('entrance clues show distance from that room to treasure', () => {
    const distFromTreasure = calculateDistances(dungeon.rooms, dungeon.treasureId);
    for (const [roomId, clue] of clues) {
      if (clue.category !== 'entrance') continue;
      const expected = distFromTreasure.get(roomId)!;
      expect(clue.text).toContain(`${expected} steps`);
    }
  });

  it('all clues have valid icon and non-empty text', () => {
    const validIcons = ['\u2696\uFE0F', '\u{1F4CD}', '\u{1F4D0}', '\u{1F6AA}'];
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

        let candidates = d.rooms.map(r => r.id);
        for (const [roomId, clue] of c) {
          const clueRoom = d.rooms.find(r => r.id === roomId)!;
          candidates = candidates.filter(id => {
            const candidate = d.rooms.find(r => r.id === id)!;
            return roomMatchesClue(candidate, clue, clueRoom, d.rooms);
          });
        }

        expect(candidates).toContain(d.treasureId);
        expect(candidates.length).toBe(1);
      });
    }
  });

  // Verify parity clues actually vary (not always the same value)
  describe('clue variety', () => {
    it('parity clues produce both even and odd across multiple dungeons', () => {
      const parityValues = new Set<string>();
      for (let i = 1; i <= 30; i++) {
        const date = `2026-03-${String(i).padStart(2, '0')}`;
        const d = generateDungeon(date);
        const c = generateClues(d, date);
        for (const clue of c.values()) {
          if (clue.category === 'parity') parityValues.add(clue.compact);
        }
      }
      expect(parityValues.has('Even dist.')).toBe(true);
      expect(parityValues.has('Odd dist.')).toBe(true);
    });

    it('manhattan clues produce varying distances across rooms', () => {
      const manhattanValues = new Set<string>();
      for (let i = 1; i <= 10; i++) {
        const date = `2026-04-${String(i).padStart(2, '0')}`;
        const d = generateDungeon(date);
        const c = generateClues(d, date);
        for (const clue of c.values()) {
          if (clue.category === 'manhattan') manhattanValues.add(clue.compact);
        }
      }
      // Manhattan distances should vary — at least 3 different values across 10 puzzles
      expect(manhattanValues.size).toBeGreaterThanOrEqual(3);
    });
  });
});
