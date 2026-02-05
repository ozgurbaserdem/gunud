# Echo Fragments Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace distance numbers with property-based clues that create a logical deduction puzzle.

**Architecture:** New `clueGenerator.ts` post-processes existing dungeon output to assign seeded clues per room. Clues stored in GameState (replaces `distances`). Room component renders clue icons/text instead of distance numbers. Game info section shows current clue prominently below the map.

**Tech Stack:** React 19, TypeScript, Vitest, Tailwind CSS 4

**Working directory:** `/Users/ozgurbaserdem/Desktop/Projects/dungeon-echo/.worktrees/echo-fragments`

---

### Task 1: Add Types & Export RNG Helpers

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/utils/dungeonGenerator.ts` (export only — no logic changes)

**Step 1: Add clue types to `src/types/index.ts`**

Add after the `Dungeon` interface (after line 12):

```typescript
export type ClueCategory = 'connection' | 'spatial' | 'relational' | 'entrance';

export interface Clue {
  category: ClueCategory;
  text: string;     // Full: "The treasure room has 3 exits"
  compact: string;  // Short: "3 exits"
  icon: string;     // Emoji: "🔗"
}
```

Replace the `GameState` interface (lines 14-21) with:

```typescript
export interface GameState {
  dungeon: Dungeon;
  currentRoomId: number;
  visitedRoomIds: Set<number>;
  moveCount: number;
  hasWon: boolean;
  clues: Map<number, Clue>; // roomId -> clue
}
```

Note: `distances` is removed. Clue generation computes distances internally.

**Step 2: Export RNG helpers from `src/utils/dungeonGenerator.ts`**

Line 4: change `function createSeededRandom` to `export function createSeededRandom`
Line 14: change `function dateToSeed` to `export function dateToSeed`

No other changes to this file.

**Step 3: Verify existing dungeon tests still pass**

Run: `npx vitest run src/utils/dungeonGenerator.test.ts`
Expected: 42 tests pass (no GameState references in these tests)

**Step 4: Commit**

```bash
git add src/types/index.ts src/utils/dungeonGenerator.ts
git commit -m "feat: add clue types and export RNG helpers"
```

---

### Task 2: Clue Generator (TDD)

**Files:**
- Create: `src/utils/clueGenerator.ts`
- Create: `src/utils/clueGenerator.test.ts`

**Step 1: Write the test file `src/utils/clueGenerator.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { generateClues } from './clueGenerator';
import { generateDungeon, calculateDistances } from './dungeonGenerator';
import type { ClueCategory, Clue, Room } from '../types';

// Helper: check if a candidate room matches a clue
function roomMatchesClue(
  candidate: Room,
  clue: Clue,
  clueRoom: Room,
  distFromEntrance: Map<number, number>
): boolean {
  switch (clue.category) {
    case 'connection': {
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
      return distFromEntrance.get(candidate.id) === d;
    }
    default:
      return true;
  }
}

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
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/clueGenerator.test.ts`
Expected: FAIL — `generateClues` does not exist yet.

**Step 3: Implement `src/utils/clueGenerator.ts`**

```typescript
import type { Dungeon, Clue, ClueCategory, Room } from '../types';
import { calculateDistances, createSeededRandom, dateToSeed } from './dungeonGenerator';

export function generateClues(dungeon: Dungeon, dateString: string): Map<number, Clue> {
  const seed = dateToSeed(dateString + '-clues');
  const random = createSeededRandom(seed);
  const { rooms, entranceId, treasureId } = dungeon;
  const treasureRoom = rooms.find(r => r.id === treasureId)!;
  const distFromEntrance = calculateDistances(rooms, entranceId);

  // Sort non-treasure rooms by distance from entrance (closest first)
  const clueRooms = rooms
    .filter(r => r.id !== treasureId)
    .sort((a, b) => (distFromEntrance.get(a.id) || 0) - (distFromEntrance.get(b.id) || 0));

  const categories: ClueCategory[] = ['connection', 'spatial', 'relational', 'entrance'];
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
  const clues = new Map<number, Clue>();

  for (const room of clueRooms) {
    const category = assignments.get(room.id)!;
    clues.set(room.id, buildClue(category, room, treasureRoom, distFromEntrance, random));
  }

  return clues;
}

