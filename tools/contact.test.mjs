// src/lib/contact.mjs（お問い合わせ・後援会入会申し込みの検証とメール組み立て）を確かめる。
import test from 'node:test';
import assert from 'node:assert/strict';
import { KINDS, validateSubmission, buildMail } from '../src/lib/contact.mjs';

const inquiry = { name: '森山', email: 'a@example.com', phone: '', subject: '', message: 'こんにちは' };
const membership = { name: '森山', kana: 'もりやま', postal: '979-2121', address: '南相馬市小高区', phone: '0244-00-0000', email: '' };

test('KINDS: 2 種類', () => {
  assert.deepEqual(Object.keys(KINDS).sort(), ['inquiry', 'membership']);
});

test('validateSubmission: 不明な kind は失敗', () => {
  assert.equal(validateSubmission('other', inquiry).ok, false);
});

test('validateSubmission(inquiry): 必須が揃えば ok。前後の空白を取り除く', () => {
  const r = validateSubmission('inquiry', { ...inquiry, name: ' 森山 ' });
  assert.equal(r.ok, true);
  assert.equal(r.values.name, '森山');
  assert.deepEqual(r.errors, {});
});

test('validateSubmission(inquiry): 名前・メール・内容は必須', () => {
  const r = validateSubmission('inquiry', { name: '', email: '', message: '  ' });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ['email', 'message', 'name']);
});

test('validateSubmission(inquiry): メールの形式を確かめる', () => {
  assert.equal(validateSubmission('inquiry', { ...inquiry, email: 'abc' }).ok, false);
  assert.equal(validateSubmission('inquiry', { ...inquiry, email: 'a b@example.com' }).ok, false);
  assert.equal(validateSubmission('inquiry', { ...inquiry, email: 'A.b+c@example.co.jp' }).ok, true);
});

test('validateSubmission(inquiry): 長さの上限を超えると失敗', () => {
  assert.equal(validateSubmission('inquiry', { ...inquiry, name: 'あ'.repeat(101) }).ok, false);
  assert.equal(validateSubmission('inquiry', { ...inquiry, message: 'あ'.repeat(5001) }).ok, false);
  assert.equal(validateSubmission('inquiry', { ...inquiry, message: 'あ'.repeat(5000) }).ok, true);
});

test('validateSubmission(inquiry): 欄が足りなくても落ちない（undefined は空として扱う）', () => {
  const r = validateSubmission('inquiry', { name: '森山', email: 'a@example.com', message: 'x' });
  assert.equal(r.ok, true);
  assert.equal(r.values.phone, '');
});

test('validateSubmission(membership): 必須が揃えば ok。郵便番号はハイフンを取り除く', () => {
  const r = validateSubmission('membership', membership);
  assert.equal(r.ok, true);
  assert.equal(r.values.postal, '9792121');
});

test('validateSubmission(membership): 名前・ふりがな・住所は必須', () => {
  const r = validateSubmission('membership', { ...membership, name: '', kana: '', address: '' });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ['address', 'kana', 'name']);
});

test('validateSubmission(membership): 電話かメールのどちらかは必須', () => {
  const r = validateSubmission('membership', { ...membership, phone: '', email: '' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.phone);
  assert.equal(validateSubmission('membership', { ...membership, phone: '', email: 'a@example.com' }).ok, true);
});

test('validateSubmission(membership): 郵便番号は 7 桁。空は可', () => {
  assert.equal(validateSubmission('membership', { ...membership, postal: '' }).ok, true);
  assert.equal(validateSubmission('membership', { ...membership, postal: '９７９２１２１' }).values.postal, '9792121');
  assert.equal(validateSubmission('membership', { ...membership, postal: '12345' }).ok, false);
});

test('validateSubmission: エラーの文言は日本語', () => {
  const r = validateSubmission('inquiry', { ...inquiry, name: '' });
  assert.match(r.errors.name, /入力/);
});

test('buildMail(inquiry): 件名は【お問い合わせ】件名（名前）。件名が空なら「件名なし」', () => {
  const v = validateSubmission('inquiry', inquiry).values;
  const m = buildMail('inquiry', v, new Date('2026-10-03T00:00:00Z'));
  assert.equal(m.subject, '【お問い合わせ】件名なし（森山）');
  assert.equal(buildMail('inquiry', { ...v, subject: '質問' }).subject, '【お問い合わせ】質問（森山）');
});

test('buildMail(inquiry): 本文に各項目と送信日時（日本時間）が入り、reply_to は差出人', () => {
  const v = validateSubmission('inquiry', { ...inquiry, message: '1行目\n2行目' }).values;
  const m = buildMail('inquiry', v, new Date('2026-10-03T00:05:00Z'));
  assert.match(m.text, /お名前: 森山/);
  assert.match(m.text, /メールアドレス: a@example\.com/);
  assert.match(m.text, /1行目\n2行目/);
  assert.match(m.text, /2026\/10\/03 09:05/);
  assert.deepEqual(m.replyTo, ['a@example.com']);
});

test('buildMail(membership): 件名は【後援会 入会申し込み】名前。メールがなければ reply_to なし', () => {
  const v = validateSubmission('membership', membership).values;
  const m = buildMail('membership', v, new Date('2026-10-03T00:00:00Z'));
  assert.equal(m.subject, '【後援会 入会申し込み】森山');
  assert.match(m.text, /ふりがな: もりやま/);
  assert.match(m.text, /郵便番号: 9792121/);
  assert.equal(m.replyTo, undefined);
});

test('buildMail: 任意の欄が空なら「（未入力）」', () => {
  const v = validateSubmission('inquiry', inquiry).values;
  assert.match(buildMail('inquiry', v).text, /電話番号: （未入力）/);
});
