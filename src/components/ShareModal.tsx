import { useState, useEffect } from 'react';
import type { Dungeon } from '../types';
import { generateShareText, copyToClipboard, getEchoRating } from '../utils/sharing';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  puzzleNumber: number;
  moves: number;
  par: number;
  visitedRoomIds: Set<number>;
  dungeon: Dungeon;
  echoCount: number;
}

const GRADE_COLORS: Record<string, string> = {
  S: 'var(--grade-s)',
  A: 'var(--grade-a)',
  B: 'var(--grade-b)',
  C: 'var(--grade-c)',
  D: 'var(--grade-d)',
};

const GRADE_SHADOWS: Record<string, string> = {
  S: '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)',
  A: '0 0 15px rgba(240, 192, 64, 0.5), 0 0 30px rgba(240, 192, 64, 0.2)',
  B: '0 0 10px rgba(168, 180, 192, 0.4)',
};

interface ConfettiConfig {
  count: number;
  emojis: string[];
  duration: string;
  maxDelay: number;
}

const CONFETTI_CONFIG: Record<string, ConfettiConfig | null> = {
  S: { count: 12, emojis: ['\u2728'], duration: '2.5s', maxDelay: 0.8 },
  A: { count: 8, emojis: ['\u26A1', '\u2728'], duration: '2s', maxDelay: 0.5 },
  B: { count: 4, emojis: ['\uD83D\uDD2E'], duration: '3s', maxDelay: 0.3 },
  C: null,
  D: null,
};

function getContextMessage(grade: string, moves: number, par: number): string | null {
  const diff = moves - par;
  switch (grade) {
    case 'S': return null;
    case 'A': return 'Perfect navigation.';
    case 'B': return `So close! Just ${diff} step${diff > 1 ? 's' : ''} off.`;
    case 'C': return 'The echoes faded...';
    case 'D': return 'Lost in the dark.';
    default: return null;
  }
}

export function ShareModal({
  isOpen,
  onClose,
  puzzleNumber,
  moves,
  par,
  visitedRoomIds,
  dungeon,
  echoCount,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const rating = getEchoRating(moves, par);
  const confettiConfig = CONFETTI_CONFIG[rating.grade];

  // Manage confetti phase with a single state driven by CSS animation timing
  const [confettiPhase, setConfettiPhase] = useState<'active' | 'shimmer' | 'done'>('done');

  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing animation phase with isOpen prop
      setConfettiPhase('done');
      return;
    }
    setConfettiPhase('active');
    const confettiDuration = confettiConfig
      ? parseFloat(confettiConfig.duration) * 1000 + confettiConfig.maxDelay * 1000
      : 0;
    const timer = setTimeout(() => {
      setConfettiPhase(rating.grade === 'S' ? 'shimmer' : 'done');
    }, confettiDuration || 500);
    return () => clearTimeout(timer);
  }, [isOpen, rating.grade, confettiConfig]);

  const showConfetti = confettiPhase === 'active';
  const showShimmer = confettiPhase === 'shimmer';

  if (!isOpen) return null;

  const { text, emojiGrid } = generateShareText(
    puzzleNumber, moves, par, visitedRoomIds, dungeon, echoCount
  );

  const handleShare = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const gradeColor = GRADE_COLORS[rating.grade];
  const gradeShadow = GRADE_SHADOWS[rating.grade] || 'none';
  const contextMessage = getContextMessage(rating.grade, moves, par);
  const echoesHighlight = echoCount <= moves;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2d2d44] rounded-lg p-6 max-w-sm w-full text-center pixel-border relative overflow-hidden modal-enter">
        {/* Tiered confetti */}
        {showConfetti && confettiConfig && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(confettiConfig.count)].map((_, i) => (
              <div
                key={i}
                className="confetti-particle"
                style={{
                  left: `${10 + (i / confettiConfig.count) * 80}%`,
                  '--drift': `${i % 2 === 0 ? -20 : 20}px`,
                  '--duration': confettiConfig.duration,
                  '--delay': `${(i / confettiConfig.count) * confettiConfig.maxDelay}s`,
                } as React.CSSProperties}
              >
                {confettiConfig.emojis[i % confettiConfig.emojis.length]}
              </div>
            ))}
          </div>
        )}

        {/* Grade Letter */}
        <div
          className={`text-7xl font-bold grade-reveal ${showShimmer ? 'grade-shimmer' : ''}`}
          style={{
            color: gradeColor,
            textShadow: gradeShadow,
            fontFamily: "'Courier New', monospace",
          }}
        >
          {rating.grade}
        </div>

        {/* Grade Name */}
        <div
          className="mt-1 text-lg uppercase tracking-widest"
          style={{ color: gradeColor, opacity: 0.8 }}
        >
          {rating.name}
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-center gap-6 mt-4 mb-2">
          <div className="text-center">
            <p className="text-xs text-[#a0a0b0] uppercase">Moves</p>
            <p className="text-2xl font-bold" style={{ color: gradeColor }}>{moves}</p>
          </div>
          <div className="w-px h-10 bg-[#4a4a6a]" />
          <div className="text-center">
            <p className="text-xs text-[#a0a0b0] uppercase">Par</p>
            <p className="text-2xl font-bold text-[#a0a0b0]">{par}</p>
          </div>
          <div className="w-px h-10 bg-[#4a4a6a]" />
          <div className="text-center">
            <p className="text-xs text-[#a0a0b0] uppercase">Clues</p>
            <p className={`text-2xl font-bold ${echoesHighlight ? 'text-[#ffd700]' : 'text-[#a0a0b0]'}`}>
              {echoCount}
            </p>
          </div>
        </div>

        {/* Context Message */}
        {contextMessage && (
          <p
            className={`text-sm italic mt-2 mb-4 ${rating.grade === 'B' ? 'text-[#c0a070]' : 'text-[#a0a0b0]'}`}
          >
            {contextMessage}
          </p>
        )}

        {/* Emoji Grid */}
        <div className="bg-[#1a1a2e] rounded p-4 mb-4 mt-4 font-mono text-lg leading-relaxed">
          <div className="whitespace-pre">{emojiGrid}</div>
        </div>

        {/* Action Buttons */}
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
