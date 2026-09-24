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

  // 絞り込みチップ（資料集・年表）。.filter-chips の data-target で対象リストを指定する
  document.querySelectorAll('.filter-chips').forEach((group) => {
    const chips = group.querySelectorAll('.chip');
    const items = document.querySelectorAll(`${group.dataset.target || '#resource-list'} > li`);
    chips.forEach((chip) =>
      chip.addEventListener('click', () => {
        const filter = chip.dataset.filter;
        chips.forEach((c) => {
          const active = c === chip;
          c.classList.toggle('is-active', active);
          c.setAttribute('aria-pressed', String(active));
        });
        items.forEach((item) => { item.hidden = filter !== 'all' && item.dataset.cat !== filter; });
      })
    );
  });

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
