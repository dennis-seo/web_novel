import type { Episode } from './types';
import type { BookRenderer } from './book-renderer';

export function setupNavigation(renderer: BookRenderer, episodes: Episode[]) {
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      renderer.flipNext();
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      renderer.flipPrev();
    }
    if (e.key === 'Escape') {
      const toc = document.getElementById('toc-panel')!;
      toc.style.display = 'none';
    }
  });

  // Table of Contents
  const tocList = document.getElementById('toc-list')!;
  const tocPanel = document.getElementById('toc-panel')!;
  const btnToc = document.getElementById('btn-toc')!;
  const btnTocClose = document.getElementById('btn-toc-close')!;

  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i];
    const li = document.createElement('li');
    li.className = 'toc-item';
    li.innerHTML = `
      <span class="toc-ep">EP${String(ep.meta.episode).padStart(3, '0')}</span>
      <span class="toc-title">${ep.meta.title}</span>
    `;
    li.addEventListener('click', () => {
      const page = renderer.getEpisodeStartPage(i);
      renderer.flipTo(page);
      tocPanel.style.display = 'none';
    });
    tocList.appendChild(li);
  }

  btnToc.addEventListener('click', () => {
    tocPanel.style.display = tocPanel.style.display === 'none' ? 'flex' : 'none';
  });

  btnTocClose.addEventListener('click', () => {
    tocPanel.style.display = 'none';
  });

  // Close TOC on backdrop click
  tocPanel.addEventListener('click', (e) => {
    if (e.target === tocPanel) tocPanel.style.display = 'none';
  });

  // Theme toggle
  const btnTheme = document.getElementById('btn-theme')!;
  btnTheme.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem(
      'theme',
      document.body.classList.contains('dark-theme') ? 'dark' : 'light'
    );
  });

  // Restore saved theme
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
  }

  // Auto-save bookmark on page change
  setInterval(() => {
    const current = renderer.getCurrentPage();
    if (current > 0) {
      localStorage.setItem('bookmark', String(current));
    }
  }, 3000);
}

export function restoreBookmark(renderer: BookRenderer) {
  const saved = localStorage.getItem('bookmark');
  if (saved) {
    const page = parseInt(saved, 10);
    if (!isNaN(page) && page > 0) {
      setTimeout(() => renderer.flipTo(page), 900);
    }
  }
}
