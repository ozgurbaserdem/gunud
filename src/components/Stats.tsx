import type { Stats as StatsType } from '../types';

interface StatsProps {
  isOpen: boolean;
  onClose: () => void;
  stats: StatsType;
  averageMoves: number;
}

const GRADE_COLORS: Record<string, string> = {
  S: 'var(--grade-s)',
  A: 'var(--grade-a)',
  B: 'var(--grade-b)',
  C: 'var(--grade-c)',
  D: 'var(--grade-d)',
};

const GRADES = ['S', 'A', 'B', 'C', 'D'] as const;

export function Stats({ isOpen, onClose, stats, averageMoves }: StatsProps) {
  if (!isOpen) return null;

  const ratingCounts = stats.ratingCounts || { S: 0, A: 0, B: 0, C: 0, D: 0 };
  const maxCount = Math.max(...GRADES.map((g) => ratingCounts[g] || 0), 1);
  const hasAnyRatings = GRADES.some((g) => (ratingCounts[g] || 0) > 0);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2d2d44] rounded-lg p-6 max-w-sm w-full pixel-border">
        <h2 className="text-2xl font-bold text-[#ffd700] mb-6 text-center">Statistics</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatBox label="Played" value={stats.gamesPlayed} />
          <StatBox label="Won" value={stats.gamesWon} />
          <StatBox label="Current Streak" value={stats.currentStreak} emoji="🔥" />
          <StatBox label="Max Streak" value={stats.maxStreak} emoji="🏆" />
        </div>

        {stats.moveHistory.length > 0 && (
          <div className="bg-[#1a1a2e] rounded p-4 mb-6">
            <p className="text-center text-[#a0a0b0] text-sm mb-1">Average Moves</p>
            <p className="text-center text-2xl font-bold text-[#ffd700]">
              {averageMoves.toFixed(1)}
            </p>
          </div>
        )}

        {/* Delve Ratings Distribution */}
        <p className="text-[#a0a0b0] text-sm mb-2 text-center">Delve Ratings</p>
        <div className="bg-[#1a1a2e] rounded p-4 mb-6">
          {hasAnyRatings ? (
            GRADES.map((grade) => {
              const count = ratingCounts[grade] || 0;
              return (
                <div key={grade} className="flex items-center gap-2 mb-1">
                  <span
                    className="w-6 text-right font-bold"
                    style={{ color: GRADE_COLORS[grade] }}
                  >
                    {grade}
                  </span>
                  <div className="flex-1">
                    {count > 0 && (
                      <div
                        className="h-5 rounded-sm"
                        style={{
                          backgroundColor: GRADE_COLORS[grade],
                          width: `${(count / maxCount) * 100}%`,
                          minWidth: '8px',
                        }}
                      />
                    )}
                  </div>
                  {count > 0 && (
                    <span className="w-8 text-left text-sm text-[#a0a0b0]">{count}</span>
                  )}
                  {count === 0 && <span className="w-8" />}
                </div>
              );
            })
          ) : (
            <p className="text-[#606068] text-sm text-center">Play to see your ratings</p>
          )}
        </div>

        {stats.moveHistory.length > 0 && (
          <div className="mb-6">
            <p className="text-[#a0a0b0] text-sm mb-2 text-center">Recent Games</p>
            <div className="flex gap-1 justify-center flex-wrap">
              {stats.moveHistory.slice(-10).map((moves, i) => (
                <div
                  key={i}
                  className="w-8 h-8 bg-[#1a1a2e] rounded flex items-center justify-center text-sm font-mono"
                  title={`${moves} moves`}
                >
                  {moves}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full bg-[#4a4a6a] text-white px-6 py-3 rounded font-bold hover:bg-[#5a5a7a] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  emoji,
}: {
  label: string;
  value: number;
  emoji?: string;
}) {
  return (
    <div className="bg-[#1a1a2e] rounded p-3 text-center">
      <p className="text-[#a0a0b0] text-xs mb-1">{label}</p>
      <p className="text-2xl font-bold">
        {emoji && <span className="mr-1">{emoji}</span>}
        {value}
      </p>
    </div>
  );
}
