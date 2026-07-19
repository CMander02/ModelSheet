"""Parse model configuration files to extract structured data."""

import shutil
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

from rich.console import Console
from tqdm import tqdm

from .config import TEMP_DIR
from .filters import skip_reason
from .extractors import (
    ConfigContext,
    # Metadata
    extract_id,
    extract_name,
    extract_provider,
    extract_huggingface_url,
    extract_modelscope_url,
    extract_tech_report,
    extract_arxiv_url,
    extract_released_at,
    extract_pipeline_tag,
    extract_task,
    extract_input_modalities,
    extract_output_modalities,
    # Architecture
    extract_architecture,
    extract_vocab_size,
    extract_num_layers,
    extract_num_heads,
    extract_num_kv_heads,
    extract_hidden_size,
    extract_embedding_dim,
    extract_intermediate_size,
    extract_context_length,
    extract_activation,
    extract_norm_type,
    extract_norm_eps,
    extract_position_encoding,
    extract_attention_dropout,
    extract_mlp_factor,
    extract_gqa_ratio,
    extract_torch_dtype,
    # MoE
    extract_is_moe,
    extract_num_experts,
    extract_num_shared_experts,
    extract_num_experts_per_token,
    extract_num_activated_experts,
    extract_moe_intermediate_size,
    # Parameters
    extract_total_parameters,
    extract_active_parameters,
    extract_embedding_parameters,
    extract_non_embedding_parameters,
)

console = Console()


@dataclass
class ParsedModel:
    """Structured model information extracted from configs."""

    # Identification
    id: str
    name: str
    provider: str

    # URLs
    huggingface_url: Optional[str] = None
    modelscope_url: Optional[str] = None
    tech_report: str = ""
    arxiv_url: Optional[str] = None

    # Basic specs
    total_parameters: Optional[int] = None
    active_parameters: Optional[int] = None
    embedding_parameters: Optional[int] = None
    non_embedding_parameters: Optional[int] = None
    context_length: Optional[int] = None
    embedding_dim: Optional[int] = None
    vocab_size: Optional[int] = None

    # Architecture
    architecture: Optional[str] = None
    num_layers: Optional[int] = None
    num_heads: Optional[int] = None
    num_kv_heads: Optional[int] = None
    hidden_size: Optional[int] = None
    intermediate_size: Optional[int] = None
    position_encoding: Optional[str] = None
    activation: Optional[str] = None
    norm_type: Optional[str] = None
    norm_eps: Optional[float] = None
    attention_dropout: Optional[float] = None
    mlp_factor: Optional[float] = None
    gqa_ratio: Optional[float] = None
    torch_dtype: Optional[str] = None

    # MoE
    is_moe: bool = False
    num_experts: Optional[int] = None
    num_shared_experts: Optional[int] = None
    num_experts_per_token: Optional[int] = None
    num_activated_experts: Optional[int] = None
    moe_intermediate_size: Optional[int] = None

    # Modalities
    input_modalities: Optional[list[str]] = None
    output_modalities: Optional[list[str]] = None

    # Pipeline tag
    pipeline_tag: Optional[str] = None
    task: Optional[str] = None

    # Metadata
    released_at: Optional[str] = None
    openness: str = "open-weight"

    def to_dict(self) -> dict:
        """Convert to dictionary, excluding None values."""
        return {k: v for k, v in asdict(self).items() if v is not None}

    def is_valid(self) -> bool:
        """Check if model has minimum required fields.

        A valid model must have at least:
        - architecture
        - num_layers
        - hidden_size

        Models missing these core fields are considered invalid
        (likely failed to fetch config.json properly).
        """
        return all([
            self.architecture is not None,
            self.num_layers is not None,
            self.hidden_size is not None,
        ])


