import { useEscapeKey } from '../../hooks/useEscapeKey';

interface HowToPlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowToPlay({ isOpen, onClose }: HowToPlayProps) {
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dungeon-floor rounded-lg p-6 max-w-md w-full pixel-border max-h-[calc(100vh-2rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-treasure-gold text-center flex-1">How to Play</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-2xl leading-none ml-2" aria-label="Close">&times;</button>
        </div>

        <div className="text-center mb-4 pb-4 border-b border-dungeon-wall/40">
          <p className="text-lg font-bold text-treasure-gold">/ˈɡunʊd/</p>
          <p className="text-xs text-text-secondary mt-1">
            Khuzdul for &ldquo;to dig underground&rdquo; — from the secret tongue of the Dwarves.
          </p>
          <p className="text-sm text-text-primary mt-2">
            Delve into the mountain. Seek the gem hidden in the deep.
          </p>
        </div>

        <div className="space-y-4 text-text-primary">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚪</span>
            <div>
              <p className="font-bold">Enter the Mines</p>
              <p className="text-sm text-text-secondary">
                You start at the entrance. Each tunnel holds a clue about the gem.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">🔍</span>
            <div>
              <p className="font-bold">Collect Clues</p>
              <p className="text-sm text-text-secondary mb-2">
                Each room holds a different type of clue:
              </p>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>📍 <span className="text-text-primary">Direction</span> — left, right, above, or below</li>
                <li>🚪 <span className="text-text-primary">Path distance</span> — steps to the gem</li>
                <li>🔗 <span className="text-text-primary">Exits</span> — how many exits the gem chamber has</li>
                <li>📏 <span className="text-text-primary">Grid distance</span> — grid squares away</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">🧩</span>
            <div>
              <p className="font-bold">Deduce</p>
              <p className="text-sm text-text-secondary">
                Combine clues to eliminate rooms. When only one room fits all the
                clues — that's where the gem is!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">💎</span>
            <div>
              <p className="font-bold">Find the Gem</p>
              <p className="text-sm text-text-secondary">
                Navigate to the chamber you've deduced. Fewer moves = better rating!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">🐉</span>
            <div>
              <p className="font-bold text-danger">Beware the Dragon</p>
              <p className="text-sm text-text-secondary">
                One room hides a dragon. Step on it and your quest ends! Use clues to avoid it.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="font-bold">Daily Puzzle</p>
              <p className="text-sm text-text-secondary">
                Same dungeon for everyone each day. Come back tomorrow for a new challenge!
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 bg-treasure-gold text-dungeon-bg px-6 py-3 rounded font-bold hover:bg-treasure-gold-light transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
