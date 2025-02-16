<script lang="ts">
  import 'vidstack/styles/base.css';
  import 'vidstack/styles/ui/buttons.css';
  import 'vidstack/styles/ui/sliders.css';
  import 'vidstack/define/media-player.js';
  import { defineCustomElements } from 'vidstack/elements';
  import type { HLSProvider, MediaPlayerElement } from 'vidstack';

  import Fa from 'svelte-fa';
  import { faMicrochip, faDownload } from '@fortawesome/free-solid-svg-icons';
  import { onMount, createEventDispatcher, onDestroy } from 'svelte';
  import { watched } from '$lib/model/watch';
  import type { Anime, Episode } from '$lib/model/Anime';
  import { getOS } from '$lib/model/info';
  import { beforeNavigate } from '$app/navigation';
  import Hls from 'hls.js';
  import { downloading, downloads } from '$lib/model/downloads';
  import { settings } from '$lib/model/settings';

  export let sources: {
    url: string;
    isM3U8: boolean;
    quality: string;
  }[];
  export let poster: string;
  export let anime: Anime;
  export let episode: Episode;

  let player: MediaPlayerElement | undefined = undefined;

  $: watchedObject = $watched[anime.id]?.find(
    item => item.episode.number === episode.number
  );

  const defaultIndex = sources.findIndex(
    source => source.quality === 'default'
  );
  let selectedSource = defaultIndex !== -1 ? defaultIndex : 0;

  $: src = sources[selectedSource].isM3U8
    ? `https://jb-proxy.app.jet-black.xyz/${sources[selectedSource].url}`
    : sources[selectedSource].url;

  const dispatcher = createEventDispatcher();

  function requestNextEpisode() {
    const state = document.querySelector('media-player')?.state;
    if (
      $settings.deleteOnWatch &&
      state &&
      state.currentTime / state.duration >= 0.8
    ) {
      downloads.remove(episode.id);
    }
    dispatcher('requestNextEpisode');
  }

  onMount(async () => {
    await defineCustomElements();
    player?.addEventListener('provider-change', event => {
      const provider = event.detail;
      if (provider && provider.type === 'hls') {
        (provider as HLSProvider).library = Hls;
      }
    });
    player?.onAttach(() => {
      if (player) {
        player.currentTime =
          (watchedObject?.time ?? 0) < (player.state.duration || anime.duration)
            ? watchedObject?.time ?? 0
            : 0;
      }
    });
    const os = await getOS();
    if (os !== 'Darwin' && os !== 'Unknown') {
      player?.addEventListener('fullscreen-change', async event => {
        const { appWindow } = await import('@tauri-apps/api/window');
        const isFullscreen = event.detail;
        appWindow?.setFullscreen(isFullscreen);
      });
    }
  });

  function updateWatched() {
    const state = document.querySelector('media-player')?.state;
    if (state) {
      watched.add(anime.id, {
        episode,
        time: state.currentTime || (watchedObject?.time ?? 0),
        percentage: Math.min(
          state.currentTime / (state.duration || anime.duration || Infinity),
          1
        )
      });
    }
  }

  const interval = setInterval(updateWatched, 15_000);

  onDestroy(() => {
    clearInterval(interval);
    player?.destroy();
  });

  beforeNavigate(updateWatched);
</script>

<div class="relative -m-4 mb-4 h-auto w-screen bg-black">
  <!-- svelte-ignore a11y-autofocus -->
  <media-player
    {src}
    {poster}
    controls
    aspect-ratio="16/9"
    class="mx-auto flex w-screen items-center justify-center object-cover fullscreen:h-screen md:w-[max(calc(800px),70vw)]"
    preload="metadata"
    prefer-native-hls
    bind:this={player}
    on:ended={requestNextEpisode}
    on:play|once={() => {
      if (player) {
        player.currentTime =
          (watchedObject?.time ?? 0) < (player.state.duration || anime.duration)
            ? watchedObject?.time ?? 0
            : 0;
      }
    }}
  >
    <media-outlet />
  </media-player>
  <div class="absolute bottom-4 left-4">
    <div class="dropdown-right dropdown-end dropdown">
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <!-- svelte-ignore a11y-label-has-associated-control -->
      <label tabindex="0" class="btn-ghost btn">
        <Fa icon={faMicrochip} size="1.5x" />
      </label>
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <ul
        tabindex="0"
        class="dropdown-content rounded-box z-10 ml-2 w-52 bg-base-200 p-2 shadow"
      >
        {#each sources as source, i}
          <li class="m-1">
            <button
              tabindex="0"
              class="btn-outline btn-accent btn w-full items-center"
              disabled={selectedSource === i}
              on:click={() => (selectedSource = i)}
            >
              {source.quality}
            </button>
          </li>
        {/each}
      </ul>
    </div>
  </div>
  {#if !$downloading[episode.id] && !$downloads[episode.id]}
    <!-- ffmpeg -i "link" -bsf:a aac_adtstoasc -vcodec copy -c copy -crf 50 "output" -->
    <button
      class="btn-ghost btn absolute bottom-4 right-4"
      on:click={() =>
        downloading.add(
          episode.id,
          anime,
          sources[selectedSource].quality,
          episode.number
        )}
    >
      <Fa icon={faDownload} size="1.5x" />
    </button>
  {/if}
</div>
