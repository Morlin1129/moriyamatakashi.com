// 「まちを知る」ページに並べるコンテンツ（ミニアプリと資料集）
export type ToolArt = 'bars' | 'rings' | 'line' | 'paper';

export interface Tool {
  id: string;
  art: ToolArt;
  badge?: string;
  title: string;
  description: string;
  meta: string[];
  href: string;
  cta: string;
}

export const TOOLS: Tool[] = [
  {
    id: 'tax',
    art: 'bars',
    badge: '試作版',
    title: '税金はどこへ行った？ 南相馬版',
    description: '年収を入力すると、自分の市民税が「福祉に1日○円、教育に○円…」と表示される道具です。市の予算を「自分ごと」として考える入口にします。',
    meta: ['データ：令和6年度 決算カード（目的別歳出）、個人市民税の税率', '参考：Code for Japan「税金はどこへ行った？」'],
    href: '/apps/tax/',
    cta: '試作版を使ってみる',
  },
  {
    id: 'dashboard',
    art: 'rings',
    badge: '試作版',
    title: '南相馬 まちの健康診断',
    description: '人口、歳出の大きさと使い道、歳入の内訳、借金の残高や財政指標を、震災前の2010年度から直近まで並べて見られます。近隣や類似市との比較、年齢別の人口などは今後追加します。',
    meta: ['データ：総務省 市町村決算カード（2008〜2024年度）'],
    href: '/apps/health/',
    cta: '試作版を見る',
  },
  {
    id: 'odaka',
    art: 'line',
    badge: '試作版',
    title: '小高 復興のあゆみ',
    description: '震災後の小高区の計画・調査、主要事業の現状、居住人口などの数字を一つの時間軸に並べて見られます。市の公開資料で確認できていない項目は「資料未確認」と表示しています。',
    meta: ['データ：南相馬市・福島県・復興庁などの公開資料（出典は各項目に記載）'],
    href: '/apps/odaka/',
    cta: '試作版を見る',
  },
  {
    id: 'sources',
    art: 'paper',
    title: '資料集',
    description: '政策の根拠にしている市の計画・統計・議会資料を、取り組みごとに絞り込んで探せます。「資料に書かれた事実」と「私の見方」を分けて示すことを目指しています。',
    meta: ['出典：南相馬市の公開資料（各資料に原本へのリンクあり）'],
    href: '/resources/sources/',
    cta: '資料を探す',
  },
];