class ModelParser:
    """Parses model configuration files using modular extractors."""

    def parse(self, model_id: str, configs: dict) -> ParsedModel:
        """Parse model configurations.

        Args:
            model_id: Model ID in format "org/model"
            configs: Dictionary of configuration files (including _metadata)

        Returns:
            ParsedModel instance
        """
        ctx = ConfigContext.from_configs(model_id, configs)

        return ParsedModel(
            # Identification
            id=extract_id(ctx),
            name=extract_name(ctx),
            provider=extract_provider(ctx),
            # URLs
            huggingface_url=extract_huggingface_url(ctx),
            modelscope_url=extract_modelscope_url(ctx),
            tech_report=extract_tech_report(ctx),
            arxiv_url=extract_arxiv_url(ctx),
            # Basic specs
            total_parameters=extract_total_parameters(ctx),
            active_parameters=extract_active_parameters(ctx),
            embedding_parameters=extract_embedding_parameters(ctx),
            non_embedding_parameters=extract_non_embedding_parameters(ctx),
            context_length=extract_context_length(ctx),
            embedding_dim=extract_embedding_dim(ctx),
            vocab_size=extract_vocab_size(ctx),
            # Architecture
            architecture=extract_architecture(ctx),
            num_layers=extract_num_layers(ctx),
            num_heads=extract_num_heads(ctx),
            num_kv_heads=extract_num_kv_heads(ctx),
            hidden_size=extract_hidden_size(ctx),
            intermediate_size=extract_intermediate_size(ctx),
            position_encoding=extract_position_encoding(ctx),
            activation=extract_activation(ctx),
            norm_type=extract_norm_type(ctx),
            norm_eps=extract_norm_eps(ctx),
            attention_dropout=extract_attention_dropout(ctx),
            mlp_factor=extract_mlp_factor(ctx),
            gqa_ratio=extract_gqa_ratio(ctx),
            torch_dtype=extract_torch_dtype(ctx),
            # MoE
            is_moe=extract_is_moe(ctx),
            num_experts=extract_num_experts(ctx),
            num_shared_experts=extract_num_shared_experts(ctx),
            num_experts_per_token=extract_num_experts_per_token(ctx),
            num_activated_experts=extract_num_activated_experts(ctx),
            moe_intermediate_size=extract_moe_intermediate_size(ctx),
            # Modalities
            input_modalities=extract_input_modalities(ctx),
            output_modalities=extract_output_modalities(ctx),
            # Pipeline tag
            pipeline_tag=extract_pipeline_tag(ctx),
            task=extract_task(ctx),
            # Metadata
            released_at=extract_released_at(ctx),
        )

    def _get_model_dir(self, model_id: str) -> Path:
        """Get the temporary directory for a model.

        Args:
            model_id: Model ID in format "org/model"

        Returns:
            Path to model's temporary directory
        """
        parts = model_id.split("/")
        if len(parts) != 2:
            raise ValueError(f"Invalid model_id format: {model_id}")

        org, model_name = parts
        return TEMP_DIR / org / model_name

    def _cleanup_model_cache(self, model_id: str) -> None:
        """Delete temporary cache for a single model after parsing.

        Args:
            model_id: Model ID in format "org/model"
        """
        try:
            model_dir = self._get_model_dir(model_id)
            if model_dir.exists():
                shutil.rmtree(model_dir)
        except (ValueError, Exception):
            # Silently ignore cleanup errors (including invalid model_id format)
            pass

    def parse_models(self, models_configs: dict[str, dict]) -> list[ParsedModel]:
        """Parse multiple models.

        Args:
            models_configs: Dictionary mapping model_id to configs

        Returns:
            List of valid ParsedModel instances (invalid models are filtered out)

        Note:
            Automatically cleans up each model's temp cache after parsing.
        """
        results = []
        failed = []
        invalid = []
        gated = []  # Models requiring HF authentication (401)
        forbidden = []  # Models requiring access request (403)

        print()  # Add newline before progress bar
        with tqdm(total=len(models_configs), desc="Parsing models", unit="model") as pbar:
            for model_id, configs in models_configs.items():
                try:
                    # Check if model is gated or forbidden
                    config_json = configs.get("config.json", {})
                    error_type = config_json.get("_error")
                    if error_type == "gated":
                        gated.append(model_id)
                        pbar.update(1)
                        continue
                    if error_type == "forbidden":
                        forbidden.append(model_id)
                        pbar.update(1)
                        continue

                    # Apply model type filters (quant, ASR, TTS, embedding, etc.)
                    metadata = configs.get("_metadata", {})
                    reason = skip_reason(
                        model_id=model_id,
                        pipeline_tag=metadata.get("pipelineTag"),
                        tags=metadata.get("tags"),
                        model_type=config_json.get("model_type"),
                    )
                    if reason:
                        invalid.append(f"{model_id} (skipped: {reason})")
                        self._cleanup_model_cache(model_id)
                        pbar.update(1)
                        continue

                    parsed = self.parse(model_id, configs)
                    if parsed.is_valid():
                        results.append(parsed)
                    else:
                        invalid.append(model_id)
                except Exception as e:
                    failed.append((model_id, str(e)))
                    # Don't clean up failed models - keep cache for debugging
                    pbar.update(1)
                    continue

                # Clean up temp cache for successfully parsed or skipped models
                self._cleanup_model_cache(model_id)
                pbar.update(1)

        console.print(f"\n[bold green]Done![/bold green] {len(results)} models parsed successfully.")

        if gated:
            console.print(f"\n[yellow]Skipped {len(gated)} gated model(s) (requires HF_TOKEN):[/yellow]")
            for model_id in gated:
                console.print(f"  - {model_id}")
            console.print("[dim]  Set HF_TOKEN environment variable to access gated models[/dim]")

        if forbidden:
            console.print(f"\n[yellow]Skipped {len(forbidden)} model(s) (requires access request):[/yellow]")
            for model_id in forbidden:
                console.print(f"  - {model_id}")
            console.print("[dim]  Visit the model page on HuggingFace and request access[/dim]")

        if invalid:
            console.print(f"\n[yellow]Skipped {len(invalid)} model(s) with incomplete data:[/yellow]")
            for model_id in invalid:
                console.print(f"  - {model_id}")

        if failed:
            console.print(f"\n[red]Failed to parse {len(failed)} model(s):[/red]")
            for model_id, error in failed:
                console.print(f"  - {model_id}: {error}")

        return results

    def _format_params(self, num: int) -> str:
        """Format parameter count in human-readable form."""
        if num >= 1e12:
            return f"{num / 1e12:.1f}T"
        if num >= 1e9:
            return f"{num / 1e9:.1f}B"
        if num >= 1e6:
            return f"{num / 1e6:.1f}M"
        return str(num)
