import type { Episode } from './types';
import type { BookRenderer } from './book-renderer';

let bookmarkInterval: ReturnType<typeof setInterval> | null = null;
let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

export function setupNavigation(renderer: BookRenderer, episodes: Episode[], novelId: string) {
  // Clean up previous listeners
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler);
  }
  if (bookmarkInterval) {
    clearInterval(bookmarkInterval);
  }

  // Keyboard navigation
  keydownHandler = (e: KeyboardEvent) => {
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
  };
  document.addEventListener('keydown', keydownHandler);

  // Table of Contents
  const tocList = document.getElementById('toc-list')!;
  const tocPanel = document.getElementById('toc-panel')!;
  const btnToc = document.getElementById('btn-toc')!;
  const btnTocClose = document.getElementById('btn-toc-close')!;

  // Clear previous TOC entries
  tocList.innerHTML = '';

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

  // Replace TOC button listeners (use clone trick to remove old listeners)
  const newBtnToc = btnToc.cloneNode(true) as HTMLElement;
  btnToc.parentNode!.replaceChild(newBtnToc, btnToc);
  newBtnToc.addEventListener('click', () => {
    tocPanel.style.display = tocPanel.style.display === 'none' ? 'flex' : 'none';
  });

  const newBtnTocClose = btnTocClose.cloneNode(true) as HTMLElement;
  btnTocClose.parentNode!.replaceChild(newBtnTocClose, btnTocClose);
  newBtnTocClose.addEventListener('click', () => {
    tocPanel.style.display = 'none';
  });

  // Close TOC on backdrop click
  tocPanel.onclick = (e) => {
    if (e.target === tocPanel) tocPanel.style.display = 'none';
  };

  // Page jump: click page indicator to enter page number
  const pageIndicator = document.getElementById('page-indicator')!;
  pageIndicator.style.cursor = 'pointer';
  pageIndicator.title = '클릭하여 페이지 이동';

  const newPageIndicator = pageIndicator.cloneNode(true) as HTMLElement;
  pageIndicator.parentNode!.replaceChild(newPageIndicator, pageIndicator);
  newPageIndicator.addEventListener('click', () => {
    const total = parseInt(newPageIndicator.dataset.total || '1', 10);
    const current = newPageIndicator.dataset.current || '1';

    // Replace text with input
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = String(total);
    input.value = current;
    input.className = 'page-jump-input';

    newPageIndicator.textContent = '';
    newPageIndicator.appendChild(input);

    const suffix = document.createElement('span');
    suffix.textContent = ` / ${total}`;
    suffix.style.color = '#777';
    newPageIndicator.appendChild(suffix);

    input.focus();
    input.select();

    const commitJump = () => {
      const page = parseInt(input.value, 10);
      if (!isNaN(page) && page >= 1 && page <= total) {
        renderer.flipTo(page - 1);
      }
      // Restore display (will be updated by flip event)
      newPageIndicator.textContent = `${input.value} / ${total}`;
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitJump();
        input.blur();
      }
      if (e.key === 'Escape') {
        newPageIndicator.textContent = `${current} / ${total}`;
      }
    });

    input.addEventListener('blur', () => {
      commitJump();
    });
  });

  // Home button
  const btnHome = document.getElementById('btn-home')!;
  const newBtnHome = btnHome.cloneNode(true) as HTMLElement;
  btnHome.parentNode!.replaceChild(newBtnHome, btnHome);
  newBtnHome.addEventListener('click', () => {
    location.hash = '';
  });

  // Theme toggle
  const btnTheme = document.getElementById('btn-theme')!;
  const newBtnTheme = btnTheme.cloneNode(true) as HTMLElement;
  btnTheme.parentNode!.replaceChild(newBtnTheme, btnTheme);
  newBtnTheme.addEventListener('click', () => {
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

  // Auto-save bookmark per novel
  const bookmarkKey = `bookmark-${novelId}`;
  bookmarkInterval = setInterval(() => {
    const current = renderer.getCurrentPage();
    if (current > 0) {
      localStorage.setItem(bookmarkKey, String(current));
    }
  }, 3000);
}

export function restoreBookmark(renderer: BookRenderer, novelId: string) {
  const bookmarkKey = `bookmark-${novelId}`;
  const saved = localStorage.getItem(bookmarkKey);
  if (saved) {
    const page = parseInt(saved, 10);
    if (!isNaN(page) && page > 0) {
      setTimeout(() => renderer.flipTo(page), 900);
    }
  }
}
