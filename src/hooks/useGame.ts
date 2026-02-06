import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { GameState, Dungeon, Clue } from '../types';
import {
  generateDungeon,
  getTodayDateString,
  calculatePar,
  getPuzzleNumber,
} from '../dungeon';
import { generateClues } from '../dungeon/clueGenerator';

const isDev = import.meta.env.DEV;
const GAME_STATE_KEY = 'gunud-game-state';

interface SavedGameState {
  date: string;
  currentRoomId: number;
  visitedRoomIds: number[];
  moveCount: number;
  hasWon: boolean;
  hasLost: boolean;
}

interface UseGameReturn {
  gameState: GameState;
  currentClue: Clue | null;
  par: number;
  puzzleNumber: number;
  isPractice: boolean;
  moveToRoom: (roomId: number) => void;
  resetGame: () => void;
  canMoveTo: (roomId: number) => boolean;
  isRoomVisible: (roomId: number) => boolean;
  regenerateDungeon: () => void;
  startPractice: () => void;
  tryAnother: () => void;
  backToDaily: () => void;
}

function saveGameState(dateString: string, state: GameState): void {
  try {
    const saved: SavedGameState = {
      date: dateString,
      currentRoomId: state.currentRoomId,
      visitedRoomIds: [...state.visitedRoomIds],
      moveCount: state.moveCount,
      hasWon: state.hasWon,
      hasLost: state.hasLost,
    };
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(saved));
  } catch { /* ignore */ }
}

function loadGameState(dateString: string): SavedGameState | null {
  try {
    const stored = localStorage.getItem(GAME_STATE_KEY);
    if (!stored) return null;
    const parsed: SavedGameState = JSON.parse(stored);
    if (parsed.date !== dateString) return null;
    return parsed;
  } catch {
    return null;
  }
}

function createInitialState(dungeon: Dungeon, dateString: string): GameState {
  const clues = generateClues(dungeon, dateString);

  // Restore saved progress for today's puzzle
  const saved = loadGameState(dateString);
  if (saved) {
    return {
      dungeon,
      currentRoomId: saved.currentRoomId,
      visitedRoomIds: new Set(saved.visitedRoomIds),
      moveCount: saved.moveCount,
      hasWon: saved.hasWon,
      hasLost: saved.hasLost ?? false,
      clues,
    };
  }

  return {
    dungeon,
    currentRoomId: dungeon.entranceId,
    visitedRoomIds: new Set([dungeon.entranceId]),
    moveCount: 0,
    hasWon: dungeon.entranceId === dungeon.treasureId,
    hasLost: false,
    clues,
  };
}

function createPracticeState(dungeon: Dungeon, seed: string): GameState {
  const clues = generateClues(dungeon, seed);
  return {
    dungeon,
    currentRoomId: dungeon.entranceId,
    visitedRoomIds: new Set([dungeon.entranceId]),
    moveCount: 0,
    hasWon: dungeon.entranceId === dungeon.treasureId,
    hasLost: false,
    clues,
  };
}

export function useGame(): UseGameReturn {
  const [dateString, setDateString] = useState(getTodayDateString);
  const puzzleNumber = getPuzzleNumber(dateString);

  const [dungeon, setDungeon] = useState(() => generateDungeon(dateString));
  const [gameState, setGameState] = useState(() => createInitialState(dungeon, dateString));

  // Practice mode
  const [isPractice, setIsPractice] = useState(false);
  const dailyStateRef = useRef<{ dungeon: Dungeon; gameState: GameState } | null>(null);

  // Detect date rollover (tab left open overnight)
  useEffect(() => {
    const checkDate = () => {
      const today = getTodayDateString();
      setDateString(prev => prev !== today ? today : prev);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkDate();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    const interval = setInterval(checkDate, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, []);

  // Regenerate dungeon when date changes (skip initial mount)
  const lastDateRef = useRef(dateString);
  useEffect(() => {
    if (dateString === lastDateRef.current) return;
    lastDateRef.current = dateString;
    const newDungeon = generateDungeon(dateString);
    setDungeon(newDungeon);
    setGameState(createInitialState(newDungeon, dateString));
  }, [dateString]);

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

  const currentRoom = useMemo(
    () => dungeon.rooms.find((r) => r.id === gameState.currentRoomId) ?? null,
    [dungeon.rooms, gameState.currentRoomId]
  );

  const canMoveTo = useCallback(
    (roomId: number): boolean => {
      if (gameState.hasWon || gameState.hasLost) return false;
      return currentRoom?.connections.includes(roomId) ?? false;
    },
    [currentRoom, gameState.hasWon, gameState.hasLost]
  );

  const isRoomVisible = useCallback(
    (roomId: number): boolean => {
      if (gameState.hasWon || gameState.hasLost) return true;
      if (gameState.visitedRoomIds.has(roomId)) return true;
      return currentRoom?.connections.includes(roomId) ?? false;
    },
    [currentRoom, gameState.visitedRoomIds, gameState.hasWon, gameState.hasLost]
  );

  const startPractice = useCallback(() => {
    dailyStateRef.current = { dungeon, gameState };
    const seed = `practice-${Date.now()}-${Math.random()}`;
    const newDungeon = generateDungeon(seed);
    setDungeon(newDungeon);
    setGameState(createPracticeState(newDungeon, seed));
    setIsPractice(true);
  }, [dungeon, gameState]);

  const tryAnother = useCallback(() => {
    const seed = `practice-${Date.now()}-${Math.random()}`;
    const newDungeon = generateDungeon(seed);
    setDungeon(newDungeon);
    setGameState(createPracticeState(newDungeon, seed));
  }, []);

  const backToDaily = useCallback(() => {
    if (dailyStateRef.current) {
      setDungeon(dailyStateRef.current.dungeon);
      setGameState(dailyStateRef.current.gameState);
    }
    setIsPractice(false);
  }, []);

  const moveToRoom = useCallback(
    (roomId: number) => {
      if (!canMoveTo(roomId)) return;
      setGameState((prev) => {
        const newVisited = new Set(prev.visitedRoomIds);
        newVisited.add(roomId);
        const newState = {
          ...prev,
          currentRoomId: roomId,
          visitedRoomIds: newVisited,
          moveCount: prev.moveCount + 1,
          hasWon: roomId === dungeon.treasureId,
          hasLost: roomId === dungeon.dragonId,
        };
        if (!isPractice) {
          saveGameState(dateString, newState);
        }
        return newState;
      });
    },
    [canMoveTo, dungeon.treasureId, dungeon.dragonId, dateString, isPractice]
  );

  const resetGame = useCallback(() => {
    setGameState(createInitialState(dungeon, dateString));
  }, [dungeon, dateString]);

  return {
    gameState,
    currentClue,
    par,
    puzzleNumber,
    isPractice,
    moveToRoom,
    resetGame,
    canMoveTo,
    isRoomVisible,
    regenerateDungeon,
    startPractice,
    tryAnother,
    backToDaily,
  };
}
