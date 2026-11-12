import { startGame } from '../../shared/actions';
import { buildDeck, type Card } from '../../shared/card';
import type { Player } from '../../shared/player';
import { type GameRequest, RequestType } from '../../shared/requests';
import type { AppThunk } from '../store';
import type { PhaseHandlingResult } from './phaseHandlingResult';

export function handlePreStartPhase(request: GameRequest): PhaseHandlingResult {
  if (request.type === RequestType.StartGame) {
    return { actions: [startGameWithShuffledCards(request.players)] };
  }
  return { error: 'The pre-start phase accepts only the start game request' };
}

// Impure, because the shuffle uses random numbers. It has no unit test. See
// docs/testing-strategy.md.
function startGameWithShuffledCards(players: Player[]): AppThunk {
  return (dispatch) => {
    const cards = buildDeck();
    shuffle(cards);
    dispatch(startGame({ players, cards }));
  };
}

// Fisher-Yates shuffle, in place.
function shuffle(cards: Card[]): void {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
}
