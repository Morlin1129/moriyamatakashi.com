(() => {
  const { details, resources } = window.SITE_CONTENT;
  const HASH_PREFIX = '#detail-';

  const dialog = document.getElementById('detail');
  const content = document.getElementById('detail-content');

  const el = (tag, props = {}, children = []) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  };

  const linkList = (items) =>
    el('ul', { className: 'link-list' }, items.map((item) =>
      el('li', {}, [
        el('a', { href: item.url, target: '_blank', rel: 'noopener', textContent: item.title }),
        item.note ? el('p', { textContent: item.note }) : '',
      ])
    ));

  const renderBlock = (block) => {
    if (typeof block === 'string') return el('p', { textContent: block });
    if (block.h) return el('h3', { textContent: block.h });
    if (block.list) return el('ul', {}, block.list.map((text) => el('li', { textContent: text })));
    if (block.links) return linkList(block.links);
    return '';
  };

  const render = (key) => {
    const entry = details[key];
    const nodes = [el('h2', { id: 'detail-title', textContent: entry.title }), ...entry.blocks.map(renderBlock)];
    const related = entry.policy ? resources.filter((r) => r.policy === key) : [];
    if (related.length) nodes.push(el('h3', { textContent: '関連する資料' }), linkList(related));
    content.replaceChildren(...nodes);
  };

  // 詳細は #detail-<key> で直接開けるので、URLを共有できる
  const open = (key) => {
    if (!details[key]) return;
    render(key);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    if (location.hash !== HASH_PREFIX + key) history.replaceState(null, '', HASH_PREFIX + key);
  };

  const openFromHash = () => {
    if (location.hash.startsWith(HASH_PREFIX)) open(decodeURIComponent(location.hash.slice(HASH_PREFIX.length)));
  };

  document.querySelectorAll('[data-open]').forEach((button) =>
    button.addEventListener('click', () => open(button.dataset.open))
  );

  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (location.hash.startsWith(HASH_PREFIX)) history.replaceState(null, '', location.pathname + location.search);
  });
  window.addEventListener('hashchange', openFromHash);
  openFromHash();

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
