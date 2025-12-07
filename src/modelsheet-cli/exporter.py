"""Export parsed model data to JSON."""

import json
from datetime import datetime
from pathlib import Path

from rich.console import Console

from .config import OUTPUT_FILE
from .parser import ParsedModel

console = Console()


class ModelExporter:
    """Exports parsed model data to JSON."""

    def export(
        self,
        models: list[ParsedModel],
        output_path: Path = OUTPUT_FILE,
        pretty: bool = True,
    ) -> None:
        """Export models to JSON file.

        Args:
            models: List of ParsedModel instances
            output_path: Output file path
            pretty: If True, format with indentation
        """
        # Convert to frontend format
        data = [self._to_frontend_format(m) for m in models]

        # Ensure parent directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Write JSON
        indent = 2 if pretty else None
        output_path.write_text(
            json.dumps(data, indent=indent, ensure_ascii=False), encoding="utf-8"
        )

        # Report
        file_size = output_path.stat().st_size / 1024  # KB
        console.print(
            f"\n[bold green]Exported {len(models)} models to {output_path}[/bold green]"
        )
        console.print(f"File size: {file_size:.1f} KB")

    def _to_frontend_format(self, model: ParsedModel) -> dict:
        """Convert ParsedModel to frontend JSON format.

        Uses camelCase for field names to match TypeScript conventions.
        """
        data = {
            "id": model.id,
            "name": model.name,
            "provider": model.provider,
            "huggingfaceUrl": model.huggingface_url,
        }

        # Add optional fields only if they have values
        optional_fields = {
            "totalParameters": model.total_parameters,
            "activeParameters": model.active_parameters,
            "contextLength": model.context_length,
            "embeddingDim": model.embedding_dim,
            "vocabSize": model.vocab_size,
            "architecture": model.architecture,
            "numLayers": model.num_layers,
            "numHeads": model.num_heads,
            "numKvHeads": model.num_kv_heads,
            "hiddenSize": model.hidden_size,
            "intermediateSize": model.intermediate_size,
            "positionEncoding": model.position_encoding,
            "activation": model.activation,
            "normType": model.norm_type,
            "normEps": model.norm_eps,
            "attentionDropout": model.attention_dropout,
            "mlpFactor": model.mlp_factor,
            "gqaRatio": model.gqa_ratio,
            "numExperts": model.num_experts,
            "numExpertsPerToken": model.num_experts_per_token,
            "bosToken": model.bos_token,
            "eosToken": model.eos_token,
            "baseModel": model.base_model,
            # Metadata from HuggingFace API (only createdAt)
            "createdAt": model.created_at,
        }

        for key, value in optional_fields.items():
            if value is not None:
                data[key] = value

        # Always include boolean flags
        data["isMoe"] = model.is_moe
        data["hasChatTemplate"] = model.has_chat_template
        data["isAdapter"] = model.is_adapter

        # Note: updatedAt from HuggingFace API takes precedence
        # If not available from API, use current timestamp
        if "updatedAt" not in data:
            data["updatedAt"] = datetime.utcnow().isoformat() + "Z"

        return data
