"""
Playwright-based scrapers for closed-model card pages from OpenAI, Anthropic,
and Google DeepMind.  All three providers surface specs on JS-rendered pages
that cannot be fetched with a plain HTTP client.

Each provider exposes a single public function:
    fetch_openai(slugs, headless) -> list[dict]
    fetch_anthropic(slugs, headless) -> list[dict]
    fetch_google(slugs, headless) -> list[dict]

The returned dicts are ready to be merged into data/models.json.
"""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).parent.parent.parent
MODELS_FILE = ROOT / "data" / "models.json"

# ──────────────────────────────────────────────────────────────────────────────
# Shared helpers
# ──────────────────────────────────────────────────────────────────────────────

def _parse_date(s: str, fmt: str = "%b %d, %Y") -> Optional[str]:
    try:
        return datetime.strptime(s.strip(), fmt).strftime("%Y-%m-%d")
    except Exception:
        return None


def _load_existing_ids() -> set[str]:
    if not MODELS_FILE.exists():
        return set()
    with open(MODELS_FILE, encoding="utf-8") as f:
        return {m["id"] for m in json.load(f)}


def _merge_into_db(new_entries: list[dict], dry_run: bool) -> tuple[list[str], list[str]]:
    """Write new_entries to models.json; return (added_ids, skipped_ids)."""
    with open(MODELS_FILE, encoding="utf-8") as f:
        models = json.load(f)

    existing_ids = {m["id"] for m in models}
    added, skipped = [], []

    for entry in new_entries:
        # Mark closed-model entries (from fetch) as closed
        entry["openness"] = "closed"
        if entry["id"] in existing_ids:
            skipped.append(entry["id"])
        else:
            models.append(entry)
            added.append(entry["id"])

    if not dry_run and added:
        models.sort(key=lambda m: (m.get("createdAt", ""), m["id"]))
        with open(MODELS_FILE, "w", encoding="utf-8") as f:
            json.dump(models, f, ensure_ascii=False, indent=2)
            f.write("\n")

    return added, skipped


# ──────────────────────────────────────────────────────────────────────────────
# OpenAI
# ──────────────────────────────────────────────────────────────────────────────

_OPENAI_BASE = "https://developers.openai.com/api/docs/models"

_OPENAI_SKIP = [
    "image", "tts", "transcribe", "realtime", "audio", "embedding",
    "moderation", "dall-e", "sora", "whisper", "speech", "video",
    "computer-use", "search-preview", "chat-latest",
]

