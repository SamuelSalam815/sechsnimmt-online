import pino from 'pino';
import { describe, expect, test } from 'vitest';
import { type Actor, createActor } from '#server/actor.ts';
import { LogLevel } from '#server/message.ts';

interface Reply {
  readonly logLevel: LogLevel;
  readonly reply: string;
}

function settled(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function loggerInto(lines: unknown[]) {
  return pino(
    { level: 'debug', base: null, timestamp: false },
    { write: (line: string) => lines.push(JSON.parse(line)) },
  );
}

function replies(...texts: string[]): Reply[] {
  return texts.map((reply) => ({ logLevel: LogLevel.Debug, reply }));
}

// Each inbound message is a list of replies that the actor sends to itself.
function echoActor(trace: string[]): Actor<Reply[], string> {
  const actor: Actor<Reply[], string> = createActor({
    initial: 0,
    step: (count: number, inboundReplies: Reply[]) => ({
      coreContext: count + 1,
      outboundMessages: inboundReplies,
    }),
    interpret({ reply }: Reply, shellContext) {
      trace.push(
        `${reply}${shellContext === undefined ? '' : `@${shellContext}`}`,
      );
      if (reply.startsWith('again')) {
        actor.send(replies(reply.slice('again'.length)));
      }
      trace.push(`end ${reply}`);
    },
    actorId: 'echo',
    logger: loggerInto([]),
  });
  return actor;
}

describe('createActor', () => {
  test('runs no step during the send', () => {
    const trace: string[] = [];
    echoActor(trace).send(replies('a'));
    expect(trace).toEqual([]);
  });

  test('runs the messages in the order of their sends', async () => {
    const trace: string[] = [];
    const actor = echoActor(trace);
    actor.send(replies('a'));
    actor.send(replies('b'));
    await settled();
    expect(trace).toEqual(['a', 'end a', 'b', 'end b']);
  });

  test('runs a message that an interpretation sends after the messages already waiting', async () => {
    const trace: string[] = [];
    const actor = echoActor(trace);
    actor.send(replies('againc'));
    actor.send(replies('b'));
    await settled();
    expect(trace).toEqual(['againc', 'end againc', 'b', 'end b', 'c', 'end c']);
  });

  test('hands the shell context of an inbound message to the interpretation of each of its outbound messages', async () => {
    const trace: string[] = [];
    echoActor(trace).send(replies('a', 'b'), 'h');
    await settled();
    expect(trace).toEqual(['a@h', 'end a', 'b@h', 'end b']);
  });

  test('logs each outbound message at its log level with the actor ID', async () => {
    const lines: unknown[] = [];
    const actor = createActor({
      initial: null,
      step: (coreContext: null, outboundMessages: Reply[]) => ({
        coreContext,
        outboundMessages,
      }),
      interpret() {},
      actorId: 'echo',
      logger: loggerInto(lines),
    });
    actor.send([
      { logLevel: LogLevel.Info, reply: 'a' },
      { logLevel: LogLevel.Error, reply: 'b' },
    ]);
    await settled();
    expect(lines).toEqual([
      { level: 30, actorId: 'echo', logLevel: 'info', reply: 'a' },
      { level: 50, actorId: 'echo', logLevel: 'error', reply: 'b' },
    ]);
  });
});
