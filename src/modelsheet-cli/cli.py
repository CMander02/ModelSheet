"""ModelSheet CLI — LLM model configuration reference tool.

Commands:
  add        Add models from HuggingFace (open-weight models)
  remove     Remove models from the database
  list       List all models in the database
  show       Show detailed model information
  scan       Scan HuggingFace/ModelScope orgs for new model candidates

  fetch      Scrape closed-model card pages (OpenAI, Anthropic, Google)
  filter     Manage model name-based suffix/pattern filter rules (YAML)
  paper      Search arXiv / tech reports for model papers

  help       Show this message and exit.
"""

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
from .filters import (
    get_compiled_rules,
    load_rules_from_yaml,
    save_rules_to_yaml,
    clear_rules_cache,
    get_rules_path,
    skip_by_name,
)
from .scanner import (
    get_scan_orgs_from_providers,
    load_snapshot,
    save_snapshot,
    scan_orgs,
)
from .utils import read_model_list, validate_model_id

# Custom theme
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

    \\b
    [bold]Quick start (add open-weight models):[/bold]
        modelsheet add Qwen/Qwen2.5-7B
        modelsheet add --file models.txt
        modelsheet list
        modelsheet show Qwen/Qwen2.5-7B

    \\b
    [bold]Discover new models and filter them:[/bold]
        modelsheet scan                          # scan tracked HF orgs
        modelsheet filter list                   # view active filter rules
        modelsheet filter test org/new-model     # preview if a model would be filtered

    \\b
    [bold]Search for papers:[/bold]
        modelsheet paper arxiv "DeepSeek-V3"     # search arXiv for tech reports
        modelsheet paper update <model-id>       # update a single model's paper link

    \\b
    [bold]Closed-model scraping (requires playwright):[/bold]
        modelsheet fetch openai
        modelsheet fetch anthropic
        modelsheet fetch google

    \\b
    [bold]Subcommand groups:[/bold]
        add, remove, list, show, scan            # HuggingFace open models
        fetch openai / anthropic / google        # closed model card scraping
        filter list / add / remove / test        # manage YAML suffix filters
        paper arxiv / update                     # paper search & update
    """,
    no_args_is_help=True,
    rich_markup_mode="rich",
    pretty_exceptions_show_locals=False,
)

# Patch typer's rich console
try:
    import typer.rich_utils
    _original_get_rich_console = typer.rich_utils._get_rich_console

    def _get_custom_rich_console(**kwargs):
        return Console(theme=custom_theme, **kwargs)

    typer.rich_utils._get_rich_console = _get_custom_rich_console
except Exception:
    pass

console = Console(theme=custom_theme)


# ═════════════════════════════════════════════════════════════════════════════
#  add
# ═════════════════════════════════════════════════════════════════════════════

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
        help="Path to file containing model IDs (.txt or .yaml). One ID per line or YAML list.",
    ),
    update_all: bool = typer.Option(
        False,
        "--update-all",
        "-u",
        help="Re-fetch and update all existing models in the database.",
    ),
    timeout: int = typer.Option(
        60,
        "--timeout",
        "-t",
        help="Request timeout in seconds.",
    ),
):
    """
    Add models to the database from HuggingFace.

    Downloads config files from HuggingFace, parses them, and adds to
    [cyan]data/models.json[/cyan]. This is the main command for adding
    new open-weight models.

    \\b
    [bold]Examples:[/bold]
        # Add a single model
        modelsheet add Qwen/Qwen2.5-7B-Instruct

        # Add multiple models
        modelsheet add Qwen/Qwen2.5-7B mistralai/Mistral-7B-v0.3 google/gemma-2-9b

        # Add from a file
        modelsheet add --file models.txt
        modelsheet add -f models.yaml

        # Update all existing models (re-fetch configs)
        modelsheet add --update-all
        modelsheet add -u

        # With custom timeout
        modelsheet add Qwen/Qwen3-8B --timeout 120

    \\b
    [bold]What it does:[/bold]
        1. Downloads config files (config.json, tokenizer_config.json, etc.)
        2. Parses and extracts model parameters
        3. Updates [cyan]data/models.json[/cyan]
        4. Cleans up temporary cache

    \\b
    [bold]Notes:[/bold]
        - Existing models in the database are preserved and updated
        - Duplicate model IDs are updated with fresh data
        - Failed downloads are skipped with a warning
        - Cache is automatically cleaned after completion
    """
    # Get model IDs
    if update_all:
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

    existing_models = []
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                existing_models = existing_data
        except Exception as e:
            console.print(f"[yellow]Warning: Could not load existing data: {e}[/yellow]")

    existing_ids = {m['id'] for m in existing_models}
    merged_models = existing_models.copy()

    new_count = 0
    updated_count = 0

    exporter = ModelExporter()
    for new_model in new_models:
        new_data = exporter._to_frontend_format(new_model)
        if new_model.id in existing_ids:
            for i, m in enumerate(merged_models):
                if m['id'] == new_model.id:
                    merged_models[i] = new_data
                    updated_count += 1
                    break
        else:
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

    # Clean up empty temp directories
    if TEMP_DIR.exists():
        try:
            for org_dir in TEMP_DIR.iterdir():
                if org_dir.is_dir() and not any(org_dir.iterdir()):
                    org_dir.rmdir()
            if not any(TEMP_DIR.iterdir()):
                TEMP_DIR.rmdir()
        except Exception:
            pass


# ═════════════════════════════════════════════════════════════════════════════
#  remove
# ═════════════════════════════════════════════════════════════════════════════

@app.command()
def remove(
    models_file: Optional[Path] = typer.Option(
        None,
        "--file",
        "-f",
        help="Path to file containing model IDs to remove.",
    ),
    model_id: Optional[str] = typer.Option(
        None,
        "--model",
        "-m",
        help="Single model ID to remove (format: org/model).",
    ),
):
    """
    Remove models from the database.

    Removes models from [cyan]data/models.json[/cyan] and deletes cached
    config files from the temporary directory.

    \\b
    [bold]Examples:[/bold]
        # Remove a single model
        modelsheet remove --model Qwen/Qwen2.5-0.5B
        modelsheet remove -m mistralai/Mistral-7B-v0.3

        # Remove from file
        modelsheet remove --file models_to_remove.txt

    \\b
    [bold]Notes:[/bold]
        - Models not in the database are silently skipped
        - Cache directories are deleted if they exist
        - No confirmation prompt — double-check before removing
    """
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

    if not OUTPUT_FILE.exists():
        console.print("[yellow]No database found. Nothing to remove.[/yellow]")
        return

    try:
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            models_data = json.load(f)
    except Exception as e:
        console.print(f"[red]Error reading database: {e}[/red]")
        raise typer.Exit(1)

    initial_count = len(models_data)
    models_data = [m for m in models_data if m['id'] not in model_ids]
    removed_count = initial_count - len(models_data)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(models_data, f, indent=2, ensure_ascii=False)

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


# ═════════════════════════════════════════════════════════════════════════════
#  list
# ═════════════════════════════════════════════════════════════════════════════

@app.command()
def list_models():
    """
    List all models in the database.

    Shows every model currently stored in [cyan]data/models.json[/cyan],
    one per line. Useful for piping to grep or wc.

    \\b
    [bold]Examples:[/bold]
        # List all models
        modelsheet list

        # Count models
        modelsheet list | wc -l

        # Filter by provider
        modelsheet list | grep Qwen

        # Filter by architecture
        modelsheet list | grep granite

    \\b
    [bold]Notes:[/bold]
        - Output is plain text, one model ID per line
        - Use [cyan]show[/cyan] to see detailed information about a model
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

    for model in models_data:
        print(model['id'])


