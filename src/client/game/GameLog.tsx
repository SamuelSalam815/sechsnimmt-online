import { useEffect, useRef } from 'react';
import { CardView } from '#client/game/CardView.tsx';
import { type GameLogLine, listGameLogLines } from '#client/game/gameView.ts';
import { useAppSelector } from '#client/store/hooks.ts';

function GameLogLineView({ gameLogLine }: { gameLogLine: GameLogLine }) {
  switch (gameLogLine.kind) {
    case 'roundStart':
      return (
        <li className="game-log-round-start">
          {`— Round ${gameLogLine.roundNumber} —`}
        </li>
      );
    case 'placement':
      return (
        <li className="game-log-line">
          <span className="game-log-player-name">{gameLogLine.playerName}</span>
          <span className="game-log-line-part">
            <CardView card={gameLogLine.card} miniature />
            {`→ row ${gameLogLine.rowNumber}`}
          </span>
        </li>
      );
    case 'take':
      return (
        <li className="game-log-line">
          <span className="game-log-player-name">{gameLogLine.playerName}</span>
          <span className="game-log-line-part">
            <CardView card={gameLogLine.card} miniature />
            {`takes row ${gameLogLine.rowNumber}`}
          </span>
          <span className="game-log-line-part">
            {gameLogLine.takenCards.map((takenCard) => (
              <CardView key={takenCard.id} card={takenCard} miniature />
            ))}
            {`(+${gameLogLine.takenPenalty})`}
          </span>
        </li>
      );
  }
}

export function GameLog() {
  const history = useAppSelector((state) => state.engine.history);
  const gameLogLines = listGameLogLines(history);
  const gameLogRef = useRef<HTMLOListElement>(null);

  const gameLogLineCount = gameLogLines.length;
  useEffect(() => {
    const gameLog = gameLogRef.current;
    if (gameLog !== null && gameLogLineCount > 0) {
      gameLog.scrollTop = gameLog.scrollHeight;
    }
  }, [gameLogLineCount]);

  return (
    <section>
      <div className="section-header negative-text">Log</div>
      <ol ref={gameLogRef} className="game-log">
        {gameLogLines.map((gameLogLine, gameLogLineIndex) => (
          <GameLogLineView
            // biome-ignore lint/suspicious/noArrayIndexKey: the log only grows at the end
            key={gameLogLineIndex}
            gameLogLine={gameLogLine}
          />
        ))}
      </ol>
    </section>
  );
}
