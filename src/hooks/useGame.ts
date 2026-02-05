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
