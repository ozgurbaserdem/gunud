import type { Dungeon, EchoRating } from '../types';

export interface ShareResult {
  text: string;
  emojiGrid: string;
}

export function getEchoRating(moves: number, par: number): EchoRating {
  const diff = moves - par;
  if (diff < 0) return { grade: 'S', name: 'Silent Steps', emoji: '\u2728' };
  if (diff === 0) return { grade: 'A', name: 'Sharp Echo', emoji: '\u26A1' };
  if (diff <= 2) return { grade: 'B', name: 'Clear Echo', emoji: '\uD83D\uDD2E' };
  if (diff <= 4) return { grade: 'C', name: 'Fading Echo', emoji: '\uD83D\uDD6F\uFE0F' };
  return { grade: 'D', name: 'Lost Echo', emoji: '\uD83D\uDC80' };
}

// Generate share text with emoji grid
export function generateShareText(
  puzzleNumber: number,
  moves: number,
  par: number,
  visitedRoomIds: Set<number>,
  dungeon: Dungeon,
  echoCount?: number
): ShareResult {
  const emojiGrid = generateEmojiGrid(dungeon, visitedRoomIds);
  const rating = getEchoRating(moves, par);
  const echoes = echoCount ?? visitedRoomIds.size;

  const text = `Dungeon Echo #${puzzleNumber}

${emojiGrid}

Rating: ${rating.grade} - ${rating.name} ${rating.emoji}
${moves} moves (Par: ${par}) | Clues: ${echoes}

dungeonecho.game`;

  return { text, emojiGrid };
}

// Generate emoji grid representing dungeon layout
function generateEmojiGrid(dungeon: Dungeon, visitedRoomIds: Set<number>): string {
  const { rooms, entranceId, treasureId } = dungeon;

  // Find bounds
  const minX = Math.min(...rooms.map((r) => r.x));
  const maxX = Math.max(...rooms.map((r) => r.x));
  const minY = Math.min(...rooms.map((r) => r.y));
  const maxY = Math.max(...rooms.map((r) => r.y));

  // Create grid
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const grid: string[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill('⬛'));

  // Place rooms
  for (const room of rooms) {
    const x = room.x - minX;
    const y = room.y - minY;

    if (room.id === treasureId) {
      grid[y][x] = '🟩'; // Treasure room
    } else if (room.id === entranceId) {
      grid[y][x] = '🚪'; // Entrance
    } else if (visitedRoomIds.has(room.id)) {
      grid[y][x] = '🟨'; // Visited
    } else {
      grid[y][x] = '⬜'; // Unvisited
    }
  }

  return grid.map((row) => row.join('')).join('\n');
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      document.body.removeChild(textarea);
      return false;
    }
  }
}