_OPENAI_EXTRACT_JS = r"""() => {
    const result = {};

    // ── Spec rows: context window / max output / knowledge cutoff ────────────
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

    // ── Modalities ────────────────────────────────────────────────────────────
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

    // ── Fallback: INPUT/OUTPUT summary text ───────────────────────────────────
    if (inputMods.length === 0) {
        const inputEl = allDivs.find(el => el.childElementCount === 0 && el.innerText.trim() === 'INPUT');
        if (inputEl && inputEl.nextElementSibling) {
            result.inputModalities = inputEl.nextElementSibling.innerText.toLowerCase().split(',').map(s => s.trim());
        }
        const outputEl = allDivs.find(el => el.childElementCount === 0 && el.innerText.trim() === 'OUTPUT');
        if (outputEl && outputEl.nextElementSibling) {
            result.outputModalities = outputEl.nextElementSibling.innerText.toLowerCase().split(',').map(s => s.trim());
        }
    }

    // ── Snapshot dates → earliest = createdAt ────────────────────────────────
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


def _openai_infer_arch(slug: str) -> tuple[str, str]:
    s = slug.lower()
    if s.startswith("o1"):               return "o1",     "o-series"
    if s.startswith("o3"):               return "o3",     "o-series"
    if s.startswith("o4"):               return "o4",     "o-series"
    if "5.4" in s:                       return "gpt5",   "GPT"
    if "5.3" in s:                       return "gpt5",   "GPT"
    if "5.2" in s:                       return "gpt5",   "GPT"
    if "5.1" in s:                       return "gpt5",   "GPT"
    if "gpt-5" in s or "codex" in s:    return "gpt5",   "GPT"
    if "4.5" in s:                       return "gpt4",   "GPT"
    if "4.1" in s:                       return "gpt4",   "GPT"
    if "gpt-4" in s:                     return "gpt4",   "GPT"
    if "3.5" in s:                       return "gpt3.5", "GPT"
    return "gpt", "GPT"


def _openai_get_all_slugs(page) -> list[str]:
    page.goto(f"{_OPENAI_BASE}/all", wait_until="domcontentloaded", timeout=20000)
    page.wait_for_selector("a[href*='/models/']", timeout=10000)
    hrefs = page.evaluate(
        """() => [...new Set([...document.querySelectorAll('a[href*="/models/"]')].map(a => a.href))]"""
    )
    slugs = []
    for href in hrefs:
        m = re.search(r"/models/([^/?#]+)/?$", href)
        if not m:
            continue
        slug = m.group(1)
        if slug in ("all", "compare", ""):
            continue
        if any(kw in slug for kw in _OPENAI_SKIP):
            continue
        slugs.append(slug)
    return slugs


def _openai_extract_one(page, slug: str) -> dict:
    url = f"{_OPENAI_BASE}/{slug}"
    for attempt in range(2):
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=20000)
            break
        except Exception:
            if attempt == 0:
                page.goto("about:blank")
            else:
                raise

    try:
        page.wait_for_selector("div.flex.flex-row.items-center.gap-2", timeout=12000)
    except Exception:
        pass

    data = page.evaluate(_OPENAI_EXTRACT_JS)
    arch, arch_family = _openai_infer_arch(slug)

    result: dict = {
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
        result["knowledgeCutoff"] = _parse_date(data["knowledgeCutoff"])

    return result


def fetch_openai(
    slugs: list[str] | None = None,
    headless: bool = True,
    verbose: bool = True,
) -> list[dict]:
    """
    Scrape OpenAI model card pages and return a list of model dicts.

    If *slugs* is None, the full model list is fetched from /all.
    """
    from playwright.sync_api import sync_playwright

    results: list[dict] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=headless)
        ctx = browser.new_context(user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ))
        page = ctx.new_page()

        if slugs is None:
            if verbose:
                print("Fetching OpenAI model list from /all...")
            slugs = _openai_get_all_slugs(page)
            if verbose:
                print(f"  → {len(slugs)} language/reasoning models found")

        for slug in slugs:
            if verbose:
                print(f"  {slug} ...", end=" ", flush=True)
            try:
                m = _openai_extract_one(page, slug)
                results.append(m)
                if verbose:
                    print(
                        f"ctx={m.get('contextLength', '?')}  "
                        f"cutoff={m.get('knowledgeCutoff', '?')}  "
                        f"in={m['inputModalities']}"
                    )
            except Exception as e:
                if verbose:
                    print(f"ERROR: {e}")

        browser.close()
    return results


# ──────────────────────────────────────────────────────────────────────────────
# Anthropic
# ──────────────────────────────────────────────────────────────────────────────

_ANTHROPIC_CARDS_URL = "https://www.anthropic.com/system-cards"

_ANTHROPIC_CARDS_JS = r"""() => {
    // Each model card link on the system-cards index page.
    // Structure varies; we look for <a> elements whose href contains "system-card"
    const links = [...document.querySelectorAll('a[href*="system-card"]')];
    return links.map(a => ({
        href: a.href,
        text: a.innerText.trim() || a.getAttribute('aria-label') || '',
    }));
}"""

_ANTHROPIC_CARD_JS = r"""() => {
    const result = {};

    // Page title — strip " System Card | Anthropic" suffix
    result.title = document.title
        .replace(/\s*[|–—]\s*Anthropic.*$/, '')
        .replace(/\s*System\s*Card.*$/i, '')
        .trim();

    // Try to find a release / published date.
    // Anthropic cards use patterns like "Published: January 2026" or ISO dates.
    const bodyText = document.body.innerText;
    let m;
    if ((m = bodyText.match(/Published[:\s]+(\w+ \d{4})/i))) {
        result.publishedText = m[1];
    } else if ((m = bodyText.match(/(\w+ \d{1,2},\s*\d{4})/))) {
        result.publishedText = m[1];
    }

    // Context window
    if ((m = bodyText.match(/([\d,]+)[- ]token context/i))) {
        result.contextLength = parseInt(m[1].replace(/,/g, ''));
    }

    return result;
}"""


def _anthropic_infer_model_id(href: str, title: str) -> Optional[str]:
    """Map a system-card URL / title to an anthropic/ model ID."""
    slug = href.rstrip("/").split("/")[-1]
    slug = re.sub(r"-system-card$", "", slug, flags=re.IGNORECASE)
    # Normalise: claude-3-5-sonnet → claude-3.5-sonnet  (heuristic)
    slug = re.sub(r"(\d)-(\d)", r"\1.\2", slug)
    return f"anthropic/{slug}"


def _anthropic_arch(model_id: str) -> tuple[str, str]:
    s = model_id.lower()
    # Architecture family: claude-3 / claude-3.5 / claude-3.7 → "Claude 3"
    # claude-opus-4, claude-sonnet-4 etc → "Claude 4"
    m = re.search(r"claude[- ]([\d.]+)", s)
    if m:
        major = m.group(1).split(".")[0]
        return f"claude{major}", f"Claude {major}"
    return "claude", "Claude"


def fetch_anthropic(
    slugs: list[str] | None = None,
    headless: bool = True,
    verbose: bool = True,
) -> list[dict]:
    """
    Scrape Anthropic system card pages and return model dicts.

    If *slugs* is None, card links are discovered from the index page.
    *slugs* should be URL path suffixes like "claude-sonnet-4-6-system-card".
    """
    from playwright.sync_api import sync_playwright

    results: list[dict] = []
    base = "https://www.anthropic.com"

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=headless)
        ctx = browser.new_context(user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ))
        page = ctx.new_page()

        if slugs is None:
            if verbose:
                print(f"Fetching Anthropic card list from {_ANTHROPIC_CARDS_URL} ...")
            page.goto(_ANTHROPIC_CARDS_URL, wait_until="domcontentloaded", timeout=20000)
            try:
                page.wait_for_selector("a[href*='system-card']", timeout=10000)
            except Exception:
                pass
            links = page.evaluate(_ANTHROPIC_CARDS_JS)
            if verbose:
                print(f"  → {len(links)} card links found")
        else:
            links = [{"href": f"{base}/{s}", "text": s} for s in slugs]

        for link in links:
            href = link["href"]
            if verbose:
                print(f"  {href} ...", end=" ", flush=True)
            try:
                page.goto(href, wait_until="domcontentloaded", timeout=20000)
                try:
                    page.wait_for_load_state("networkidle", timeout=8000)
                except Exception:
                    pass
                data = page.evaluate(_ANTHROPIC_CARD_JS)

                model_id = _anthropic_infer_model_id(href, data.get("title", ""))
                arch, arch_family = _anthropic_arch(model_id)

                entry: dict = {
                    "id": model_id,
                    "name": data.get("title") or model_id.split("/")[-1],
                    "provider": "Anthropic",
                    "techReport": href,
                    "architecture": arch,
                    "architectureFamily": arch_family,
                    "inputModalities": ["text", "image"],
                    "outputModalities": ["text"],
                    "isMoe": False,
                }
                if data.get("contextLength"):
                    entry["contextLength"] = data["contextLength"]

                # Try to parse published date
                if data.get("publishedText"):
                    for fmt in ("%B %Y", "%B %d, %Y", "%b %Y", "%b %d, %Y"):
                        d = _parse_date(data["publishedText"], fmt)
                        if d:
                            entry["createdAt"] = f"{d}T00:00:00.000Z"
                            break

                results.append(entry)
                if verbose:
                    print(f"ok  ctx={entry.get('contextLength', '?')}")
            except Exception as e:
                if verbose:
                    print(f"ERROR: {e}")

        browser.close()
    return results


# ──────────────────────────────────────────────────────────────────────────────
# Google DeepMind
# ──────────────────────────────────────────────────────────────────────────────

_GOOGLE_CARDS_URL = "https://deepmind.google/models/model-cards/"

_GOOGLE_LIST_JS = r"""() => {
    // Links to individual model card pages
    const links = [...document.querySelectorAll('a[href*="model-cards/"]')]
        .filter(a => !a.href.endsWith('/model-cards/') && !a.href.endsWith('/model-cards'))
        .map(a => ({ href: a.href, text: a.innerText.trim() }));
    return [...new Map(links.map(l => [l.href, l])).values()];
}"""

_GOOGLE_CARD_JS = r"""() => {
    const result = {};
    const body = document.body.innerText;

    // Title — strip " – Google DeepMind" suffix
    result.title = document.title
        .replace(/\s*[|–—-]\s*(Google DeepMind|DeepMind).*$/i, '')
        .replace(/\s*Model Card.*$/i, '')
        .trim();

    // Context window
    let m;
    if ((m = body.match(/([\d,.]+)[Mm]?\s*(?:token|context window)/i))) {
        const raw = m[1].replace(/,/g, '');
        const val = parseFloat(raw);
        // Handle "1M" suffix
        result.contextLength = body[m.index + m[0].length - 1] === 'M' || body.includes(m[1] + 'M')
            ? val * 1e6
            : val;
    }

    // Knowledge cutoff
    if ((m = body.match(/[Kk]nowledge\s+cutoff[:\s]+(\w+ \d{4})/i))) {
        result.knowledgeCutoff = m[1];
    }

    // Published / release date
    if ((m = body.match(/(?:Published|Released|Date)[:\s]+(\w+ \d{1,2},?\s*\d{4})/i))) {
        result.publishedText = m[1];
    } else if ((m = body.match(/(\w+\s+\d{4})/))) {
        result.publishedText = m[1];
    }

    // Modalities: look for "Text", "Image", "Audio", "Video" mentions
    const lower = body.toLowerCase();
    const inputMods = [];
    if (lower.includes('text')) inputMods.push('text');
    if (lower.includes('image') || lower.includes('vision')) inputMods.push('image');
    if (lower.includes('audio')) inputMods.push('audio');
    if (lower.includes('video')) inputMods.push('video');
    result.inputModalities = inputMods.length ? inputMods : ['text'];
    result.outputModalities = ['text'];

    return result;
}"""


def _google_infer_model_id(href: str, title: str) -> str:
    slug = href.rstrip("/").split("/")[-1]
    # Normalise: gemini-2-5-pro → gemini-2.5-pro
    slug = re.sub(r"(\d)-(\d)", r"\1.\2", slug)
    return f"google/{slug}"


def _google_arch(model_id: str) -> tuple[str, str]:
    s = model_id.lower()
    m = re.search(r"gemini[- ]([\d.]+)", s)
    if m:
        parts = m.group(1).split(".")
        major = parts[0]
        minor = parts[1] if len(parts) > 1 else "0"
        return f"gemini{major}{minor}", f"Gemini {major}"
    return "gemini", "Gemini"


def fetch_google(
    slugs: list[str] | None = None,
    headless: bool = True,
    verbose: bool = True,
) -> list[dict]:
    """
    Scrape Google DeepMind model card pages and return model dicts.

    If *slugs* is None, card links are discovered from the index page.
    *slugs* should be URL path suffixes like "gemini-2-5-pro".
    """
    from playwright.sync_api import sync_playwright

    results: list[dict] = []
    base = "https://deepmind.google/models/model-cards"

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=headless)
        ctx = browser.new_context(user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ))
        page = ctx.new_page()

        if slugs is None:
            if verbose:
                print(f"Fetching Google model card list from {_GOOGLE_CARDS_URL} ...")
            page.goto(_GOOGLE_CARDS_URL, wait_until="domcontentloaded", timeout=20000)
            try:
                page.wait_for_load_state("networkidle", timeout=8000)
            except Exception:
                pass
            links = page.evaluate(_GOOGLE_LIST_JS)
            # Filter: language/reasoning only — skip Veo, Lyria, Imagen, robotics
            skip_kw = ["veo", "lyria", "imagen", "robotics", "aloha", "rt-", "gemma"]
            links = [l for l in links if not any(kw in l["href"].lower() for kw in skip_kw)]
            if verbose:
                print(f"  → {len(links)} model card links found")
        else:
            links = [{"href": f"{base}/{s}/", "text": s} for s in slugs]

        for link in links:
            href = link["href"]
            if verbose:
                print(f"  {href} ...", end=" ", flush=True)
            try:
                page.goto(href, wait_until="domcontentloaded", timeout=20000)
                try:
                    page.wait_for_load_state("networkidle", timeout=8000)
                except Exception:
                    pass
                data = page.evaluate(_GOOGLE_CARD_JS)

                model_id = _google_infer_model_id(href, data.get("title", ""))
                arch, arch_family = _google_arch(model_id)

                entry: dict = {
                    "id": model_id,
                    "name": data.get("title") or model_id.split("/")[-1],
                    "provider": "Google DeepMind",
                    "techReport": href,
                    "architecture": arch,
                    "architectureFamily": arch_family,
                    "inputModalities": data.get("inputModalities", ["text"]),
                    "outputModalities": data.get("outputModalities", ["text"]),
                    "isMoe": False,
                }
                if data.get("contextLength"):
                    entry["contextLength"] = int(data["contextLength"])
                if data.get("knowledgeCutoff"):
                    for fmt in ("%B %Y", "%b %Y"):
                        d = _parse_date(data["knowledgeCutoff"], fmt)
                        if d:
                            entry["knowledgeCutoff"] = d
                            break
                if data.get("publishedText"):
                    for fmt in ("%B %d, %Y", "%B %Y", "%b %d, %Y", "%b %Y"):
                        d = _parse_date(data["publishedText"], fmt)
                        if d:
                            entry["createdAt"] = f"{d}T00:00:00.000Z"
                            break

                results.append(entry)
                if verbose:
                    print(f"ok  ctx={entry.get('contextLength', '?')}")
            except Exception as e:
                if verbose:
                    print(f"ERROR: {e}")

        browser.close()
    return results
