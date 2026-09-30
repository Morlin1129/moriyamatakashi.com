// ミニアプリ「一般質問 みんなの論点」の JSON の型。questions.json / questions-analysis.json / questions-meta.json に対応する。
import meta from './questions-meta.json';

export type CategoryId = 'childcare' | 'welfare' | 'industry' | 'recovery' | 'disaster' | 'town' | 'environment' | 'community' | 'admin' | 'other';
export type DirectionId = 'doing' | 'positive' | 'study' | 'status' | 'no';

export interface Category { id: CategoryId; label: string }
export interface Direction { id: DirectionId; label: string; hint: string }
export interface Source { title: string; url: string }

export interface Session {
  id: string;
  name: string;
  year: number;
  month: number;
  issue: { vol: number; date: string; url: string; pdf: string };
  /** 未収録の理由。あれば一覧・集計に含めない */
  note?: string;
}

export interface Member { id: string; name: string; kana: string; note?: string }

export interface Question {
  id: string;
  session: string;
  member: string;
  category: CategoryId;
  title: string;
  question: string;
  answer: string;
  direction: DirectionId | null;
  reason: string;
  page?: number;
}

export interface Topic { category: CategoryId; points: { text: string; questionIds: string[] }[] }

export interface CrossTab {
  rows: { member: Member; counts: number[]; total: number }[];
  colTotals: number[];
  total: number;
  max: number;
}

export const CATEGORIES = meta.categories as Category[];
export const DIRECTIONS = meta.directions as Direction[];
export const NO_DIRECTION = meta.noDirection as { id: string; label: string };
export const SOURCES = meta.sources as Record<'dayori' | 'kaigiroku' | 'subjects', Source>;
