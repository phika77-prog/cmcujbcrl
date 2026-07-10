"""
가톨릭대학교 산학협력단 연구공고 스크래퍼
URL: https://iacf.catholic.ac.kr/board/BoardPageList?_menuCd=002002001000&part=RESE
자동으로 공고 목록을 수집하여 웹 페이지에 업데이트합니다.
"""

import datetime
import json
import os
import re
import time
from typing import Dict, List

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://iacf.catholic.ac.kr"
LIST_URL = (
    "https://iacf.catholic.ac.kr/board/BoardPageList"
    "?_menuCd=002002001000&part=RESE&searchCategory=&noticeYn="
    "&searchSubPart=1&key=searchAll&keyword="
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Referer": BASE_URL,
}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)


def fetch_list_page(page: int = 0) -> List[Dict]:
    """공고 목록 1페이지를 가져와 기본 정보 반환."""
    url = LIST_URL + f"&startRow={page * 10}"
    try:
        resp = SESSION.get(url, timeout=20)
        resp.raise_for_status()
        resp.encoding = "utf-8"
    except requests.RequestException as e:
        print(f"  [오류] 목록 페이지 요청 실패 (page={page}): {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    items: List[Dict] = []

    for li in soup.select("ul.board_list li"):
        a_tag = li.find("a")
        if not a_tag:
            continue

        href = a_tag.get("href", "")
        match = re.search(r"fnDetail\('([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\)", href)
        if not match:
            continue

        idx, part, notice_yn = match.groups()
        detail_url = f"{BASE_URL}/board/BoardDetail?_menuCd=002002001000&part={part}&idx={idx}&noticeYn={notice_yn}"

        text = " ".join(li.get_text(" ", strip=True).split())
        if not text:
            continue

        no_match = re.search(r"게시물번호\s*(\d+)", text)
        no_text = no_match.group(1) if no_match else ""

        status_match = re.search(r"기한 또는 상태\s*([^\s]+)", text)
        status_text = status_match.group(1) if status_match else ""

        agency_match = re.search(r"주관기관\(부처\)\s*([^\s]+)", text)
        agency_text = agency_match.group(1) if agency_match else ""

        title_match = re.search(r"제목\s*(.+?)\s*기간", text)
        title_text = title_match.group(1).strip() if title_match else ""

        period_match = re.search(r"기간\s*(.+)$", text)
        period_text = period_match.group(1).strip() if period_match else ""

        deadline = ""
        dates = re.findall(r"(\d{4})[.](\d{2})[.](\d{2})", period_text)
        if dates:
            yy, mm, dd = dates[-1]
            deadline = f"{yy}-{mm}-{dd}"

        today = datetime.date.today()
        if deadline:
            dl = datetime.date.fromisoformat(deadline)
            if dl < today:
                status = "마감임박"
            elif dl <= today + datetime.timedelta(days=7):
                status = "마감임박"
            else:
                status = "접수중"
        else:
            status = "공고예정" if "예정" in status_text else "접수중"

        items.append({
            "no": no_text,
            "title": title_text,
            "url": detail_url,
            "post_date": deadline,
            "deadline": deadline,
            "status": status,
            "status_text": status_text,
            "agency": agency_text,
            "period": period_text,
        })

    return items


def fetch_all_pages(max_pages: int = 5) -> List[Dict]:
    """여러 페이지를 순회하며 공고 목록 전체 수집."""
    all_items: List[Dict] = []
    for page in range(max_pages):
        print(f"  목록 페이지 {page + 1}/{max_pages} 수집 중...")
        items = fetch_list_page(page)
        if not items:
            print(f"  → 페이지 {page + 1}: 데이터 없음. 중단.")
            break
        all_items.extend(items)
        time.sleep(0.8)
    return all_items


def fetch_detail(url: str) -> Dict:
    """공고 상세 페이지에서 마감일·부처·금액 등 추출."""
    if not url:
        return {}
    try:
        resp = SESSION.get(url, timeout=15)
        resp.raise_for_status()
        resp.encoding = "utf-8"
    except requests.RequestException as e:
        print(f"    [오류] 상세 페이지 요청 실패: {e}")
        return {}

    soup = BeautifulSoup(resp.text, "html.parser")
    text = soup.get_text(" ", strip=True)

    detail: Dict = {}
    deadline_patterns = [
        r"(?:마감|접수\s*마감|신청\s*기한|제출\s*마감)[^\d]*(\d{4}[-./]\d{2}[-./]\d{2})",
        r"(\d{4}[-./]\d{2}[-./]\d{2})[^\d]*(?:까지|마감|접수\s*마감)",
        r"(?:~|∼)\s*(\d{4}[-./]\d{2}[-./]\d{2})",
    ]
    for pat in deadline_patterns:
        m = re.search(pat, text)
        if m:
            raw = m.group(1)
            norm = re.sub(r"[./]", "-", raw)
            detail["deadline"] = norm
            break

    money_patterns = [
        r"(\d[\d,]*)\s*억\s*원",
        r"(?:총\s*지원금|지원\s*규모|연구비)[^\d]*(\d[\d,]*)\s*억",
    ]
    for pat in money_patterns:
        m = re.search(pat, text)
        if m:
            detail["amount"] = m.group(1).replace(",", "")
            break

    dept_keywords = [
        "과학기술정보통신부", "산업통상자원부", "보건복지부", "환경부",
        "국토교통부", "중소벤처기업부", "농림축산식품부", "해양수산부",
        "방위사업청", "문화체육관광부", "교육부", "행정안전부", "기획재정부",
        "외교부", "법무부", "국방부", "고용노동부", "여성가족부",
    ]
    for dept in dept_keywords:
        if dept in text:
            detail["dept"] = dept
            break

    agency_keywords = [
        "한국연구재단", "한국산업기술평가관리원", "한국보건산업진흥원",
        "한국환경산업기술원", "국토교통과학기술진흥원", "중소기업기술정보진흥원",
        "농림식품기술기획평가원", "한국해양과학기술원", "한국콘텐츠진흥원",
        "한국교육학술정보원", "정보통신기획평가원", "한국에너지기술평가원",
        "한국산업기술진흥원", "가톨릭대학교", "산학협력단",
    ]
    for agency in agency_keywords:
        if agency in text:
            detail["agency"] = agency
            break

    return detail


CACHE_FILE = os.path.join(os.path.dirname(__file__), "cache.json")


def load_cache() -> Dict:
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache: Dict):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def collect(max_pages: int = 5, fetch_detail_pages: bool = True) -> List[Dict]:
    """전체 공고 수집 → 상세 정보 병합 → 결과 반환."""
    print("=" * 55)
    print("  가톨릭대학교 IACF 연구공고 수집 시작")
    print("=" * 55)

    cache = load_cache()
    items = fetch_all_pages(max_pages)
    print(f"\n  목록에서 총 {len(items)}건 수집됨\n")

    results: List[Dict] = []
    for i, item in enumerate(items, 1):
        url = item.get("url", "")
        cache_key = url or item["title"]

        if cache_key in cache:
            detail = cache[cache_key]
            print(f"  [{i:02d}] (캐시) {item['title'][:40]}")
        elif fetch_detail_pages and url:
            print(f"  [{i:02d}] 상세 수집: {item['title'][:40]}")
            detail = fetch_detail(url)
            cache[cache_key] = detail
            time.sleep(0.6)
        else:
            detail = {}

        merged = {**item, **detail}
        results.append(merged)

    save_cache(cache)
    print(f"\n  ✅ 수집 완료: {len(results)}건  (캐시 저장: {CACHE_FILE})")
    return results


if __name__ == "__main__":
    data = collect(max_pages=3)
    for d in data[:5]:
        print(d)
