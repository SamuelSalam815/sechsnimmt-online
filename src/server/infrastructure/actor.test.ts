import pino from 'pino';
import { describe, expect, test } from 'vitest';
import {
  type Actor,
  createActor,
  REDACTED_CLIENT_TOKEN,
} from '#server/infrastructure/actor.ts';
import { LogLevel } from '#server/infrastructure/message.ts';

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

interface Replies {
  readonly logLevel: LogLevel;
  readonly replies: Reply[];
}

function replies(...texts: string[]): Replies {
  return {
    logLevel: LogLevel.Debug,
    replies: texts.map((reply) => ({ logLevel: LogLevel.Debug, reply })),
  };
}

// Each inbound message holds the replies that the actor sends to itself.
function echoActor(trace: string[]): Actor<Replies, string> {
  const actor: Actor<Replies, string> = createActor({
    initial: 0,
    step: (count: number, inboundMessage: Replies) => ({
      coreContext: count + 1,
      outboundMessages: inboundMessage.replies,
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

function loggingActor(lines: unknown[]): Actor<Replies> {
  return createActor({
    initial: null,
    step: (coreContext: null, inboundMessage: Replies) => ({
      coreContext,
      outboundMessages: inboundMessage.replies,
    }),
    interpret() {},
    actorId: 'echo',
    logger: loggerInto(lines),
  });
}

const infoReplies: Replies = {
  logLevel: LogLevel.Info,
  replies: [
    { logLevel: LogLevel.Debug, reply: 'a' },
    { logLevel: LogLevel.Error, reply: 'b' },
  ],
};

const outboundLines = [
  { level: 20, actorId: 'echo', logLevel: 'debug', reply: 'a' },
  { level: 50, actorId: 'echo', logLevel: 'error', reply: 'b' },
];

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

  test('logs an inbound message as received and each outbound message, each at its log level with the actor ID', async () => {
    const lines: unknown[] = [];
    loggingActor(lines).send(infoReplies);
    await settled();
    expect(lines).toEqual([
      {
        level: 30,
        actorId: 'echo',
        logLevel: 'info',
        replies: [
          { logLevel: 'debug', reply: 'a' },
          { logLevel: 'error', reply: 'b' },
        ],
        msg: 'received',
      },
      ...outboundLines,
    ]);
  });

  test('logs no client token, at any depth, and hands the interpretation the message whole', async () => {
    interface TokenMessage {
      readonly logLevel: LogLevel;
      readonly clientToken: string;
      readonly requestBody: unknown;
    }
    const tokenMessage: TokenMessage = {
      logLevel: LogLevel.Debug,
      clientToken: 'secret-a',
      requestBody: { seats: [{ clientToken: 'secret-b' }] },
    };
    const lines: unknown[] = [];
    const interpreted: TokenMessage[] = [];
    createActor({
      initial: null,
      step: (coreContext: null, inboundMessage: TokenMessage) => ({
        coreContext,
        outboundMessages: [inboundMessage],
      }),
      interpret(outboundMessage: TokenMessage) {
        interpreted.push(outboundMessage);
      },
      actorId: 'echo',
      logger: loggerInto(lines),
    }).send(tokenMessage);
    await settled();
    const redactedEntry = {
      level: 20,
      actorId: 'echo',
      logLevel: 'debug',
      clientToken: REDACTED_CLIENT_TOKEN,
      requestBody: { seats: [{ clientToken: REDACTED_CLIENT_TOKEN }] },
    };
    expect(lines).toEqual([
      { ...redactedEntry, msg: 'received' },
      redactedEntry,
    ]);
    expect(interpreted).toEqual([tokenMessage]);
  });
});
