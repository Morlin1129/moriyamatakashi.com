// 一覧カードに出す本文の抜粋。改行を取り除き、指定の文字数で切って「…」を付ける。
// 文字数は見た目の文字（コードポイント）で数える。

export function excerpt(text, max) {
  const chars = Array.from(text.replace(/\n/g, ''));
  if (chars.length <= max) return chars.join('');
  return chars.slice(0, max).join('') + '…';
}
