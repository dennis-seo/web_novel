import type { NovelInfo } from './types';

export async function initSelector(base: string): Promise<void> {
  const container = document.getElementById('novel-selector')!;
  const grid = document.getElementById('novel-grid')!;

  const res = await fetch(`${base}data/novels.json`);
  if (!res.ok) throw new Error('Failed to load novels list');

  const novels: NovelInfo[] = await res.json();

  grid.innerHTML = '';

  for (const novel of novels) {
    const card = document.createElement('div');
    card.className = 'novel-card';
    card.style.setProperty('--cover-color', novel.coverColor);
    card.innerHTML = `
      <div class="novel-card-cover">
        <div class="novel-card-deco">// ${novel.subtitle} v0.0</div>
        <h2 class="novel-card-title">${escapeHtml(novel.title)}</h2>
        <p class="novel-card-subtitle">${escapeHtml(novel.subtitle)}</p>
        <div class="novel-card-line"></div>
        <p class="novel-card-author">${escapeHtml(novel.author)}</p>
      </div>
      <div class="novel-card-info">
        <p class="novel-card-desc">${escapeHtml(novel.description)}</p>
        <span class="novel-card-episodes">${novel.totalEpisodes} episodes</span>
      </div>
    `;
    card.addEventListener('click', () => {
      location.hash = `#/${novel.id}`;
    });
    grid.appendChild(card);
  }

  container.style.display = 'flex';
}

export function hideSelector(): void {
  const container = document.getElementById('novel-selector');
  if (container) container.style.display = 'none';
}

export function showSelector(): void {
  const container = document.getElementById('novel-selector');
  if (container) container.style.display = 'flex';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
