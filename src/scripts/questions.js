// 一般質問の一覧：議員・分野・定例会・方向性の4条件（AND）で絞り込む。
// data-q-filter を持つリンク（クロス表・トピック）を押すと、その条件にそろえてから絞り込む。
(() => {
  const form = document.getElementById('q-filter');
  if (!form) return;
  const selects = [...form.querySelectorAll('select')];
  const cards = [...document.querySelectorAll('#q-list > li')];
  const count = document.getElementById('q-count');

  const apply = () => {
    const conds = selects.filter((s) => s.value !== 'all').map((s) => [s.name, s.value]);
    let shown = 0;
    cards.forEach((card) => {
      const match = conds.every(([key, value]) => card.dataset[key] === value);
      card.hidden = !match;
      if (match) shown += 1;
    });
    count.textContent = String(shown);
  };

  form.addEventListener('change', apply);
  // reset イベントの時点ではまだ値が戻っていないので、次のタスクで反映する
  form.addEventListener('reset', () => setTimeout(apply));

  // リンク先への移動（#list や #q-xxx）はブラウザに任せ、条件だけ設定する
  document.querySelectorAll('[data-q-filter]').forEach((link) =>
    link.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      const cond = JSON.parse(link.dataset.qFilter);
      selects.forEach((s) => { s.value = cond[s.name] ?? 'all'; });
      apply();
    })
  );
})();
