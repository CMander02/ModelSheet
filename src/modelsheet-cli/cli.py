"""Command-line interface for ModelSheet."""

import json
import shutil
from pathlib import Path
from typing import List, Optional

import typer
from rich.console import Console
from rich.theme import Theme

from .config import OUTPUT_FILE, TEMP_DIR
from .exporter import ModelExporter
from .fetcher import ModelFetcher
from .parser import ModelParser
from .scanner import (
    get_scan_orgs_from_providers,
    load_snapshot,
    save_snapshot,
    scan_orgs,
)
from .utils import read_model_list, validate_model_id

# Custom theme to make dim text white
custom_theme = Theme({
    "dim": "white",
    "option": "bold cyan",
    "switch": "bold green",
    "repr.dim": "white",
})

app = typer.Typer(
    name="modelsheet",
    help="""
    [bold]ModelSheet CLI[/bold] — LLM model configuration reference tool.

    Fetches configs from HuggingFace and closed-model card pages, parses them
    into a structured local database ([cyan]data/models.json[/cyan]), and lets
    you query, compare, and maintain model metadata.

    \b
    Quick start (open-source models):
        modelsheet add Qwen/Qwen2.5-7B
        modelsheet add --file models.txt
        modelsheet list
        modelsheet show Qwen/Qwen2.5-7B

    \b
    Quick start (closed frontier models):
        modelsheet fetch openai                  # scrape all OpenAI model cards
        modelsheet fetch anthropic               # scrape Anthropic system cards
        modelsheet fetch google                  # scrape Google DeepMind cards
        modelsheet fetch openai gpt-4o o3        # specific slugs only
        modelsheet fetch openai --add            # write new entries to DB

    \b
    Discovery:
        modelsheet scan                          # diff HuggingFace orgs vs DB
        modelsheet scan --source hf --org Qwen
        modelsheet scan --commit --add           # auto-add new HF models

    \b
    Subcommand groups:
        add, remove, list, show, scan            # HuggingFace open models
        fetch openai / anthropic / google        # closed model card scraping

    \b
    Note:
        fetch requires [cyan]playwright[/cyan] (pip install playwright && playwright install chromium).
    """,
    no_args_is_help=True,
    rich_markup_mode="rich",
    pretty_exceptions_show_locals=False,
)

# Patch typer's rich console to use our theme
try:
    import typer.rich_utils
    _original_get_rich_console = typer.rich_utils._get_rich_console

    def _get_custom_rich_console(**kwargs):
        """Custom console with our theme."""
        return Console(theme=custom_theme, **kwargs)

    typer.rich_utils._get_rich_console = _get_custom_rich_console
except Exception:
    pass

console = Console(theme=custom_theme)


