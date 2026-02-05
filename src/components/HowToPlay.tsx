interface HowToPlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowToPlay({ isOpen, onClose }: HowToPlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2d2d44] rounded-lg p-6 max-w-md w-full pixel-border">
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
              <p className="text-sm text-[#a0a0b0]">
                Each room reveals a property of the treasure room — its exits (🔗),
                direction (📍), adjacency (👁), or distance from entrance (🚪).
              </p>
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
