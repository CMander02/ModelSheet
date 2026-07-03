"""Collect Sebastian Raschka's LLM Architecture Gallery into reference files.

The output under reference/ is intentionally review-oriented: it preserves the
source page snapshot, structured card facts, HF repository metadata, and a first
pass architecture grouping file that can feed ModelSheet architecture YAML work.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_URL = "https://sebastianraschka.com/llm-architecture-gallery/"
DEFAULT_OUTPUT = PROJECT_ROOT / "reference" / "raschka-llm-architecture-gallery"
USER_AGENT = "modelsheet-raschka-collector/1.0 (+https://github.com/)"
VOID_TAGS = {
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
}


@dataclass
class Node:
    tag: str
    attrs: dict[str, str] = field(default_factory=dict)
    children: list["Node | str"] = field(default_factory=list)

    def attr(self, name: str, default: str = "") -> str:
        return self.attrs.get(name, default)

    def classes(self) -> set[str]:
        return set(self.attrs.get("class", "").split())

    def has_class(self, class_name: str) -> bool:
        return class_name in self.classes()

    def text(self) -> str:
        parts: list[str] = []

        def walk(value: Node | str) -> None:
            if isinstance(value, str):
                parts.append(value)
                return
            if value.tag in {"script", "style"}:
                return
            for child in value.children:
                walk(child)

        walk(self)
        return normalize_text(" ".join(parts))

    def find_all(self, predicate) -> list["Node"]:
        matches: list[Node] = []

        def walk(node: Node) -> None:
            if predicate(node):
                matches.append(node)
            for child in node.children:
                if isinstance(child, Node):
                    walk(child)

        walk(self)
        return matches

    def find_first(self, predicate) -> "Node | None":
        matches = self.find_all(predicate)
        return matches[0] if matches else None


class TreeParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("document")
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Node(tag.lower(), {k: v or "" for k, v in attrs})
        self.stack[-1].children.append(node)
        if tag.lower() not in VOID_TAGS:
            self.stack.append(node)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data: str) -> None:
        if data:
            self.stack[-1].children.append(data)


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(value)).strip()


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "model"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def request_text(url: str, token: str | None = None, timeout: int = 30) -> str:
    headers = {"User-Agent": USER_AGENT}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    with httpx.Client(timeout=timeout, follow_redirects=True, headers=headers) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.text


def request_json(url: str, token: str | None = None, timeout: int = 30) -> Any:
    return json.loads(request_text(url, token=token, timeout=timeout))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def safe_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def parse_html(html: str) -> Node:
    parser = TreeParser()
    parser.feed(html)
    parser.close()
    return parser.root


def parse_hf_repo(url: str) -> str | None:
    parsed = urlparse(url)
    if not parsed.netloc.endswith("huggingface.co"):
        return None
    parts = [p for p in parsed.path.split("/") if p]
    if len(parts) < 2:
        return None
    if parts[0] in {"api", "datasets", "spaces"}:
        if len(parts) >= 3 and parts[1] == "models":
            return f"{parts[2]}/{parts[3]}" if len(parts) >= 4 else None
        return None
    return f"{parts[0]}/{parts[1]}"


def canonical_fact_key(term: str) -> str:
    cleaned = term.lower()
    cleaned = re.sub(r"\binfo\b", "", cleaned)
    cleaned = normalize_text(cleaned)
    if cleaned.startswith("scale"):
        return "scale"
    if cleaned.startswith("context"):
        return "context"
    if cleaned.startswith("license"):
        return "license"
    if cleaned.startswith("date"):
        return "releaseDate"
    if cleaned.startswith("decoder type"):
        return "decoderType"
    if cleaned.startswith("attention"):
        return "attention"
    if cleaned.startswith("layer mix"):
        return "layerMix"
    if cleaned.startswith("kv cache"):
        return "kvCache"
    if cleaned.startswith("key detail"):
        return "keyDetail"
    if "intelligence index" in cleaned:
        return "aaIndex"
    return slugify(cleaned).replace("-", "_")


def all_links(node: Node, base_url: str) -> list[dict[str, str]]:
    links = []
    for link in node.find_all(lambda n: n.tag == "a" and bool(n.attr("href"))):
        href = urljoin(base_url, link.attr("href"))
        label = link.text()
        links.append(
            {
                "label": label,
                "url": href,
                "host": urlparse(href).netloc,
            }
        )
    return links


def parse_card(card: Node, base_url: str) -> dict[str, Any]:
    dataset = {
        key[5:].replace("-", "_"): value
        for key, value in card.attrs.items()
        if key.startswith("data-")
    }
    title_node = card.find_first(lambda n: n.has_class("llm-architecture-overview__title"))
    media_img = card.find_first(lambda n: n.tag == "img")
    media_link = card.find_first(lambda n: n.has_class("llm-architecture-overview__media-link"))
    title_meta = card.find_first(lambda n: n.has_class("llm-architecture-overview__title-meta"))
    concepts = card.find_all(lambda n: n.has_class("llm-architecture-overview__concept-link"))

    facts: dict[str, str] = {}
    raw_facts: list[dict[str, str]] = []
    for item in card.find_all(lambda n: n.has_class("llm-architecture-overview__fact-item")):
        term = item.find_first(lambda n: n.has_class("llm-architecture-overview__fact-term"))
        definition = item.find_first(lambda n: n.has_class("llm-architecture-overview__fact-def"))
        if not term or not definition:
            continue
        term_text = term.text()
        def_text = definition.text()
        key = canonical_fact_key(term_text)
        facts[key] = def_text
        raw_facts.append({"term": term_text, "key": key, "value": def_text})

    links = all_links(title_meta or card, base_url)
    hf_repos = []
    for link in links:
        repo = parse_hf_repo(link["url"])
        if repo and repo not in hf_repos:
            hf_repos.append(repo)

    thumbnail = None
    if media_img:
        thumbnail = {
            "src": urljoin(base_url, media_img.attr("src")),
            "alt": media_img.attr("alt"),
            "width": media_img.attr("width"),
            "height": media_img.attr("height"),
        }
    zoom_image = urljoin(base_url, media_link.attr("data-zoom-src")) if media_link and media_link.attr("data-zoom-src") else None

    slug = card.attr("data-compare-key") or dataset.get("sort_key") or slugify(title_node.text() if title_node else "")
    title = card.attr("data-compare-title") or card.attr("data-sort-label") or (title_node.text() if title_node else slug)

    return {
        "slug": slug,
        "title": title,
        "baseTitle": card.attr("data-compare-base-title") or title,
        "releaseDate": facts.get("releaseDate") or card.attr("data-sort-date"),
        "scale": facts.get("scale") or card.attr("data-sort-size"),
        "context": facts.get("context"),
        "license": facts.get("license"),
        "decoderType": facts.get("decoderType") or card.attr("data-compare-decoder"),
        "attention": facts.get("attention") or card.attr("data-compare-attention"),
        "layerMix": facts.get("layerMix") or card.attr("data-compare-layer-mix"),
        "kvCache": facts.get("kvCache") or card.attr("data-compare-kv"),
        "keyDetail": facts.get("keyDetail"),
        "aaIndex": facts.get("aaIndex") or card.attr("data-sort-aai"),
        "summary": card.attr("data-search-text"),
        "relatedConcepts": [
            {"label": concept.text(), "url": urljoin(base_url, concept.attr("href"))}
            for concept in concepts
            if concept.attr("href")
        ],
        "thumbnail": thumbnail,
        "zoomImage": zoom_image,
        "links": links,
        "hfRepos": hf_repos,
        "facts": raw_facts,
        "compare": {
            "key": card.attr("data-compare-key"),
            "attention": card.attr("data-compare-attention"),
            "decoder": card.attr("data-compare-decoder"),
            "kv": card.attr("data-compare-kv"),
            "layerMix": card.attr("data-compare-layer-mix"),
        },
    }


def parse_gallery(html: str, base_url: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    root = parse_html(html)
    cards = root.find_all(
        lambda n: n.has_class("llm-architecture-overview__card") and bool(n.attr("data-compare-key"))
    )
    models = [parse_card(card, base_url) for card in cards]
    declared_count = None
    count_match = re.search(r"(?P<count>\d+)\s+models", html)
    if count_match:
        declared_count = int(count_match.group("count"))
    updated_match = re.search(r"([A-Z][a-z]{2}\s+\d{1,2})\s+last updated", html)
    meta = {
        "sourceUrl": base_url,
        "declaredModelCount": declared_count,
        "parsedModelCount": len(models),
        "lastUpdatedText": updated_match.group(0) if updated_match else None,
    }
    return models, meta


def write_markdown(path: Path, meta: dict[str, Any], models: list[dict[str, Any]]) -> None:
    lines = [
        "# LLM Architecture Gallery",
        "",
        f"Source: {meta['sourceUrl']}",
        f"Fetched: {meta['fetchedAt']}",
        f"Declared models: {meta.get('declaredModelCount')}",
        f"Parsed models: {meta.get('parsedModelCount')}",
        f"Last updated text: {meta.get('lastUpdatedText') or ''}",
        "",
    ]
    for model in models:
        lines.extend(
            [
                f"## {model['title']}",
                "",
                f"- slug: `{model['slug']}`",
                f"- date: {model.get('releaseDate') or ''}",
                f"- scale: {model.get('scale') or ''}",
                f"- decoder: {model.get('decoderType') or ''}",
                f"- attention: {model.get('attention') or ''}",
                f"- layer mix: {model.get('layerMix') or ''}",
                f"- key detail: {model.get('keyDetail') or ''}",
                f"- hf repos: {', '.join(model.get('hfRepos') or [])}",
                "",
            ]
        )
    safe_write_text(path, "\n".join(lines))


GROUP_RULES: list[dict[str, Any]] = [
    {
        "id": "gpt2",
        "family": "GPT-2",
        "patterns": [r"gpt-2"],
        "aliases": ["gpt2"],
        "features": {"attention": "MHA", "positionEncoding": "learned absolute", "ffn": "GELU MLP"},
    },
    {
        "id": "llama",
        "family": "Llama 3 / 3.2",
        "patterns": [r"llama-3(?!.*llama-4)"],
        "aliases": ["llama"],
        "features": {"attention": "GQA", "positionEncoding": "RoPE", "ffn": "SwiGLU"},
    },
    {
        "id": "llama4",
        "family": "Llama 4",
        "patterns": [r"llama-4"],
        "aliases": ["llama4"],
        "features": {"attention": "GQA", "moe": "sparse MoE", "layerMix": "alternating dense/MoE"},
    },
    {
        "id": "deepseek-v3",
        "family": "DeepSeek V3 / R1 / V3.2",
        "patterns": [r"deepseek-v3", r"deepseek-r1"],
        "aliases": ["deepseek_v3", "deepseek_v32"],
        "features": {"attention": "MLA", "moe": "shared expert MoE", "routing": "sigmoid bias routing"},
    },
    {
        "id": "deepseek-v4",
        "family": "DeepSeek V4",
        "patterns": [r"deepseek-v4"],
        "aliases": ["deepseek_v4"],
        "features": {"attention": "MLA", "moe": "sparse MoE"},
    },
    {
        "id": "gemma",
        "family": "Gemma 3 / 4",
        "patterns": [r"gemma-3", r"gemma-4"],
        "aliases": ["gemma3", "gemma3_text", "gemma4"],
        "features": {"attention": "GQA + QK-Norm", "layerMix": "local/global attention", "norm": "RMSNorm"},
    },
    {
        "id": "mistral",
        "family": "Mistral Small / Large",
        "patterns": [r"mistral-small", r"mistral-large"],
        "aliases": ["mistral", "mistral3"],
        "features": {"attention": "GQA", "positionEncoding": "RoPE", "ffn": "SwiGLU"},
    },
    {
        "id": "qwen3-next",
        "family": "Qwen3 Next",
        "patterns": [r"qwen3-next"],
        "aliases": ["qwen3_next"],
        "features": {"attention": "hybrid GQA / linear attention", "moe": "sparse MoE"},
    },
    {
        "id": "qwen3",
        "family": "Qwen3 / Qwen3.5 / Qwen3.6",
        "patterns": [r"qwen3(?![- ]next)"],
        "aliases": ["qwen3", "qwen3_moe", "qwen3_5", "qwen3_5_moe", "qwen3_6"],
        "features": {"attention": "GQA + QK-RMSNorm", "positionEncoding": "RoPE", "ffn": "SwiGLU"},
    },
    {
        "id": "kimi-k2",
        "family": "Kimi K2 / Kimi Linear",
        "patterns": [r"kimi-k2", r"kimi-linear"],
        "aliases": ["kimi_k2", "kimi_k25", "kimi_linear"],
        "features": {"attention": "MLA or linear attention variant", "moe": "large sparse MoE"},
    },
    {
        "id": "glm",
        "family": "GLM 4.5 / 5",
        "patterns": [r"glm-4", r"glm-5"],
        "aliases": ["glm", "glm4", "glm4_moe", "glm_moe_dsa"],
        "features": {"attention": "GQA / DSA variants", "moe": "sparse MoE variants"},
    },
    {
        "id": "olmo",
        "family": "OLMo 2 / 3",
        "patterns": [r"olmo-2", r"olmo-3"],
        "aliases": ["olmo", "olmo2", "olmo3"],
        "features": {"attention": "MHA or GQA + QK-Norm", "norm": "inside-residual norm variants"},
    },
    {
        "id": "gpt-oss",
        "family": "GPT-OSS",
        "patterns": [r"gpt-oss"],
        "aliases": ["gpt_oss"],
        "features": {"attention": "GQA", "moe": "sparse MoE"},
    },
    {
        "id": "granite",
        "family": "Granite 4",
        "patterns": [r"granite"],
        "aliases": ["granite", "granitemoe", "granitemoehybrid"],
        "features": {"attention": "hybrid attention/SSM variants", "moe": "GraniteMoE variants"},
    },
    {
        "id": "phi",
        "family": "Phi-4",
        "patterns": [r"phi-4"],
        "aliases": ["phi", "phi3", "phi4mm", "phimoe"],
        "features": {"attention": "GQA", "positionEncoding": "RoPE", "ffn": "SwiGLU"},
    },
    {
        "id": "xlstm",
        "family": "xLSTM",
        "patterns": [r"xlstm"],
        "aliases": ["xlstm"],
        "features": {"tokenMixer": "xLSTM blocks", "attention": "recurrent token mixing"},
    },
    {
        "id": "lfm",
        "family": "LFM2.5",
        "patterns": [r"lfm2"],
        "aliases": ["lfm2", "lfm2_vl"],
        "features": {"tokenMixer": "hybrid convolution / attention blocks"},
    },
    {
        "id": "nemotron",
        "family": "Nemotron 3",
        "patterns": [r"nemotron"],
        "aliases": ["nemotron", "nemotron_nas"],
        "features": {"attention": "GQA", "moe": "MoE variants"},
    },
    {
        "id": "minimax",
        "family": "MiniMax M2 / M3",
        "patterns": [r"minimax"],
        "aliases": ["minimax", "minimax_m1", "minimax_m2"],
        "features": {"attention": "MLA-style attention", "moe": "large sparse MoE"},
    },
    {
        "id": "command-a",
        "family": "Command A+",
        "patterns": [r"command-a"],
        "aliases": ["command_a", "cohere2"],
        "features": {"attention": "GQA", "moe": "sparse MoE"},
    },
]


def build_architecture_groups(models: list[dict[str, Any]]) -> dict[str, Any]:
    groups = []
    assigned: set[str] = set()
    for rule in GROUP_RULES:
        members = []
        patterns = [re.compile(p, re.I) for p in rule["patterns"]]
        for model in models:
            haystack = f"{model['slug']} {model['title']}"
            if any(pattern.search(haystack) for pattern in patterns):
                members.append(
                    {
                        "slug": model["slug"],
                        "title": model["title"],
                        "releaseDate": model.get("releaseDate"),
                        "attention": model.get("attention"),
                        "decoderType": model.get("decoderType"),
                        "hfRepos": model.get("hfRepos", []),
                    }
                )
                assigned.add(model["slug"])
        if not members:
            continue
        representative_hf = next((repo for member in members for repo in member.get("hfRepos", []) if repo), None)
        groups.append(
            {
                "id": rule["id"],
                "family": rule["family"],
                "aliases": rule["aliases"],
                "features": rule["features"],
                "members": members,
                "representativeHfRepo": representative_hf,
                "evidence": [
                    {
                        "source": "raschka-gallery",
                        "fields": ["attention", "decoderType", "layerMix", "keyDetail"],
                    }
                ],
                "confidence": "reviewed-from-gallery",
            }
        )
    unmatched = [
        {"slug": model["slug"], "title": model["title"], "attention": model.get("attention")}
        for model in models
        if model["slug"] not in assigned
    ]
    return {
        "generatedAt": now_iso(),
        "groupCount": len(groups),
        "assignedModelCount": len(assigned),
        "unmatchedModelCount": len(unmatched),
        "groups": groups,
        "unmatched": unmatched,
    }


def fetch_hf_reference(card: dict[str, Any], out_dir: Path, token: str | None, pause: float) -> dict[str, Any]:
    slug = card["slug"]
    repos = card.get("hfRepos") or []
    card_dir = out_dir / "hf" / slug
    card_dir.mkdir(parents=True, exist_ok=True)
    write_json(card_dir / "repositories.json", repos)
    result = {"slug": slug, "repos": repos, "primaryRepo": repos[0] if repos else None, "accessIssues": []}
    if not repos:
        result["accessIssues"].append({"type": "no_hf_repo", "message": "No HuggingFace repository link found on card"})
        write_json(card_dir / "status.json", result)
        return result

    repo = repos[0]
    api_url = f"https://huggingface.co/api/models/{repo}"
    try:
        metadata = request_json(api_url, token=token)
        write_json(card_dir / "metadata.json", metadata)
        siblings = metadata.get("siblings") or []
        write_json(card_dir / "files.json", siblings)
    except httpx.HTTPStatusError as exc:
        result["accessIssues"].append({"type": "metadata_http_error", "status": exc.response.status_code, "url": api_url})
    except (httpx.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
        result["accessIssues"].append({"type": "metadata_error", "message": str(exc), "url": api_url})

    for filename, out_name in (("config.json", "config.json"), ("README.md", "README.md")):
        url = f"https://huggingface.co/{repo}/resolve/main/{filename}"
        try:
            content = request_text(url, token=token)
            safe_write_text(card_dir / out_name, content)
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            issue_type = "gated_or_forbidden" if status in {401, 403} else "file_http_error"
            result["accessIssues"].append({"type": issue_type, "status": status, "file": filename, "url": url})
        except (httpx.HTTPError, TimeoutError) as exc:
            result["accessIssues"].append({"type": "file_error", "message": str(exc), "file": filename, "url": url})
    write_json(card_dir / "status.json", result)
    if pause:
        time.sleep(pause)
    return result


def collect(args: argparse.Namespace) -> dict[str, Any]:
    out_dir = Path(args.output).resolve()
    source_dir = out_dir / "source"
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    fetched_at = now_iso()

    html = request_text(args.url)
    safe_write_text(source_dir / "page.html", html)
    try:
        js = request_text(urljoin(args.url, "gallery.js"))
        safe_write_text(source_dir / "gallery.js", js)
    except Exception as exc:
        safe_write_text(source_dir / "gallery.js.error.txt", str(exc))

    models, meta = parse_gallery(html, args.url)
    meta["fetchedAt"] = fetched_at
    write_json(out_dir / "models.json", {"meta": meta, "models": models})
    write_markdown(source_dir / "page.md", meta, models)
    groups = build_architecture_groups(models)
    groups["sourceUrl"] = args.url
    write_json(out_dir / "analysis" / "architecture-groups.json", groups)

    hf_results = []
    if not args.skip_hf:
        for i, model in enumerate(models, start=1):
            print(f"[{i:02d}/{len(models):02d}] HF reference: {model['slug']}")
            hf_results.append(fetch_hf_reference(model, out_dir, token=token, pause=args.pause))
        write_json(out_dir / "hf-status.json", {"generatedAt": now_iso(), "items": hf_results})
    else:
        status_path = out_dir / "hf-status.json"
        if status_path.exists():
            status = json.loads(status_path.read_text(encoding="utf-8"))
            hf_results = status.get("items", [])

    missing_required = []
    required = ["slug", "title", "releaseDate", "decoderType", "attention", "keyDetail", "links"]
    for model in models:
        missing = [key for key in required if not model.get(key)]
        if missing:
            missing_required.append({"slug": model["slug"], "missing": missing})
    validation = {
        "generatedAt": now_iso(),
        "declaredModelCount": meta.get("declaredModelCount"),
        "parsedModelCount": len(models),
        "countMatches": meta.get("declaredModelCount") == len(models),
        "missingRequired": missing_required,
        "hfIssueCount": sum(len(item.get("accessIssues", [])) for item in hf_results),
    }
    write_json(out_dir / "validation.json", validation)
    return validation


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--skip-hf", action="store_true", help="Only collect the gallery page and card facts")
    parser.add_argument("--pause", type=float, default=0.1, help="Delay between HF repository fetches")
    args = parser.parse_args()
    validation = collect(args)
    print(json.dumps(validation, indent=2, ensure_ascii=False))
    if not validation["countMatches"]:
        raise SystemExit("Parsed model count does not match declared gallery count")


if __name__ == "__main__":
    main()
