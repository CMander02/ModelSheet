"""Command-line interface for ModelSheet."""

import json
import shutil
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.theme import Theme

from .config import OUTPUT_FILE, TEMP_DIR
from .exporter import ModelExporter
from .fetcher import ModelFetcher
from .parser import ModelParser
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
    ModelSheet CLI - LLM Model Configuration Tool

    Manage and query model configurations from HuggingFace.

    \b
    Quick Start:
        1. Add a single model: modelsheet add Qwen/Qwen2.5-7B
        2. Or add from file: modelsheet add --file models.txt
        3. Check: modelsheet list

    \b
    Common Commands:
        modelsheet add Qwen/Qwen2.5-7B       # Add single model
        modelsheet add --file models.txt      # Add models from file
        modelsheet show Qwen/Qwen2.5-7B      # View model details
        modelsheet list                       # List all models
        modelsheet remove --model <id>        # Remove a model

    \b
    Documentation:
        GitHub: https://github.com/your-username/ModelSheet
        Docs: See docs/ directory for detailed guides
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
    model_id: Optional[str] = typer.Argument(
        None,
        help="Model ID to add (format: org/model, e.g., Qwen/Qwen3-8B)",
    ),
    models_file: Optional[Path] = typer.Option(
        None,
        "--file",
        "-f",
        help="Path to file containing model IDs (.txt or .yaml)",
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
        # Add single model (default)
        modelsheet add Qwen/Qwen2.5-7B-Instruct
        modelsheet add mistralai/Mistral-7B-v0.3

        # Add from file
        modelsheet add --file models.txt
        modelsheet add -f models.yaml

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
    if models_file:
        model_ids = read_model_list(models_file)
        if not model_ids:
            console.print("[red]No valid model IDs found in file[/red]")
            raise typer.Exit(1)
    elif model_id:
        if not validate_model_id(model_id):
            console.print(f"[red]Invalid model ID format: {model_id}[/red]")
            console.print("Expected format: org/model (e.g., Qwen/Qwen2.5-7B)")
            raise typer.Exit(1)
        model_ids = [model_id]
    else:
        console.print("[red]Error: Must provide either --file or --model[/red]")
        raise typer.Exit(1)

    console.print(f"[bold]Adding {len(model_ids)} model(s)...[/bold]\n")

    # Step 1: Fetch
    console.print("[bold cyan]Step 1/3: Fetching configurations[/bold cyan]")
    with ModelFetcher(timeout=timeout) as fetcher:
        models_configs = fetcher.fetch_models(model_ids)

    # Step 2: Parse
    console.print("\n[bold cyan]Step 2/3: Parsing configurations[/bold cyan]")
    parser = ModelParser()
    new_models = parser.parse_models(models_configs)

    # Step 3: Update JSON
    console.print("\n[bold cyan]Step 3/3: Updating database[/bold cyan]")

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

    # Clean up cache
    console.print("\n[white]Cleaning up temporary cache...[/white]")
    if TEMP_DIR.exists():
        shutil.rmtree(TEMP_DIR)
        TEMP_DIR.mkdir(exist_ok=True)
        console.print("[green]Cache cleaned successfully.[/green]")


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
        - Tokenizer details
        - Type classification (base/adapter)

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

    params = model_data.get('totalParameters')
    if params:
        if params >= 1e12:
            params_str = f"{params / 1e12:.1f}T"
        elif params >= 1e9:
            params_str = f"{params / 1e9:.1f}B"
        elif params >= 1e6:
            params_str = f"{params / 1e6:.1f}M"
        else:
            params_str = str(params)
    else:
        params_str = "Unknown"
    console.print(f"  Parameters: {params_str}")

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

    console.print(f"  MoE: {'Yes' if model_data.get('isMoe') else 'No'}")

    if model_data.get('isMoe') and model_data.get('numExperts'):
        console.print(f"  Experts: {model_data['numExperts']}")

    console.print(f"\n[bold]Tokenizer:[/bold]")
    console.print(f"  Chat Template: {'Yes' if model_data.get('hasChatTemplate') else 'No'}")
    console.print(f"  BOS Token: {model_data.get('bosToken', 'N/A')}")
    console.print(f"  EOS Token: {model_data.get('eosToken', 'N/A')}")

    console.print(f"\n[bold]Type:[/bold]")
    console.print(f"  Adapter: {'Yes' if model_data.get('isAdapter') else 'No'}")
    if model_data.get('isAdapter'):
        console.print(f"  Base Model: {model_data.get('baseModel', 'Unknown')}")




if __name__ == "__main__":
    app()
