export interface Room {
  id: number;
  x: number;
  y: number;
  connections: number[]; // IDs of connected rooms
}

export interface Dungeon {
  rooms: Room[];
  entranceId: number;
  treasureId: number;
  dragonId: number;
}

export type ClueCategory = 'exits' | 'spatial' | 'manhattan' | 'entrance';

export interface Clue {
  category: ClueCategory;
  text: string;     // Full: "The treasure room has 3 exits"
  compact: string;  // Short: "3 exits"
  icon: string;     // Emoji: "🔗"
}

export interface GameState {
  dungeon: Dungeon;
  currentRoomId: number;
  visitedRoomIds: Set<number>;
  moveCount: number;
  hasWon: boolean;
  hasLost: boolean;
  clues: Map<number, Clue>; // roomId -> clue
}

export interface GunudRating {
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  name: string;
  emoji: string;
}

export interface RatingCounts {
  S: number;
  A: number;
  B: number;
  C: number;
  D: number;
}

export interface Stats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string | null;
  moveHistory: number[]; // moves taken to win each game
  ratingCounts: RatingCounts;
}

export interface ShareData {
  puzzleNumber: number;
  moves: number;
  par: number;
  visitedPath: number[];
  dungeon: Dungeon;
}
