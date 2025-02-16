import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const prerender = 'auto';
export const ssr = false;

export const load = (() => {
  if (!navigator?.onLine) {
    throw redirect(302, '/library');
  }
}) satisfies LayoutLoad;
