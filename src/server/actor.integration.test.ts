import { describe, expect, test } from 'vitest';
import { type Actor, createActor } from '#server/actor.ts';

function settled(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

// Each message is a list of replies that the actor sends to itself.
function echoActor(trace: string[]): Actor<string[], string> {
  const actor: Actor<string[], string> = createActor({
    initial: 0,
    step: (count: number, replies: string[]) => ({
      coreContext: count + 1,
      outboundMessages: replies,
    }),
    interpret(reply: string, shellContext) {
      trace.push(
        `${reply}${shellContext === undefined ? '' : `@${shellContext}`}`,
      );
      if (reply.startsWith('again')) {
        actor.send([reply.slice('again'.length)]);
      }
      trace.push(`end ${reply}`);
    },
  });
  return actor;
}

describe('createActor', () => {
  test('runs no step during the send', () => {
    const trace: string[] = [];
    echoActor(trace).send(['a']);
    expect(trace).toEqual([]);
  });

  test('runs the messages in the order of their sends', async () => {
    const trace: string[] = [];
    const actor = echoActor(trace);
    actor.send(['a']);
    actor.send(['b']);
    await settled();
    expect(trace).toEqual(['a', 'end a', 'b', 'end b']);
  });

  test('runs a message that an interpretation sends after the messages already waiting', async () => {
    const trace: string[] = [];
    const actor = echoActor(trace);
    actor.send(['againc']);
    actor.send(['b']);
    await settled();
    expect(trace).toEqual(['againc', 'end againc', 'b', 'end b', 'c', 'end c']);
  });

  test('hands the shell context of an inbound message to the interpretation of each of its outboundMessages', async () => {
    const trace: string[] = [];
    echoActor(trace).send(['a', 'b'], 'h');
    await settled();
    expect(trace).toEqual(['a@h', 'end a', 'b@h', 'end b']);
  });

  test('tells the observer the message and its outboundMessages', async () => {
    const observed: unknown[] = [];
    const actor = createActor({
      initial: null,
      step: (coreContext: null, message: string) => ({
        coreContext,
        outboundMessages: [message.toUpperCase()],
      }),
      interpret() {},
      observe: (message, outboundMessages) =>
        observed.push({ message, outboundMessages }),
    });
    actor.send('a');
    await settled();
    expect(observed).toEqual([{ message: 'a', outboundMessages: ['A'] }]);
  });
});