@app.command()
def add(
    model_ids: Optional[List[str]] = typer.Argument(
        None,
        help="Model ID(s) to add (format: org/model, e.g., Qwen/Qwen3-8B). Can specify multiple models separated by space.",
    ),
    models_file: Optional[Path] = typer.Option(
        None,
        "--file",
        "-f",
        help="Path to file containing model IDs (.txt or .yaml)",
    ),
    update_all: bool = typer.Option(
        False,
        "--update-all",
        "-u",
        help="Re-fetch and update all existing models in the database",
    ),
    timeout: int = typer.Option(
        60,
        "--timeout",
        "-t",
        help="Request timeout in seconds",
    ),
):
    """
    Add models to the database.

    \b
    Downloads configs from HuggingFace, parses them, and adds to models.json.
    This is the main command for adding new models.

    \b
    Examples:
        # Add single model
        modelsheet add Qwen/Qwen2.5-7B-Instruct

        # Add multiple models (like pip install)
        modelsheet add Qwen/Qwen2.5-7B mistralai/Mistral-7B-v0.3 google/gemma-2-9b

        # Add from file
        modelsheet add --file models.txt
        modelsheet add -f models.yaml

        # Update all existing models in database
        modelsheet add --update-all
        modelsheet add -u

        # With custom timeout (default: 60 seconds)
        modelsheet add Qwen/Qwen3-8B --timeout 120

    \b
    What it does:
        1. Downloads config files from HuggingFace
        2. Parses and extracts model parameters
        3. Updates models.json database
        4. Cleans up temporary cache automatically

    \b
    Notes:
        - Existing models in JSON are preserved
        - Duplicate models are updated with new data
        - Failed downloads are skipped
        - Cache is automatically cleaned after completion
    """
    # Get model IDs
    if update_all:
        # Load existing models from database
        if not OUTPUT_FILE.exists():
            console.print("[yellow]No database found. Nothing to update.[/yellow]")
            raise typer.Exit(1)
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                final_model_ids = [m['id'] for m in existing_data]
        except Exception as e:
            console.print(f"[red]Error reading database: {e}[/red]")
            raise typer.Exit(1)
        if not final_model_ids:
            console.print("[yellow]Database is empty. Nothing to update.[/yellow]")
            raise typer.Exit(1)
        console.print(f"[bold]Updating all {len(final_model_ids)} model(s) in database...[/bold]\n")
    elif models_file:
        final_model_ids = read_model_list(models_file)
        if not final_model_ids:
            console.print("[red]No valid model IDs found in file[/red]")
            raise typer.Exit(1)
    elif model_ids:
        # Validate all model IDs
        final_model_ids = []
        for model_id in model_ids:
            if not validate_model_id(model_id):
                console.print(f"[red]Invalid model ID format: {model_id}[/red]")
                console.print("Expected format: org/model (e.g., Qwen/Qwen2.5-7B)")
                raise typer.Exit(1)
            final_model_ids.append(model_id)
    else:
        console.print("[red]Error: Must provide model ID(s), --file, or --update-all[/red]")
        console.print("Examples:")
        console.print("  modelsheet add Qwen/Qwen2.5-7B")
        console.print("  modelsheet add Qwen/Qwen2.5-7B mistralai/Mistral-7B-v0.3")
        console.print("  modelsheet add --file models.txt")
        console.print("  modelsheet add --update-all")
        raise typer.Exit(1)

    if not update_all:
        console.print(f"[bold]Adding {len(final_model_ids)} model(s)...[/bold]\n")

    # Step 1: Fetch
    with ModelFetcher(timeout=timeout) as fetcher:
        models_configs = fetcher.fetch_models(final_model_ids)

    # Step 2: Parse
    parser = ModelParser()
    new_models = parser.parse_models(models_configs)

    # Step 3: Update JSON
    console.print("\n[bold cyan]Updating database...[/bold cyan]")

    # Load existing models
    existing_models = []
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                # Convert to ParsedModel-like dicts for merging
                existing_models = existing_data
        except Exception as e:
            console.print(f"[yellow]Warning: Could not load existing data: {e}[/yellow]")

    # Merge: update existing or append new
    existing_ids = {m['id'] for m in existing_models}
    merged_models = existing_models.copy()

    new_count = 0
    updated_count = 0

    exporter = ModelExporter()
    for new_model in new_models:
        new_data = exporter._to_frontend_format(new_model)
        if new_model.id in existing_ids:
            # Update existing
            for i, m in enumerate(merged_models):
                if m['id'] == new_model.id:
                    merged_models[i] = new_data
                    updated_count += 1
                    break
        else:
            # Add new
            merged_models.append(new_data)
            new_count += 1

    # Export merged data
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(merged_models, f, indent=2, ensure_ascii=False)

    file_size = OUTPUT_FILE.stat().st_size / 1024
    console.print(f"\n[bold green]Success![/bold green]")
    console.print(f"Added: {new_count} new, Updated: {updated_count}")
    console.print(f"Total models in database: {len(merged_models)}")
    console.print(f"Database: {OUTPUT_FILE} ({file_size:.1f} KB)")

    # Clean up remaining empty directories (models are cleaned incrementally during parsing)
    if TEMP_DIR.exists():
        try:
            # Remove empty org directories
            for org_dir in TEMP_DIR.iterdir():
                if org_dir.is_dir() and not any(org_dir.iterdir()):
                    org_dir.rmdir()
            # Remove temp dir if empty
            if not any(TEMP_DIR.iterdir()):
                TEMP_DIR.rmdir()
        except Exception:
            # Ignore cleanup errors
            pass


