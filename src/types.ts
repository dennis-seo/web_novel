export interface EpisodeMeta {
  episode: number;
  title: string;
  chars: number;
  summary: string;
}

export interface ContentBlock {
  type: 'narrative' | 'system-ui-zero' | 'system-ui-v2' | 'scene-break' | 'dialogue';
  content: string;
}

export interface Episode {
  meta: EpisodeMeta;
  blocks: ContentBlock[];
}

export interface Page {
  type: 'book-cover' | 'back-cover' | 'episode-cover' | 'content';
  episodeIndex: number;
  blocks: ContentBlock[];
  episodeMeta?: EpisodeMeta;
}

export interface BookData {
  title: string;
  subtitle: string;
  author: string;
  totalEpisodes: number;
  episodes: Episode[];
}
