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

        return ParsedModel(
            # Identification
            id=model_id,
            name=self._extract_name(model_id),
            provider=self._extract_provider(model_id),
            # Basic specs
            total_parameters=self._calc_parameters(config),
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
            # MoE
            is_moe=self._is_moe(config),
            num_experts=config.get("num_local_experts") or config.get("num_experts"),
            num_experts_per_token=config.get("num_experts_per_tok"),
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

    def _calc_parameters(self, config: dict) -> Optional[int]:
        """Calculate total parameters.

        First tries to use explicit num_parameters field,
        then estimates from architecture parameters.
        """
        # Explicit parameter count
        if "num_parameters" in config:
            return config["num_parameters"]

        # Estimate from architecture
        h = config.get("hidden_size")
        l = config.get("num_hidden_layers")
        v = config.get("vocab_size")
        i = config.get("intermediate_size")

        if all([h, l, v, i]):
            # Simplified estimation: embedding + attention + ffn
            embedding = v * h
            attention = l * (4 * h * h)  # Q, K, V, O projections
            ffn = l * (2 * h * i)  # up and down projections
            return embedding + attention + ffn

        return None

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
            or "moe" in config.get("model_type", "").lower()
        )

    def _get_token(self, config: dict, key: str) -> Optional[str]:
        """Get token value, handling both string and dict formats."""
        token = config.get(key)
        if isinstance(token, dict):
            return token.get("content")
        return token

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