@app.command()
def remove(
    models_file: Optional[Path] = typer.Option(
        None,
        "--file",
        "-f",
        help="Path to file containing model IDs to remove",
    ),
    model_id: Optional[str] = typer.Option(
        None,
        "--model",
        "-m",
        help="Single model ID to remove",
    ),
):
    """
    Remove models from the database.

    \b
    Removes models from models.json and deletes cached configs.

    \b
    Examples:
        # Remove from file
        modelsheet remove --file models_to_remove.txt

        # Remove single model
        modelsheet remove --model Qwen/Qwen2.5-0.5B
        modelsheet remove -m mistralai/Mistral-7B-v0.3

    \b
    What it does:
        1. Removes models from models.json
        2. Deletes cached config files
        3. Reports removal status

    \b
    Notes:
        - Models not in database are skipped
        - Cache directories are deleted if they exist
        - No confirmation prompt (be careful!)
    """
    # Get model IDs
    if models_file:
        model_ids = read_model_list(models_file)
        if not model_ids:
            console.print("[red]No valid model IDs found in file[/red]")
            raise typer.Exit(1)
    elif model_id:
        if not validate_model_id(model_id):
            console.print(f"[red]Invalid model ID format: {model_id}[/red]")
            raise typer.Exit(1)
        model_ids = [model_id]
    else:
        console.print("[red]Error: Must provide either --file or --model[/red]")
        raise typer.Exit(1)

    console.print(f"[bold]Removing {len(model_ids)} model(s)...[/bold]\n")

    # Load existing models
    if not OUTPUT_FILE.exists():
        console.print("[yellow]No database found. Nothing to remove.[/yellow]")
        return

    try:
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            models_data = json.load(f)
    except Exception as e:
        console.print(f"[red]Error reading database: {e}[/red]")
        raise typer.Exit(1)

    # Remove from JSON
    initial_count = len(models_data)
    models_data = [m for m in models_data if m['id'] not in model_ids]
    removed_count = initial_count - len(models_data)

    # Save updated JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(models_data, f, indent=2, ensure_ascii=False)

    # Remove cache directories
    cache_removed = 0
    for mid in model_ids:
        fetcher = ModelFetcher()
        model_dir = fetcher.get_model_dir(mid)
        if model_dir.exists():
            shutil.rmtree(model_dir)
            cache_removed += 1

    console.print(f"[bold green]Removed:[/bold green]")
    console.print(f"  From database: {removed_count} models")
    console.print(f"  From cache: {cache_removed} directories")
    console.print(f"  Remaining in database: {len(models_data)} models")


@app.command()
def list():
    """
    List all models in the database.

    \b
    Shows all models currently in models.json, one per line.

    \b
    Examples:
        # List all models
        modelsheet list

        # Count models
        modelsheet list | wc -l

        # Search for specific models
        modelsheet list | grep Qwen

    \b
    Output Format:
        org/model-name

    \b
    Notes:
        - Shows only models in database (models.json)
        - Output is plain text, one model ID per line
        - Use 'show' command to see model details
    """
    if not OUTPUT_FILE.exists():
        console.print("[yellow]No database found. Use 'add' to add models.[/yellow]")
        return

    try:
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            models_data = json.load(f)
    except Exception as e:
        console.print(f"[red]Error reading database: {e}[/red]")
        raise typer.Exit(1)

    if not models_data:
        console.print("[yellow]Database is empty.[/yellow]")
        return

    # Simple output: one model ID per line
    for model in models_data:
        print(model['id'])  # Use print instead of console.print for clean output


