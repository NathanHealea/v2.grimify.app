/** Adds new paint IDs to the published-ID ledger. Never removes one: published IDs are permanent. */
export function recordIds(ledger: string[], paintIds: string[]): string[] {
  return [...new Set([...ledger, ...paintIds])].sort();
}
