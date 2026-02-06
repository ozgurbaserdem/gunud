import { useEffect } from 'react';

interface HowToPlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowToPlay({ isOpen, onClose }: HowToPlayProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#2d2d44] rounded-lg p-6 max-w-md w-full pixel-border" onClick={e => e.stopPropagation()}>
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
              <p className="text-sm text-[#a0a0b0] mb-2">
                Each room holds a different type of clue:
              </p>
              <ul className="text-sm text-[#a0a0b0] space-y-1">
                <li>📍 <span className="text-[#e8e8f0]">Direction</span> — left, right, above, or below</li>
                <li>🚪 <span className="text-[#e8e8f0]">Path distance</span> — steps to the relic</li>
                <li>🔗 <span className="text-[#e8e8f0]">Exits</span> — how many exits the relic room has</li>
                <li>📏 <span className="text-[#e8e8f0]">Grid distance</span> — grid squares away</li>
              </ul>
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
            <span className="text-2xl">🏺</span>
            <div>
              <p className="font-bold">Find the Relic</p>
              <p className="text-sm text-[#a0a0b0]">
                Navigate to the room you've deduced. Fewer moves = better rating!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">🐉</span>
            <div>
              <p className="font-bold text-[#ff4444]">Beware the Dragon</p>
              <p className="text-sm text-[#a0a0b0]">
                One room hides a dragon. Step on it and your quest ends! Use clues to avoid it.
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
