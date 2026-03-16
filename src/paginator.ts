import type { ContentBlock, Episode, Page } from './types';

export interface PageDimensions {
  width: number;
  height: number;
}

/**
 * Process inline markdown:
 * - Escape HTML entities
 * - **text** → <strong>text</strong> (magic names)
 * - *text* → <strong class="inner-thought">text</strong> (inner monologue, bold)
 */
export function formatInlineMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // **text** first (greedy match within single asterisks)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // *text* (inner monologue → bold)
  html = html.replace(/\*(.+?)\*/g, '<strong class="inner-thought">$1</strong>');
  return html;
}

export function renderBlockHtml(block: ContentBlock): string {
  switch (block.type) {
    case 'system-ui-zero':
      return `<pre class="system-ui-zero">${formatInlineMarkdown(block.content)}</pre>`;
    case 'system-ui-v2':
      return `<pre class="system-ui-v2">${formatInlineMarkdown(block.content)}</pre>`;
    case 'illustration':
      return `<figure class="illustration"><img src="${block.src}" alt="${block.alt || block.content}" loading="lazy"><figcaption>${formatInlineMarkdown(block.content)}</figcaption></figure>`;
    case 'narrative':
    case 'dialogue':
      return `<p>${formatInlineMarkdown(block.content)}</p>`;
    default:
      return '';
  }
}

/**
 * Calculate page dimensions from container element (matches BookRenderer.initFlip logic).
 * Container must be visible in the DOM for accurate measurement.
 */
export function calculatePageDimensions(containerEl: HTMLElement): PageDimensions {
  const isMobile = window.innerWidth <= 768;
  const wrapper = containerEl.parentElement!;
  const availW = wrapper.clientWidth;
  const availH = wrapper.clientHeight - 60;

  let pageW: number;
  let pageH: number;

  if (isMobile) {
    pageW = Math.min(availW - 16, 400);
    pageH = Math.min(availH, Math.round(pageW * 1.43));
  } else {
    pageW = Math.min(Math.floor((availW - 16) / 2), 550);
    pageH = Math.min(availH, Math.round(pageW * 1.33));
  }

  return { width: pageW, height: pageH };
}

/**
 * DOM-measurement based paginator.
 * Creates a hidden element with real page dimensions and CSS styles,
 * adds blocks one-by-one, and splits into pages when content overflows.
 * This ensures text never gets clipped at the bottom of a page.
 */
export function paginateEpisodes(
  episodes: Episode[],
  dimensions: PageDimensions
): Page[] {
  const pages: Page[] = [];

  // Create hidden measurement element with same styles as a real page
  const measurer = document.createElement('div');
  measurer.className = 'page page-content';
  measurer.style.position = 'absolute';
  measurer.style.left = '-9999px';
  measurer.style.top = '0';
  measurer.style.visibility = 'hidden';
  measurer.style.width = `${dimensions.width}px`;
  measurer.style.height = `${dimensions.height}px`;
  measurer.style.boxSizing = 'border-box';
  document.body.appendChild(measurer);

  // Book cover (hard page)
  pages.push({ type: 'book-cover', episodeIndex: -1, blocks: [] });

  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i];

    // Episode cover page
    pages.push({
      type: 'episode-cover',
      episodeIndex: i,
      blocks: [],
      episodeMeta: ep.meta,
    });

    let currentBlocks: ContentBlock[] = [];
    measurer.innerHTML = '';

    for (const block of ep.blocks) {
      if (block.type === 'scene-break') {
        // Scene break → flush current page
        if (currentBlocks.length > 0) {
          pages.push({ type: 'content', episodeIndex: i, blocks: [...currentBlocks] });
          currentBlocks = [];
          measurer.innerHTML = '';
        }
        continue;
      }

      // Try adding the block
      currentBlocks.push(block);
      measurer.innerHTML = currentBlocks.map(b => renderBlockHtml(b)).join('\n');

      // Check if content overflows the page
      if (measurer.scrollHeight > measurer.clientHeight) {
        // Remove the block that caused overflow
        currentBlocks.pop();

        if (currentBlocks.length > 0) {
          // Flush current page without the overflowing block
          pages.push({ type: 'content', episodeIndex: i, blocks: [...currentBlocks] });
        }

        // Start new page with the overflowing block
        currentBlocks = [block];
        measurer.innerHTML = renderBlockHtml(block);
        // If a single block overflows, it still gets its own page
      }
    }

    if (currentBlocks.length > 0) {
      pages.push({ type: 'content', episodeIndex: i, blocks: [...currentBlocks] });
      measurer.innerHTML = '';
    }
  }

  // Cleanup measurement element
  document.body.removeChild(measurer);

  // Back cover (hard page)
  pages.push({ type: 'back-cover', episodeIndex: -1, blocks: [] });

  return pages;
}
