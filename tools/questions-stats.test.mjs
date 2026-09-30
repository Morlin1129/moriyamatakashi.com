// src/lib/questions-stats.mjs（一般質問ミニアプリの集計）を確かめる。
import test from 'node:test';
import assert from 'node:assert/strict';
import { sortMembers, sortSessions, crossTab, countBy, orderQuestions, sessionCounts, shadeLevel } from '../src/lib/questions-stats.mjs';

const members = [
  { id: 'm2', name: '佐藤', kana: 'さとう' },
  { id: 'm1', name: '阿部', kana: 'あべ' },
];
const categories = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
const sessions = [
  { id: 's2', year: 2023, month: 3 },
  { id: 's1', year: 2022, month: 12 },
  { id: 's3', year: 2023, month: 6 },
];
const questions = [
  { id: 'q1', session: 's1', member: 'm1', category: 'a', direction: 'doing' },
  { id: 'q2', session: 's2', member: 'm1', category: 'a', direction: 'study' },
  { id: 'q3', session: 's2', member: 'm2', category: 'b', direction: null },
  { id: 'q4', session: 's1', member: 'm2', category: 'a', direction: 'doing' },
];

test('sortMembers: よみの五十音順。元の配列は変えない', () => {
  assert.deepEqual(sortMembers(members).map((m) => m.id), ['m1', 'm2']);
  assert.equal(members[0].id, 'm2');
});

test('sortSessions: 年・月の古い順', () => {
  assert.deepEqual(sortSessions(sessions).map((s) => s.id), ['s1', 's2', 's3']);
});

test('crossTab: 件数・行合計・列合計・総計・最大値', () => {
  const t = crossTab(questions, sortMembers(members), categories);
  assert.deepEqual(t.rows.map((r) => [r.member.id, r.counts, r.total]), [
    ['m1', [2, 0], 2],
    ['m2', [1, 1], 2],
  ]);
  assert.deepEqual(t.colTotals, [3, 1]);
  assert.equal(t.total, 4);
  assert.equal(t.max, 2);
});

test('crossTab: 質問がなければ最大値は 0', () => {
  assert.equal(crossTab([], members, categories).max, 0);
});

test('countBy: 指定した id の順に数え、null は数えない', () => {
  assert.deepEqual(countBy(questions, 'direction', ['study', 'doing', 'no']), [
    { id: 'study', count: 1 },
    { id: 'doing', count: 2 },
    { id: 'no', count: 0 },
  ]);
});

test('orderQuestions: 定例会の新しい順、同じ定例会は元の順', () => {
  assert.deepEqual(orderQuestions(questions, sessions).map((q) => q.id), ['q2', 'q3', 'q1', 'q4']);
});

test('sessionCounts: 定例会の並び（古い順）に、その分野の件数', () => {
  assert.deepEqual(sessionCounts(questions, sortSessions(sessions), 'a'), [2, 1, 0]);
});

test('shadeLevel: 0件は0、最大値は最上段、途中は切り上げ', () => {
  assert.equal(shadeLevel(0, 10, 5), 0);
  assert.equal(shadeLevel(10, 10, 5), 4);
  assert.equal(shadeLevel(1, 10, 5), 1);
  assert.equal(shadeLevel(6, 10, 5), 3);
  assert.equal(shadeLevel(0, 0, 5), 0);
});
