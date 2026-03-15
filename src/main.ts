import './styles/reset.css';
import './styles/book.css';
import './styles/page.css';
import './styles/system-ui.css';
import './styles/cover.css';
import './styles/navigation.css';
import './styles/responsive.css';
import './styles/selector.css';

import type { BookData } from './types';
import { paginateEpisodes } from './paginator';
import { BookRenderer } from './book-renderer';
import { setupNavigation, restoreBookmark } from './navigation';
import { initSelector, hideSelector, showSelector } from './novel-selector';

let currentRenderer: BookRenderer | null = null;

function getNovelIdFromHash(): string | null {
  const hash = location.hash;
  const match = hash.match(/^#\/(.+)$/);
  return match ? match[1] : null;
}

function showLoading(show: boolean) {
  const el = document.getElementById('loading')!;
  el.style.display = show ? '' : 'none';
}

function showViewer(show: boolean) {
  document.getElementById('book-wrapper')!.style.display = show ? 'flex' : 'none';
  document.getElementById('toc-panel')!.style.display = 'none';
}

async function loadNovel(novelId: string) {
  // Clean up previous renderer
  if (currentRenderer) {
    currentRenderer.destroy();
    currentRenderer = null;
  }

  hideSelector();
  showViewer(false);
  showLoading(true);

  try {
    const base = import.meta.env.BASE_URL;
    const res = await fetch(`${base}data/${novelId}.json`);
    if (!res.ok) throw new Error(`Novel "${novelId}" not found`);

    const data: BookData = await res.json();
    const isMobile = window.innerWidth <= 768;
    const pages = paginateEpisodes(data.episodes, isMobile);

    await document.fonts.ready;

    showLoading(false);
    showViewer(true);

    // Update title
    document.title = `${data.title} — ${data.subtitle}`;

    const renderer = new BookRenderer('book');
    renderer.render(pages, data.episodes);
    currentRenderer = renderer;

    setupNavigation(renderer, data.episodes, novelId);

    const indicator = document.getElementById('page-indicator')!;
    indicator.textContent = `1 / ${pages.length}`;

    restoreBookmark(renderer, novelId);

  } catch (err) {
    console.error('Failed to load novel:', err);
    showLoading(false);
    showSelector();
  }
}

async function showMainPage() {
  // Clean up viewer
  if (currentRenderer) {
    currentRenderer.destroy();
    currentRenderer = null;
  }
  showViewer(false);
  showLoading(true);

  try {
    const base = import.meta.env.BASE_URL;
    await initSelector(base);
    showLoading(false);
    document.title = 'Web Novel';
  } catch (err) {
    console.error('Failed to load selector:', err);
    showLoading(false);
    const loading = document.getElementById('loading')!;
    loading.style.display = '';
    loading.innerHTML = `
      <div class="loading-text">오류</div>
      <div class="loading-sub">novels.json을 불러올 수 없습니다.<br>npm run build:content를 먼저 실행하세요.</div>
    `;
  }
}

function handleRoute() {
  const novelId = getNovelIdFromHash();
  if (novelId) {
    loadNovel(novelId);
  } else {
    showMainPage();
  }
}

// Listen for hash changes
window.addEventListener('hashchange', handleRoute);

// Initial route
handleRoute();
