"""
announcements.json 생성기
스크래퍼가 수집한 데이터를 웹 위젯이 읽을 수 있는 JSON으로 내보냅니다.
위젯 HTML 파일과 같은 폴더에 announcements.json 을 저장하세요.
"""

import json
import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from scraper import collect


def calc_status(deadline_str: str, fallback: str = "공고예정") -> str:
    if deadline_str:
        try:
            dl = datetime.date.fromisoformat(deadline_str)
            diff = (dl - datetime.date.today()).days
            if diff < 0:
                return "마감임박"
            if diff <= 7:
                return "마감임박"
            return "접수중"
        except Exception:
            return fallback
    return fallback


def calc_dday(deadline_str: str) -> str:
    try:
        dl   = datetime.date.fromisoformat(deadline_str)
        diff = (dl - datetime.date.today()).days
        if diff > 0:  return f"D-{diff}"
        if diff == 0: return "D-Day"
        return "종료"
    except Exception:
        return ""


def export_json(scraped_items: list[dict], output_path: str):
    announcements = []
    for i, item in enumerate(scraped_items, 1):
        title = item.get("title", "").strip()
        deadline = item.get("deadline", "")
        post_date = item.get("post_date", "")
        dept = item.get("dept", "가톨릭대 산학협력단")
        agency = item.get("agency", "가톨릭대학교")
        amount = item.get("amount", "")
        url = item.get("url", "")
        note = item.get("note", "IACF 자동수집")
        status = item.get("status") or calc_status(deadline, "공고예정")

        if not title:
            continue

        announcements.append({
            "id": item.get("no", str(i)),
            "title": title,
            "dept": dept,
            "agency": agency,
            "field": item.get("field", "기타"),
            "postDate": post_date,
            "deadline": deadline,
            "dday": calc_dday(deadline),
            "amount": amount,
            "status": status,
            "url": url,
            "note": note,
        })

    payload = {
        "lastUpdated": datetime.date.today().isoformat(),
        "total":       len(announcements),
        "announcements": announcements,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"✅ announcements.json 저장 완료: {len(announcements)}건 → {output_path}")


if __name__ == "__main__":
    items = collect(max_pages=5)
    out = os.path.join(os.path.dirname(__file__), "announcements.json")
    export_json(items, out)
