// Test support. It builds the requests that the tests of several phases send.
import { STANDARD_GAME_RULES } from '#engine/dataTypes/gameRules.ts';
import { INITIAL_GAME_STATE_VERSION } from '#engine/dataTypes/gameStateVersion.ts';
import type { PlayerId } from '#engine/dataTypes/player.ts';
import type { AbandonGameRequest } from '#engine/requests/abandonGameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import type { StartGameRequest } from '#engine/requests/startGameRequest.ts';
import { orderedDeck } from '#testSupport/cards.ts';

export const startGameRequest: StartGameRequest = {
  type: RequestType.StartGame,
  lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
  gameRules: STANDARD_GAME_RULES,
  players: [
    { id: 'a', name: 'Ada' },
    { id: 'b', name: 'Ben' },
  ],
  newShuffledDeck: orderedDeck(),
};

export function abandonRequest(playerId: PlayerId): AbandonGameRequest {
  return {
    type: RequestType.AbandonGame,
    lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
    playerId,
  };
}
