import { describe, it, expect } from 'vitest';
import { getEchoRating, generateShareText } from './sharing';
import type { Dungeon } from '../types';

describe('getEchoRating', () => {
  describe('grade boundaries', () => {
    it('returns S grade when moves < par (under par)', () => {
      const rating = getEchoRating(3, 5);
      expect(rating.grade).toBe('S');
      expect(rating.name).toBe('Silent Steps');
    });

    it('returns S grade when 1 under par', () => {
      const rating = getEchoRating(4, 5);
      expect(rating.grade).toBe('S');
    });

    it('returns A grade when moves === par (exactly par)', () => {
      const rating = getEchoRating(5, 5);
      expect(rating.grade).toBe('A');
      expect(rating.name).toBe('Sharp Echo');
    });

    it('returns B grade when 1 over par', () => {
      const rating = getEchoRating(6, 5);
      expect(rating.grade).toBe('B');
      expect(rating.name).toBe('Clear Echo');
    });

    it('returns B grade when 2 over par', () => {
      const rating = getEchoRating(7, 5);
      expect(rating.grade).toBe('B');
    });

    it('returns C grade when 3 over par', () => {
      const rating = getEchoRating(8, 5);
      expect(rating.grade).toBe('C');
      expect(rating.name).toBe('Fading Echo');
    });

    it('returns C grade when 4 over par', () => {
      const rating = getEchoRating(9, 5);
      expect(rating.grade).toBe('C');
    });

    it('returns D grade when 5 over par', () => {
      const rating = getEchoRating(10, 5);
      expect(rating.grade).toBe('D');
      expect(rating.name).toBe('Lost Echo');
    });

    it('returns D grade when far over par', () => {
      const rating = getEchoRating(20, 5);
      expect(rating.grade).toBe('D');
    });
  });

  describe('rating properties', () => {
    it('all ratings have a non-empty name', () => {
      const pars = [4, 5, 6];
      for (const par of pars) {
        for (let moves = 1; moves <= par + 10; moves++) {
          const rating = getEchoRating(moves, par);
          expect(rating.name.length).toBeGreaterThan(0);
        }
      }
    });

    it('all ratings have a non-empty emoji', () => {
      const pars = [4, 5, 6];
      for (const par of pars) {
        for (let moves = 1; moves <= par + 10; moves++) {
          const rating = getEchoRating(moves, par);
          expect(rating.emoji.length).toBeGreaterThan(0);
        }
      }
    });

    it('grade is one of S, A, B, C, D', () => {
      const validGrades = ['S', 'A', 'B', 'C', 'D'];
      for (let moves = 1; moves <= 20; moves++) {
        const rating = getEchoRating(moves, 5);
        expect(validGrades).toContain(rating.grade);
      }
    });
  });

  describe('with typical par values (4-6)', () => {
    it('par 4: 3 moves = S, 4 = A, 5-6 = B, 7-8 = C, 9+ = D', () => {
      expect(getEchoRating(3, 4).grade).toBe('S');
      expect(getEchoRating(4, 4).grade).toBe('A');
      expect(getEchoRating(5, 4).grade).toBe('B');
      expect(getEchoRating(6, 4).grade).toBe('B');
      expect(getEchoRating(7, 4).grade).toBe('C');
      expect(getEchoRating(8, 4).grade).toBe('C');
      expect(getEchoRating(9, 4).grade).toBe('D');
    });

    it('par 6: 5 moves = S, 6 = A, 7-8 = B, 9-10 = C, 11+ = D', () => {
      expect(getEchoRating(5, 6).grade).toBe('S');
      expect(getEchoRating(6, 6).grade).toBe('A');
      expect(getEchoRating(7, 6).grade).toBe('B');
      expect(getEchoRating(8, 6).grade).toBe('B');
      expect(getEchoRating(9, 6).grade).toBe('C');
      expect(getEchoRating(10, 6).grade).toBe('C');
      expect(getEchoRating(11, 6).grade).toBe('D');
    });
  });
});