@app.command()
def show(
    model_id: str = typer.Argument(
        ...,
        help="Model ID in format: org/model (e.g., Qwen/Qwen2.5-7B-Instruct)",
    )
):
    """
    Show detailed information about a model.

    \b
    Displays model information from the database including:
        - Provider and architecture type
        - Parameter count and context length
        - Layer/head configuration
        - Position encoding method
        - MoE configuration (if applicable)

    \b
    Examples:
        # View Qwen model info
        modelsheet show Qwen/Qwen2.5-7B-Instruct

        # View Mixtral MoE info
        modelsheet show mistralai/Mixtral-8x7B-Instruct-v0.1

        # View any model
        modelsheet show deepseek-ai/DeepSeek-V3

    \b
    Notes:
        - Model must be in database (use 'add' first)
        - Shows 'Unknown' for missing fields
        - Includes HuggingFace URL for reference
    """
    if not validate_model_id(model_id):
        console.print(f"[red]Invalid model ID format: {model_id}[/red]")
        raise typer.Exit(1)

    if not OUTPUT_FILE.exists():
        console.print("[yellow]No database found. Use 'add' to add models.[/yellow]")
        raise typer.Exit(1)

    try:
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            models_data = json.load(f)
    except Exception as e:
        console.print(f"[red]Error reading database: {e}[/red]")
        raise typer.Exit(1)

    # Find model
    model_data = None
    for m in models_data:
        if m['id'] == model_id:
            model_data = m
            break

    if not model_data:
        console.print(f"[yellow]Model not found: {model_id}[/yellow]")
        console.print("Use 'modelsheet list' to see all models.")
        raise typer.Exit(1)

    # Display info
    console.print(f"\n[bold cyan]{model_data.get('name', 'Unknown')}[/bold cyan]")
    console.print(f"Provider: {model_data.get('provider', 'Unknown')}")
    console.print(f"URL: {model_data.get('huggingfaceUrl', 'Unknown')}")

    console.print(f"\n[bold]Architecture:[/bold]")
    console.print(f"  Type: {model_data.get('architecture', 'Unknown')}")

    # Helper function to format parameter counts (returns number and unit separately)
    def format_params(params):
        if params is None:
            return "Unknown", ""
        if params >= 1e12:
            return f"{params / 1e12:.1f}", "T"
        elif params >= 1e9:
            return f"{params / 1e9:.1f}", "B"
        elif params >= 1e6:
            return f"{params / 1e6:.1f}", "M"
        else:
            return str(params), ""

    # Display parameters (handle MoE vs dense models)
    total_params = model_data.get('totalParameters')
    active_params = model_data.get('activeParameters')

    if model_data.get('isMoe') and active_params and active_params != total_params:
        # MoE model with different active/total
        num, unit = format_params(total_params)
        console.print(f"  Total Parameters: {num} {unit}")
        num, unit = format_params(active_params)
        console.print(f"  Active Parameters: {num} {unit}")
    else:
        # Dense model or MoE where we only have one value
        num, unit = format_params(total_params)
        console.print(f"  Parameters: {num} {unit}")

    console.print(f"  Context Length: {model_data.get('contextLength', 'Unknown')}")
    console.print(f"  Layers: {model_data.get('numLayers', 'Unknown')}")
    console.print(f"  Attention Heads: {model_data.get('numHeads', 'Unknown')}")
    console.print(f"  Hidden Size: {model_data.get('hiddenSize', 'Unknown')}")
    console.print(f"  Position Encoding: {model_data.get('positionEncoding', 'Unknown')}")
    console.print(f"  Activation: {model_data.get('activation', 'Unknown')}")
    console.print(f"  Norm Type: {model_data.get('normType', 'Unknown')}")

    if model_data.get('normEps') is not None:
        console.print(f"  Norm Eps: {model_data['normEps']:.0e}")

    if model_data.get('attentionDropout') is not None:
        console.print(f"  Attention Dropout: {model_data['attentionDropout']}")

    if model_data.get('mlpFactor') is not None:
        console.print(f"  MLP Factor: {model_data['mlpFactor']}")

    if model_data.get('gqaRatio') is not None:
        console.print(f"  GQA Ratio: {model_data['gqaRatio']}")

    # MoE section
    if model_data.get('isMoe'):
        console.print(f"\n[bold]MoE:[/bold]")
        if model_data.get('numExperts') is not None:
            console.print(f"  Total Experts: {model_data['numExperts']}")
        if model_data.get('numSharedExperts') is not None:
            console.print(f"  Shared Experts: {model_data['numSharedExperts']}")
        if model_data.get('numExpertsPerToken') is not None:
            console.print(f"  Experts Per Token: {model_data['numExpertsPerToken']}")
        if model_data.get('numActivatedExperts') is not None:
            console.print(f"  Activated Experts: {model_data['numActivatedExperts']}")
        if model_data.get('moeIntermediateSize') is not None:
            console.print(f"  MoE Intermediate Size: {model_data['moeIntermediateSize']}")




