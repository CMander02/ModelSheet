"""Base utilities for field extraction."""

from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class ConfigContext:
    """Context containing all config files for a model."""

    model_id: str
    config: dict  # config.json
    tokenizer_config: dict  # tokenizer_config.json
    generation_config: dict  # generation_config.json
    adapter_config: Optional[dict]  # adapter_config.json (None if not exists)
    metadata: dict  # HuggingFace API metadata

    @classmethod
    def from_configs(cls, model_id: str, configs: dict) -> "ConfigContext":
        """Create ConfigContext from raw configs dictionary."""
        return cls(
            model_id=model_id,
            config=configs.get("config.json", {}),
            tokenizer_config=configs.get("tokenizer_config.json", {}),
            generation_config=configs.get("generation_config.json", {}),
            adapter_config=configs.get("adapter_config.json"),
            metadata=configs.get("_metadata", {}),
        )


def get_first_of(config: dict, *keys: str, default: Any = None) -> Any:
    """Get the first available value from multiple possible keys.

    Args:
        config: Configuration dictionary to search
        *keys: Keys to try in order of priority
        default: Default value if no key is found

    Returns:
        The first found value, or default if none found

    Example:
        >>> get_first_of(config, "num_hidden_layers", "n_layer", "num_layers")
        28
    """
    for key in keys:
        if key in config and config[key] is not None:
            return config[key]
    return default
