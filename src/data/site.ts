// サイト全体で使う名前・説明・ナビゲーション
export const SITE_NAME = '森山貴士';
// サイトの運営名義（フッターの © とプライバシーポリシーで使う）
export const ORGANIZATION = `${SITE_NAME}後援会`;
export const TAGLINE = '「こうなったらいいな」をひとつずつ';
export const DEFAULT_DESCRIPTION =
  '困りごとを、放っておかない。南相馬・小高で暮らす一児の父、森山貴士が、子育てや仕事の「不便」を市役所と一緒に直していくための取り組み。';

export type NavKey = 'vision' | 'policies' | 'resources' | 'profile' | 'supporters';

export const NAV: { key: NavKey; label: string; href: string }[] = [
  { key: 'vision', label: '考え方', href: '/vision/' },
  { key: 'policies', label: '取り組みたいこと', href: '/policies/' },
  { key: 'resources', label: 'まちを知る', href: '/resources/' },
  { key: 'profile', label: 'プロフィール', href: '/profile/' },
  { key: 'supporters', label: '後援会', href: '/supporters/' },
];

// SNS（後援会ページのボタンとフッターのリンク）。badge はボタンの左に出す短い名前、action はボタンの文言
export const SNS = [
  { key: 'line', name: '公式LINE', badge: 'LINE', action: '友だち追加', href: 'https://lin.ee/RwiHFyR' },
  { key: 'facebook', name: 'Facebook', badge: 'facebook', action: 'ページを見る', href: 'https://www.facebook.com/takashi.moriyama.12' },
] as const;

// メニューには載せず、フッターと各フォームからリンクするページ
export const PRIVACY = { label: 'プライバシーポリシー', href: '/privacy/' };

// パンくずなどでメニュー項目を引くときに使う（ラベルのベタ書きを避ける）
export const navItem = (key: NavKey) => NAV.find((item) => item.key === key)!;
