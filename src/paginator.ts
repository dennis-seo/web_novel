import type { ContentBlock, Episode, Page } from './types';

const DESKTOP_CHARS = 800;
const MOBILE_CHARS = 500;

export function paginateEpisodes(
  episodes: Episode[],
  isMobile: boolean
): Page[] {
  const charsPerPage = isMobile ? MOBILE_CHARS : DESKTOP_CHARS;
  const pages: Page[] = [];

  // Book cover (hard page)
  pages.push({
    type: 'book-cover',
    episodeIndex: -1,
    blocks: [],
  });

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
    let currentChars = 0;

    for (const block of ep.blocks) {
      if (block.type === 'scene-break') {
        // Scene break → flush current page
        if (currentBlocks.length > 0) {
          pages.push({ type: 'content', episodeIndex: i, blocks: [...currentBlocks] });
          currentBlocks = [];
          currentChars = 0;
        }
        continue;
      }

      const blockLen = block.content.length;

      // System UI blocks: never split, always get their own space
      if (block.type === 'system-ui-zero' || block.type === 'system-ui-v2') {
        if (currentChars > 0 && currentChars + blockLen > charsPerPage) {
          // Flush current page first
          pages.push({ type: 'content', episodeIndex: i, blocks: [...currentBlocks] });
          currentBlocks = [];
          currentChars = 0;
        }
        // If UI block alone exceeds page, it still gets its own page
        if (blockLen > charsPerPage) {
          if (currentBlocks.length > 0) {
            pages.push({ type: 'content', episodeIndex: i, blocks: [...currentBlocks] });
            currentBlocks = [];
            currentChars = 0;
          }
          pages.push({ type: 'content', episodeIndex: i, blocks: [block] });
          continue;
        }
      }

      if (currentChars + blockLen > charsPerPage && currentBlocks.length > 0) {
        pages.push({ type: 'content', episodeIndex: i, blocks: [...currentBlocks] });
        currentBlocks = [block];
        currentChars = blockLen;
      } else {
        currentBlocks.push(block);
        currentChars += blockLen;
      }
    }

    if (currentBlocks.length > 0) {
      pages.push({ type: 'content', episodeIndex: i, blocks: [...currentBlocks] });
    }
  }

  // Back cover (hard page)
  pages.push({
    type: 'back-cover',
    episodeIndex: -1,
    blocks: [],
  });

  return pages;
}
