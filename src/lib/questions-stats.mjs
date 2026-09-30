// ミニアプリ「一般質問 みんなの論点」の集計。ページ（ビルド時）とテストの両方から使う純粋な関数。

/** 議員をよみの五十音順に並べる（元の配列は変えない） */
export const sortMembers = (members) => [...members].sort((a, b) => a.kana.localeCompare(b.kana, 'ja'));

/** 定例会を年・月の古い順に並べる */
export const sortSessions = (sessions) => [...sessions].sort((a, b) => a.year - b.year || a.month - b.month);

/** 議員×分野の件数表。rows は members の順、counts は categories の順 */
export function crossTab(questions, members, categories) {
  const cells = new Map();
  for (const q of questions) {
    const key = `${q.member}|${q.category}`;
    cells.set(key, (cells.get(key) ?? 0) + 1);
  }
  const rows = members.map((member) => {
    const counts = categories.map((c) => cells.get(`${member.id}|${c.id}`) ?? 0);
    return { member, counts, total: counts.reduce((a, b) => a + b, 0) };
  });
  const colTotals = categories.map((_, i) => rows.reduce((sum, r) => sum + r.counts[i], 0));
  const total = colTotals.reduce((a, b) => a + b, 0);
  const max = Math.max(0, ...rows.flatMap((r) => r.counts));
  return { rows, colTotals, total, max };
}

/** questions[key] の値ごとの件数を ids の順で返す。ids にない値（null を含む）は数えない */
export const countBy = (questions, key, ids) =>
  ids.map((id) => ({ id, count: questions.filter((q) => q[key] === id).length }));

/** 一覧の並び：定例会の新しい順、同じ定例会の中は元の（掲載）順 */
export function orderQuestions(questions, sessions) {
  const rank = new Map(sortSessions(sessions).map((s, i) => [s.id, i]));
  return questions
    .map((q, i) => ({ q, i }))
    .sort((a, b) => rank.get(b.q.session) - rank.get(a.q.session) || a.i - b.i)
    .map(({ q }) => q);
}

/** sessions の順に、その分野の件数を返す */
export const sessionCounts = (questions, sessions, categoryId) =>
  sessions.map((s) => questions.filter((q) => q.session === s.id && q.category === categoryId).length);

/** クロス表の濃淡段階（0〜levels-1）。0件は0、1件以上は1以上 */
export const shadeLevel = (count, max, levels) =>
  count <= 0 || max <= 0 ? 0 : Math.max(1, Math.ceil((count / max) * (levels - 1)));
