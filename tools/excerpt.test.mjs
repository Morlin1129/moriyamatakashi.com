// src/lib/excerpt.mjs（一覧カードに出す本文の抜粋）を確かめる。
import test from 'node:test';
import assert from 'node:assert/strict';
import { excerpt } from '../src/lib/excerpt.mjs';

test('改行を取り除いて、指定の文字数で切って「…」を付ける', () => {
  assert.equal(excerpt('あいう\nえお\n\nかきく', 5), 'あいうえお…');
});

test('文字数が収まるときはそのまま返す（「…」は付けない）', () => {
  assert.equal(excerpt('あいう\nえお', 5), 'あいうえお');
});

test('サロゲートペアの文字も1文字と数える', () => {
  assert.equal(excerpt('𠮷野家です', 3), '𠮷野家…');
});
