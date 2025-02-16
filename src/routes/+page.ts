import {
  popularAnimes,
  recentEpisodes,
  trendingAnimes
} from '$lib/model/cache';
import type { Anime } from '$lib/model/Anime';
import type { PageLoad } from './$types';

const timeout = 15_000;

async function fetchRecentEpisodes(_fetch: typeof fetch) {
  const recent = (
    await _fetch(
      'https://consumet.app.jet-black.xyz/meta/anilist/recent-episodes?perPage=25',
      { signal: AbortSignal.timeout(timeout) }
    ).then(r => r.json())
  ).results as Anime[];
  recentEpisodes.set(0, recent);
  return recent;
}

async function fetchTrendingAnime(_fetch: typeof fetch) {
  const trending = (
    await _fetch(
      'https://consumet.app.jet-black.xyz/meta/anilist/trending?perPage=25',
      {
        signal: AbortSignal.timeout(timeout)
      }
    ).then(r => r.json())
  ).results as Anime[];
  trendingAnimes.set(0, trending);
  return trending;
}

async function fetchPopularAnime(_fetch: typeof fetch) {
  const popular = (
    await _fetch('https://consumet.app.jet-black.xyz/meta/anilist/popular', {
      signal: AbortSignal.timeout(timeout)
    }).then(r => r.json())
  ).results as Anime[];
  popularAnimes.set(0, popular);
  return popular;
}

export const load = (async ({ fetch }) => {
  return {
    recent: {
      data: new Promise<Anime[]>(resolve => {
        resolve(recentEpisodes.get(0) ?? fetchRecentEpisodes(fetch));
      })
    },
    trending: {
      data: new Promise<Anime[]>(resolve => {
        resolve(trendingAnimes.get(0) ?? fetchTrendingAnime(fetch));
      })
    },
    popular: {
      data: new Promise<Anime[]>(resolve => {
        resolve(popularAnimes.get(0) ?? fetchPopularAnime(fetch));
      })
    }
  };
}) satisfies PageLoad;
