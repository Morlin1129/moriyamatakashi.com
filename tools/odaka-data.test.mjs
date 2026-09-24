// src/data/odaka-*.json の構造を確かめる。中身（事実）の正しさは見ない。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => JSON.parse(readFileSync(new URL(`../src/data/${name}`, import.meta.url), 'utf8'));
const timeline = read('odaka-timeline.json');
const projects = read('odaka-projects.json');
const numbers = read('odaka-numbers.json');

const KINDS = ['plan', 'survey', 'project', 'event'];
const STATUSES = ['done', 'building', 'planned', 'suspended'];
const isUrl = (u) => typeof u === 'string' && /^https?:\/\//.test(u);
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

const checkSources = (sources, label, verified) => {
  assert.ok(Array.isArray(sources), `${label}: sources が配列でない`);
  for (const s of sources) {
    assert.ok(nonEmpty(s.title), `${label}: 出典の title が空`);
    assert.ok(isUrl(s.url), `${label}: 出典の url が不正 (${s.url})`);
  }
  if (verified) assert.ok(sources.length > 0, `${label}: 確認済みなのに出典がない`);
};

test('年表: 各項目に必要な値があり、確認済みなら出典がある', () => {
  assert.ok(Array.isArray(timeline.items), `年表: items が配列でない`);
  timeline.items.forEach((it, i) => {
    const label = `年表[${i}]「${it.title}」`;
    assert.ok(Number.isInteger(it.year), `${label}: year が整数でない`);
    if (it.month !== undefined) assert.ok(Number.isInteger(it.month) && it.month >= 1 && it.month <= 12, `${label}: month が 1〜12 の整数でない`);
    assert.ok(KINDS.includes(it.kind), `${label}: kind が不正 (${it.kind})`);
    assert.ok(nonEmpty(it.title), `${label}: title が空`);
    assert.ok(nonEmpty(it.summary), `${label}: summary が空`);
    assert.equal(typeof it.verified, 'boolean', `${label}: verified が真偽値でない`);
    checkSources(it.sources, label, it.verified);
    if (!it.verified) assert.ok(nonEmpty(it.note), `${label}: 未確認なのに note がない`);
  });
});

test('年表: 年月の昇順に並んでいる', () => {
  const key = (it) => it.year * 100 + (it.month ?? 0);
  for (let i = 1; i < timeline.items.length; i++) {
    assert.ok(key(timeline.items[i - 1]) <= key(timeline.items[i]), `「${timeline.items[i].title}」の順序が前後している`);
  }
});

test('年表: projectId は事業に存在する', () => {
  const ids = new Set(projects.items.map((p) => p.id));
  for (const it of timeline.items) {
    if (it.projectId !== undefined) assert.ok(ids.has(it.projectId), `年表「${it.title}」の projectId ${it.projectId} が事業にない`);
  }
});

test('事業: id は一意で、状態と出典がそろっている', () => {
  assert.ok(Array.isArray(projects.items), `事業: items が配列でない`);
  const seen = new Set();
  projects.items.forEach((p, i) => {
    const label = `事業[${i}]「${p.name}」`;
    assert.ok(/^[a-z0-9-]+$/.test(p.id), `${label}: id は小文字英数字とハイフンのみ (${p.id})`);
    assert.ok(!seen.has(p.id), `${label}: id が重複`);
    seen.add(p.id);
    assert.ok(nonEmpty(p.name), `${label}: name が空`);
    assert.ok(nonEmpty(p.category), `${label}: category が空`);
    assert.ok(nonEmpty(p.summary), `${label}: summary が空`);
    assert.ok(STATUSES.includes(p.status), `${label}: status が不正 (${p.status})`);
    assert.ok(Number.isInteger(p.start), `${label}: start が整数でない`);
    if (p.end !== undefined) assert.ok(Number.isInteger(p.end) && p.end >= p.start, `${label}: end が整数でないか start より前`);
    assert.equal(typeof p.verified, 'boolean', `${label}: verified が真偽値でない`);
    checkSources(p.sources, label, p.verified);
    assert.ok(Array.isArray(p.current), `${label}: current が配列でない`);
    for (const c of p.current) {
      assert.ok(nonEmpty(c.label), `${label}: current の label が空`);
      assert.ok(nonEmpty(c.value), `${label}: current の value が空`);
      assert.ok(nonEmpty(c.asOf), `${label}: current の asOf が空`);
      assert.ok(isUrl(c.source), `${label}: current の source が不正`);
    }
    if (p.status !== 'done' && p.current.length === 0) assert.ok(nonEmpty(p.body), `${label}: 未完成で current が空なら body に状況を書く`);
  });
});

test('数字: 各系列に単位・出典・点があり、値は数値か null', () => {
  assert.ok(Array.isArray(numbers.series), `数字: series が配列でない`);
  const ids = new Set();
  numbers.series.forEach((s, i) => {
    const label = `系列[${i}]「${s.title}」`;
    assert.ok(nonEmpty(s.id), `${label}: id が空`);
    assert.ok(!ids.has(s.id), `${label}: id が重複`);
    ids.add(s.id);
    assert.ok(nonEmpty(s.title), `${label}: title が空`);
    assert.equal(typeof s.unit, 'string', `${label}: unit が文字列でない`);
    assert.ok(['bar', 'line'].includes(s.kind), `${label}: kind が bar/line でない`);
    assert.ok(typeof s.source === 'object' && s.source !== null, `${label}: source が不正`);
    checkSources([s.source], label, true);
    assert.ok(Array.isArray(s.points) && s.points.length > 0, `${label}: points が空`);
    let hasValue = false;
    for (let j = 0; j < s.points.length; j++) {
      const p = s.points[j];
      assert.ok(Number.isInteger(p.year), `${label}: points[${j}].year が整数でない`);
      assert.ok(nonEmpty(p.label), `${label}: points[${j}].label が空`);
      assert.ok(p.value === null || typeof p.value === 'number', `${label}: points[${j}].value が数値でも null でもない`);
      if (j > 0) assert.ok(s.points[j - 1].year < p.year, `${label}: year が昇順でない`);
      if (p.value !== null) hasValue = true;
    }
    assert.ok(hasValue, `${label}: 値が一つもない`);
  });
});
