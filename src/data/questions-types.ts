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

/** 議員の役職と、その期間（from〜to は定例会 id。両端を含む） */
export interface MemberRole { label: string; from: string; to: string }

/** seat: 現在の議席番号（失職した議員は当時の番号。表の並び順に使う）。roles: 議長など一般質問を行わない役職の期間。note: 表の注記（失職など） */
export interface Member { id: string; name: string; kana: string; seat: number; roles?: MemberRole[]; note?: string }

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
/** 方向性を判定していない質問の表示。titleOnly / notInDayori はカードの注記（議会だよりに件名だけ載った / 載っていない） */
export interface NoDirection { id: string; label: string; titleOnly: string; notInDayori: string }

export const NO_DIRECTION = meta.noDirection as NoDirection;
export const SOURCES = meta.sources as Record<'dayori' | 'kaigiroku' | 'subjects', Source>;
