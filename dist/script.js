(() => {
  // お問い合わせ（準備中）のダイアログ
  const dialog = document.getElementById('contact');
  if (dialog) {
    document.querySelectorAll('[data-open="contact"]').forEach((button) =>
      button.addEventListener('click', () => dialog.showModal())
    );
    dialog.querySelector('.close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
  }

  // スマートフォンのメニュー
  const menu = document.querySelector('.menu');
  const nav = document.querySelector('.header nav');
  const setMenu = (isOpen) => {
    nav.classList.toggle('open', isOpen);
    menu.setAttribute('aria-expanded', String(isOpen));
    menu.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
    menu.textContent = isOpen ? '×' : '☰';
  };
  menu.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.querySelectorAll('a,button').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) setMenu(false);
  });
})();
