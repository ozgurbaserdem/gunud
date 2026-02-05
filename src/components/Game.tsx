import { useState, useEffect } from 'react';
import { useGame } from '../hooks/useGame';
import { useStats } from '../hooks/useStats';
import { DungeonMap } from './DungeonMap';
import { ShareModal } from './ShareModal';
import { HowToPlay } from './HowToPlay';
import { Stats } from './Stats';

export function Game() {
  const { gameState, currentClue, par, puzzleNumber, moveToRoom, canMoveTo, isRoomVisible } =
    useGame();

  const { stats, recordWin, hasPlayedToday, averageMoves } = useStats();

  const [showShareModal, setShowShareModal] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [hasRecordedWin, setHasRecordedWin] = useState(false);

  // Show how to play on first visit
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('gunud-tutorial-seen');
    if (!hasSeenTutorial) {
      setShowHowToPlay(true);
      localStorage.setItem('gunud-tutorial-seen', 'true');
    }
  }, []);

  // Handle win
  useEffect(() => {
    if (gameState.hasWon && !hasRecordedWin) {
      if (!hasPlayedToday) {
        recordWin(gameState.moveCount, par);
      }
      setHasRecordedWin(true);
      // Delay showing modal for dramatic effect (let treasure pulse play)
      const timer = setTimeout(() => {
        setShowShareModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState.hasWon, gameState.moveCount, hasRecordedWin, hasPlayedToday, recordWin, par]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[#4a4a6a]/40">
        <div className="flex items-center justify-between max-w-md mx-auto px-4 py-4">
          <button
            onClick={() => setShowHowToPlay(true)}
            className="w-8 h-8 flex items-center justify-center rounded border border-[#4a4a6a] text-sm text-[#a0a0b0] hover:text-[#ffd700] hover:border-[#ffd700]/60 transition-colors"
            title="How to Play"
          >
            ?
          </button>

          <div className="text-center">
            <h1
              className="text-2xl font-bold text-[#ffd700] tracking-[0.15em]"
              style={{ textShadow: '0 0 24px rgba(255,215,0,0.25)' }}
            >
              GUNUD
            </h1>
            <p className="text-[10px] text-[#6a6a8a] tracking-[0.25em] mt-0.5">
              PUZZLE #{puzzleNumber}
            </p>
          </div>

          <button
            onClick={() => setShowStats(true)}
            className="w-8 h-8 flex items-center justify-center rounded border border-[#4a4a6a] text-[#a0a0b0] hover:text-[#ffd700] hover:border-[#ffd700]/60 transition-colors"
            title="Statistics"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="1" y="8" width="3" height="5" rx="0.5" />
              <rect x="5.5" y="4" width="3" height="9" rx="0.5" />
              <rect x="10" y="1" width="3" height="12" rx="0.5" />
            </svg>
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
          {gameState.hasWon ? (
            <div>
              <p className="text-2xl font-bold text-[#ffd700] mb-2 win-text-reveal">🏺 Relic Found!</p>
              <button
                onClick={() => setShowShareModal(true)}
                className="bg-[#ffd700] text-[#1a1a2e] px-6 py-2 rounded font-bold hover:bg-[#ffed4a] transition-colors win-button-reveal"
              >
                Share Result
              </button>
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

              <p className="text-sm text-[#a0a0b0]">Collect clues to find the relic</p>
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
        isOpen={showShareModal}
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
