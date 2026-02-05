import { useState, useEffect } from 'react';
import type { Dungeon } from '../types';
import { generateShareText, copyToClipboard } from '../utils/sharing';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  puzzleNumber: number;
  moves: number;
  par: number;
  visitedRoomIds: Set<number>;
  dungeon: Dungeon;
}

export function ShareModal({
  isOpen,
  onClose,
  puzzleNumber,
  moves,
  par,
  visitedRoomIds,
  dungeon,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const { text, emojiGrid } = generateShareText(puzzleNumber, moves, par, visitedRoomIds, dungeon);

  const handleShare = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resultMessage =
    moves < par
      ? `Amazing! ${par - moves} under par!`
      : moves === par
        ? 'Perfect! Right on par!'
        : `Found it! ${moves - par} over par`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2d2d44] rounded-lg p-6 max-w-sm w-full text-center pixel-border relative overflow-hidden">
        {/* Confetti animation */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute text-2xl animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${0.5 + Math.random() * 0.5}s`,
                }}
              >
                {['✨', '💎', '🏆', '⭐'][Math.floor(Math.random() * 4)]}
              </div>
            ))}
          </div>
        )}

        <h2 className="text-2xl font-bold text-[#ffd700] mb-2">Treasure Found!</h2>

        <p className="text-lg mb-4">{resultMessage}</p>

        <div className="bg-[#1a1a2e] rounded p-4 mb-4 font-mono text-lg leading-relaxed">
          <div className="mb-2">🏰 Dungeon Echo #{puzzleNumber}</div>
          <div className="whitespace-pre">{emojiGrid}</div>
          <div className="mt-2">
            {moves <= par ? '🏆' : '🗝️'} {moves} moves (Par: {par})
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleShare}
            className="bg-[#ffd700] text-[#1a1a2e] px-6 py-2 rounded font-bold hover:bg-[#ffed4a] transition-colors"
          >
            {copied ? 'Copied!' : 'Share'}
          </button>
          <button
            onClick={onClose}
            className="bg-[#4a4a6a] text-white px-6 py-2 rounded font-bold hover:bg-[#5a5a7a] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
