"""Parse model configuration files to extract structured data."""

from dataclasses import dataclass, asdict
from typing import Optional

from rich.console import Console

console = Console()


@dataclass
class ParsedModel:
    """Structured model information extracted from configs."""

    # Identification
    id: str
    name: str
    provider: str

    # Basic specs
    total_parameters: Optional[int] = None
    active_parameters: Optional[int] = None  # For MoE: parameters used per token
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

    # MoE
    is_moe: bool = False
    num_experts: Optional[int] = None
    num_experts_per_token: Optional[int] = None

    # Tokenizer
    has_chat_template: bool = False
    bos_token: Optional[str] = None
    eos_token: Optional[str] = None

    # Type flags
    is_adapter: bool = False
    base_model: Optional[str] = None

    # Metadata
    huggingface_url: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary, excluding None values."""
        return {k: v for k, v in asdict(self).items() if v is not None}


class ModelParser:
    """Parses model configuration files."""

    PROVIDER_MAP = {
        "meta-llama": "Meta",
        "Qwen": "Alibaba",
        "mistralai": "Mistral AI",
        "google": "Google",
        "microsoft": "Microsoft",
        "01-ai": "01.AI",
        "deepseek-ai": "DeepSeek",
        "THUDM": "Tsinghua",
        "internlm": "Shanghai AI Lab",
        "baichuan-inc": "Baichuan",
    }

    def parse(self, model_id: str, configs: dict) -> ParsedModel:
        """Parse model configurations.

        Args:
            model_id: Model ID in format "org/model"
            configs: Dictionary of configuration files

        Returns:
            ParsedModel instance
        """
        config = configs.get("config.json", {})
        tokenizer_config = configs.get("tokenizer_config.json", {})
        generation_config = configs.get("generation_config.json", {})
        adapter_config = configs.get("adapter_config.json")

        # Calculate parameters (handles MoE specially)
        total_params, active_params = self._calc_parameters(config)

        return ParsedModel(
            # Identification
            id=model_id,
            name=self._extract_name(model_id),
            provider=self._extract_provider(model_id),
            # Basic specs
            total_parameters=total_params,
            active_parameters=active_params,
            context_length=self._get_context_length(config),
            embedding_dim=config.get("hidden_size"),
            vocab_size=config.get("vocab_size"),
            # Architecture
            architecture=config.get("model_type"),
            num_layers=config.get("num_hidden_layers"),
            num_heads=config.get("num_attention_heads"),
            num_kv_heads=config.get("num_key_value_heads"),
            hidden_size=config.get("hidden_size"),
            intermediate_size=config.get("intermediate_size"),
            position_encoding=self._detect_position_encoding(config),
            activation=config.get("hidden_act"),
            norm_type=self._detect_norm_type(config),
            norm_eps=self._get_norm_eps(config),
            attention_dropout=config.get("attention_dropout"),
            mlp_factor=self._calc_mlp_factor(config),
            gqa_ratio=self._calc_gqa_ratio(config),
            # MoE
            is_moe=self._is_moe(config),
            num_experts=config.get("n_routed_experts") or config.get("num_local_experts") or config.get("num_experts"),
            num_experts_per_token=config.get("num_experts_per_tok") or config.get("num_experts_per_token"),
            # Tokenizer
            has_chat_template="chat_template" in tokenizer_config,
            bos_token=self._get_token(tokenizer_config, "bos_token"),
            eos_token=self._get_token(tokenizer_config, "eos_token"),
            # Type flags
            is_adapter=adapter_config is not None,
            base_model=adapter_config.get("base_model_name_or_path") if adapter_config else None,
            # Metadata
            huggingface_url=f"https://huggingface.co/{model_id}",
        )

    def _extract_name(self, model_id: str) -> str:
        """Extract display name from model ID."""
        return model_id.split("/")[-1]

    def _extract_provider(self, model_id: str) -> str:
        """Extract provider from model ID."""
        org = model_id.split("/")[0]
        return self.PROVIDER_MAP.get(org, org)

    def _calc_parameters(self, config: dict) -> tuple[Optional[int], Optional[int]]:
        """Calculate total and active parameters.

        For MoE models, calculates both total (all experts) and active (per token).
        For dense models, both values are the same.

        Returns:
            Tuple of (total_parameters, active_parameters)
        """
        # Explicit parameter count
        if "num_parameters" in config:
            total = config["num_parameters"]
            # For non-MoE, active = total
            if not self._is_moe(config):
                return total, total
            # For MoE, try to calculate active
            active = self._calc_moe_active_params(config, total)
            return total, active

        # Estimate from architecture
        h = config.get("hidden_size")
        l = config.get("num_hidden_layers")
        v = config.get("vocab_size")

        if not all([h, l, v]):
            return None, None

        # Embedding layer (shared)
        embedding = v * h

        # Attention (same for all models)
        attention_per_layer = 4 * h * h  # Q, K, V, O projections

        # Check if MoE
        is_moe = self._is_moe(config)

        if is_moe:
            # MoE model: calculate with expert layers
            total, active = self._calc_moe_params(config, embedding, attention_per_layer, h, l)
            return total, active
        else:
            # Dense model: standard calculation
            i = config.get("intermediate_size")
            if not i:
                return None, None

            attention = l * attention_per_layer
            ffn = l * (2 * h * i)  # up and down projections
            total = embedding + attention + ffn
            return total, total

    def _calc_moe_params(self, config: dict, embedding: int, attention_per_layer: int,
                         hidden_size: int, num_layers: int) -> tuple[Optional[int], Optional[int]]:
        """Calculate parameters for MoE models.

        Returns:
            Tuple of (total_parameters, active_parameters)
        """
        # Get MoE-specific parameters
        n_routed_experts = config.get("n_routed_experts") or config.get("num_local_experts") or config.get("num_experts")
        n_shared_experts = config.get("n_shared_experts", 0)
        num_experts_per_tok = config.get("num_experts_per_tok") or config.get("num_experts_per_token", 1)
        moe_intermediate_size = config.get("moe_intermediate_size") or config.get("intermediate_size")
        intermediate_size = config.get("intermediate_size")

        if not all([n_routed_experts, moe_intermediate_size]):
            return None, None

        # Check for dense layers at the beginning (DeepSeek models)
        first_k_dense_replace = config.get("first_k_dense_replace", 0)
        num_dense_layers = first_k_dense_replace
        num_moe_layers = num_layers - num_dense_layers

        # Attention layers (same for all layers)
        total_attention = num_layers * attention_per_layer

        # Dense FFN layers (if any)
        dense_ffn_params = 0
        if num_dense_layers > 0 and intermediate_size:
            # Dense layers use standard FFN: 2 * hidden * intermediate
            dense_ffn_params = num_dense_layers * 2 * hidden_size * intermediate_size

        # MoE FFN layers
        # Each routed expert has: gate_proj + up_proj + down_proj
        # gate_proj: hidden → moe_intermediate
        # up_proj: hidden → moe_intermediate
        # down_proj: moe_intermediate → hidden
        params_per_routed_expert = 3 * hidden_size * moe_intermediate_size
        params_per_shared_expert = 3 * hidden_size * moe_intermediate_size if n_shared_experts > 0 else 0

        # Total: all experts in all MoE layers
        total_routed_params = num_moe_layers * n_routed_experts * params_per_routed_expert
        total_shared_params = num_moe_layers * n_shared_experts * params_per_shared_expert

        # Active: only activated experts per token (in MoE layers) + all params in dense layers
        active_routed_params = num_moe_layers * num_experts_per_tok * params_per_routed_expert
        active_shared_params = total_shared_params  # Shared experts always active

        # Final totals
        total_params = embedding + total_attention + dense_ffn_params + total_routed_params + total_shared_params
        active_params = embedding + total_attention + dense_ffn_params + active_routed_params + active_shared_params

        return total_params, active_params

    def _calc_moe_active_params(self, config: dict, total_params: int) -> Optional[int]:
        """Estimate active parameters from total for MoE when we have explicit total.

        This is a rough estimation based on the ratio of activated experts.
        """
        n_routed_experts = config.get("n_routed_experts") or config.get("num_local_experts") or config.get("num_experts")
        num_experts_per_tok = config.get("num_experts_per_tok") or config.get("num_experts_per_token")

        if not all([n_routed_experts, num_experts_per_tok]):
            return None

        # Rough estimation: assume FFN dominates parameter count
        # active = total * (activated_experts / total_experts)
        ratio = num_experts_per_tok / n_routed_experts

        # This is a rough estimate - the actual calculation would need to know
        # what fraction of params are in the MoE layers vs other layers
        # For now, we assume ~70% of params are in MoE layers (typical for large MoE models)
        moe_fraction = 0.7
        non_moe_params = total_params * (1 - moe_fraction)
        moe_params_active = total_params * moe_fraction * ratio

        return int(non_moe_params + moe_params_active)

    def _get_context_length(self, config: dict) -> Optional[int]:
        """Get context length from various possible keys."""
        keys = [
            "max_position_embeddings",
            "n_positions",
            "max_sequence_length",
            "seq_length",
            "model_max_length",
        ]
        for key in keys:
            if key in config:
                return config[key]
        return None

    def _detect_position_encoding(self, config: dict) -> Optional[str]:
        """Detect position encoding type."""
        if config.get("rope_scaling") or config.get("rope_theta"):
            return "RoPE"
        if config.get("use_alibi"):
            return "ALiBi"
        if config.get("rotary_pct"):
            return "RoPE"
        return None

    def _is_moe(self, config: dict) -> bool:
        """Check if model uses MoE architecture."""
        return (
            config.get("num_local_experts", 0) > 1
            or config.get("num_experts", 0) > 1
            or config.get("n_routed_experts", 0) > 1
            or "moe" in config.get("model_type", "").lower()
        )

    def _get_token(self, config: dict, key: str) -> Optional[str]:
        """Get token value, handling both string and dict formats."""
        token = config.get(key)
        if isinstance(token, dict):
            return token.get("content")
        return token

    def _detect_norm_type(self, config: dict) -> Optional[str]:
        """Detect normalization type."""
        if "rms_norm_eps" in config:
            return "RMSNorm"
        if "layer_norm_eps" in config or "layer_norm_epsilon" in config:
            return "LayerNorm"
        # Infer from model type
        model_type = config.get("model_type", "").lower()
        if model_type in ["llama", "mistral", "mixtral", "qwen", "qwen2"]:
            return "RMSNorm"
        return None

    def _get_norm_eps(self, config: dict) -> Optional[float]:
        """Get normalization epsilon value."""
        return (
            config.get("rms_norm_eps")
            or config.get("layer_norm_eps")
            or config.get("layer_norm_epsilon")
        )

    def _calc_mlp_factor(self, config: dict) -> Optional[float]:
        """Calculate MLP expansion factor (intermediate_size / hidden_size)."""
        hidden_size = config.get("hidden_size")
        intermediate_size = config.get("intermediate_size")

        if hidden_size and intermediate_size and hidden_size > 0:
            return round(intermediate_size / hidden_size, 2)
        return None

    def _calc_gqa_ratio(self, config: dict) -> Optional[float]:
        """Calculate GQA ratio (num_attention_heads / num_key_value_heads)."""
        num_heads = config.get("num_attention_heads")
        num_kv_heads = config.get("num_key_value_heads")

        if num_heads and num_kv_heads and num_kv_heads > 0:
            return round(num_heads / num_kv_heads, 2)
        return None

    def parse_models(self, models_configs: dict[str, dict]) -> list[ParsedModel]:
        """Parse multiple models.

        Args:
            models_configs: Dictionary mapping model_id to configs

        Returns:
            List of ParsedModel instances
        """
        results = []

        console.print(f"\n[bold]Parsing {len(models_configs)} models...[/bold]\n")

        for i, (model_id, configs) in enumerate(models_configs.items(), 1):
            try:
                parsed = self.parse(model_id, configs)
                results.append(parsed)

                # Show summary
                params = parsed.total_parameters
                params_str = self._format_params(params) if params else "Unknown"
                ctx = parsed.context_length or "?"
                console.print(f"[{i}/{len(models_configs)}] {model_id}")
                console.print(f"  [green]OK[/green] {params_str} params, {ctx} ctx, {parsed.architecture or 'Unknown'}")

            except Exception as e:
                console.print(f"[{i}/{len(models_configs)}] {model_id}")
                console.print(f"  [red]FAILED[/red] Parse failed: {str(e)}")

        console.print(f"\n[bold green]Done![/bold green] {len(results)} models parsed successfully.")
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
