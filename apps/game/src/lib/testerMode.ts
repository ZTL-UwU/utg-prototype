/**
 * Password for tester mode. Ships in the client bundle as plain string. Acceptable because tester mode
 * never touches the server.
 */
export const TESTER_PASSWORD = 'test-sozler-seylisi';

export function isTesterPassword(input: string): boolean {
  return input === TESTER_PASSWORD;
}
