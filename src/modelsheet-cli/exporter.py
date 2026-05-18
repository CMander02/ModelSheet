"""Export parsed model data to JSON."""

import json
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
            "techReport": model.tech_report,
        }

        # Add optional fields only if they have values
        optional_fields = {
            # URLs
            "modelscopeUrl": model.modelscope_url,
            "arxivUrl": model.arxiv_url,
            # Basic specs
            "totalParameters": model.total_parameters,
            "activeParameters": model.active_parameters,
            "embeddingParameters": model.embedding_parameters,
            "nonEmbeddingParameters": model.non_embedding_parameters,
            "contextLength": model.context_length,
            "embeddingDim": model.embedding_dim,
            "vocabSize": model.vocab_size,
            # Architecture
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
            "torchDtype": model.torch_dtype,
            # MoE fields
            "numExperts": model.num_experts,
            "numSharedExperts": model.num_shared_experts,
            "numExpertsPerToken": model.num_experts_per_token,
            "numActivatedExperts": model.num_activated_experts,
            "moeIntermediateSize": model.moe_intermediate_size,
            # Modalities
            "inputModalities": model.input_modalities,
            "outputModalities": model.output_modalities,
            # Pipeline tag (task display name only — raw pipelineTag is internal)
            "task": model.task,
            # Metadata
            "createdAt": model.created_at,
            # Openness
            "openness": model.openness,
        }

        for key, value in optional_fields.items():
            if value is not None:
                data[key] = value

        # Always include isMoe flag
        data["isMoe"] = model.is_moe

        return data
