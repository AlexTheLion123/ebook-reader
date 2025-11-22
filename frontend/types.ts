export interface BookRecommendation {
  title: string;
  author: string;
  description: string;
  rating: number;
}

export interface BookDetails extends BookRecommendation {
  longDescription: string;
  chapters: string[];
}

export enum SearchStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}