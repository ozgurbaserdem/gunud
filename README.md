# Gunud

A daily browser-based puzzle game where players explore a dungeon to find a hidden relic using clues.

**Tagline:** *"Delve deeper, think smarter"*

## How to Play

1. **Enter the Dungeon** - You start at the entrance. Each room holds a clue about the relic.
2. **Collect Clues** - Clues reveal properties of the relic room: exits, direction, adjacency, or distance from entrance.
3. **Deduce** - Combine clues to eliminate rooms until only one fits.
4. **Find the Relic** - Navigate to the room you've deduced. Fewer moves = better rating!
5. **Daily Puzzle** - Same dungeon for everyone each day. Come back tomorrow for a new challenge!

## Features

- Daily seeded puzzles (same for all players)
- No backend required - runs entirely client-side
- Letter grade ratings (S/A/B/C/D)
- Stats tracking with streaks
- Shareable results with emoji grid
- Mobile responsive

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- localStorage for persistence

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Share Format

```
Gunud #42

⬛⬛🟨⬛
⬛🟨🟨⬛
⬛⬛🟩⬛

Rating: A - Swift Delve ⚡
4 moves (Par: 4) | Clues: 3

gunud.vercel.app
```

## License

MIT
