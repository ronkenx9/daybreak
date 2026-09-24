export type PendingMessage<T> = { value: T; text: string };

type State<T> = {
  items: PendingMessage<T>[];
  timer: NodeJS.Timeout;
  chain: Promise<void>;
};

export class MessageBatcher<T> {
  private readonly states = new Map<string, State<T>>();

  constructor(
    private readonly delayMs: number,
    private readonly flush: (key: string, items: PendingMessage<T>[]) => Promise<void>,
  ) {}

  enqueue(key: string, item: PendingMessage<T>) {
    const current = this.states.get(key);
    if (current) {
      clearTimeout(current.timer);
      current.items.push(item);
      current.timer = setTimeout(() => this.drain(key), this.delayMs);
      return;
    }
    const state: State<T> = {
      items: [item],
      timer: setTimeout(() => this.drain(key), this.delayMs),
      chain: Promise.resolve(),
    };
    this.states.set(key, state);
  }

  private drain(key: string) {
    const state = this.states.get(key);
    if (!state || state.items.length === 0) return;
    const items = state.items.splice(0);
    state.chain = state.chain
      .then(() => this.flush(key, items))
      .catch((error: unknown) => console.error('[daybreak-imessage] flush failed', error instanceof Error ? error.message : 'unknown error'));
    state.timer = setTimeout(() => {
      const latest = this.states.get(key);
      if (latest === state && latest.items.length === 0) {
        void latest.chain.finally(() => this.states.delete(key));
      }
    }, Math.max(1_000, this.delayMs));
  }

  async stop() {
    const work: Promise<void>[] = [];
    for (const [key, state] of this.states) {
      clearTimeout(state.timer);
      if (state.items.length) {
        const items = state.items.splice(0);
        state.chain = state.chain.then(() => this.flush(key, items));
      }
      work.push(state.chain);
    }
    await Promise.allSettled(work);
    this.states.clear();
  }
}
