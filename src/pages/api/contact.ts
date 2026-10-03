// お問い合わせ・後援会入会申し込みの送信先 API。
// このファイルだけ Vercel の関数として動く（他のページは静的のまま）。
// 入力の検証とメール本文は src/lib/contact.mjs、迷惑投稿対策は Cloudflare Turnstile、送信は Resend の REST API。
export const prerender = false;

import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { KINDS, validateSubmission, buildMail } from '../../lib/contact.mjs';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const REQUIRED_ENV = ['RESEND_API_KEY', 'CONTACT_TO', 'CONTACT_FROM', 'TURNSTILE_SECRET_KEY'] as const;

// 利用者の画面に出す文言（詳しい原因はサーバーのログにだけ残す）
const MESSAGES = {
  unreadable: '送信内容を読み取れませんでした。',
  unknownKind: '送信の種類が不明です。',
  invalid: '入力内容をご確認ください。',
  verify: '確認に失敗しました。もう一度お試しください。',
  misconfigured: 'サーバーの設定が足りないため送信できません。',
  send: '送信できませんでした。時間をおいてお試しください。',
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

// フォーム送信（FormData）か JSON を、欄の名前 → 文字列の形に揃える
async function readFields(request: Request): Promise<Record<string, string> | null> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('multipart/form-data') || type.includes('application/x-www-form-urlencoded')) {
    const fields: Record<string, string> = {};
    for (const [key, value] of await request.formData()) if (typeof value === 'string') fields[key] = value;
    return fields;
  }
  if (type.includes('application/json')) {
    const body = await request.json();
    return body && typeof body === 'object' ? body : null;
  }
  return null;
}

async function verifyTurnstile(secret: string, token: string, remoteip?: string): Promise<boolean> {
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip }),
    });
    const result = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (!result.success) console.warn('Turnstile の確認に失敗', result['error-codes']);
    return result.success === true;
  } catch (error) {
    console.error('Turnstile に接続できない', error);
    return false;
  }
}

async function sendMail(apiKey: string, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return true;
    console.error('Resend の送信に失敗', res.status, await res.text());
    return false;
  } catch (error) {
    console.error('Resend に接続できない', error);
    return false;
  }
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const fields = await readFields(request).catch(() => null);
  if (!fields) return json(400, { ok: false, message: MESSAGES.unreadable });

  const kind = String(fields.kind ?? '');
  if (!(kind in KINDS)) return json(400, { ok: false, message: MESSAGES.unknownKind });

  // ハニーポット。人には見えない欄に値があればボットとみなし、送らずに成功として返す
  if (fields.website) return json(200, { ok: true });

  const result = validateSubmission(kind, fields);
  if (!result.ok) return json(400, { ok: false, message: MESSAGES.invalid, errors: result.errors });

  const missing = REQUIRED_ENV.filter((name) => !getSecret(name));
  if (missing.length > 0) {
    console.error('環境変数が未設定', missing.join(', '));
    return json(500, { ok: false, message: MESSAGES.misconfigured, missing });
  }

  const token = String(fields['cf-turnstile-response'] ?? '');
  let remoteip: string | undefined;
  try {
    remoteip = clientAddress;
  } catch {
    remoteip = undefined;
  }
  if (!token || !(await verifyTurnstile(getSecret('TURNSTILE_SECRET_KEY')!, token, remoteip))) {
    return json(400, { ok: false, message: MESSAGES.verify });
  }

  const mail = buildMail(kind, result.values);
  const sent = await sendMail(getSecret('RESEND_API_KEY')!, {
    from: getSecret('CONTACT_FROM'),
    to: [getSecret('CONTACT_TO')],
    subject: mail.subject,
    text: mail.text,
    reply_to: mail.replyTo,
  });
  if (!sent) return json(502, { ok: false, message: MESSAGES.send });

  return json(200, { ok: true });
};
