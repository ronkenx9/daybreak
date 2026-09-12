// Turn a real news headline about a stock into a starter meme brief for Muse.
// Deterministic today (templated from the headline); an LLM can slot in later to
// craft sharper concepts — same output contract, so the UI never changes.
export function memeMoment(headline: string, company: string): string {
  const clean = headline.replace(/\s+/g, ' ').trim().slice(0, 200);
  return `A funny, shareable community meme for the ${company} community, inspired by this news: "${clean}". Make it bold and expressive.`.slice(0, 800);
}

// The two images every token pull needs, both from the same moment seed.
// PFP: square 1:1 coin avatar. Banner: wide header art. Same ≤800-char contract.
export function pfpArt(company: string, moment: string): string {
  const clean = moment.replace(/\s+/g, ' ').trim().slice(0, 300);
  return `Square 1:1 profile-picture avatar artwork for the ${company} community token, inspired by this moment: "${clean}". One bold central emblem, flat readable silhouette, clean background, no text walls, legible at tiny sizes.`.slice(0, 800);
}
export function bannerArt(company: string, moment: string): string {
  const clean = moment.replace(/\s+/g, ' ').trim().slice(0, 300);
  return `Wide panoramic banner artwork for the ${company} community token page, inspired by this moment: "${clean}". Epic sweeping composition, space on the edges for overlay text, cinematic lighting, no text walls.`.slice(0, 800);
}
