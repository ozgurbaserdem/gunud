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
                You start at the entrance. Each room shows a number.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">🔢</span>
            <div>
              <p className="font-bold">Distance Hints</p>
              <p className="text-sm text-[#a0a0b0]">
                The number shows how many rooms away the treasure is (via the shortest path).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">🚶</span>
            <div>
              <p className="font-bold">Navigate</p>
              <p className="text-sm text-[#a0a0b0]">
                Click on adjacent rooms or doors to move. Use the numbers to triangulate!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">💎</span>
            <div>
              <p className="font-bold">Find the Treasure</p>
              <p className="text-sm text-[#a0a0b0]">
                When you see 0, you've found it! Try to match or beat par.
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
