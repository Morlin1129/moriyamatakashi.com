// お問い合わせ・入会申し込みフォーム（form[data-contact]）の送信。
// Turnstile のウィジェットを表示されたときに描き、submit を横取りして fetch で送り、結果をフォーム内に出す。
(() => {
  const forms = document.querySelectorAll('form[data-contact]');
  if (forms.length === 0) return;

  // Turnstile（明示描画）。閉じたダイアログの中では描けないので、見えるようになってから描く
  const widgets = new WeakMap();
  const renderWidget = (form) => {
    const el = form.querySelector('.cf-turnstile');
    if (!el || !window.turnstile || widgets.has(form)) return;
    widgets.set(form, window.turnstile.render(el, { sitekey: el.dataset.sitekey, language: 'ja' }));
  };
  const resetWidget = (form) => {
    if (widgets.has(form)) window.turnstile.reset(widgets.get(form));
  };
  const isVisible = (form) => {
    const dialog = form.closest('dialog');
    return !dialog || dialog.open;
  };
  const renderVisible = () => forms.forEach((form) => isVisible(form) && renderWidget(form));
  // api.js の読み込みが先なら今描く。後なら Base.astro の onload（turnstile-ready）を待つ
  if (window.turnstile) renderVisible();
  else document.addEventListener('turnstile-ready', renderVisible);
  forms.forEach((form) => {
    const dialog = form.closest('dialog');
    if (!dialog) return;
    new MutationObserver(() => dialog.open && renderWidget(form)).observe(dialog, { attributeFilter: ['open'] });
  });

  // 結果と欄ごとのエラーの表示
  const setStatus = (form, text, kind) => {
    const status = form.querySelector('.form-status[role="status"]');
    status.textContent = text;
    status.className = `form-status ${kind}`;
  };
  const clearErrors = (form) => {
    form.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  };
  const showErrors = (form, errors) => {
    let first = null;
    for (const [name, message] of Object.entries(errors)) {
      const input = form.elements[name];
      if (!input) continue;
      input.setAttribute('aria-invalid', 'true');
      const error = input.closest('.field')?.querySelector('.field-error');
      if (error) error.textContent = message;
      first ??= input;
    }
    first?.focus();
  };

  forms.forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      clearErrors(form);
      button.disabled = true;
      setStatus(form, '送信しています…', '');
      let sent = false;
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          sent = true;
          form.querySelectorAll('.field, .field-row, .actions, .note').forEach((el) => (el.hidden = true));
          setStatus(form, form.querySelector('.form-status[role="status"]').dataset.success, 'is-success');
        } else {
          if (data.errors) showErrors(form, data.errors);
          setStatus(form, data.message || '送信できませんでした。時間をおいてお試しください。', 'is-error');
        }
      } catch {
        setStatus(form, '通信に失敗しました。電波の状況を確かめて、もう一度お試しください。', 'is-error');
      }
      if (!sent) {
        button.disabled = false;
        resetWidget(form);
      }
    });
  });
})();