# ═════════════════════════════════════════════════════════════════════════════
#  show
# ═════════════════════════════════════════════════════════════════════════════

@app.command()
def show(
    model_id: str = typer.Argument(
        ...,
        help="Model ID in format: org/model (e.g., Qwen/Qwen2.5-7B-Instruct).",
    )
):
    """
    Show detailed information about a model.

    Displays model information from the database including provider,
    architecture, parameter counts, context length, layer configuration,
    position encoding, and MoE details when applicable.

    \\b
    [bold]Examples:[/bold]
        # View model details
        modelsheet show Qwen/Qwen2.5-7B-Instruct

        # View MoE model
        modelsheet show deepseek-ai/DeepSeek-V3

        # View dense model
        modelsheet show meta-llama/Llama-3.1-8B-Instruct

    \\b
    [bold]Output includes:[/bold]
        - Provider and HuggingFace URL
        - Architecture type
        - Total and active parameters
        - Context length
        - Layer / head / hidden size configuration
        - Position encoding method
        - MoE configuration (if applicable)
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

    model_data = None
    for m in models_data:
        if m['id'] == model_id:
            model_data = m
            break

    if not model_data:
        console.print(f"[yellow]Model not found: {model_id}[/yellow]")
        console.print("Use 'modelsheet list' to see all models.")
        raise typer.Exit(1)

    # Display
    console.print(f"\n[bold cyan]{model_data.get('name', 'Unknown')}[/bold cyan]")
    console.print(f"Provider: {model_data.get('provider', 'Unknown')}")
    console.print(f"URL: {model_data.get('huggingfaceUrl', 'Unknown')}")

    console.print(f"\n[bold]Architecture:[/bold]")
    console.print(f"  Type: {model_data.get('architecture', 'Unknown')}")

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

    total_params = model_data.get('totalParameters')
    active_params = model_data.get('activeParameters')

    if model_data.get('isMoe') and active_params and active_params != total_params:
        num, unit = format_params(total_params)
        console.print(f"  Total Parameters: {num} {unit}")
        num, unit = format_params(active_params)
        console.print(f"  Active Parameters: {num} {unit}")
    else:
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


# ═════════════════════════════════════════════════════════════════════════════
#  scan
# ═════════════════════════════════════════════════════════════════════════════

@app.command()
def scan(
    source: Optional[str] = typer.Option(
        None,
        "--source",
        "-s",
        help="Source to scan: 'hf' (HuggingFace), 'ms' (ModelScope), or omit for both.",
    ),
    org: Optional[List[str]] = typer.Option(
        None,
        "--org",
        "-o",
        help="Specific org(s) to scan (repeatable: --org Qwen --org deepseek-ai). "
             "If omitted, scans all orgs in providers.json.",
    ),
    show_skipped: bool = typer.Option(
        False,
        "--show-skipped",
        help="Show filtered-out models (quant, ASR, TTS, embedding, etc.).",
    ),
    commit: bool = typer.Option(
        False,
        "--commit",
        "-c",
        help="Save the scan snapshot, so next run diffs from this point.",
    ),
    add_new: bool = typer.Option(
        False,
        "--add",
        "-a",
        help="Automatically run 'modelsheet add' on all discovered new models.",
    ),
    timeout: int = typer.Option(
        60,
        "--timeout",
        "-t",
        help="Request timeout in seconds.",
    ),
):
    """
    Scan HuggingFace / ModelScope orgs for new models.

    Fetches the current model list for all tracked orgs (from [cyan]providers.json[/cyan]),
    diffs against the last saved snapshot and the local database, and reports
    new model candidates.

    \\b
    [bold]Examples:[/bold]
        # Scan all tracked orgs (HF + ModelScope)
        modelsheet scan

        # Scan HuggingFace only
        modelsheet scan --source hf

        # Scan a specific org
        modelsheet scan --source hf --org Qwen

        # Show filtered-out models
        modelsheet scan --show-skipped

        # Scan and save snapshot
        modelsheet scan --commit

        # Scan and immediately add all new models
        modelsheet scan --commit --add

    \\b
    [bold]Filtering:[/bold]
        Models are filtered using [cyan]data/filter-suffixes.yaml[/cyan].
        Use [cyan]modelsheet filter[/cyan] to view or modify filter rules.

    \\b
    [bold]Snapshot:[/bold]
        The snapshot is stored in [cyan]data/scan_snapshot.json[/cyan].
        Only models absent from both the snapshot AND the local database
        are reported as "new".
        Use [cyan]--commit[/cyan] to update the snapshot after reviewing.
    """
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
                except Exception:
                    pass

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


# ═════════════════════════════════════════════════════════════════════════════
#  filter subcommand group
# ═════════════════════════════════════════════════════════════════════════════

filter_app = typer.Typer(
    name="filter",
    help="""
    [bold]Manage model name-based filter rules[/bold].

    The filter rules control which models are excluded during [cyan]modelsheet scan[/cyan].
    Rules are stored in [cyan]data/filter-suffixes.yaml[/cyan] as regex patterns
    that match against model names (the part after "/" in org/model).

    \\b
    [bold]Subcommands:[/bold]
        list        — Show all active filter rules
        add         — Add a new filter pattern
        remove      — Remove a filter rule by index
        test        — Test if a model ID would be filtered

    \\b
    [bold]Example:[/bold]
        modelsheet filter list
        modelsheet filter add --pattern "\\\\b(small|medium)\\\\b" --reason "experimental size"
        modelsheet filter remove --index 3
        modelsheet filter test Qwen/Qwen3-8B
    """,
    no_args_is_help=True,
    rich_markup_mode="rich",
    pretty_exceptions_show_locals=False,
)

app.add_typer(filter_app, name="filter")


@filter_app.command("list")
def filter_list(
    verbose: bool = typer.Option(
        False,
        "--verbose",
        "-v",
        help="Also show built-in default rules that are not in the YAML file.",
    ),
):
    """
    Show all active filter rules.

    Displays the current set of name-based pattern filters loaded from
    [cyan]data/filter-suffixes.yaml[/cyan].

    \\b
    [bold]Examples:[/bold]
        # Show active rules only
        modelsheet filter list

        # Include built-in defaults in the output
        modelsheet filter list --verbose
    """
    from .filters import _DEFAULT_RULES

    rules = load_rules_from_yaml()
    yaml_path = get_rules_path()

    if not rules and not yaml_path.exists():
        console.print("[yellow]No filter rules found. Using built-in defaults.[/yellow]")
        rules = _DEFAULT_RULES

    console.print(f"\n[bold]Filter rules ({len(rules)} active):[/bold]")
    console.print(f"  Source: {yaml_path}\n")

    for i, rule in enumerate(rules):
        console.print(f"  [cyan]{i:>3}[/cyan]  [bold]{rule['pattern']}[/bold]")
        console.print(f"       └─ {rule['reason']}")

    if verbose:
        # Show what built-in rules exist but aren't in YAML
        yaml_patterns = {r["pattern"] for r in rules}
        builtin_only = [r for r in _DEFAULT_RULES if r["pattern"] not in yaml_patterns]
        if builtin_only:
            console.print(f"\n[dim]Built-in defaults not in YAML ({len(builtin_only)}):[/dim]")
            for rule in builtin_only:
                console.print(f"  [dim]- {rule['pattern']} → {rule['reason']}[/dim]")


@filter_app.command("add")
def filter_add(
    pattern: str = typer.Argument(
        ...,
        help="Regex pattern to match against model name (case-insensitive). "
             "Escape backslashes for shell: \\\\b(model)\\\\b",
    ),
    reason: str = typer.Argument(
        ...,
        help="Human-readable reason shown in --show-skipped output.",
    ),
):
    """
    Add a new filter rule.

    Appends a new pattern to [cyan]data/filter-suffixes.yaml[/cyan].
    The pattern is a regex that matches against the model name
    (the part after "/"), and is always case-insensitive.

    \\b
    [bold]Examples:[/bold]
        # Block models with "experimental" in name
        modelsheet filter add "\\\\bexperimental\\\\b" "experimental model"

        # Block a specific suffix
        modelsheet filter add "-legacy$" "legacy version"

        # Block translation models
        modelsheet filter add "\\\\btranslate\\\\b" "translation model"

    \\b
    [bold]Escaping notes:[/bold]
        In most shells, backslashes need escaping. Use quotes and double
        backslashes: "\\\\btag\\\\b" matches \\btag\\b.
    """
    rules = load_rules_from_yaml()
    rules.append({"pattern": pattern, "reason": reason})
    save_rules_to_yaml(rules)
    clear_rules_cache()
    console.print(f"[green]✓[/green] Added filter rule [cyan]{len(rules) - 1}[/cyan]:")
    console.print(f"    pattern: [bold]{pattern}[/bold]")
    console.print(f"    reason:  {reason}")


@filter_app.command("remove")
def filter_remove(
    index: int = typer.Argument(
        ...,
        help="Index of the rule to remove (see `modelsheet filter list` for indices).",
    ),
):
    """
    Remove a filter rule by index.

    Removes the rule at the given index from [cyan]data/filter-suffixes.yaml[/cyan].
    Use [cyan]modelsheet filter list[/cyan] to see rule indices.

    \\b
    [bold]Example:[/bold]
        # Remove rule at index 3
        modelsheet filter remove 3
    """
    rules = load_rules_from_yaml()
    if index < 0 or index >= len(rules):
        console.print(f"[red]Error: Index {index} out of range (0-{len(rules) - 1}).[/red]")
        raise typer.Exit(1)

    removed = rules.pop(index)
    save_rules_to_yaml(rules)
    clear_rules_cache()
    console.print(f"[green]✓[/green] Removed filter rule [cyan]{index}[/cyan]:")
    console.print(f"    pattern: [bold]{removed['pattern']}[/bold]")
    console.print(f"    reason:  {removed['reason']}")


@filter_app.command("test")
def filter_test(
    model_id: str = typer.Argument(
        ...,
        help="Full model ID to test (format: org/model). E.g., Qwen/Qwen3-8B-INT4",
    ),
):
    """
    Test if a model would be filtered by current rules.

    Checks the given model ID against all active filter patterns and reports
    whether it would be skipped or kept during [cyan]modelsheet scan[/cyan].

    \\b
    [bold]Examples:[/bold]
        # Test a quantized model
        modelsheet filter test Qwen/Qwen3-8B-INT4

        # Test a standard model
        modelsheet filter test meta-llama/Llama-3.1-8B

        # Test with explicit tags (requires huggingface card)
        modelsheet filter test inclusionAI/Ling-2.6-flash

    \\b
    [bold]Notes:[/bold]
        - Tests only name-based YAML patterns (not pipeline_tag or model_type)
        - For full filtering, use [cyan]modelsheet scan --show-skipped[/cyan]
    """
    if not validate_model_id(model_id):
        console.print(f"[red]Invalid model ID format: {model_id}[/red]")
        raise typer.Exit(1)

    name = model_id.split("/")[-1]
    reason = skip_by_name(name)

    console.print(f"\nTesting: [bold]{model_id}[/bold]")
    console.print(f"  Name part: [dim]{name}[/dim]\n")

    if reason:
        console.print(f"  [red]✗ FILTERED[/red] — {reason}")
    else:
        console.print(f"  [green]✓ PASSED[/green] — no matching filter rule")


# ═════════════════════════════════════════════════════════════════════════════
#  paper subcommand group
# ═════════════════════════════════════════════════════════════════════════════

paper_app = typer.Typer(
    name="paper",
    help="""
    [bold]Search for model papers on arXiv and update tech report links[/bold].

    Searches arXiv (primary) for technical reports and papers related to a
    model. When found, updates the model's [cyan]techReport[/cyan] and
    [cyan]arxivUrl[/cyan] fields in [cyan]data/models.json[/cyan].

    \\b
    [bold]Subcommands:[/bold]
        arxiv       — Search arXiv for a model name and display results
        update      — Update a single model's paper links in the database

    \\b
    [bold]Search chain:[/bold]
        1. arXiv API  (primary source — most reliable for AI papers)
        2. HF README  (extract paper links from HuggingFace card, fallback)

    \\b
    [bold]TechReport stability:[/bold]
        Company blog URLs change. arXiv links are stable. The goal is to
        always prefer arXiv links over company blog URLs for techReport.
        Use [cyan]modelsheet paper arxiv[/cyan] to find them.
    """,
    no_args_is_help=True,
    rich_markup_mode="rich",
    pretty_exceptions_show_locals=False,
)

app.add_typer(paper_app, name="paper")


# ═════════════════════════════════════════════════════════════════════════════
#  tag subcommand — manage model openness/metadata tags
# ═════════════════════════════════════════════════════════════════════════════

tag_app = typer.Typer(
    name="tag",
    help="""
    [bold]Manage model metadata tags[/bold] — set openness status, override fields.

    \\b
    [bold]Subcommands:[/bold]
        openness    — Set a model's openness status (closed / open-weight / open-source)
        list        — List all models with a given openness status

    \\b
    [bold]Openness definitions:[/bold]
        closed        — API only, no weights available (GPT-4o, Claude, Gemini API)
        open-weight   — Weights released, no training data/code (Llama, Qwen, DeepSeek)
        open-source   — Full OSAID 1.0: weights + code + data (OLMo, Pythia, BLOOM)

    \\b
    [bold]Examples:[/bold]
        modelsheet tag openness open-weight meta-llama/Llama-3.1-8B
        modelsheet tag openness closed openai/gpt-4o
        modelsheet tag openness open-source allenai/OLMo-7B
        modelsheet tag list open-source
    """,
    no_args_is_help=True,
    rich_markup_mode="rich",
    pretty_exceptions_show_locals=False,
)

app.add_typer(tag_app, name="tag")


@tag_app.command("openness")
def tag_openness(
    status: str = typer.Argument(
        ...,
        help="Openness status: closed, open-weight, or open-source.",
    ),
    model_ids: List[str] = typer.Argument(
        ...,
        help="One or more model IDs to tag (format: org/model).",
    ),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        "-n",
        help="Show what would change without writing.",
    ),
):
    """
    Set the openness status for one or more models.

    Updates the [cyan]openness[/cyan] field in [cyan]data/models.json[/cyan]
    to mark models as closed, open-weight, or fully open-source.

    \\b
    [bold]Examples:[/bold]
        # Mark a model as closed (API-only)
        modelsheet tag openness closed openai/gpt-4o

        # Mark as open-weight (default for HF models)
        modelsheet tag openness open-weight Qwen/Qwen3-8B

        # Mark as fully open-source (OSAID 1.0 compliant)
        modelsheet tag openness open-source allenai/OLMo-7B

        # Dry-run: see what would change
        modelsheet tag openness closed anthropic/claude-sonnet-4 --dry-run

    \\b
    [bold]Notes:[/bold]
        - Default for HuggingFace-added models is "open-weight"
        - Use [cyan]tag openness closed[/cyan] for API-only models
        - Use [cyan]tag openness open-source[/cyan] sparingly (very few qualify)
    """
    valid_statuses = {"closed", "open-weight", "open-source"}
    if status not in valid_statuses:
        console.print(f"[red]Invalid openness status: {status}[/red]")
        console.print(f"Valid: {', '.join(sorted(valid_statuses))}")
        raise typer.Exit(1)

    if not OUTPUT_FILE.exists():
        console.print("[red]No database found. Add models first.[/red]")
        raise typer.Exit(1)

    try:
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            models_data = json.load(f)
    except Exception as e:
        console.print(f"[red]Error reading database: {e}[/red]")
        raise typer.Exit(1)

    updated = 0
    not_found = []

    for mid in model_ids:
        found = False
        for m in models_data:
            if m['id'] == mid:
                old = m.get('openness', 'open-weight')
                m['openness'] = status
                if old != status:
                    updated += 1
                    console.print(f"  [dim]{old} →[/dim] [cyan]{status}[/cyan]  [bold]{mid}[/bold]")
                else:
                    console.print(f"  [dim](already {status})[/dim] {mid}")
                found = True
                break
        if not found:
            not_found.append(mid)

    if dry_run:
        console.print(f"\n[yellow]Dry-run: {updated} model(s) would be updated.[/yellow]")
        return

    if updated > 0:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(models_data, f, indent=2, ensure_ascii=False)
        console.print(f"\n[green]✓[/green] Updated {updated} model(s).")

    if not_found:
        console.print(f"\n[yellow]Not found ({len(not_found)}):[/yellow]")
        for mid in not_found:
            console.print(f"  - {mid}")


@tag_app.command("list")
def tag_list(
    status: str = typer.Argument(
        "open-source",
        help="Openness filter: closed, open-weight, or open-source.",
    ),
):
    """
    List all models with a given openness status.

    \\b
    [bold]Examples:[/bold]
        # List all fully open-source models
        modelsheet tag list open-source

        # List all closed models
        modelsheet tag list closed

        # Count open-weight models
        modelsheet tag list open-weight | wc -l
    """
    if not OUTPUT_FILE.exists():
        console.print("[yellow]No database found.[/yellow]")
        return

    try:
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            models_data = json.load(f)
    except Exception as e:
        console.print(f"[red]Error reading database: {e}[/red]")
        raise typer.Exit(1)

    matched = [m for m in models_data if m.get('openness', 'open-weight') == status]

    if not matched:
        console.print(f"[yellow]No models with openness = '{status}'.[/yellow]")
        return

    console.print(f"[bold]{len(matched)} model(s) with openness = '{status}':[/bold]\n")
    for m in matched:
        console.print(f"  {m['id']}")


@paper_app.command("arxiv")
def paper_arxiv(
    query: str = typer.Argument(
        ...,
        help="Search query for arXiv. Use model name like 'DeepSeek-R1' or 'Llama 4'.",
    ),
    max_results: int = typer.Option(
        5,
        "--max-results",
        "-n",
        help="Maximum number of arXiv results to fetch.",
    ),
):
    """
    Search arXiv for papers matching a model name.

    Queries the arXiv API directly (independent of HuggingFace READMEs)
    and displays matching papers with their arXiv IDs and titles.

    \\b
    [bold]Examples:[/bold]
        # Search by model name
        modelsheet paper arxiv "DeepSeek-R1"

        # Search with specific keywords
        modelsheet paper arxiv "granite 4.1 technical report"

        # Increase result count
        modelsheet paper arxiv "Llama 4" --max-results 10

    \\b
    [bold]Output:[/bold]
        - arXiv ID and URL
        - Paper title
        - Published date
        - Match confidence indicator
    """
    import urllib.parse
    import xml.etree.ElementTree as ET
    import httpx

    encoded = urllib.parse.quote(query)
    url = f"http://export.arxiv.org/api/query?search_query=all:{encoded}&start=0&max_results={max_results}"

    console.print(f"\n[bold]Searching arXiv for:[/bold] [cyan]{query}[/cyan]\n")

    try:
        with httpx.Client(timeout=30, follow_redirects=True) as client:
            resp = client.get(url)
            resp.raise_for_status()
            root = ET.fromstring(resp.text)
    except Exception as e:
        console.print(f"[red]Error querying arXiv: {e}[/red]")
        raise typer.Exit(1)

    ns = {"atom": "http://www.w3.org/2005/Atom",
          "arxiv": "http://arxiv.org/schemas/atom"}

    entries = root.findall("atom:entry", ns)

    if not entries:
        # Check if the response itself is an error entry
        console.print("[yellow]No results found on arXiv.[/yellow]")
        console.print("  Try a different query or check the model name.")
        return

    console.print(f"Found {len(entries)} result(s):\n")

    for entry in entries:
        eid = entry.find("atom:id", ns)
        title = entry.find("atom:title", ns)
        published = entry.find("atom:published", ns)
        summary = entry.find("atom:summary", ns)

        arxiv_id = eid.text.strip() if eid is not None else "?"
        arxiv_short = arxiv_id.split("/")[-1].split("v")[0] if "arxiv" in arxiv_id else arxiv_id
        arxiv_url = f"https://arxiv.org/abs/{arxiv_short}"

        console.print(f"  [cyan]{arxiv_short}[/cyan]")
        if title is not None and title.text:
            t = title.text.strip().replace("\n", " ")
            console.print(f"  Title: {t[:120]}{'...' if len(t) > 120 else ''}")
        if published is not None and published.text:
            console.print(f"  Date:  {published.text[:10]}")
        console.print(f"  URL:   {arxiv_url}")

        # Also show snippet if relevant
        if summary is not None and summary.text:
            s = summary.text.strip().replace("\n", " ")[:200]
            console.print(f"  [dim]{s}...[/dim]")

        console.print()

    # Offer to update a model
    console.print("[dim]To link a paper to a model, use:[/dim]")
    console.print(f"  [dim]modelsheet paper update <model-id> --arxiv <paper-id>[/dim]")


@paper_app.command("update")
def paper_update(
    model_id: str = typer.Argument(
        ...,
        help="Model ID to update (format: org/model).",
    ),
    arxiv_id: Optional[str] = typer.Option(
        None,
        "--arxiv",
        help="arXiv paper ID to link (e.g., 2401.12345).",
    ),
    tech_report: Optional[str] = typer.Option(
        None,
        "--tech-report",
        "--tr",
        help="Tech report URL (e.g., company blog post).",
    ),
    auto: bool = typer.Option(
        False,
        "--auto",
        "-a",
        help="Auto-discover paper from arXiv by model name (experimental).",
    ),
):
    """
    Update a model's paper/tech report links in the database.

    Sets or updates the [cyan]techReport[/cyan] and [cyan]arxivUrl[/cyan]
    fields for a model in [cyan]data/models.json[/cyan].

    \\b
    [bold]Examples:[/bold]
        # Link a known arXiv paper
        modelsheet paper update Qwen/Qwen3-8B --arxiv 2503.12345

        # Link a tech report blog post
        modelsheet paper update ibm-granite/granite-4.1-8b --tech-report https://huggingface.co/blog/ibm-granite/granite-4-1

        # Auto-discover from arXiv (experimental)
        modelsheet paper update deepseek-ai/DeepSeek-R1 --auto

        # Combine both
        modelsheet paper update Qwen/Qwen3-8B --arxiv 2503.12345 --tech-report https://qwenlm.github.io/blog/qwen3/

    \\b
    [bold]Paper search chain:[/bold]
        1. arXiv link (preferred — stable, persistent)
        2. Tech report (company blog, may change)
    """
    import httpx
    import xml.etree.ElementTree as ET

    if not validate_model_id(model_id):
        console.print(f"[red]Invalid model ID format: {model_id}[/red]")
        raise typer.Exit(1)

    if not OUTPUT_FILE.exists():
        console.print("[red]No database found. Add models first.[/red]")
        raise typer.Exit(1)

    # Load DB
    try:
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            models_data = json.load(f)
    except Exception as e:
        console.print(f"[red]Error reading database: {e}[/red]")
        raise typer.Exit(1)

    # Find model
    model_found = None
    for m in models_data:
        if m['id'] == model_id:
            model_found = m
            break

    if not model_found:
        console.print(f"[red]Model not found: {model_id}[/red]")
        raise typer.Exit(1)

    # Auto-discover from arXiv
    if auto and not arxiv_id:
        name = model_id.split("/")[-1]
        console.print(f"[dim]Auto-searching arXiv for '{name}'...[/dim]")
        import urllib.parse
        encoded = urllib.parse.quote(name)
        url = f"http://export.arxiv.org/api/query?search_query=all:{encoded}&start=0&max_results=3"
        try:
            with httpx.Client(timeout=15, follow_redirects=True) as client:
                resp = client.get(url)
                resp.raise_for_status()
                root = ET.fromstring(resp.text)
            ns = {"atom": "http://www.w3.org/2005/Atom"}
            entries = root.findall("atom:entry", ns)
            if entries:
                first = entries[0]
                eid = first.find("atom:id", ns)
                if eid is not None:
                    full_id = eid.text.strip()
                    arxiv_id = full_id.split("/")[-1].split("v")[0]
                    console.print(f"  [green]Found:[/green] https://arxiv.org/abs/{arxiv_id}")
            if not arxiv_id:
                console.print("[yellow]No arXiv paper auto-discovered.[/yellow]")
        except Exception as e:
            console.print(f"[yellow]arXiv search failed: {e}[/yellow]")

    if not arxiv_id and not tech_report:
        console.print("[red]Must provide --arxiv, --tech-report, or --auto[/red]")
        raise typer.Exit(1)

    # Update fields
    updated_fields = []

    if arxiv_id:
        clean_id = arxiv_id.replace("https://arxiv.org/abs/", "").split("v")[0]
        arxiv_url = f"https://arxiv.org/abs/{clean_id}"
        model_found["arxivUrl"] = arxiv_url
        updated_fields.append(f"arxivUrl={arxiv_url}")
        # Also set techReport to arxiv if currently empty
        if not model_found.get("techReport"):
            model_found["techReport"] = arxiv_url
            updated_fields.append(f"techReport={arxiv_url}")

    if tech_report:
        model_found["techReport"] = tech_report
        updated_fields.append(f"techReport={tech_report}")

    # Save
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(models_data, f, indent=2, ensure_ascii=False)

    console.print(f"\n[green]✓[/green] Updated [bold]{model_id}[/bold]:")
    for field in updated_fields:
        console.print(f"    {field}")


# ═════════════════════════════════════════════════════════════════════════════
#  fetch subcommand group
# ═════════════════════════════════════════════════════════════════════════════

fetch_app = typer.Typer(
    name="fetch",
    help="""
    [bold]Scrape closed-model card pages[/bold] from OpenAI, Anthropic, and Google DeepMind.

    Uses a headless Chromium browser (via Playwright) to render JS pages and
    extract specs (context length, modalities, knowledge cutoff, etc.).

    \\b
    [bold]Subcommands:[/bold]
        fetch openai      — developers.openai.com model cards
        fetch anthropic   — anthropic.com system cards
        fetch google      — deepmind.google model cards

    \\b
    [bold]Common flags:[/bold]
        --add, -a         Write new entries to data/models.json
        --dry-run, -n     Print scraped JSON only; do not write
        --no-headless     Show the browser window (debugging)

    \\b
    [bold]Prerequisites:[/bold]
        pip install playwright
        playwright install chromium
    """,
    no_args_is_help=True,
    rich_markup_mode="rich",
    pretty_exceptions_show_locals=False,
)

app.add_typer(fetch_app, name="fetch")


def _fetch_report(fetched: list[dict], added: list[str], skipped: list[str], dry_run: bool) -> None:
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

    Source: https://developers.openai.com/api/docs/models/all
    Individual cards: https://developers.openai.com/api/docs/models/<slug>

    \\b
    [bold]What is extracted:[/bold]
        - Context window and max output tokens
        - Knowledge cutoff date
        - Input/output modalities (text, image, audio, …)
        - Snapshot dates (earliest used as createdAt)
        - Architecture family (GPT / o-series) inferred from slug

    \\b
    [bold]Examples:[/bold]
        # Dry-run a single model
        modelsheet fetch openai gpt-4o --dry-run

        # Scrape all and show diff (no write)
        modelsheet fetch openai

        # Scrape all and add new ones to DB
        modelsheet fetch openai --add

        # Debug with visible browser
        modelsheet fetch openai o3 --no-headless --dry-run

    \\b
    [bold]Notes:[/bold]
        Non-language models (image, audio, TTS, embedding, etc.) are
        automatically filtered out when fetching the full list.
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

    Source: https://www.anthropic.com/system-cards
    Individual cards: https://www.anthropic.com/<slug>

    \\b
    [bold]What is extracted:[/bold]
        - Model name and published date
        - Context window (when stated in the card body)
        - Architecture family (Claude 3 / 4 / etc.)
        - Modalities default: text + image input, text output

    \\b
    [bold]Examples:[/bold]
        # Dry-run, discover all cards from index
        modelsheet fetch anthropic --dry-run

        # Scrape specific card
        modelsheet fetch anthropic claude-sonnet-4-6-system-card --dry-run

        # Discover and add new ones to DB
        modelsheet fetch anthropic --add

    \\b
    [bold]Notes:[/bold]
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

    Source: https://deepmind.google/models/model-cards/
    Individual cards: https://deepmind.google/models/model-cards/<slug>/

    \\b
    [bold]What is extracted:[/bold]
        - Model name, context window, knowledge cutoff
        - Published/release date
        - Input modalities (text/image/audio/video detected from card body)
        - Architecture family (Gemini 1/2/3) inferred from slug

    \\b
    [bold]Examples:[/bold]
        # Dry-run, auto-discover all Gemini language cards
        modelsheet fetch google --dry-run

        # Fetch specific models
        modelsheet fetch google gemini-2-5-pro gemini-3-flash --dry-run

        # Add new entries to DB
        modelsheet fetch google --add

    \\b
    [bold]Notes:[/bold]
        Veo, Lyria, Imagen, Gemma, and robotics cards are filtered out when
        scanning the index. Gemma open-weight models are tracked via the
        standard HuggingFace pipeline ([cyan]modelsheet add google/gemma-…[/cyan]).
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
