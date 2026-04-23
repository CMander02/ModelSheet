#!/usr/bin/env python3
"""
Fetch OpenAI model card specs from developers.openai.com using Playwright.

Usage:
  # Fetch specific slugs (dry-run, prints JSON):
  python scripts/fetch_openai_model_cards.py gpt-5.4 o3-mini --dry-run

  # Fetch all language models from /all page and show diff:
  python scripts/fetch_openai_model_cards.py

  # Fetch all and add new ones to models.json:
  python scripts/fetch_openai_model_cards.py --add

  # Run with visible browser (for debugging):
  python scripts/fetch_openai_model_cards.py gpt-5.4 --no-headless --dry-run
"""

import json
import re
import argparse
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
MODELS_FILE = ROOT / "data" / "models.json"
BASE_URL = "https://developers.openai.com/api/docs/models"

# Slugs to exclude (non language/reasoning models)
SKIP_KEYWORDS = [
    "image", "tts", "transcribe", "realtime", "audio", "embedding",
    "moderation", "dall-e", "sora", "whisper", "speech", "video",
    "computer-use", "search-preview", "chat-latest",
]


def infer_arch(slug: str) -> tuple[str, str]:
    s = slug.lower()
    if s.startswith("o1"):   return "o1",    "o-series"
    if s.startswith("o3"):   return "o3",    "o-series"
    if s.startswith("o4"):   return "o4",    "o-series"
    if "5.4" in s:           return "gpt5",  "GPT"
    if "5.3" in s:           return "gpt5",  "GPT"
    if "5.2" in s:           return "gpt5",  "GPT"
    if "5.1" in s:           return "gpt5",  "GPT"
    if "gpt-5" in s or "codex" in s: return "gpt5", "GPT"
    if "4.5" in s:           return "gpt4",  "GPT"
    if "4.1" in s:           return "gpt4",  "GPT"
    if "gpt-4" in s:         return "gpt4",  "GPT"
    if "3.5" in s:           return "gpt3.5","GPT"
    return "gpt", "GPT"


def parse_cutoff(s: str) -> str | None:
    try:
        return datetime.strptime(s.strip(), "%b %d, %Y").strftime("%Y-%m-%d")
    except Exception:
        return None


# JavaScript run inside the page to extract all fields at once
_EXTRACT_JS = r"""() => {
    const result = {};

    // ── Spec rows: context window / max output / knowledge cutoff ───────────
    // Structure: <span>1,050,000</span><!-- --> context window
    // Playwright page.inner_text gives "1,050,000 context window" per container div
    document.querySelectorAll('div.flex.flex-row.items-center.gap-2 > div').forEach(el => {
        const t = el.innerText.trim();
        let m;
        if ((m = t.match(/^([\d,]+) context window$/)))
            result.contextLength = parseInt(m[1].replace(/,/g, ''));
        if ((m = t.match(/^([\d,]+) max output tokens$/)))
            result.maxOutputTokens = parseInt(m[1].replace(/,/g, ''));
        if ((m = t.match(/^(\w+ \d+, \d{4}) knowledge cutoff$/)))
            result.knowledgeCutoff = m[1];
    });

    // ── Modalities from Modalities section ──────────────────────────────────
    const allDivs = [...document.querySelectorAll('div')];
    const modHdr = allDivs.find(el => el.childElementCount === 0 && el.innerText.trim() === 'Modalities');
    const inputMods = [], outputMods = [];
    if (modHdr) {
        const container = modHdr.parentElement;
        container.querySelectorAll('div.flex.flex-row.gap-2').forEach(row => {
            const cells = [...row.querySelectorAll('div')]
                .filter(el => el.childElementCount === 0)
                .map(el => el.innerText.trim())
                .filter(Boolean);
            if (cells.length < 2) return;
            const name = cells[0].toLowerCase();
            const support = cells[1].toLowerCase();
            if (support.includes('not supported')) return;
            if (support.includes('input and output')) { inputMods.push(name); outputMods.push(name); }
            else if (support.includes('input')) inputMods.push(name);
            else if (support.includes('output')) outputMods.push(name);
        });
    }
    result.inputModalities = inputMods.length ? inputMods : ['text'];
    result.outputModalities = outputMods.length ? outputMods : ['text'];

    // ── Fallback: INPUT/OUTPUT summary text at top of card ──────────────────
    // e.g. StaticText "Text, image" after StaticText "INPUT"
    if (inputMods.length === 0) {
        const inputEl = allDivs.find(el => el.childElementCount === 0 && el.innerText.trim() === 'INPUT');
        if (inputEl) {
            const next = inputEl.nextElementSibling;
            if (next) {
                const txt = next.innerText.toLowerCase();
                const mods = txt.split(',').map(s => s.trim());
                result.inputModalities = mods;
            }
        }
        const outputEl = allDivs.find(el => el.childElementCount === 0 && el.innerText.trim() === 'OUTPUT');
        if (outputEl) {
            const next = outputEl.nextElementSibling;
            if (next) result.outputModalities = next.innerText.toLowerCase().split(',').map(s => s.trim());
        }
    }

    // ── Snapshot dates → earliest = createdAt ───────────────────────────────
    const snapHdr = allDivs.find(el => el.childElementCount === 0 && el.innerText.trim() === 'Snapshots');
    result.snapshotDates = [];
    if (snapHdr) {
        snapHdr.parentElement.querySelectorAll('div').forEach(el => {
            const m = el.innerText.trim().match(/^(\d{4}-\d{2}-\d{2})$/);
            if (m) result.snapshotDates.push(m[1]);
        });
    }

    result.title = document.title.replace(' Model | OpenAI API', '').replace(' | OpenAI API', '').trim();
    return result;
}"""


