# Gunud

**/ˈɡunʊd/**

A daily dungeon-crawling puzzle game inspired by the secret tongue of the Dwarves. Delve into the mountain, collect clues, and deduce where the hidden gem lies — all in under a few minutes, no login required.

> Built for the [Claude Community Hackathon v0.1.0](https://claudecode.community/) — *"A browser-based game with a viral hook."*

## Play

[**gunud.vercel.app**](https://gunud.vercel.app)

## How It Works

1. **Enter the Mines** — You start at the entrance. Each tunnel holds a clue about the gem's location.
2. **Collect Clues** — Clues reveal properties of the gem chamber: direction, path distance, number of exits, or grid distance.
3. **Deduce** — Combine clues to eliminate rooms until only one candidate remains.
4. **Find the Gem** 💎 — Navigate to the chamber you've deduced. Fewer moves = better rating.
5. **Beware the Dragon** 🐉 — One room hides a dragon. Step on it and your quest ends!
6. **Share** — Compare your result with friends. Same dungeon for everyone, every day.

## Features

- **Daily seeded puzzles** — deterministic generation ensures the same dungeon for all players each day
- **Four clue types** — direction, path distance, exit count, and grid distance for varied deduction
- **Dragon hazard** 🐉 — one room hides a dragon that ends your quest instantly
- **Dwarven-themed ratings** with par-based scoring
- **Stats tracking** — games played, win streaks, move history, rating distribution
- **Shareable results** with a spoiler-free emoji grid
- **No backend** — runs entirely client-side with localStorage persistence
- **Mobile responsive** — play on any device

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

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| Testing | Vitest |
| Storage | Browser localStorage |
| Deployment | Vercel (static) |

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## License

MIT
