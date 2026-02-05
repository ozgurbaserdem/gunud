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
    const hasSeenTutorial = localStorage.getItem('dungeon-echo-tutorial-seen');
    if (!hasSeenTutorial) {
      setShowHowToPlay(true);
      localStorage.setItem('dungeon-echo-tutorial-seen', 'true');
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
      <header className="flex items-center justify-between p-4 border-b border-[#4a4a6a]">
        <button
          onClick={() => setShowHowToPlay(true)}
          className="text-2xl hover:scale-110 transition-transform"
          title="How to Play"
        >
          ❓
        </button>

        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-[#ffd700]">🏰 Dungeon Echo</h1>
          <p className="text-xs text-[#a0a0b0]">Puzzle #{puzzleNumber}</p>
        </div>

        <button
          onClick={() => setShowStats(true)}
          className="text-2xl hover:scale-110 transition-transform"
          title="Statistics"
        >
          📊
        </button>
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
              <p className="text-2xl font-bold text-[#ffd700] mb-2 win-text-reveal">💎 Treasure Found!</p>
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

              <p className="text-sm text-[#a0a0b0]">Collect clues to find the treasure</p>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-[#6a6a8a]">
        <p>Triangulate your way to treasure</p>
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
        echoCount={gameState.visitedRoomIds.size}
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