@app.command()
def scan(
    source: Optional[str] = typer.Option(
        None,
        "--source",
        "-s",
        help="Source to scan: 'hf' (HuggingFace), 'ms' (ModelScope), or omit for both",
    ),
    org: Optional[List[str]] = typer.Option(
        None,
        "--org",
        "-o",
        help="Specific org(s) to scan. Repeatable: --org Qwen --org deepseek-ai. "
             "If omitted, scans all orgs in providers.json.",
    ),
    show_skipped: bool = typer.Option(
        False,
        "--show-skipped",
        help="Show filtered-out models (quant, ASR, TTS, embedding, etc.)",
    ),
    commit: bool = typer.Option(
        False,
        "--commit",
        "-c",
        help="Commit (save) the snapshot after scanning, so next run diffs from here",
    ),
    add_new: bool = typer.Option(
        False,
        "--add",
        "-a",
        help="Automatically run 'modelsheet add' on all discovered new models",
    ),
    timeout: int = typer.Option(
        60,
        "--timeout",
        "-t",
        help="Request timeout in seconds",
    ),
):
    """
    Scan HuggingFace / ModelScope orgs for new models.

    \b
    Fetches the current model list for all tracked orgs (from providers.json),
    diffs against the last saved snapshot and the local database, and reports
    new model candidates.

    \b
    Examples:
        # Scan all tracked orgs (HF + ModelScope)
        modelsheet scan

        # Scan HuggingFace only
        modelsheet scan --source hf

        # Scan a specific org on HuggingFace
        modelsheet scan --source hf --org Qwen

        # Scan and show what was filtered out
        modelsheet scan --show-skipped

        # Scan, print new models, then save snapshot
        modelsheet scan --commit

        # Scan and immediately add all new models
        modelsheet scan --commit --add

    \b
    Snapshot:
        The snapshot is stored in data/scan_snapshot.json.
        Only models absent from both the snapshot AND the local database
        are reported as "new".
        Use --commit to update the snapshot after reviewing.

    \b
    ModelScope support:
        Add a "scan" key to a provider in providers.json:
            "scan": { "hf": ["Qwen"], "ms": ["qwen-bot"] }
        Set MS_TOKEN env var for authenticated requests.
    """
    # Build orgs list
    if org:
        src = source or "hf"
        orgs_to_scan = [(src, o) for o in org]
    else:
        orgs_to_scan = get_scan_orgs_from_providers(source_filter=source)

    if not orgs_to_scan:
        console.print("[yellow]No orgs to scan. Check providers.json or --org flag.[/yellow]")
        raise typer.Exit(1)

    console.print(f"[bold]Scanning {len(orgs_to_scan)} org(s)...[/bold]\n")

    result = scan_orgs(
        orgs=orgs_to_scan,
        apply_filters=True,
        show_skipped=show_skipped,
    )

    new_models = result["new_models"]
    all_models = result["all_models"]
    skipped = result["skipped"]

    console.print(f"\n[bold]Scan summary:[/bold]")
    console.print(f"  Total fetched (after filter): {len(all_models)}")
    console.print(f"  Filtered out: {len(skipped)}")

    if new_models:
        console.print(f"\n[bold green]{len(new_models)} new model(s) found:[/bold green]")
        for m in new_models:
            src_label = f"[dim][{m.get('source', '?')}][/dim]"
            pt = f" [dim]({m['pipeline_tag']})[/dim]" if m.get("pipeline_tag") else ""
            console.print(f"  {src_label} {m['id']}{pt}")
    else:
        console.print("\n[green]No new models found.[/green]")

    if commit:
        save_snapshot(result["snapshot_updated"])
        console.print(f"\n[bold cyan]Snapshot saved.[/bold cyan]")

    if add_new and new_models:
        new_hf_ids = [m["id"] for m in new_models if m.get("source") == "hf"]
        if new_hf_ids:
            console.print(f"\n[bold cyan]Adding {len(new_hf_ids)} new HF model(s)...[/bold cyan]\n")
            with ModelFetcher(timeout=timeout) as fetcher:
                models_configs = fetcher.fetch_models(new_hf_ids)

            parser = ModelParser()
            new_parsed = parser.parse_models(models_configs)

            existing_models = []
            if OUTPUT_FILE.exists():
                try:
                    with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                        existing_models = json.load(f)
                except Exception as e:
                    console.print(f"[yellow]Warning: Could not load existing data: {e}[/yellow]")

            existing_ids = {m['id'] for m in existing_models}
            merged = existing_models.copy()
            added = 0
            exporter = ModelExporter()
            for pm in new_parsed:
                data = exporter._to_frontend_format(pm)
                if pm.id not in existing_ids:
                    merged.append(data)
                    added += 1

            OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                json.dump(merged, f, indent=2, ensure_ascii=False)

            console.print(f"\n[bold green]Added {added} new model(s) to database.[/bold green]")

        ms_only = [m["id"] for m in new_models if m.get("source") == "ms"]
        if ms_only:
            console.print(
                f"\n[yellow]{len(ms_only)} ModelScope-only model(s) — "
                "find their HuggingFace IDs and add manually:[/yellow]"
            )
            for mid in ms_only:
                console.print(f"  {mid}")


