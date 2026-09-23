"""総務省 決算カード（福島県分PDF）から南相馬市の主要数値を抜き出す。"""
import json, re, sys
import pdfplumber

FILES = json.load(open('cards/files.json'))
NUM = re.compile(r'^[\d,]+(\.\d+)?$|^-$|^△[\d,]+(\.\d+)?$|^-[\d,]+(\.\d+)?$')

# ラベル: (取り出す数値の個数, キー名リスト)
LABELS = {
    '住民基本台帳人口': None,  # 特殊処理
    '議会費': ('gikai', 2), '総務費': ('somu', 2), '民生費': ('minsei', 2), '衛生費': ('eisei', 2),
    '労働費': ('rodo', 2), '農林水産業費': ('norin', 2), '商工費': ('shoko', 2), '土木費': ('doboku', 2),
    '消防費': ('shobo', 2), '教育費': ('kyoiku', 2), '災害復旧費': ('saigai', 2), '公債費': ('kosai', 2),
    '諸支出金': ('sho', 2), '歳出合計': ('expTotal', 2), '歳入総額': ('revTotal', 1), '歳出総額': ('expTotal2', 1),
    '地方税': ('localTax', 2), '市町村民税': ('cityTax', 2), '個人均等割': ('kintowari', 2), '所得割': ('shotokuwari', 2), '地方交付税': ('kofuzei', 2),
    '国庫支出金': ('kokko', 2), '県支出金': ('ken', 2), '地方債': ('bond', 2),
    '財政力指数': ('zaiseiryoku', 1), '経常収支比率': ('keijo', 1), '実質公債費比率': ('kosaihi', 1),
    '将来負担比率': ('shorai', 1), '実質収支比率': ('jisshitsu', 1), '地方債現在高': ('bondBalance', 1),
    '財政調整基金': ('chosei', 1), '積立金現在高': ('tsumitate', 1), '人件費': ('jinken', 2), '扶助費': ('fujo', 2),
    '普通建設事業費': ('kensetsu', 2), '職員数': ('staff', 1),
}


def rows_of(page):
    words = sorted(page.extract_words(x_tolerance=1.5, y_tolerance=2), key=lambda w: w['top'])
    # 縦位置が近い単語を同じ行にまとめる
    lines, cur, cur_top = [], [], None
    for w in words:
        if cur_top is None or abs(w['top'] - cur_top) <= 4:
            cur.append(w); cur_top = w['top'] if cur_top is None else cur_top
        else:
            lines.append(cur); cur, cur_top = [w], w['top']
    if cur:
        lines.append(cur)
    out = []
    for ws in lines:
        ws = sorted(ws, key=lambda w: w['x0'])
        # 1文字ずつ離れた日本語ラベルを結合（「民 生 費」→「民生費」）
        toks = []
        for w in ws:
            t = w['text']
            if toks and not NUM.match(t) and not NUM.match(toks[-1]['text']):
                char_w = max(w['x1'] - w['x0'], 4)
                if w['x0'] - toks[-1]['x1'] < char_w * 1.3:
                    toks[-1]['text'] += t
                    toks[-1]['x1'] = w['x1']
                    continue
            toks.append({'text': t, 'x0': w['x0'], 'x1': w['x1'], 'top': w['top']})
        out.append(toks)
    return out


def find_page(pdf):
    for i, page in enumerate(pdf.pages):
        text = (page.extract_text() or '').replace(' ', '')
        if '南相馬市' in text and '歳出合計' in text and '財政力指数' in text:
            return i, page
    return None, None


def to_num(t):
    t = t.replace(',', '').replace('△', '-')
    if t in ('-', ''):
        return None
    try:
        return float(t) if '.' in t else int(t)
    except ValueError:
        return None


# 金額系（千円）は 1,000 以上を期待。比率系は小さい値。
RATIO_KEYS = {'zaiseiryoku', 'keijo', 'kosaihi', 'shorai', 'jisshitsu'}
# 短いラベルが長いラベルに含まれるものを避けるため、長い順に照合する
LABEL_ORDER = sorted((k for k in LABELS if LABELS[k]), key=len, reverse=True)


def groups_of(toks):
    """トークン列を [ラベル文字列, 数値リスト] の繰り返しにまとめる"""
    groups, label, nums = [], '', []
    for t in toks:
        if NUM.match(t['text']):
            nums.append(t['text'])
        else:
            if label or nums:
                groups.append((label, nums))
            label, nums = t['text'], []
            continue
    if label or nums:
        groups.append((label, nums))
    # 連続する（数値を挟まない）ラベルは前のグループに結合
    merged = []
    for label, nums in groups:
        if merged and not merged[-1][1]:
            merged[-1] = (merged[-1][0] + label, nums)
        else:
            merged.append((label, nums))
    return merged


# 値の妥当な範囲（比率系）。範囲外は別の場所の数字なので捨てる
RANGES = {'zaiseiryoku': (0, 3), 'keijo': (50, 150), 'kosaihi': (-10, 60), 'shorai': (-50, 500), 'jisshitsu': (-50, 50),
          'kofuzei': (1_000_000, 100_000_000), 'kokko': (1_000_000, 200_000_000)}


