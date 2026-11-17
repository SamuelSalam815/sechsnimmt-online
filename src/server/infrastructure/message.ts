export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Error = 'error',
}

export interface MessageBase {
  readonly logLevel: LogLevel;
}