function buildClue(
  category: ClueCategory,
  room: Room,
  treasureRoom: Room,
  distFromEntrance: Map<number, number>,
  random: () => number
): Clue {
  switch (category) {
    case 'connection': {
      const n = treasureRoom.connections.length;
      return {
        category: 'connection',
        text: `The treasure room has ${n} exit${n !== 1 ? 's' : ''}`,
        compact: `${n} exit${n !== 1 ? 's' : ''}`,
        icon: '🔗',
      };
    }
    case 'spatial': {
      const dx = treasureRoom.x - room.x;
      const dy = treasureRoom.y - room.y;
      const useX = random() < 0.5;

      if (useX) {
        if (dx > 0) return { category: 'spatial', text: 'The treasure is to the right of here', compact: '→ Right', icon: '📍' };
        if (dx < 0) return { category: 'spatial', text: 'The treasure is to the left of here', compact: '← Left', icon: '📍' };
        return { category: 'spatial', text: 'The treasure is in the same column', compact: '| Same col', icon: '📍' };
      } else {
        if (dy > 0) return { category: 'spatial', text: 'The treasure is below here', compact: '↓ Below', icon: '📍' };
        if (dy < 0) return { category: 'spatial', text: 'The treasure is above here', compact: '↑ Above', icon: '📍' };
        return { category: 'spatial', text: 'The treasure is in the same row', compact: '— Same row', icon: '📍' };
      }
    }
    case 'relational': {
      const isAdj = room.connections.includes(treasureRoom.id);
      return isAdj
        ? { category: 'relational', text: 'The treasure IS adjacent to this room', compact: 'Adjacent!', icon: '👁' }
        : { category: 'relational', text: 'The treasure is NOT adjacent to this room', compact: 'Not adj.', icon: '👁' };
    }
    case 'entrance': {
      const d = distFromEntrance.get(treasureRoom.id) || 0;
      return {
        category: 'entrance',
        text: `The treasure is ${d} steps from the entrance`,
        compact: `${d} steps`,
        icon: '🚪',
      };
    }
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/clueGenerator.test.ts`
Expected: All tests pass.

If any solvability tests fail, the clue diversity is insufficient for that dungeon.
Fix: in `generateClues`, add a retry loop that reshuffles category assignments
(up to 10 attempts) until all clues combined uniquely identify the treasure.
Only add this if tests fail — YAGNI.

**Step 5: Run all tests**

Run: `npx vitest run`
Expected: clueGenerator tests pass. Some sharing tests may fail if they reference
`distances` on GameState — we'll fix those in Task 5.

**Step 6: Commit**

```bash
git add src/utils/clueGenerator.ts src/utils/clueGenerator.test.ts
git commit -m "feat: add clue generator with TDD tests"
```

---

### Task 3: Update Game Hook & Par Calculation

**Files:**
- Modify: `src/hooks/useGame.ts`

**Step 1: Update imports and initial state**

Replace the file content. Key changes:
- Import `generateClues` instead of `calculateDistancesToTreasure`
- `createInitialState` generates clues instead of distances
- Replace `currentDistance` with `currentClue`
- Par = shortest path + 1 (accounts for clue-gathering overhead)

```typescript
import { useState, useCallback, useMemo, useEffect } from 'react';
import type { GameState, Dungeon, Clue } from '../types';
import {
  generateDungeon,
  getTodayDateString,
  calculatePar,
  getPuzzleNumber,
} from '../utils/dungeonGenerator';
import { generateClues } from '../utils/clueGenerator';

const isDev = import.meta.env.DEV;

interface UseGameReturn {
  gameState: GameState;
  currentClue: Clue | null;
  par: number;
  puzzleNumber: number;
  moveToRoom: (roomId: number) => void;
  resetGame: () => void;
  canMoveTo: (roomId: number) => boolean;
  isRoomVisible: (roomId: number) => boolean;
  regenerateDungeon: () => void;
}

function createInitialState(dungeon: Dungeon, dateString: string): GameState {
  const clues = generateClues(dungeon, dateString);

  return {
    dungeon,
    currentRoomId: dungeon.entranceId,
    visitedRoomIds: new Set([dungeon.entranceId]),
    moveCount: 0,
    hasWon: dungeon.entranceId === dungeon.treasureId,
    clues,
  };
}

export function useGame(): UseGameReturn {
  const dateString = getTodayDateString();
  const puzzleNumber = getPuzzleNumber(dateString);

  const [dungeon, setDungeon] = useState(() => generateDungeon(dateString));
  const [gameState, setGameState] = useState(() => createInitialState(dungeon, dateString));

  // Dev mode: Shift+R to regenerate dungeon with random seed
  const regenerateDungeon = useCallback(() => {
    if (!isDev) return;
    const randomSeed = `dev-${Date.now()}-${Math.random()}`;
    const newDungeon = generateDungeon(randomSeed);
    setDungeon(newDungeon);
    setGameState(createInitialState(newDungeon, randomSeed));
    console.log('[Dev] Regenerated dungeon with seed:', randomSeed);
  }, []);

  useEffect(() => {
    if (!isDev) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        regenerateDungeon();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [regenerateDungeon]);

  // Par = shortest path + 1 (clue-gathering buffer)
  const par = useMemo(() => calculatePar(dungeon) + 1, [dungeon]);

  const currentClue = useMemo(() => {
    return gameState.clues.get(gameState.currentRoomId) ?? null;
  }, [gameState.currentRoomId, gameState.clues]);

  const canMoveTo = useCallback(
    (roomId: number): boolean => {
      if (gameState.hasWon) return false;
      const currentRoom = dungeon.rooms.find((r) => r.id === gameState.currentRoomId);
      if (!currentRoom) return false;
      return currentRoom.connections.includes(roomId);
    },
    [dungeon.rooms, gameState.currentRoomId, gameState.hasWon]
  );

  const isRoomVisible = useCallback(
    (roomId: number): boolean => {
      if (gameState.visitedRoomIds.has(roomId)) return true;
      const currentRoom = dungeon.rooms.find((r) => r.id === gameState.currentRoomId);
      if (!currentRoom) return false;
      return currentRoom.connections.includes(roomId);
    },
    [dungeon.rooms, gameState.currentRoomId, gameState.visitedRoomIds]
  );

  const moveToRoom = useCallback(
    (roomId: number) => {
      if (!canMoveTo(roomId)) return;
      setGameState((prev) => {
        const newVisited = new Set(prev.visitedRoomIds);
        newVisited.add(roomId);
        return {
          ...prev,
          currentRoomId: roomId,
          visitedRoomIds: newVisited,
          moveCount: prev.moveCount + 1,
          hasWon: roomId === dungeon.treasureId,
        };
      });
    },
    [canMoveTo, dungeon.treasureId]
  );

  const resetGame = useCallback(() => {
    setGameState(createInitialState(dungeon, dateString));
  }, [dungeon, dateString]);

  return {
    gameState,
    currentClue,
    par,
    puzzleNumber,
    moveToRoom,
    resetGame,
    canMoveTo,
    isRoomVisible,
    regenerateDungeon,
  };
}
```

**Step 2: Verify the app compiles (ignore type errors in downstream components for now)**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Errors in Game.tsx, DungeonMap.tsx, Room.tsx (they still reference `distances` and `currentDistance`). That's expected — we fix those next.

**Step 3: Commit**

```bash
git add src/hooks/useGame.ts
git commit -m "feat: update game hook to use clues instead of distances"
```

---

### Task 4: Update Room, DungeonMap, and Game Components

**Files:**
- Modify: `src/components/Room.tsx`
- Modify: `src/components/DungeonMap.tsx`
- Modify: `src/components/Game.tsx`

**Step 1: Rewrite Room component**

Replace `src/components/Room.tsx` entirely:

```tsx
import type { Room as RoomType, Clue } from '../types';

interface RoomProps {
  room: RoomType;
  clue: Clue | null;
  isCurrent: boolean;
  isVisited: boolean;
  isVisible: boolean;
  isTreasure: boolean;
  onClick: () => void;
  canClick: boolean;
  scale: number;
}

export function Room({
  room,
  clue,
  isCurrent,
  isVisited,
  isVisible,
  isTreasure,
  onClick,
  canClick,
  scale,
}: RoomProps) {
  const size = 60 * scale;
  const x = room.x * 100 * scale;
  const y = room.y * 100 * scale;

  // Room appearance — no distance-based coloring
  let fillColor = '#2d2d44';
  let strokeColor = '#4a4a6a';
  let strokeWidth = 2;
  let opacity = 0.3;

  if (!isVisible) {
    opacity = 0;
  } else if (isCurrent) {
    fillColor = '#3d3d54';
    strokeColor = '#ffd700';
    strokeWidth = 3;
    opacity = 1;
  } else if (isVisited) {
    fillColor = '#2d2d44';
    strokeColor = '#6a6a8a';
    opacity = 0.7;
  } else {
    // Adjacent, unvisited
    fillColor = '#252538';
    strokeColor = '#5a5a7a';
    opacity = 0.5;
  }

  // Treasure room glow
  if (isTreasure && (isVisited || isCurrent)) {
    fillColor = '#3d3520';
    strokeColor = '#ffd700';
  }

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={canClick ? onClick : undefined}
      style={{ cursor: canClick ? 'pointer' : 'default' }}
      className={isCurrent ? 'current-room' : ''}
    >
      {/* Room background */}
      <rect
        x={-size / 2}
        y={-size / 2}
        width={size}
        height={size}
        rx={4}
        ry={4}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
        style={{ transition: 'fill 0.5s ease-out' }}
      />

      {/* Treasure pulse circles */}
      {isTreasure && isCurrent && (
        <>
          <circle cx={0} cy={0} r={30} className="treasure-pulse" />
          <circle cx={0} cy={0} r={30} className="treasure-pulse-delayed" />
        </>
      )}

      {/* Room content */}
      {isVisible && (
        <>
          {isTreasure && isCurrent ? (
            // Treasure found
            <text
              x={0} y={6}
              textAnchor="middle"
              fontSize={24 * scale}
              fill="#ffd700"
              className="torch-glow"
            >
              💎
            </text>
          ) : isCurrent && clue ? (
            // Current room: icon + compact clue
            <>
              <text
                x={0} y={-2 * scale}
                textAnchor="middle"
                fontSize={16 * scale}
                className="clue-reveal"
              >
                {clue.icon}
              </text>
              <text
                x={0} y={14 * scale}
                textAnchor="middle"
                fontSize={10 * scale}
                fontFamily="'Courier New', monospace"
                fontWeight="bold"
                fill="#ffd700"
                className="clue-reveal"
              >
                {clue.compact}
              </text>
            </>
          ) : isVisited && clue ? (
            // Visited room: icon + compact (dimmer)
            <>
              <text
                x={0} y={-2 * scale}
                textAnchor="middle"
                fontSize={14 * scale}
              >
                {clue.icon}
              </text>
              <text
                x={0} y={14 * scale}
                textAnchor="middle"
                fontSize={8 * scale}
                fontFamily="'Courier New', monospace"
                fill="#707080"
              >
                {clue.compact}
              </text>
            </>
          ) : clue ? (
            // Adjacent unvisited: icon only
            <text
              x={0} y={4 * scale}
              textAnchor="middle"
              fontSize={16 * scale}
              opacity={0.6}
            >
              {clue.icon}
            </text>
          ) : (
            // No clue (shouldn't happen, but fallback)
            <text
              x={0} y={8 * scale}
              textAnchor="middle"
              fontSize={24 * scale}
              fontFamily="'Courier New', monospace"
              fontWeight="bold"
              fill="#505060"
            >
              ?
            </text>
          )}

          {/* "You" indicator */}
          {isCurrent && !isTreasure && (
            <text
              x={0} y={-20 * scale}
              textAnchor="middle"
              fontSize={10 * scale}
              fill="#ffd700"
              fontFamily="'Courier New', monospace"
            >
              YOU
            </text>
          )}
        </>
      )}

      {/* Hover effect */}
      {canClick && (
        <rect
          x={-size / 2}
          y={-size / 2}
          width={size}
          height={size}
          rx={4}
          ry={4}
          fill="transparent"
          stroke="#ffd700"
          strokeWidth={2}
          opacity={0}
          className="room-hover"
        />
      )}
    </g>
  );
}
```

**Step 2: Update DungeonMap to pass clues instead of distances**

In `src/components/DungeonMap.tsx`:

Line 19: change destructuring from:
```typescript
const { dungeon, currentRoomId, visitedRoomIds, distances } = gameState;
```
to:
```typescript
const { dungeon, currentRoomId, visitedRoomIds, clues } = gameState;
```

Lines 105-126: update Room rendering — replace `distance` prop with `clue`:
```tsx
{dungeon.rooms.map((room) => {
  const clue = clues.get(room.id) ?? null;
  const isCurrent = room.id === currentRoomId;
  const isVisited = visitedRoomIds.has(room.id);
  const isVisible = isRoomVisible(room.id);
  const isTreasure = room.id === dungeon.treasureId;
  const canClick = canMoveTo(room.id);

  return (
    <Room
      key={room.id}
      room={room}
      clue={clue}
      isCurrent={isCurrent}
      isVisited={isVisited}
      isVisible={isVisible}
      isTreasure={isTreasure}
      onClick={() => onMoveToRoom(room.id)}
      canClick={canClick}
      scale={scale}
    />
  );
})}
```

**Step 3: Update Game.tsx**

Replace the `useGame` destructuring (line 10-11):
```typescript
const { gameState, currentClue, par, puzzleNumber, moveToRoom, canMoveTo, isRoomVisible } =
  useGame();
```

Replace the game info section (lines 80-111). The non-won state becomes:
```tsx
<>
  <div className="flex items-center justify-center gap-6 mb-2">
    <div className="text-center">
      <p className="text-xs text-[#a0a0b0]">CLUES</p>
      <p className="text-3xl font-bold text-[#ffd700] torch-glow">
        {gameState.visitedRoomIds.size}
      </p>
    </div>
    <div className="w-px h-10 bg-[#4a4a6a]" />
    <div className="text-center">
      <p className="text-xs text-[#a0a0b0]">MOVES</p>
      <p className="text-3xl font-bold">{gameState.moveCount}</p>
    </div>
    <div className="w-px h-10 bg-[#4a4a6a]" />
    <div className="text-center">
      <p className="text-xs text-[#a0a0b0]">PAR</p>
      <p className="text-3xl font-bold text-[#a0a0b0]">{par}</p>
    </div>
  </div>

  {/* Current room's full clue text */}
  {currentClue && (
    <p className="text-base text-[#ffd700] font-bold mb-2 clue-reveal">
      {currentClue.icon} {currentClue.text}
    </p>
  )}

  <p className="text-sm text-[#a0a0b0]">Collect clues to find the treasure</p>
</>
```

**Step 4: Verify the app compiles and renders**

Run: `npx tsc --noEmit`
Expected: No type errors (or only pre-existing lint warnings in Game.tsx).

Run: `npx vite build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/components/Room.tsx src/components/DungeonMap.tsx src/components/Game.tsx
git commit -m "feat: display clues in rooms and game UI"
```

---

### Task 5: Update Sharing & Share Modal

**Files:**
- Modify: `src/utils/sharing.ts`
- Modify: `src/utils/sharing.test.ts`
- Modify: `src/components/ShareModal.tsx`

**Step 1: Update sharing.ts — rename "Echoes" to "Clues" in share text**

In `generateShareText` (line 30-37), change the stats line:
```typescript
const text = `Dungeon Echo #${puzzleNumber}

${emojiGrid}

Rating: ${rating.grade} - ${rating.name} ${rating.emoji}
${moves} moves (Par: ${par}) | Clues: ${echoes}

dungeonecho.game`;
```

Only the word `Echoes` changes to `Clues` in the template string.

**Step 2: Update sharing tests**

In `src/utils/sharing.test.ts`, find any assertions that check for the string "Echoes:" and
change them to "Clues:". For example:
```typescript
// Old:
expect(result.text).toContain('Echoes:');
// New:
expect(result.text).toContain('Clues:');
```

**Step 3: Update ShareModal.tsx labels**

In the stats row (around line 168), change "Echoes" label to "Clues":
```tsx
<p className="text-xs text-[#a0a0b0] uppercase">Clues</p>
```

**Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (dungeon generator: 42, sharing: 28, clue generator: ~20).

**Step 5: Commit**

```bash
git add src/utils/sharing.ts src/utils/sharing.test.ts src/components/ShareModal.tsx
git commit -m "feat: update sharing text and modal to use 'Clues' label"
```

---

### Task 6: Tutorial & CSS Updates

**Files:**
- Modify: `src/components/HowToPlay.tsx`
- Modify: `src/index.css`

**Step 1: Rewrite HowToPlay for Echo Fragments**

Replace the content section of `src/components/HowToPlay.tsx`:

```tsx
interface HowToPlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowToPlay({ isOpen, onClose }: HowToPlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2d2d44] rounded-lg p-6 max-w-md w-full pixel-border">
        <h2 className="text-2xl font-bold text-[#ffd700] mb-4 text-center">How to Play</h2>

        <div className="space-y-4 text-[#e8e8f0]">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚪</span>
            <div>
              <p className="font-bold">Enter the Dungeon</p>
              <p className="text-sm text-[#a0a0b0]">
                You start at the entrance. Each room holds a clue about the treasure.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">🔍</span>
            <div>
              <p className="font-bold">Collect Clues</p>
              <p className="text-sm text-[#a0a0b0]">
                Each room reveals a property of the treasure room — its exits (🔗),
                direction (📍), adjacency (👁), or distance from entrance (🚪).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">🧩</span>
            <div>
              <p className="font-bold">Deduce</p>
              <p className="text-sm text-[#a0a0b0]">
                Combine clues to eliminate rooms. When only one room fits all the
                clues — that's where the treasure is!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">💎</span>
            <div>
              <p className="font-bold">Find the Treasure</p>
              <p className="text-sm text-[#a0a0b0]">
                Navigate to the room you've deduced. Fewer moves = better rating!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="font-bold">Daily Puzzle</p>
              <p className="text-sm text-[#a0a0b0]">
                Same dungeon for everyone each day. Come back tomorrow for a new challenge!
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 bg-[#ffd700] text-[#1a1a2e] px-6 py-3 rounded font-bold hover:bg-[#ffed4a] transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Add clue reveal animation to `src/index.css`**

Add after the `.distance-reveal` block (around line 129):

```css
/* Clue reveal (room entry) */
@keyframes clue-reveal {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.clue-reveal {
  animation: clue-reveal 0.4s ease-out forwards;
}
```

The existing `.distance-reveal` class can be left in place (harmless) or removed.

**Step 3: Run all tests and build**

Run: `npx vitest run`
Expected: All tests pass.

Run: `npx vite build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/components/HowToPlay.tsx src/index.css
git commit -m "feat: update tutorial for clue mechanic and add clue animation"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Types & RNG exports | types/index.ts, dungeonGenerator.ts |
| 2 | Clue generator (TDD) | clueGenerator.ts, clueGenerator.test.ts |
| 3 | Game hook & par | useGame.ts |
| 4 | Room, Map, Game UI | Room.tsx, DungeonMap.tsx, Game.tsx |
| 5 | Sharing & modal | sharing.ts, sharing.test.ts, ShareModal.tsx |
| 6 | Tutorial & CSS | HowToPlay.tsx, index.css |

**Total new/modified files:** 11
**New test file:** 1 (clueGenerator.test.ts with ~20 tests)
**Estimated new tests:** ~20 (clue generator) + updates to ~5 existing sharing tests
