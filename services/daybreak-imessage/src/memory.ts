type MemoryValue = { symbol: string; touchedAt: number };

export class ConversationMemory {
  private readonly symbols = new Map<string, MemoryValue>();

  constructor(private readonly ttlMs = 6 * 60 * 60 * 1_000, private readonly maxSpaces = 2_000) {}

  remember(spaceId: string, symbol: string, now = Date.now()) {
    this.symbols.delete(spaceId);
    this.symbols.set(spaceId, { symbol: symbol.toUpperCase(), touchedAt: now });
    while (this.symbols.size > this.maxSpaces) {
      const oldest = this.symbols.keys().next().value as string | undefined;
      if (!oldest) break;
      this.symbols.delete(oldest);
    }
  }

  recall(spaceId: string, now = Date.now()): string | undefined {
    const value = this.symbols.get(spaceId);
    if (!value) return undefined;
    if (now - value.touchedAt > this.ttlMs) {
      this.symbols.delete(spaceId);
      return undefined;
    }
    return value.symbol;
  }
}
