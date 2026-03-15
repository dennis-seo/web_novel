import './styles/reset.css';
import './styles/book.css';
import './styles/page.css';
import './styles/system-ui.css';
import './styles/cover.css';
import './styles/navigation.css';
import './styles/responsive.css';

import type { BookData } from './types';
import { paginateEpisodes } from './paginator';
import { BookRenderer } from './book-renderer';
import { setupNavigation, restoreBookmark } from './navigation';

async function init() {
  try {
    const base = import.meta.env.BASE_URL;
    const res = await fetch(`${base}book-data.json`);
    if (!res.ok) throw new Error('Failed to load book data');

    const data: BookData = await res.json();
    const isMobile = window.innerWidth <= 768;
    const pages = paginateEpisodes(data.episodes, isMobile);

    // Wait for fonts to load before rendering
    await document.fonts.ready;

    // Hide loading, show book
    document.getElementById('loading')!.style.display = 'none';
    document.getElementById('book-wrapper')!.style.display = 'flex';

    // Render book
    const renderer = new BookRenderer('book');
    renderer.render(pages, data.episodes);

    // Setup navigation
    setupNavigation(renderer, data.episodes);

    // Update page indicator
    const indicator = document.getElementById('page-indicator')!;
    indicator.textContent = `1 / ${pages.length}`;

    // Restore last reading position
    restoreBookmark(renderer);

  } catch (err) {
    console.error('Init failed:', err);
    const loading = document.getElementById('loading')!;
    loading.innerHTML = `
      <div class="loading-text">오류</div>
      <div class="loading-sub">book-data.json을 불러올 수 없습니다.<br>npm run build:content를 먼저 실행하세요.</div>
    `;
  }
}

init();
