// 取り組み本文（Markdown から作った hast）を、h2 ごとに <section> で包む。
// 最初の h2 より前のノードはそのまま残す。h3 以下は包まない。
// 見出しの id は Astro 側のプラグインが後から付けるので、section 自体には id を付けない。

export function sectionize(children) {
  const out = [];
  let current = null;
  for (const node of children) {
    if (node.type === 'element' && node.tagName === 'h2') {
      current = { type: 'element', tagName: 'section', properties: {}, children: [node] };
      out.push(current);
    } else if (current) {
      current.children.push(node);
    } else {
      out.push(node);
    }
  }
  return out;
}
