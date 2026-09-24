// ミニアプリ「小高 復興のあゆみ」の JSON の型。odaka-timeline.json / odaka-projects.json に対応する。
export interface Source { title: string; url: string }

export interface TimelineItem {
  year: number;
  month?: number;
  kind: 'plan' | 'survey' | 'project' | 'event';
  title: string;
  summary: string;
  body?: string;
  projectId?: string;
  sources: Source[];
  verified: boolean;
  note?: string;
}

export interface Project {
  id: string;
  name: string;
  category: string;
  status: 'done' | 'building' | 'planned' | 'suspended';
  start: number;
  end?: number;
  summary: string;
  body?: string;
  current: { label: string; value: string; asOf: string; source: string }[];
  sources: Source[];
  verified: boolean;
}
