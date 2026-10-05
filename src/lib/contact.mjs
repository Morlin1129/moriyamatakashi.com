// お問い合わせ・後援会入会申し込みの検証とメールの組み立て（純粋関数）。
// API（src/pages/api/contact.ts）から使う。ブラウザや Astro には依存しない。

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTAL_LENGTH = 7;

// 各欄の定義。required は必須、max は文字数の上限、type は形式の確認
const text = (name, label, { required = false, max = 100 } = {}) => ({ name, label, required, max, type: 'text' });

export const KINDS = {
  inquiry: {
    label: 'お問い合わせ',
    fields: [
      text('name', 'お名前', { required: true }),
      { name: 'email', label: 'メールアドレス', required: true, max: 200, type: 'email' },
      text('phone', '電話番号', { max: 30 }),
      text('subject', '件名', { max: 100 }),
      { name: 'message', label: '内容', required: true, max: 5000, type: 'multiline' },
    ],
  },
  membership: {
    label: '後援会 入会申し込み',
    fields: [
      text('name', 'お名前', { required: true }),
      text('kana', 'ふりがな', { required: true }),
      { name: 'postal', label: '郵便番号', required: false, max: 20, type: 'postal' },
      text('address', '住所', { required: true, max: 200 }),
      text('phone', '電話番号', { max: 30 }),
      { name: 'email', label: 'メールアドレス', required: false, max: 200, type: 'email' },
    ],
    // 電話かメールのどちらかは必須
    either: ['phone', 'email'],
  },
};

const toHalfWidthDigits = (s) => s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));

const normalize = (field, raw) => {
  const value = String(raw ?? '').trim();
  if (field.type === 'postal') return toHalfWidthDigits(value).replace(/[-‐－ー\s]/g, '');
  if (field.type === 'multiline') return value.replace(/\r\n?/g, '\n');
  return value;
};

const checkFormat = (field, value) => {
  if (value === '') return null;
  if (field.type === 'email' && !EMAIL.test(value)) return 'メールアドレスの形式が正しくありません';
  if (field.type === 'postal' && !new RegExp(`^\\d{${POSTAL_LENGTH}}$`).test(value)) return `郵便番号は${POSTAL_LENGTH}桁の数字で入力してください`;
  return null;
};

/**
 * 入力を検証して整える。
 * @param {string} kind 'inquiry' | 'membership'
 * @param {Record<string, unknown>} fields 欄の名前 → 値（undefined は空として扱う）
 * @returns {{ ok: boolean, values: Record<string, string>, errors: Record<string, string> }}
 */
export function validateSubmission(kind, fields) {
  const spec = KINDS[kind];
  if (!spec) return { ok: false, values: {}, errors: { kind: '種類が不明です' } };

  const values = {};
  const errors = {};
  for (const field of spec.fields) {
    const value = normalize(field, fields?.[field.name]);
    values[field.name] = value;
    if (field.required && value === '') errors[field.name] = `${field.label}を入力してください`;
    else if (value.length > field.max) errors[field.name] = `${field.label}は${field.max}文字以内で入力してください`;
    else {
      const format = checkFormat(field, value);
      if (format) errors[field.name] = format;
    }
  }
  if (spec.either && spec.either.every((name) => values[name] === '')) {
    const labels = spec.either.map((name) => spec.fields.find((f) => f.name === name).label);
    errors[spec.either[0]] = `${labels.join('か')}のどちらかを入力してください`;
  }
  return { ok: Object.keys(errors).length === 0, values, errors };
}

const EMPTY = '（未入力）';

const formatJst = (date) =>
  new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

/**
 * 検証済みの値からメールの件名と本文を作る。
 * @param {string} kind
 * @param {Record<string, string>} values validateSubmission の values
 * @param {Date} [now] 送信日時（テスト用に差し替えられる）
 * @returns {{ subject: string, text: string, replyTo?: string[] }}
 */
export function buildMail(kind, values, now = new Date()) {
  const spec = KINDS[kind];
  const subject =
    kind === 'inquiry'
      ? `【${spec.label}】${values.subject || '件名なし'}（${values.name}）`
      : `【${spec.label}】${values.name}`;

  const lines = [`サイトから${spec.label}が届きました。`, ''];
  for (const field of spec.fields) {
    const value = values[field.name] || EMPTY;
    if (field.type === 'multiline') lines.push(`${field.label}:`, value);
    else lines.push(`${field.label}: ${value}`);
  }
  lines.push('', `送信日時（日本時間）: ${formatJst(now)}`);

  const mail = { subject, text: lines.join('\n') };
  if (values.email) mail.replyTo = [values.email];
  return mail;
}
