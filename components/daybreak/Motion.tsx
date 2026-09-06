'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Scroll-reveal driver.
 *
 * The hidden state lives behind `html.db-motion`, and only this component adds
 * that class — so if the script never runs, every `[data-reveal]` block stays
 * visible instead of leaving a blank page. One IntersectionObserver handles the
 * whole document and unobserves each element once it has played; nothing polls
 * scroll position.
 */
export default function Motion() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const still =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      root.getAttribute('data-reduce-motion') === 'true';

    if (still) {
      root.classList.remove('db-motion');
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
      return;
    }

    root.classList.add('db-motion');
    root.dataset.dbMotionReady = '1';

    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    // Async data can insert content after the route's initial frame.
    const observeNew = () => document.querySelectorAll('[data-reveal]:not(.is-in)').forEach(el => observer.observe(el));
    const mutations = new MutationObserver(observeNew);
    mutations.observe(document.body, { childList: true, subtree: true });

    // A frame's grace so the first paint lands before anything is revealed.
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => observer.observe(el));
    });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      mutations.disconnect();
    };
  }, [pathname]);

  return null;
}
