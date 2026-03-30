import type { ContentBlock, Episode, Page, FrontmatterData } from './types';

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

  // Frontmatter: world map page
  const mapData: FrontmatterData = {
    mapImage: '/web_novel/illustrations/maps/map-eldia-overview.png',
    mapTitle: '에르다스 — 제1대륙 엘디아',
    locations: [
      { name: '벨포드', desc: '모험의 시작점. 남부 초원 지대의 변방 도시' },
      { name: '아르카디온', desc: '아르카디온 왕국의 수도. 세 강의 합류점' },
      { name: '세레니아 숲', desc: '엘프 자치령. 고대 숲과 정령의 샘' },
      { name: '카론', desc: '서해안 항구 도시. 대륙 간 교역의 거점' },
      { name: '크레센트 산맥', desc: '북부 경계. 드워프 정착지가 산재' },
    ],
  };
  pages.push({ type: 'frontmatter-map', episodeIndex: -1, blocks: [], frontmatter: mapData });

  // Frontmatter: character profiles (2 per page)
  const profiles: FrontmatterData = {
    title: '등장인물 소개',
    characters: [
      { name: '카이렌 아셀', image: '/web_novel/illustrations/profiles/profile-kairen-s1.png', race: '인간(남)', job: '마법사', age: '23세', rank: 'F→', desc: '차분한 분석가. 관찰과 수식으로 전장을 읽는 후방 전술가' },
      { name: '가렌 벨크로스', image: '/web_novel/illustrations/profiles/profile-garen-s1.png', race: '인간(남)', job: '전직 기사', age: '25세', rank: 'E→', desc: '무모하지만 동료를 위해 몸을 사리지 않는 전위 검사' },
      { name: '리에나 에란실', image: '/web_novel/illustrations/profiles/profile-liena-s1.png', race: '엘프(여)', job: '정령술사', age: '127세(외견 23세)', rank: 'D', desc: '냉정해 보이지만 세심한 치유사. 바람 정령 실피드의 계약자' },
      { name: '테오 마르케스', image: '/web_novel/illustrations/profiles/profile-theo-s1.png', race: '인간(남)', job: '도적', age: '19세', rank: 'F', desc: '빈민가 출신의 함정 해제 전문가. 밝고 에너지 넘치는 파티의 막내' },
    ],
  };
  // Page 1: first 2 characters
  pages.push({ type: 'frontmatter-profile', episodeIndex: -1, blocks: [], frontmatter: { ...profiles, characters: profiles.characters!.slice(0, 2) } });
  // Page 2: next 2 characters
  pages.push({ type: 'frontmatter-profile', episodeIndex: -1, blocks: [], frontmatter: { ...profiles, characters: profiles.characters!.slice(2, 4) } });

  // Table of contents pages (after frontmatter)
  const tocEntries = episodes.map(ep => ({ episode: ep.meta.episode, title: ep.meta.title }));
  const TOC_PER_PAGE = 15;
  for (let t = 0; t < tocEntries.length; t += TOC_PER_PAGE) {
    pages.push({
      type: 'toc',
      episodeIndex: -1,
      blocks: [],
      tocEntries: tocEntries.slice(t, t + TOC_PER_PAGE),
    });
  }

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

      // Illustrations always get their own dedicated page
      // (lazy-loaded images can't be measured, so we force a page break)
      if (block.type === 'illustration') {
        if (currentBlocks.length > 0) {
          pages.push({ type: 'content', episodeIndex: i, blocks: [...currentBlocks] });
          currentBlocks = [];
          measurer.innerHTML = '';
        }
        pages.push({ type: 'content', episodeIndex: i, blocks: [block] });
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
