export interface EpisodeMeta {
  episode: number;
  title: string;
  chars: number;
  summary: string;
}

export interface ContentBlock {
  type: 'narrative' | 'system-ui-zero' | 'system-ui-v2' | 'scene-break' | 'dialogue' | 'illustration';
  content: string;
  src?: string;
  alt?: string;
}

export interface Episode {
  meta: EpisodeMeta;
  blocks: ContentBlock[];
}

export interface Page {
  type: 'book-cover' | 'back-cover' | 'episode-cover' | 'content' | 'frontmatter-map' | 'frontmatter-profile';
  episodeIndex: number;
  blocks: ContentBlock[];
  episodeMeta?: EpisodeMeta;
  frontmatter?: FrontmatterData;
}

export interface CharacterProfile {
  name: string;
  image: string;
  race: string;
  job: string;
  age: string;
  rank: string;
  desc: string;
}

export interface FrontmatterData {
  mapImage?: string;
  mapTitle?: string;
  locations?: Array<{ name: string; desc: string }>;
  characters?: CharacterProfile[];
  title?: string;
}

export interface BookData {
  title: string;
  subtitle: string;
  author: string;
  totalEpisodes: number;
  episodes: Episode[];
}

export interface NovelInfo {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  description: string;
  coverColor: string;
  totalEpisodes: number;
}