# ──────────────────────────────────────────────────────────────────────────────
# fetch subcommand group
# ──────────────────────────────────────────────────────────────────────────────

fetch_app = typer.Typer(
    name="fetch",
    help="""
    [bold]Scrape closed-model card pages[/bold] from OpenAI, Anthropic, and Google DeepMind.

    Uses a headless Chromium browser (via Playwright) to render JS pages and
    extract specs (context length, modalities, knowledge cutoff, etc.).

    \b
    Subcommands:
        fetch openai      — developers.openai.com model cards
        fetch anthropic   — anthropic.com system cards
        fetch google      — deepmind.google model cards

    \b
    Common flags (all subcommands):
        --add             Write new entries to data/models.json
        --dry-run         Print scraped JSON only; do not write anything
        --no-headless     Show the browser window (useful for debugging)

    \b
    Prerequisites:
        pip install playwright
        playwright install chromium
    """,
    no_args_is_help=True,
    rich_markup_mode="rich",
    pretty_exceptions_show_locals=False,
)

app.add_typer(fetch_app, name="fetch")


def _fetch_report(fetched: List[dict], added: List[str], skipped: List[str], dry_run: bool) -> None:
    """Print a compact summary after a fetch run."""
    if dry_run:
        console.print(json.dumps(fetched, indent=2, ensure_ascii=False))
        return
    if added:
        console.print(f"\n[bold green]Added {len(added)} new entries:[/bold green]")
        for mid in added:
            console.print(f"  + {mid}")
    if skipped:
        console.print(f"[dim]Skipped {len(skipped)} (already in DB)[/dim]")
    if not added and not skipped:
        console.print("[yellow]No entries to report.[/yellow]")


