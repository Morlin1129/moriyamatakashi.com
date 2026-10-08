// プロフィールページ（src/pages/profile.astro）の構造データ。
// 文章の段落はページ側に書き、数字・年表・リンクなど後から直すものをここに置く。
// 出典: 政治活動リーフレット、AI 勉強会スライド（2026年9月）、DRIVE メディア・greenz.jp・HOOK の記事、本人聞き取り。
// 設計は docs/superpowers/specs/2026-10-08-profile-page-design.md

export interface Badge {
  icon: string;
  label: string;
}

export interface Field {
  id: string;
  name: string;
  image: { src: string; alt: string };
  body: string[]; // 段落
  facts: string[]; // 数字の行（ないときは空配列）
  link?: { label: string; href: string };
}

export interface Milestone {
  year: number; // 並び順の確認用
  when: string; // 表示用（「2015〜16年」など）
  text: string;
}

export interface Stat {
  value: string;
  label: string;
  note: string;
}

export interface Case {
  title: string;
  text: string;
}

export interface Press {
  outlet: string;
  title: string;
  date?: string;
  url: string;
}

// オムスビの制作・開発実績
export const WORK_URL = 'https://omsb.co/work';
// 受託制作した市の子育て応援サイト
export const KOSODATE_URL = 'https://minamisoma-kosodate.net/';

// 01 自己紹介の下に並べるアイコンの帯（リーフレットの表紙と同じ 4 つ）
export const BADGES: Badge[] = [
  { icon: '/assets/profile/badge-years.webp', label: '移住して12年' },
  { icon: '/assets/profile/badge-it.webp', label: 'IT・業務改善' },
  { icon: '/assets/profile/badge-place.webp', label: '地域拠点を運営' },
  { icon: '/assets/profile/badge-family.webp', label: '子育て中' },
];

// 02 リーフレットの「この地域でやってきたこと」4 分野
export const FIELDS: Field[] = [
  {
    id: 'place',
    name: 'まちの暮らしと場づくり',
    image: { src: '/assets/profile/place.webp', alt: 'アオスバシの店内に集まる人たち' },
    body: [
      '避難指示が解除された直後の2016年末、仲間とキッチンカーのコーヒースタンドを小高駅前で始めました。2018年に常設の店舗、2023年には空き店舗だった寿司店を改装して、カフェ・小売・コワーキングを備えた地域拠点「アオスバシ」を開きました。',
      '「やってみたい」を持つ人が、小さく始められる場所にしています。',
    ],
    facts: [
      'アオスバシの来店者は年間約5,000人',
      'ここから独立して事業を始めた人 2名。拠点を使って事業を行う人 7（個人5・団体2）',
    ],
  },
  {
    id: 'education',
    name: '教育・若者支援',
    image: { src: '/assets/profile/education.webp', alt: 'パソコン教室で教えている様子' },
    body: [
      '子どもや若者が地域で学び、挑戦できる機会づくりに関わってきました。高校でのプログラミング指導、大人向けのIT寺子屋、英語の学びのコミュニティなど、ITと英語の学びの場を中心に続けています。',
    ],
    facts: ['小高産業技術高校でプログラミング指導 10年（うち2年は実務家教員）', 'IT寺子屋 11年継続'],
  },
  {
    id: 'dialogue',
    name: '地域・事業者との意見交換',
    image: { src: '/assets/profile/dialogue.webp', alt: '地図に付箋を貼って意見を出し合うワークショップ' },
    body: [
      '移住した直後は、小高の情報誌の発刊や、ITで帰還支援を考えるハッカソンの開催に関わりました。その後も地域の意見交換の場に参加し、地域の人や事業者の声を聞き、課題やアイデアを一緒に整理してきました。',
    ],
    facts: [],
  },
  {
    id: 'it',
    name: 'IT・業務改善／事業支援',
    image: { src: '/assets/profile/coffee.webp', alt: 'アオスバシでコーヒーを淹れる森山貴士' },
    body: [
      'ITやAIを使った業務改善や、地域の事業者の仕事づくりと情報発信を支援してきました。南相馬市の子育て応援サイトも受託して制作しています。',
    ],
    facts: [],
    link: { label: '南相馬市 子育て応援サイト', href: KOSODATE_URL },
  },
];

