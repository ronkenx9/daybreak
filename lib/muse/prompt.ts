// Turn a real news headline about a stock into a starter meme brief for Muse.
// Deterministic today (templated from the headline); an LLM can slot in later to
// craft sharper concepts — same output contract, so the UI never changes.
export function memeMoment(headline: string, company: string): string {
  const clean = headline.replace(/\s+/g, ' ').trim().slice(0, 200);
  return `A funny, shareable community meme for the ${company} community, inspired by this news: "${clean}". Make it bold and expressive.`.slice(0, 800);
}