def char_rows(page):
    """文字を行にまとめる（縦位置のずれに強い）"""
    chars = sorted([c for c in page.chars if c['text'].strip()], key=lambda c: (c['top'], c['x0']))
    rows, cur = [], []
    for c in chars:
        if cur and abs(c['top'] - cur[-1]['top']) > 3 and abs(c['top'] - cur[0]['top']) > 3:
            rows.append(cur); cur = []
        cur.append(c)
    if cur:
        rows.append(cur)
    return [sorted(r, key=lambda c: c['x0']) for r in rows]


def search_label(rows, name):
    """行ごとに文字列を連結して name を探し、bbox を返す"""
    hits = []
    for r in rows:
        text = ''.join(c['text'] for c in r)
        pat = '.{0,2}'.join(re.escape(ch) for ch in name)
        for m in re.finditer(pat, text):
            cs = [r[i] for i in range(m.start(), m.end()) if text[i] in name]
            tops = sorted(c['top'] for c in cs)
            hits.append({'x0': cs[0]['x0'], 'x1': cs[-1]['x1'], 'top': tops[len(tops) // 2] - 1, 'bottom': tops[len(tops) // 2] + (cs[0]['bottom'] - cs[0]['top']) + 1})
    return hits


def parse(page):
    words = page.extract_words(x_tolerance=1.5, y_tolerance=2)
    crows = char_rows(page)
    data = {}
    consumed = []  # 長いラベルが占めた領域。短いラベルはその中では照合しない
    for name in LABEL_ORDER:
        key, count = LABELS[name]
        pat = r'\s*'.join(re.escape(c) for c in name)
        hits = list(page.search(pat, regex=True)) + search_label(crows, name)
        hits.sort(key=lambda h: (round(h['top']), h['x0']))
        for h in hits:
            cx, cy = (h['x0'] + h['x1']) / 2, (h['top'] + h['bottom']) / 2
            if any(b['x0'] <= cx <= b['x1'] and b['top'] <= cy <= b['bottom'] for b in consumed):
                continue
            consumed.append(h)
            line = sorted([w for w in words if abs((w['top'] + w['bottom']) / 2 - cy) < 3.2], key=lambda w: w['x0'])
            # ラベルが1つの単語の中に埋もれている（注記の文章など）場合は除外
            if any(w['x0'] < h['x0'] - 1 and w['x1'] > h['x1'] + 1 for w in line):
                continue
            right = [w for w in line if w['x0'] >= h['x1'] - 1]
            nums = []
            for w in right:
                if NUM.match(w['text']):
                    nums.append(to_num(w['text']))
                elif not nums and w['text'] in ('(', '（', '％', '%', ')', '）', '(％)', '（％）'):
                    continue
                else:
                    break
                if len(nums) >= count:
                    break
            if not nums or nums[0] is None:
                continue
            if key in RANGES:
                lo, hi = RANGES[key]
                if not (lo <= nums[0] <= hi):
                    continue
            elif key != 'staff' and nums[0] < 1000:
                continue
            if key not in data:
                data[key] = nums[0] if count == 1 else nums[:count]
    # 人口：見出し「住民基本台帳人口」（または「国調人口」）の真下にある数値
    for header, key in (('住民基本台帳人口', 'population'), ('住基人口', 'population'), ('国調人口', 'censusPopulation')):
        hits = page.search(r'\s*'.join(header), regex=True)
        if not hits or key in data:
            continue
        h = hits[0]
        below = [w for w in words if w['top'] > h['bottom'] and w['top'] - h['bottom'] < 40
                 and re.match(r'^\d{1,3}(,\d{3})+$', w['text']) and w['x1'] > h['x0'] - 5 and w['x0'] < h['x1'] + 5]
        if below:
            below.sort(key=lambda w: (round(w['top']), w['x0']))
            data[key] = to_num(below[0]['text'])
    if 'population' not in data:
        cands = sorted([(round(w['top']), w['x0'], to_num(w['text'])) for w in words
                        if w['top'] < 80 and re.match(r'^\d{2,3},\d{3}$', w['text']) and 40000 <= to_num(w['text']) <= 90000])
        tops = sorted({c[0] for c in cands})
        if len(tops) >= 3:
            data['population'] = [c for c in cands if c[0] == tops[2]][0][2]
            data['_populationFallback'] = True
    return data


if __name__ == '__main__':
    years = sys.argv[1:] or sorted(FILES)
    result = {}
    for y in years:
        with pdfplumber.open(FILES[y]['file']) as pdf:
            idx, page = find_page(pdf)
            if page is None:
                print(y, 'NOT FOUND'); continue
            d = parse(page)
            d['_page'] = idx + 1
            result[y] = d
            print(y, 'p', idx + 1, {k: d.get(k) for k in ['population', 'expTotal', 'minsei', 'norin', 'kyoiku', 'personalTax', 'zaiseiryoku', 'keijo', 'kosaihi', 'shorai']})
    json.dump(result, open('cards/parsed.json', 'w'), ensure_ascii=False, indent=1)
