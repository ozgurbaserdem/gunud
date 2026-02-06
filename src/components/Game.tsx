import { useState, useEffect, useRef } from 'react';
import { CircleHelp, BarChart3 } from 'lucide-react';
import { useGame } from '../hooks/useGame';
import { useStats } from '../hooks/useStats';
import { DungeonMap } from './DungeonMap';
import { ShareModal } from './ShareModal';
import { HowToPlay } from './HowToPlay';
import { Stats } from './Stats';

export function Game() {
  const {
    gameState, currentClue, par, puzzleNumber, isPractice,
    moveToRoom, canMoveTo, isRoomVisible, startPractice, tryAnother, backToDaily,
  } = useGame();
  const { hasLost } = gameState;

  const { stats, recordWin, hasPlayedToday, averageMoves } = useStats();

  // If game was restored as already won, show modal immediately
  const restoredAsWon = gameState.hasWon && gameState.moveCount > 0;
  const [showShareModal, setShowShareModal] = useState(restoredAsWon);
  const [showHowToPlay, setShowHowToPlay] = useState(() => {
    if (restoredAsWon) return false; // Don't show tutorial over completed game
    const seen = localStorage.getItem('gunud-tutorial-seen');
    if (!seen) {
      localStorage.setItem('gunud-tutorial-seen', 'true');
      return true;
    }
    return false;
  });
  const [showStats, setShowStats] = useState(false);
  const hasRecordedWin = useRef(restoredAsWon);

  // Reset win tracking when dungeon changes (practice mode transitions)
  const dungeonIdRef = useRef(gameState.dungeon);
  useEffect(() => {
    if (gameState.dungeon !== dungeonIdRef.current) {
      dungeonIdRef.current = gameState.dungeon;
      hasRecordedWin.current = false;
    }
  }, [gameState.dungeon]);

  // Handle win (only for fresh wins, not restored)
  useEffect(() => {
    if (gameState.hasWon && !hasRecordedWin.current) {
      if (!isPractice && !hasPlayedToday) {
        recordWin(gameState.moveCount, par);
      }
      hasRecordedWin.current = true;
      if (!isPractice) {
        // Delay showing modal for dramatic effect (let treasure pulse play)
        const timer = setTimeout(() => {
          setShowShareModal(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState.hasWon, gameState.moveCount, hasPlayedToday, recordWin, par, isPractice]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[#4a4a6a]/40">
        <div className="flex items-center justify-between max-w-md mx-auto px-4 py-4">
          <button
            onClick={() => setShowHowToPlay(true)}
            className="text-[#6a6a8a] hover:text-[#ffd700] transition-colors"
            title="How to Play"
          >
            <CircleHelp size={24} strokeWidth={1.5} />
          </button>

          <div className="text-center">
            <h1
              className="text-2xl font-bold text-[#ffd700] tracking-[0.15em]"
              style={{ textShadow: '0 0 24px rgba(255,215,0,0.25)' }}
            >
              /ˈɡunʊd/
            </h1>
            <p className="text-[10px] text-[#6a6a8a] tracking-[0.25em] mt-0.5">
              {isPractice ? 'PRACTICE' : `PUZZLE #${puzzleNumber}`}
            </p>
          </div>

          <button
            onClick={() => setShowStats(true)}
            className="text-[#6a6a8a] hover:text-[#ffd700] transition-colors"
            title="Statistics"
          >
            <BarChart3 size={24} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Game Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <DungeonMap
          gameState={gameState}
          onMoveToRoom={moveToRoom}
          canMoveTo={canMoveTo}
          isRoomVisible={isRoomVisible}
        />

        {/* Game Info */}
        <div className="mt-6 text-center">
          {hasLost ? (
            <div>
              <p className="text-2xl font-bold text-[#ff4444] mb-2 win-text-reveal">🐉 The Dragon Got You!</p>
              {isPractice ? (
                <div className="flex gap-3 win-button-reveal">
                  <button
                    onClick={tryAnother}
                    className="bg-[#ff4444] text-[#1a1a2e] px-6 py-2 rounded font-bold hover:bg-[#ff6666] transition-colors"
                  >
                    Try Another
                  </button>
                  <button
                    onClick={backToDaily}
                    className="border border-[#4a4a6a] text-[#a0a0b0] px-6 py-2 rounded font-bold hover:border-[#ffd700] hover:text-[#ffd700] transition-colors"
                  >
                    Back to Daily
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 win-button-reveal">
                  <button
                    onClick={startPractice}
                    className="bg-[#ffd700] text-[#1a1a2e] px-6 py-2 rounded font-bold hover:bg-[#ffed4a] transition-colors"
                  >
                    Practice Mode
                  </button>
                </div>
              )}
            </div>
          ) : gameState.hasWon ? (
            <div>
              <p className="text-2xl font-bold text-[#ffd700] mb-2 win-text-reveal">💎 Gem Found!</p>
              {isPractice ? (
                <div className="flex gap-3 win-button-reveal">
                  <button
                    onClick={tryAnother}
                    className="bg-[#ffd700] text-[#1a1a2e] px-6 py-2 rounded font-bold hover:bg-[#ffed4a] transition-colors"
                  >
                    Try Another
                  </button>
                  <button
                    onClick={backToDaily}
                    className="border border-[#4a4a6a] text-[#a0a0b0] px-6 py-2 rounded font-bold hover:border-[#ffd700] hover:text-[#ffd700] transition-colors"
                  >
                    Back to Daily
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 win-button-reveal">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="bg-[#ffd700] text-[#1a1a2e] px-6 py-2 rounded font-bold hover:bg-[#ffed4a] transition-colors"
                  >
                    Share Result
                  </button>
                  <button
                    onClick={startPractice}
                    className="text-[#6a6a8a] text-xs hover:text-[#ffd700] transition-colors"
                  >
                    Practice Mode
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-6 mb-2">
                <div className="text-center">
                  <p className="text-xs text-[#a0a0b0]">CLUES</p>
                  <p className="text-3xl font-bold text-[#ffd700] torch-glow">
                    {gameState.visitedRoomIds.size}
                  </p>
                </div>
                <div className="w-px h-10 bg-[#4a4a6a]" />
                <div className="text-center">
                  <p className="text-xs text-[#a0a0b0]">MOVES</p>
                  <p className="text-3xl font-bold">{gameState.moveCount}</p>
                </div>
                <div className="w-px h-10 bg-[#4a4a6a]" />
                <div className="text-center">
                  <p className="text-xs text-[#a0a0b0]">PAR</p>
                  <p className="text-3xl font-bold text-[#a0a0b0]">{par}</p>
                </div>
              </div>

              {currentClue && (
                <p className="text-base text-[#ffd700] font-bold mb-2 clue-reveal">
                  {currentClue.icon} {currentClue.text}
                </p>
              )}

              <p className="text-sm text-[#a0a0b0]">Collect clues to find the gem</p>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-[#6a6a8a]">
        <p>Delve deeper, think smarter</p>
      </footer>

      {/* Modals */}
      <ShareModal
        isOpen={showShareModal && gameState.hasWon}
        onClose={() => setShowShareModal(false)}
        puzzleNumber={puzzleNumber}
        moves={gameState.moveCount}
        par={par}
        visitedRoomIds={gameState.visitedRoomIds}
        dungeon={gameState.dungeon}
        clueCount={gameState.visitedRoomIds.size}
      />

      <HowToPlay isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />

      <Stats
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
        averageMoves={averageMoves}
      />
    </div>
  );
}
