from pathlib import Path
import html
import re
import zipfile

from build_weekly_reports import WEEKS


ROOT = Path(__file__).resolve().parent
TEMPLATE = ROOT / "weekly-report-template.hwpx"


def replace_cell(table_xml, row, col, text):
    cell_re = re.compile(r"<hp:tc\b.*?</hp:tc>", re.S)
    cells = list(cell_re.finditer(table_xml))
    target = None
    marker = f'<hp:cellAddr colAddr="{col}" rowAddr="{row}"/>'
    for match in cells:
        if marker in match.group(0):
            target = match
            break
    if target is None:
        raise KeyError((row, col))
    cell = target.group(0)
    sub = re.search(r"(<hp:subList\b[^>]*>)(.*?)(</hp:subList>)", cell, re.S)
    para = re.search(r"<hp:p\b([^>]*)>.*?</hp:p>", sub.group(2), re.S)
    para_attrs = para.group(1)
    run_attrs = ' charPrIDRef="9"'
    paragraphs = []
    for line in str(text).split("\n"):
        paragraphs.append(
            f"<hp:p{para_attrs}><hp:run{run_attrs}><hp:t>{html.escape(line)}</hp:t></hp:run></hp:p>"
        )
    new_cell = cell[: sub.start()] + sub.group(1) + "".join(paragraphs) + sub.group(3) + cell[sub.end() :]
    return table_xml[: target.start()] + new_cell + table_xml[target.end() :]


def build(info):
    with zipfile.ZipFile(TEMPLATE) as zin:
        infos = zin.infolist()
        blobs = {info.filename: zin.read(info.filename) for info in infos}
    xml = blobs["Contents/section0.xml"].decode("utf-8")
    tables = list(re.finditer(r"<hp:tbl\b.*?</hp:tbl>", xml, re.S))
    small_match = tables[0]
    body_match = next(m for m in tables if 'rowCnt="13"' in m.group(0)[:500])
    small = replace_cell(small_match.group(0), 0, 1, "")
    xml = xml[: small_match.start()] + small + xml[small_match.end() :]

    # Locate the body table again because the first replacement changes offsets.
    body_match = next(m for m in re.finditer(r"<hp:tbl\b.*?</hp:tbl>", xml, re.S) if 'rowCnt="13"' in m.group(0)[:500])
    body = body_match.group(0)
    values = {
        (0, 1): "청년 금융지원 통합 플랫폼 앱 개발",
        (1, 1): "",
        (1, 3): info["period"],
        (2, 1): "",
        (2, 3): f"{info['week']}주차",
        (2, 5): "12시간",
        (3, 1): "",
        (3, 3): "자기주도창의전공 3",
        (3, 5): "3학점",
        (5, 1): info["goal"],
        (6, 1): info["content"],
        (7, 1): info["method"],
        (8, 1): info["result"],
        (9, 1): info["refs"],
        (10, 1): info["next"],
        (11, 3): info["date"],
    }
    for (row, col), text in values.items():
        body = replace_cell(body, row, col, text)
    xml = xml[: body_match.start()] + body + xml[body_match.end() :]
    title_match = next(
        m for m in re.finditer(r"<hp:p\b([^>]*)>.*?</hp:p>", xml, re.S)
        if "주간학습보고서" in m.group(0)
    )
    title = (
        f'<hp:p{title_match.group(1)}><hp:run charPrIDRef="16"><hp:t>'
        f'2026-하계 세종창의학기제(집중이수제) 주간학습보고서 ({info["week"]}주차)'
        f'</hp:t></hp:run></hp:p>'
    )
    xml = xml[: title_match.start()] + title + xml[title_match.end() :]
    blobs["Contents/section0.xml"] = xml.encode("utf-8")

    out = ROOT / f"2026-하계_주간학습보고서_{info['week']}주차.hwpx"
    with zipfile.ZipFile(out, "w") as zout:
        for zip_info in infos:
            zout.writestr(zip_info, blobs[zip_info.filename])
    return out


if __name__ == "__main__":
    for week in WEEKS:
        print(build(week))
