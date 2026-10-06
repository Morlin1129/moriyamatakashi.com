// src/lib/sectionize.mjs（取り組み本文の h2 ごとの section 化）を確かめる。
import test from 'node:test';
import assert from 'node:assert/strict';
import { sectionize } from '../src/lib/sectionize.mjs';

const el = (tagName, children = []) => ({ type: 'element', tagName, properties: {}, children });
const nl = () => ({ type: 'text', value: '\n' });

test('h2 から次の h2 の直前までを section で包む', () => {
  const out = sectionize([el('h2'), nl(), el('p'), nl(), el('h2'), nl(), el('ul')]);
  assert.deepEqual(out.map((n) => n.tagName), ['section', 'section']);
  assert.deepEqual(out[0].children.map((n) => n.tagName ?? n.value), ['h2', '\n', 'p', '\n']);
  assert.deepEqual(out[1].children.map((n) => n.tagName ?? n.value), ['h2', '\n', 'ul']);
});

test('最初の h2 より前のノードはそのまま残す', () => {
  const out = sectionize([el('p'), nl(), el('h2'), el('p')]);
  assert.deepEqual(out.map((n) => n.tagName ?? n.value), ['p', '\n', 'section']);
});

test('h3 は包まない（section の中にそのまま入る）', () => {
  const out = sectionize([el('h2'), el('h3'), el('p')]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].children.map((n) => n.tagName), ['h2', 'h3', 'p']);
});

test('h2 がなければ何も変えない。入力の配列は変えない', () => {
  const input = [el('p'), el('ul')];
  const out = sectionize(input);
  assert.deepEqual(out.map((n) => n.tagName), ['p', 'ul']);
  assert.equal(input.length, 2);
});

test('section の properties は空（id は見出しに残す）', () => {
  const h2 = { type: 'element', tagName: 'h2', properties: { id: 'x' }, children: [] };
  const [section] = sectionize([h2]);
  assert.deepEqual(section.properties, {});
  assert.equal(section.children[0].properties.id, 'x');
});
