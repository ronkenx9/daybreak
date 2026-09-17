import 'server-only';

// US equity market session, computed from NYSE hours in America/New_York.
// Holiday + half-day dates are the ones Pyth publishes in its equity market_sessions
// (get_symbols), covering ~Sep 2026 – Jul 2027. Regular/pre/post windows are stable.
// This drives honest "live vs last close" labels; it is not a trading calendar of record.
const HOLIDAYS = new Set([ // MM-DD, market closed
  '09-07', '11-26', '12-25', '01-01', '01-18', '02-15', '03-26', '05-31', '06-18', '07-05',
]);
const HALF_DAYS = new Set(['11-27', '12-24']); // early close 13:00 ET

export type MarketSession = 'regular' | 'pre' | 'post' | 'closed';

export function usMarketSession(now: Date = new Date()): { session: MarketSession; open: boolean } {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', month: '2-digit', day: '2-digit', hour12: false });
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value])) as Record<string, string>;
  const mmdd = `${p.month}-${p.day}`;
  const mins = (parseInt(p.hour, 10) % 24) * 60 + parseInt(p.minute, 10);
  if (p.weekday === 'Sat' || p.weekday === 'Sun' || HOLIDAYS.has(mmdd)) return { session: 'closed', open: false };
  const close = HALF_DAYS.has(mmdd) ? 13 * 60 : 16 * 60;
  if (mins >= 570 && mins < close) return { session: 'regular', open: true };   // 09:30–close
  if (mins >= 240 && mins < 570) return { session: 'pre', open: false };        // 04:00–09:30
  if (mins >= close && mins < 20 * 60) return { session: 'post', open: false }; // close–20:00
  return { session: 'closed', open: false };
}
