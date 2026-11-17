import { expect, test } from 'vitest';
import { ErrorCode } from '#engine/dataTypes/result.ts';
import { handleGameOverPhase } from '#engine/requestHandling/handleGameOverPhase.ts';
import { startGameRequest } from '#testSupport/requests.ts';

test('returns an error for every request', () => {
  expect(handleGameOverPhase(startGameRequest)).toEqual({
    errorCode: ErrorCode.WrongPhase,
    message:
      'The game over phase rejects the startGame request: it accepts no request',
  });
});
