import type { Dungeon, GunudRating } from '../types';

export interface ShareResult {
  text: string;
  emojiGrid: string;
}

export function getGunudRating(moves: number, par: number): GunudRating {
  const diff = moves - par;
  if (diff < 0) return { grade: 'S', name: 'Mithril Vein', emoji: '\u2728' };
  if (diff === 0) return { grade: 'A', name: 'Gold Strike', emoji: '\u26A1' };
  if (diff <= 2) return { grade: 'B', name: 'Iron Seam', emoji: '\u26CF\uFE0F' };
  if (diff <= 4) return { grade: 'C', name: 'Rough Tunnel', emoji: '\uD83D\uDD6F\uFE0F' };
  return { grade: 'D', name: 'Cave-in', emoji: '\uD83D\uDC80' };
}

// Generate share text with emoji grid
export function generateShareText(
  puzzleNumber: number,
  moves: number,
  par: number,
  visitedRoomIds: Set<number>,
  dungeon: Dungeon,
  clueCount?: number
): ShareResult {
  const emojiGrid = generateEmojiGrid(dungeon, visitedRoomIds);
  const rating = getGunudRating(moves, par);
  const clues = clueCount ?? visitedRoomIds.size;

  const text = `Gunud #${puzzleNumber}

${emojiGrid}

Rating: ${rating.grade} - ${rating.name} ${rating.emoji}
${moves} moves (Par: ${par}) | Clues: ${clues}

gunud.vercel.app`;

  return { text, emojiGrid };
}

// Generate emoji grid representing dungeon layout
function generateEmojiGrid(dungeon: Dungeon, visitedRoomIds: Set<number>): string {
  const { rooms, entranceId, treasureId } = dungeon;

  // Find bounds
  const xs = rooms.map((r) => r.x);
  const ys = rooms.map((r) => r.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

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
      grid[y][x] = '🟩'; // Gem room
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
    return copyToClipboardFallback(text);
  }
}

// Fallback for older browsers that don't support navigator.clipboard
function copyToClipboardFallback(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand('copy');
    return true;
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}
