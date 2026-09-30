// src/data/questions*.json（ミニアプリ「一般質問 みんなの論点」）の構造を確かめる。中身（事実）の正しさは見ない。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sortSessions } from '../src/lib/questions-stats.mjs';

const read = (name) => JSON.parse(readFileSync(new URL(`../src/data/${name}`, import.meta.url), 'utf8'));
const meta = read('questions-meta.json');
const data = read('questions.json');
const analysis = read('questions-analysis.json');

const CATEGORY_IDS = meta.categories.map((c) => c.id);
const DIRECTION_IDS = meta.directions.map((d) => d.id);
const isUrl = (u) => typeof u === 'string' && /^https?:\/\//.test(u);
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;
const unique = (arr, label) => assert.equal(new Set(arr).size, arr.length, `${label} の id が重複している`);

const sessionIds = new Set(data.sessions.map((s) => s.id));
const memberIds = new Set(data.members.map((m) => m.id));
const questionIds = new Set(data.questions.map((q) => q.id));

test('対応表: id が一意で表示名がある', () => {
  unique(CATEGORY_IDS, '分野');
  unique(DIRECTION_IDS, '方向性');
  for (const c of [...meta.categories, ...meta.directions]) assert.ok(nonEmpty(c.label), `${c.id}: label が空`);
  for (const [k, s] of Object.entries(meta.sources)) assert.ok(isUrl(s.url) && nonEmpty(s.title), `sources.${k} が不正`);
  for (const k of ['id', 'label', 'titleOnly', 'notInDayori']) assert.ok(nonEmpty(meta.noDirection[k]), `noDirection.${k} が空`);
});

test('定例会: id が一意で、号の情報がそろっている', () => {
  unique(data.sessions.map((s) => s.id), '定例会');
  for (const s of data.sessions) {
    const label = `定例会 ${s.id}`;
    assert.match(s.id, /^r\d+-(0[1-9]|1[0-2])$/, `${label}: id は r<令和年>-<月2桁>`);
    assert.ok(nonEmpty(s.name), `${label}: name が空`);
    assert.ok(Number.isInteger(s.year) && Number.isInteger(s.month) && s.month >= 1 && s.month <= 12, `${label}: 年月が不正`);
    assert.equal(s.id, `r${s.year - 2018}-${String(s.month).padStart(2, '0')}`, `${label}: id と year / month が合わない`);
    assert.ok(Number.isInteger(s.issue?.vol), `${label}: issue.vol が整数でない`);
    assert.match(s.issue.date, /^\d{4}-\d{2}-\d{2}$/, `${label}: issue.date は YYYY-MM-DD`);
    assert.ok(isUrl(s.issue.url) && isUrl(s.issue.pdf), `${label}: issue の url / pdf が不正`);
    const count = data.questions.filter((q) => q.session === s.id).length;
    if (s.note === undefined) assert.ok(count > 0, `${label}: 質問が1件もないなら note（未収録の理由）が要る`);
    else assert.ok(nonEmpty(s.note) && count === 0, `${label}: 未収録（note あり）なのに質問がある`);
  }
});

test('議員: id が一意で、よみがあり、1件以上質問している', () => {
  unique(data.members.map((m) => m.id), '議員');
  for (const m of data.members) {
    assert.ok(nonEmpty(m.name) && nonEmpty(m.kana), `議員 ${m.id}: name / kana が空`);
    assert.match(m.kana, /^[ぁ-ゖー\s]+$/, `議員 ${m.id}: kana はひらがな`);
    assert.ok(data.questions.some((q) => q.member === m.id), `議員 ${m.id}: 質問がない（一覧から外す）`);
    if (m.note !== undefined) assert.ok(nonEmpty(m.note), `議員 ${m.id}: note が空`);
  }
});

test('議員: 役職（roles）の期間が正しく、議長の間は一般質問がない', () => {
  const order = new Map(sortSessions(data.sessions).map((s, i) => [s.id, i]));
  for (const m of data.members) {
    for (const r of m.roles ?? []) {
      const label = `議員 ${m.id} の役職「${r.label}」`;
      assert.ok(nonEmpty(r.label), `議員 ${m.id}: roles の label が空`);
      assert.ok(order.has(r.from) && order.has(r.to), `${label}: from / to が存在する定例会 id でない`);
      assert.ok(order.get(r.from) <= order.get(r.to), `${label}: from が to より後`);
      if (r.label !== '議長') continue;
      for (const q of data.questions.filter((q) => q.member === m.id)) {
        const i = order.get(q.session);
        assert.ok(i < order.get(r.from) || i > order.get(r.to), `${label}: 期間内の ${q.session} に質問 ${q.id} がある`);
      }
    }
  }
});

