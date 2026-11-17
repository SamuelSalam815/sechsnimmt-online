import { expect, test } from 'vitest';
import { handleGameOverPhase } from '#engine/requestHandling/handleGameOverPhase.ts';
import { ErrorCode } from '#engine/result.ts';
import { startGameRequest } from '#testSupport/requests.ts';

test('returns an error for every request', () => {
  expect(handleGameOverPhase(startGameRequest)).toMatchObject({
    errorCode: ErrorCode.WrongPhase,
  });
});