@fetch_app.command("openai")
def fetch_openai_cmd(
    slugs: Optional[List[str]] = typer.Argument(
        None,
        help=(
            "One or more OpenAI model slugs to fetch (e.g. gpt-4o o3-mini). "
            "Omit to scrape all language/reasoning models from the /all listing."
        ),
    ),
    add: bool = typer.Option(
        False,
        "--add",
        "-a",
        help="Write newly discovered entries to data/models.json.",
    ),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        "-n",
        help="Print scraped JSON to stdout; do not modify the database.",
    ),
    headless: bool = typer.Option(
        True,
        "--headless/--no-headless",
        help="Run browser headlessly (default) or with a visible window.",
    ),
):
    """
    Scrape OpenAI model card pages on developers.openai.com.

    \b
    Source:
        https://developers.openai.com/api/docs/models/all
        Individual cards: https://developers.openai.com/api/docs/models/<slug>

    \b
    What is extracted:
        - Context window and max output tokens
        - Knowledge cutoff date
        - Input/output modalities (text, image, audio, …)
        - Snapshot dates (earliest used as createdAt)
        - Architecture family (GPT / o-series) inferred from slug

    \b
    Examples:
        # Dry-run a single model
        modelsheet fetch openai gpt-4o --dry-run

        # Scrape all and show diff (no write)
        modelsheet fetch openai

        # Scrape all and add new ones to DB
        modelsheet fetch openai --add

        # Debug with visible browser
        modelsheet fetch openai o3 --no-headless --dry-run

    \b
    Non-language models (image, audio, TTS, embedding, etc.) are automatically
    skipped when fetching the full list.
    """
    from .oag_fetcher import fetch_openai, _merge_into_db, _load_existing_ids

    fetched = fetch_openai(slugs=slugs or None, headless=headless, verbose=not dry_run)

    if dry_run:
        console.print(json.dumps(fetched, indent=2, ensure_ascii=False))
        return

    existing = _load_existing_ids()
    new_entries = [m for m in fetched if m["id"] not in existing]
    console.print(f"\nFetched: {len(fetched)}  New: {len(new_entries)}  Already in DB: {len(fetched) - len(new_entries)}")

    if add:
        added, skipped = _merge_into_db(fetched, dry_run=False)
        _fetch_report(fetched, added, skipped, dry_run=False)
    else:
        if new_entries:
            console.print(f"\n[bold]New entries (use --add to write):[/bold]")
            for m in new_entries:
                console.print(f"  {m['id']}")


