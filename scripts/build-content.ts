import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

interface Block {
  type: 'narrative' | 'system-ui-zero' | 'system-ui-v2' | 'scene-break' | 'dialogue';
  content: string;
}

interface Episode {
  meta: {
    episode: number;
    title: string;
    chars: number;
    summary: string;
  };
  blocks: Block[];
}

interface NovelMeta {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  description: string;
  coverColor: string;
}

function classifyBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.split('\n');
  let buffer: string[] = [];
  let inSystemUI = false;
  let systemUIType: 'system-ui-zero' | 'system-ui-v2' = 'system-ui-zero';

  function flushBuffer() {
    if (buffer.length === 0) return;
    const text = buffer.join('\n').trim();
    if (!text) { buffer = []; return; }

    const paragraphs = text.split(/\n\n+/);
    for (const p of paragraphs) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      blocks.push({ type: 'narrative', content: trimmed });
    }
    buffer = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Scene break (standalone ---)
    if (trimmed === '---' && !inSystemUI) {
      flushBuffer();
      blocks.push({ type: 'scene-break', content: '' });
      continue;
    }

    // System UI start: v0.0 double-line box
    if (line.includes('╔') && !inSystemUI) {
      flushBuffer();
      inSystemUI = true;
      systemUIType = 'system-ui-zero';
      buffer = [line];
      continue;
    }

    // System UI start: v2.0 single-line box
    if (line.includes('┌─') && !inSystemUI) {
      flushBuffer();
      inSystemUI = true;
      systemUIType = 'system-ui-v2';
      buffer = [line];
      continue;
    }

    // System UI end
    if (inSystemUI && (line.includes('╚') || line.includes('└─'))) {
      buffer.push(line);
      blocks.push({ type: systemUIType, content: buffer.join('\n') });
      buffer = [];
      inSystemUI = false;
      continue;
    }

    if (inSystemUI) {
      buffer.push(line);
      continue;
    }

    // Normal content
    buffer.push(line);
  }

  flushBuffer();
  return blocks;
}

// Main
const projectRoot = process.cwd();
const novelsDir = path.resolve(projectRoot, 'novels');
const outputDir = path.resolve(projectRoot, 'public', 'data');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Scan all novel folders
const novelFolders = fs.readdirSync(novelsDir)
  .filter(f => fs.statSync(path.join(novelsDir, f)).isDirectory())
  .sort();

const novelsList: Array<NovelMeta & { totalEpisodes: number }> = [];

for (const folder of novelFolders) {
  const novelDir = path.join(novelsDir, folder);
  const metaPath = path.join(novelDir, 'novel.json');

  if (!fs.existsSync(metaPath)) {
    console.warn(`Skipping ${folder}: no novel.json found`);
    continue;
  }

  const novelMeta: NovelMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

  // Read episodes
  const files = fs.readdirSync(novelDir)
    .filter(f => /^ep\d{3}\.md$/.test(f))
    .sort();

  const episodes: Episode[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(novelDir, file), 'utf-8');
    const { data, content } = matter(raw);
    const blocks = classifyBlocks(content);
    episodes.push({
      meta: {
        episode: data.episode,
        title: data.title || '',
        chars: data.chars || 0,
        summary: data.summary || '',
      },
      blocks,
    });
  }

  // Write per-novel data file
  const bookData = {
    title: novelMeta.title,
    subtitle: novelMeta.subtitle,
    author: novelMeta.author,
    totalEpisodes: episodes.length,
    episodes,
  };

  fs.writeFileSync(
    path.join(outputDir, `${novelMeta.id}.json`),
    JSON.stringify(bookData),
    'utf-8'
  );

  console.log(`  ${novelMeta.id}: ${episodes.length} episodes → public/data/${novelMeta.id}.json`);

  novelsList.push({
    ...novelMeta,
    totalEpisodes: episodes.length,
  });
}

// Write novels index
fs.writeFileSync(
  path.join(outputDir, 'novels.json'),
  JSON.stringify(novelsList),
  'utf-8'
);

console.log(`\nBuilt ${novelsList.length} novel(s) → public/data/novels.json`);
