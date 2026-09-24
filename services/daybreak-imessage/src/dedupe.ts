export class MessageDeduper {
  private readonly inFlight = new Set<string>();
  private readonly completed = new Map<string, number>();

  constructor(private readonly ttlMs = 24 * 60 * 60 * 1_000, private readonly maxCompleted = 10_000) {}

  begin(messageId: string, now = Date.now()): boolean {
    this.prune(now);
    if (this.inFlight.has(messageId) || this.completed.has(messageId)) return false;
    this.inFlight.add(messageId);
    return true;
  }

  complete(messageId: string, now = Date.now()) {
    this.inFlight.delete(messageId);
    this.completed.delete(messageId);
    this.completed.set(messageId, now + this.ttlMs);
    while (this.completed.size > this.maxCompleted) {
      const oldest = this.completed.keys().next().value as string | undefined;
      if (!oldest) break;
      this.completed.delete(oldest);
    }
  }

  release(messageId: string) {
    this.inFlight.delete(messageId);
  }

  private prune(now: number) {
    for (const [id, expiresAt] of this.completed) {
      if (expiresAt > now) break;
      this.completed.delete(id);
    }
  }
}