test('質問: 参照先と値が正しい', () => {
  unique(data.questions.map((q) => q.id), '質問');
  for (const q of data.questions) {
    const label = `質問 ${q.id}「${q.title}」`;
    assert.ok(sessionIds.has(q.session), `${label}: session ${q.session} がない`);
    assert.ok(q.id.startsWith(`${q.session}-`), `${label}: id は <session>-<番号>`);
    assert.match(q.id.slice(q.session.length + 1), /^\d{2,}$/, `${label}: id の番号は2桁以上の数字`);
    assert.ok(memberIds.has(q.member), `${label}: member ${q.member} がない`);
    assert.ok(CATEGORY_IDS.includes(q.category), `${label}: category が不正 (${q.category})`);
    assert.ok(q.direction === null || DIRECTION_IDS.includes(q.direction), `${label}: direction が不正 (${q.direction})`);
    assert.ok(nonEmpty(q.title) && nonEmpty(q.question), `${label}: title / question が空`);
    assert.equal(typeof q.answer, 'string', `${label}: answer は文字列（なければ空文字）`);
    assert.equal(typeof q.reason, 'string', `${label}: reason は文字列（なければ空文字）`);
    if (q.direction !== null) assert.ok(nonEmpty(q.answer) && nonEmpty(q.reason), `${label}: 方向性があるのに answer / reason が空`);
    if (q.page !== undefined) assert.ok(Number.isInteger(q.page) && q.page > 0, `${label}: page は正の整数`);
    for (const text of [q.question, q.answer, q.reason]) assert.ok(!/https?:\/\//.test(text), `${label}: 要約に URL を書かない`);
  }
});

test('質問: 同じ定例会の中では id の番号が掲載順に並ぶ', () => {
  for (const s of data.sessions) {
    const nums = data.questions.filter((q) => q.session === s.id).map((q) => Number(q.id.slice(s.id.length + 1)));
    assert.deepEqual(nums, [...nums].sort((a, b) => a - b), `定例会 ${s.id}: id の番号が昇順でない`);
  }
});

test('分析: 分野と質問 id が存在する', () => {
  assert.ok(Array.isArray(analysis.topics), 'topics が配列でない');
  if (analysis.topics.length > 0) assert.match(analysis.generatedAt, /^\d{4}-\d{2}-\d{2}$/, 'generatedAt は YYYY-MM-DD');
  unique(analysis.topics.map((t) => t.category), '分析の分野');
  for (const t of analysis.topics) {
    assert.ok(CATEGORY_IDS.includes(t.category), `分析: category が不正 (${t.category})`);
    assert.ok(t.points.length >= 1 && t.points.length <= 4, `分析 ${t.category}: 論点は1〜4項目`);
    for (const p of t.points) {
      assert.ok(nonEmpty(p.text), `分析 ${t.category}: text が空`);
      assert.ok(p.questionIds.length > 0, `分析 ${t.category}: questionIds が空`);
      for (const id of p.questionIds) {
        assert.ok(questionIds.has(id), `分析 ${t.category}: 質問 ${id} がない`);
        assert.equal(data.questions.find((q) => q.id === id).category, t.category, `分析 ${t.category}: 質問 ${id} の分野が違う`);
      }
    }
  }
});

test('分析: 答弁のある質問がある論点では、例（先頭）に答弁のある質問を置く', () => {
  const byId = new Map(data.questions.map((q) => [q.id, q]));
  for (const t of analysis.topics) {
    for (const p of t.points) {
      const directed = p.questionIds.filter((id) => byId.get(id)?.direction != null);
      if (directed.length === 0) continue;
      assert.notEqual(byId.get(p.questionIds[0]).direction, null, `分析 ${t.category}「${p.text.slice(0, 20)}…」: 先頭 ${p.questionIds[0]} に方向性がない（${directed[0]} などを先頭に）`);
    }
  }
});
