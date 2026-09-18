import fs from 'node:fs';

const discussion = process.argv.includes('--discussion');
const route = fs.readFileSync('app/api/circles/news/route.ts', 'utf8');
const comments = fs.readFileSync('app/api/news/comments/route.ts', 'utf8');
const circleNews = fs.readFileSync('components/daybreak/CircleNews.tsx', 'utf8');
const hub = fs.readFileSync('components/daybreak/CirclesHub.tsx', 'utf8');
const identity = fs.readFileSync('lib/news/url.ts', 'utf8');
const repo = fs.readFileSync('lib/db/repo.ts', 'utf8');

const assertions = discussion ? [
  [identity.includes('scopeInput') && identity.includes('${scope}\\n${ticker}\\n${url}'), 'Article identity is not namespaced by circle'],
  [comments.includes('circleSlug') && comments.includes('access.member'), 'Circle membership is not required to comment'],
  [circleNews.includes('circleSlug={slug}') && circleNews.includes('isMember={isMember}'), 'Circle context is not passed to discussions'],
] : [
  [route.includes('circleNewsAccess') && route.includes('fetchCompanyNews'), 'Circle news route does not resolve access and ticker feeds'],
  [route.includes('balancedStories') && route.includes('createRequestCache'), 'Circle news is not balanced and cached'],
  [circleNews.includes('/api/circles/news?slug=') && !circleNews.includes("queryKey: ['news-feed']"), 'CircleNews still filters the global feed'],
  [hub.includes('slug={active.slug}') && hub.includes('isMember={active.joined}'), 'CirclesHub does not pass active circle context'],
  [repo.includes('export async function circleNewsAccess'), 'Circle access resolver is missing'],
];

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(message);
}

console.log(discussion ? 'circle discussion scope verified' : 'circle news scope verified');
