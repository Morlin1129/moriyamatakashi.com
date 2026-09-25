// サイト全体で使う名前・説明・ナビゲーション
export const SITE_NAME = '森山貴士';
export const TAGLINE = '南相馬のこれからを、みなさんと。';
export const DEFAULT_DESCRIPTION =
  '困りごとを、放っておかない。南相馬・小高で暮らす一児の父、森山貴士が、子育てや仕事の「不便」を市役所と一緒に直していくための取り組み。';

export type NavKey = 'vision' | 'policies' | 'resources' | 'profile';

export const NAV: { key: NavKey; label: string; href: string }[] = [
  { key: 'vision', label: '考え方', href: '/vision/' },
  { key: 'policies', label: '取り組みたいこと', href: '/policies/' },
  { key: 'resources', label: '資料と数字', href: '/resources/' },
  { key: 'profile', label: 'プロフィール', href: '/profile/' },
];