describe('generateShareText', () => {
  // Minimal dungeon for testing share text output
  const testDungeon: Dungeon = {
    rooms: [
      { id: 0, x: 0, y: 0, connections: [1] },
      { id: 1, x: 1, y: 0, connections: [0, 2] },
      { id: 2, x: 2, y: 0, connections: [1, 3] },
      { id: 3, x: 2, y: 1, connections: [2] },
    ],
    entranceId: 0,
    treasureId: 3,
  };

  it('includes puzzle number in header', () => {
    const result = generateShareText(42, 5, 5, new Set([0, 1, 2, 3]), testDungeon);
    expect(result.text).toContain('Dungeon Echo #42');
  });

  it('includes rating line with grade and name', () => {
    const result = generateShareText(42, 5, 5, new Set([0, 1, 2, 3]), testDungeon);
    expect(result.text).toContain('Rating: A - Sharp Echo');
  });

  it('includes moves and par in stats line', () => {
    const result = generateShareText(42, 5, 5, new Set([0, 1, 2, 3]), testDungeon);
    expect(result.text).toContain('5 moves (Par: 5)');
  });

  it('includes echo count from visitedRoomIds.size when echoCount not provided', () => {
    const visited = new Set([0, 1, 2, 3]);
    const result = generateShareText(42, 5, 5, visited, testDungeon);
    expect(result.text).toContain('Clues: 4');
  });

  it('uses explicit echoCount when provided', () => {
    const visited = new Set([0, 1, 2, 3]);
    const result = generateShareText(42, 5, 5, visited, testDungeon, 7);
    expect(result.text).toContain('Clues: 7');
  });

  it('includes site URL', () => {
    const result = generateShareText(42, 5, 5, new Set([0, 1, 2, 3]), testDungeon);
    expect(result.text).toContain('dungeonecho.game');
  });

  it('includes emoji grid in output', () => {
    const result = generateShareText(42, 5, 5, new Set([0, 1, 2, 3]), testDungeon);
    expect(result.emojiGrid).toBeTruthy();
    expect(result.emojiGrid.length).toBeGreaterThan(0);
  });

  describe('emoji grid correctness', () => {
    it('marks entrance with door emoji', () => {
      const visited = new Set([0, 1, 2, 3]);
      const result = generateShareText(1, 3, 3, visited, testDungeon);
      expect(result.emojiGrid).toContain('\uD83D\uDEAA'); // door emoji
    });

    it('marks treasure room with green square', () => {
      const visited = new Set([0, 1, 2, 3]);
      const result = generateShareText(1, 3, 3, visited, testDungeon);
      expect(result.emojiGrid).toContain('\uD83D\uDFE9'); // green square
    });

    it('marks visited rooms with yellow square', () => {
      const visited = new Set([0, 1, 2, 3]);
      const result = generateShareText(1, 3, 3, visited, testDungeon);
      expect(result.emojiGrid).toContain('\uD83D\uDFE8'); // yellow square
    });

    it('marks unvisited rooms with white square', () => {
      // Only visit rooms 0 and 3, leave 1 and 2 unvisited
      const visited = new Set([0, 3]);
      const result = generateShareText(1, 3, 3, visited, testDungeon);
      expect(result.emojiGrid).toContain('\u2B1C'); // white square
    });
  });

  describe('rating in share text matches getEchoRating', () => {
    it('S-rank text when under par', () => {
      const result = generateShareText(1, 3, 5, new Set([0, 1, 2, 3]), testDungeon);
      expect(result.text).toContain('Rating: S - Silent Steps');
    });

    it('B-rank text when 1-2 over par', () => {
      const result = generateShareText(1, 6, 5, new Set([0, 1, 2, 3]), testDungeon);
      expect(result.text).toContain('Rating: B - Clear Echo');
    });

    it('D-rank text when far over par', () => {
      const result = generateShareText(1, 15, 5, new Set([0, 1, 2, 3]), testDungeon);
      expect(result.text).toContain('Rating: D - Lost Echo');
    });
  });
});