def extract_model_data(page, slug: str) -> dict:
    url = f"{BASE_URL}/{slug}"

    # Navigate with generous timeout; retry once on failure
    for attempt in range(2):
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=20000)
            break
        except Exception as e:
            if attempt == 0:
                page.goto("about:blank")
                continue
            raise

    # Wait for the spec section to appear
    try:
        page.wait_for_selector("div.flex.flex-row.items-center.gap-2", timeout=12000)
    except Exception:
        pass

    data = page.evaluate(_EXTRACT_JS)

    arch, arch_family = infer_arch(slug)

    result = {
        "id": f"openai/{slug}",
        "name": data.get("title") or slug,
        "provider": "OpenAI",
        "techReport": url,
        "architecture": arch,
        "architectureFamily": arch_family,
        "inputModalities": data.get("inputModalities", ["text"]),
        "outputModalities": data.get("outputModalities", ["text"]),
        "isMoe": False,
    }

    if data.get("snapshotDates"):
        earliest = sorted(data["snapshotDates"])[0]
        result["createdAt"] = f"{earliest}T00:00:00.000Z"

    if data.get("contextLength"):
        result["contextLength"] = data["contextLength"]
    if data.get("knowledgeCutoff"):
        result["knowledgeCutoff"] = parse_cutoff(data["knowledgeCutoff"])

    return result


def get_all_slugs(page) -> list[str]:
    page.goto(f"{BASE_URL}/all", wait_until="domcontentloaded", timeout=20000)
    page.wait_for_selector("a[href*='/models/']", timeout=10000)

    hrefs = page.evaluate("""() =>
        [...new Set([...document.querySelectorAll('a[href*="/models/"]')].map(a => a.href))]
    """)

    slugs = []
    for href in hrefs:
        m = re.search(r"/models/([^/?#]+)/?$", href)
        if not m:
            continue
        slug = m.group(1)
        if slug in ("all", "compare", ""):
            continue
        if any(kw in slug for kw in SKIP_KEYWORDS):
            continue
        slugs.append(slug)
    return slugs


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("slugs", nargs="*")
    parser.add_argument("--add", action="store_true", help="Add new models to models.json")
    parser.add_argument("--dry-run", action="store_true", help="Print JSON only, no DB write")
    parser.add_argument("--headless", default=True, action="store_true")
    parser.add_argument("--no-headless", dest="headless", action="store_false")
    args = parser.parse_args()

    from playwright.sync_api import sync_playwright

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=args.headless)
        ctx = browser.new_context(user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ))
        page = ctx.new_page()

        if args.slugs:
            slugs = args.slugs
        else:
            print("Fetching model list from /all page...")
            slugs = get_all_slugs(page)
            print(f"  → {len(slugs)} language/reasoning slugs found")

        fetched = []
        for slug in slugs:
            print(f"  {slug} ...", end=" ", flush=True)
            try:
                m = extract_model_data(page, slug)
                fetched.append(m)
                print(f"ctx={m.get('contextLength','?')}  cutoff={m.get('knowledgeCutoff','?')}  in={m['inputModalities']}")
            except Exception as e:
                print(f"ERROR: {e}")

        browser.close()

    if args.dry_run:
        print(json.dumps(fetched, indent=2, ensure_ascii=False))
        return

    with open(MODELS_FILE, encoding="utf-8") as f:
        models = json.load(f)
    existing_ids = {m["id"] for m in models}

    new_entries = [m for m in fetched if m["id"] not in existing_ids]
    print(f"\nNew ({len(new_entries)}):", [m["id"] for m in new_entries])
    print(f"Already in DB ({len(fetched) - len(new_entries)})")

    if args.add and new_entries:
        models.extend(new_entries)
        models.sort(key=lambda m: (m.get("createdAt", ""), m["id"]))
        with open(MODELS_FILE, "w", encoding="utf-8") as f:
            json.dump(models, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"Added {len(new_entries)} entries to models.json")


if __name__ == "__main__":
    main()