// 02 あゆみ（記事で確認できた年月。宿題カフェは載せない）
export const MILESTONES: Milestone[] = [
  { year: 2014, when: '2014年7月', text: '南相馬市へ移住。ITエンジニアとして独立。最初は原町区に住み、小高で活動を始める' },
  { year: 2015, when: '2015〜16年', text: '情報誌「小高の小数力」を発刊。ITで帰還支援を考えるハッカソンを開催' },
  { year: 2016, when: '2016年12月', text: '避難指示解除後の小高駅前で、仲間とキッチンカーのコーヒースタンド「Odaka Micro Stand Bar」を開業' },
  { year: 2017, when: '2017年3月', text: '「Odaka Micro Coffee Lights」。コーヒー1杯でソーラーライト1本を高校生の下校路に設置。約2か月で150本以上' },
  { year: 2017, when: '2017年4月', text: '一般社団法人オムスビを設立' },
  { year: 2018, when: '2018年6月', text: '小高駅前に常設店舗を開業' },
  { year: 2018, when: '2018〜19年', text: '南相馬市の移住体験施設「お試しハウス」の運営を受託' },
  { year: 2023, when: '2023年1月', text: 'オムスビとして令和4年度「新しい東北」復興・創生の星顕彰を受賞' },
  { year: 2023, when: '2023年7月', text: '複合施設「アオスバシ」を開業' },
];

// 03 数字のある実績（AI 勉強会スライドより。公開前に測定条件とクライアントの承諾を確認する）
export const STATS: Stat[] = [
  { value: '5倍', label: 'Webサイトのアクセス数', note: 'リニューアル前後で5倍に。安定して稼働するサイトへ' },
  { value: '6倍', label: '問い合わせ率の改善', note: '0.2%から1.2%へ' },
  { value: '約100万円', label: '年間コストの削減', note: '独自CRMと電子契約の連携による' },
];

// 03 業務改善の実践例（クライアント名は出さない）
export const CASES: Case[] = [
  { title: '不動産情報の管理システム', text: '問い合わせと物件情報の管理・分析を一元化し、業務の工数を削減' },
  { title: '大手小売業のナレッジ管理改善', text: '社内に蓄積された知識や業務情報を、必要な人が使いやすくする改善プロジェクトに参画' },
  { title: '卸売業の業務改善', text: '現場の業務の流れを整理し、仕事の進め方や情報管理の改善を検討するプロジェクトに参画' },
];

// 04 経歴
export const CAREER: [string, string][] = [
  ['出身', '大阪市'],
  ['学歴', '立命館大学 政策科学部 卒業'],
  ['2009年〜', '東京のIT企業でソフトウェア開発・先端技術研究（約5年）'],
  ['2014年', '南相馬市へ移住。個人事業主として起業'],
  ['2017年', '一般社団法人オムスビ 設立（代表理事）'],
  ['2023年', '地域拠点「アオスバシ」を開業'],
  ['今の仕事', 'ITエンジニア・業務改善コンサルタント／コンサルティング会社のIT顧問'],
  ['受賞', '令和4年度「新しい東北」復興・創生の星顕彰（一般社団法人オムスビとして）'],
];

// 04 外部掲載
export const PRESS: Press[] = [
  {
    outlet: 'greenz.jp',
    title: '福島県南相馬市小高区に移住し、カフェ兼コワーキングスペースを開業した森山貴士さんのローカルでの戦い方',
    date: '2023年10月',
    url: 'https://greenz.jp/2023/10/20/fukushima12_moriyama-takashi/',
  },
  {
    outlet: 'DRIVEメディア',
    title: 'ヨソモノのITエンジニアが、震災後の南相馬で「ゼロからのまちづくり」に取り組むまで',
    url: 'https://drivemedia.etic.or.jp/30042',
  },
  {
    outlet: 'HOOK',
    title: '小高で「みんなが挑戦できる」まちづくりを',
    url: 'https://fukushima-hook.jp/interview_moriyama/',
  },
  {
    outlet: '福島民友',
    title: '名店からパン仕入れ、南相馬「アオスバシ」開店 元すし店を改修',
    date: '2023年7月',
    url: 'https://www.minyu-net.com/gourmet/shoku/FM20230703-788880.php',
  },
  {
    outlet: '復興庁',
    title: '令和4年度「新しい東北」復興・創生の星顕彰 選定結果',
    date: '2023年1月',
    url: 'https://www.reconstruction.go.jp/topics/m23/01/230106_senteikekka.pdf',
  },
];
