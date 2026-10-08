// src/data/profile.ts の構造を確かめる。中身（事実）の正しさは見ない。
import test from 'node:test';
import assert from 'node:assert/strict';

const data = await import('../src/data/profile.ts');
const { BADGES, FIELDS, MILESTONES, STATS, CASES, CAREER, PRESS, WORK_URL } = data;

const isUrl = (u) => typeof u === 'string' && /^https?:\/\//.test(u);
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

test('アイコンの帯: 4 つあり、画像とラベルが埋まっている', () => {
  assert.equal(BADGES.length, 4);
  for (const b of BADGES) {
    assert.ok(b.icon.startsWith('/assets/profile/badge-'), `${b.label}: icon のパスが不正`);
    assert.ok(nonEmpty(b.label));
  }
});

test('分野カード: 4 枚あり、写真・本文があり、数字と外部リンクは形式が正しい', () => {
  assert.equal(FIELDS.length, 4);
  for (const f of FIELDS) {
    assert.ok(nonEmpty(f.id) && nonEmpty(f.name), 'id/name が空');
    assert.ok(f.image.src.startsWith('/assets/profile/'), `${f.name}: 写真のパスが不正`);
    assert.ok(nonEmpty(f.image.alt), `${f.name}: 写真の alt が空`);
    assert.ok(f.body.length > 0 && f.body.every(nonEmpty), `${f.name}: 本文が空`);
    assert.ok(f.facts.every(nonEmpty), `${f.name}: 数字の行に空がある`);
    if (f.link) assert.ok(nonEmpty(f.link.label) && isUrl(f.link.href), `${f.name}: リンクが不正`);
  }
});

test('年表: 各行に年と出来事があり、年の昇順に並んでいる', () => {
  assert.ok(MILESTONES.length >= 8);
  for (const m of MILESTONES) {
    assert.ok(Number.isInteger(m.year), `${m.text}: year が整数でない`);
    assert.ok(nonEmpty(m.when) && nonEmpty(m.text));
  }
  for (let i = 1; i < MILESTONES.length; i++) {
    assert.ok(MILESTONES[i - 1].year <= MILESTONES[i].year, `「${MILESTONES[i].text}」の順序が前後している`);
  }
});

test('数字タイル: 3 つあり、値・ラベル・補足が埋まっている', () => {
  assert.equal(STATS.length, 3);
  for (const s of STATS) assert.ok(nonEmpty(s.value) && nonEmpty(s.label) && nonEmpty(s.note), `${s.label}: 空がある`);
});

test('実践例・経歴・掲載記事: 空がなく URL は http で始まる', () => {
  assert.ok(CASES.length >= 3);
  for (const c of CASES) assert.ok(nonEmpty(c.title) && nonEmpty(c.text));
  assert.ok(CAREER.length >= 6);
  for (const [k, v] of CAREER) assert.ok(nonEmpty(k) && nonEmpty(v));
  assert.ok(PRESS.length >= 5);
  for (const p of PRESS) assert.ok(nonEmpty(p.outlet) && nonEmpty(p.title) && isUrl(p.url), `${p.title}: 不正`);
  assert.ok(isUrl(WORK_URL));
});
