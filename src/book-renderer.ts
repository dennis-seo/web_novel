import { PageFlip } from 'page-flip';
import type { Page, Episode, BookData } from './types';
import { formatInlineMarkdown, renderBlockHtml, type PageDimensions } from './paginator';

interface BookMeta {
  title: string;
  subtitle: string;
  author: string;
}

export class BookRenderer {
  private pageFlip: PageFlip | null = null;
  private container: HTMLElement;
  private pages: Page[] = [];
  private dimensions: PageDimensions | null = null;
  private bookMeta: BookMeta = { title: '', subtitle: '', author: '' };

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
  }

  render(pages: Page[], episodes: Episode[], dimensions?: PageDimensions, meta?: BookMeta) {
    this.pages = pages;
    this.dimensions = dimensions ?? null;
    if (meta) this.bookMeta = meta;
    this.container.innerHTML = '';

    for (const page of pages) {
      const div = document.createElement('div');
      div.className = this.getPageClass(page);

      if (page.type === 'book-cover' || page.type === 'back-cover') {
        div.setAttribute('data-density', 'hard');
      }

      div.innerHTML = this.renderPageContent(page);
      this.container.appendChild(div);
    }

    this.initFlip();
  }

  private getPageClass(page: Page): string {
    const classes = ['page'];
    if (page.type === 'book-cover') classes.push('page-cover');
    if (page.type === 'back-cover') classes.push('page-back-cover');
    if (page.type === 'episode-cover') classes.push('page-episode-cover');
    if (page.type === 'content') classes.push('page-content');
    return classes.join(' ');
  }

  private renderPageContent(page: Page): string {
    switch (page.type) {
      case 'book-cover':
        return `<div class="cover-content">
          <div class="cover-deco top">// ${this.bookMeta.subtitle || this.bookMeta.title}</div>
          <h1 class="cover-title">${this.bookMeta.title}</h1>
          <p class="cover-subtitle">${this.bookMeta.subtitle}</p>
          <div class="cover-line"></div>
          <p class="cover-author">${this.bookMeta.author}</p>
        </div>`;

      case 'back-cover':
        return `<div class="cover-content back">
          <div class="cover-line"></div>
          <p class="back-text">${this.bookMeta.title}</p>
          <p class="back-sub">— fin —</p>
          <div class="cover-line"></div>
        </div>`;

      case 'episode-cover':
        const ep = page.episodeMeta!;
        return `<div class="episode-cover-content">
          <span class="ep-label">EPISODE</span>
          <span class="ep-number">${String(ep.episode).padStart(3, '0')}</span>
          <div class="ep-divider"></div>
          <h2 class="ep-title">${formatInlineMarkdown(ep.title)}</h2>
        </div>`;

      case 'content':
        return page.blocks.map(block => renderBlockHtml(block)).join('\n');

      default:
        return '';
    }
  }

  private initFlip() {
    const isMobile = window.innerWidth <= 768;

    let pageW: number;
    let pageH: number;

    if (this.dimensions) {
      // Use pre-calculated dimensions (same as paginator used)
      pageW = this.dimensions.width;
      pageH = this.dimensions.height;
    } else {
      // Fallback: calculate from DOM
      const wrapper = this.container.parentElement!;
      const availW = wrapper.clientWidth;
      const availH = wrapper.clientHeight - 60;

      if (isMobile) {
        pageW = Math.min(availW - 16, 400);
        pageH = Math.min(availH, Math.round(pageW * 1.43));
      } else {
        pageW = Math.min(Math.floor((availW - 16) / 2), 550);
        pageH = Math.min(availH, Math.round(pageW * 1.33));
      }
    }

    this.pageFlip = new PageFlip(this.container as HTMLElement, {
      width: pageW,
      height: pageH,
      size: 'fixed',
      showCover: true,
      mobileScrollSupport: false,
      maxShadowOpacity: 0.5,
      flippingTime: 600,
      usePortrait: isMobile,
      autoSize: false,
      drawShadow: true,
      startZIndex: 10,
    });

    this.pageFlip.loadFromHTML(
      document.querySelectorAll('#book .page')
    );

    // Force layout recalculation after init to fix first page sizing
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });

    this.pageFlip.on('flip', (e: any) => {
      this.updatePageIndicator(e.data);
    });

    // Tap zones for mobile
    if (isMobile) {
      this.container.addEventListener('click', (e) => {
        const rect = this.container.getBoundingClientRect();
        const x = (e as MouseEvent).clientX - rect.left;
        const w = rect.width;
        if (x < w * 0.25) this.flipPrev();
        else if (x > w * 0.75) this.flipNext();
      });
    }
  }

  private updatePageIndicator(pageNum: number) {
    const el = document.getElementById('page-indicator');
    if (el) el.textContent = `${pageNum + 1} / ${this.pages.length}`;
  }

  flipNext() { this.pageFlip?.flipNext(); }
  flipPrev() { this.pageFlip?.flipPrev(); }
  flipTo(page: number) { this.pageFlip?.flip(page); }
  getPageCount() { return this.pages.length; }
  getCurrentPage() { return this.pageFlip?.getCurrentPageIndex() ?? 0; }

  getEpisodeStartPage(episodeIndex: number): number {
    for (let i = 0; i < this.pages.length; i++) {
      if (this.pages[i].episodeIndex === episodeIndex &&
          this.pages[i].type === 'episode-cover') {
        return i;
      }
    }
    return 0;
  }

  destroy() {
    this.pageFlip?.destroy();
  }
}