@fetch_app.command("anthropic")
def fetch_anthropic_cmd(
    slugs: Optional[List[str]] = typer.Argument(
        None,
        help=(
            "One or more Anthropic system-card URL suffixes "
            "(e.g. claude-sonnet-4-6-system-card). "
            "Omit to discover all cards from the index page."
        ),
    ),
    add: bool = typer.Option(
        False,
        "--add",
        "-a",
        help="Write newly discovered entries to data/models.json.",
    ),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        "-n",
        help="Print scraped JSON to stdout; do not modify the database.",
    ),
    headless: bool = typer.Option(
        True,
        "--headless/--no-headless",
        help="Run browser headlessly (default) or with a visible window.",
    ),
):
    """
    Scrape Anthropic model system card pages on anthropic.com.

    \b
    Source:
        Index: https://www.anthropic.com/system-cards
        Individual cards: https://www.anthropic.com/<slug>

    \b
    What is extracted:
        - Model name and published date
        - Context window (when stated in the card body)
        - Architecture family inferred from model name (Claude 3 / 4 / etc.)
        - Modalities default: text + image input, text output

    \b
    Examples:
        # Dry-run, discover all cards from index
        modelsheet fetch anthropic --dry-run

        # Scrape specific card
        modelsheet fetch anthropic claude-sonnet-4-6-system-card --dry-run

        # Discover and add new ones to DB
        modelsheet fetch anthropic --add

    \b
    Notes:
        Some older cards are PDF links — these are skipped automatically.
        The heuristic that infers model IDs from URLs may need manual
        correction for unusual naming patterns.
    """
    from .oag_fetcher import fetch_anthropic, _merge_into_db, _load_existing_ids

    fetched = fetch_anthropic(slugs=slugs or None, headless=headless, verbose=not dry_run)

    if dry_run:
        console.print(json.dumps(fetched, indent=2, ensure_ascii=False))
        return

    existing = _load_existing_ids()
    new_entries = [m for m in fetched if m["id"] not in existing]
    console.print(f"\nFetched: {len(fetched)}  New: {len(new_entries)}  Already in DB: {len(fetched) - len(new_entries)}")

    if add:
        added, skipped = _merge_into_db(fetched, dry_run=False)
        _fetch_report(fetched, added, skipped, dry_run=False)
    else:
        if new_entries:
            console.print(f"\n[bold]New entries (use --add to write):[/bold]")
            for m in new_entries:
                console.print(f"  {m['id']}")


@fetch_app.command("google")
def fetch_google_cmd(
    slugs: Optional[List[str]] = typer.Argument(
        None,
        help=(
            "One or more Google DeepMind model card URL suffixes "
            "(e.g. gemini-2-5-pro gemini-3-flash). "
            "Omit to discover all Gemini language cards from the index."
        ),
    ),
    add: bool = typer.Option(
        False,
        "--add",
        "-a",
        help="Write newly discovered entries to data/models.json.",
    ),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        "-n",
        help="Print scraped JSON to stdout; do not modify the database.",
    ),
    headless: bool = typer.Option(
        True,
        "--headless/--no-headless",
        help="Run browser headlessly (default) or with a visible window.",
    ),
):
    """
    Scrape Google DeepMind model card pages on deepmind.google.

    \b
    Source:
        Index: https://deepmind.google/models/model-cards/
        Individual cards: https://deepmind.google/models/model-cards/<slug>/

    \b
    What is extracted:
        - Model name, context window, knowledge cutoff
        - Published/release date
        - Input modalities (text/image/audio/video detected from card body)
        - Architecture family (Gemini 1/2/3) inferred from slug

    \b
    Examples:
        # Dry-run, auto-discover all Gemini language cards
        modelsheet fetch google --dry-run

        # Fetch specific models
        modelsheet fetch google gemini-2-5-pro gemini-3-flash --dry-run

        # Add new entries to DB
        modelsheet fetch google --add

    \b
    Notes:
        Veo, Lyria, Imagen, Gemma, and robotics cards are filtered out when
        scanning the index.  Gemma open-weight models are tracked via the
        standard HuggingFace pipeline (modelsheet add google/gemma-…).
    """
    from .oag_fetcher import fetch_google, _merge_into_db, _load_existing_ids

    fetched = fetch_google(slugs=slugs or None, headless=headless, verbose=not dry_run)

    if dry_run:
        console.print(json.dumps(fetched, indent=2, ensure_ascii=False))
        return

    existing = _load_existing_ids()
    new_entries = [m for m in fetched if m["id"] not in existing]
    console.print(f"\nFetched: {len(fetched)}  New: {len(new_entries)}  Already in DB: {len(fetched) - len(new_entries)}")

    if add:
        added, skipped = _merge_into_db(fetched, dry_run=False)
        _fetch_report(fetched, added, skipped, dry_run=False)
    else:
        if new_entries:
            console.print(f"\n[bold]New entries (use --add to write):[/bold]")
            for m in new_entries:
                console.print(f"  {m['id']}")


if __name__ == "__main__":
    app()
