# Dungeon Echo

A daily browser-based puzzle game where players explore a dungeon to find hidden treasure using distance hints.

**Tagline:** *"Triangulate your way to treasure"*

## How to Play

1. **Enter the Dungeon** - You start at the entrance. Your current room shows a number.
2. **Distance Hints** - The number shows how many rooms away the treasure is (via shortest path).
3. **Navigate** - Click adjacent rooms to move. Only your current room reveals its distance!
4. **Find the Treasure** - When you reach distance 0, you've found it! Try to match or beat par.
5. **Daily Puzzle** - Same dungeon for everyone each day. Come back tomorrow for a new challenge!

## Features

- Daily seeded puzzles (same for all players)
- No backend required - runs entirely client-side
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
🏰 Dungeon Echo #42

⬛⬛🟨⬛
⬛🟨🟨⬛
⬛⬛🟩⬛

🏆 Found in 4 moves (Par: 5)

dungeonecho.game
```

## License

MIT
