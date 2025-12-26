"""Base utilities for field extraction."""

from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class ConfigContext:
    """Context containing all config files for a model."""

    model_id: str
    config: dict  # config.json (flattened for VLM models)
    tokenizer_config: dict  # tokenizer_config.json
    generation_config: dict  # generation_config.json
    adapter_config: Optional[dict]  # adapter_config.json (None if not exists)
    metadata: dict  # HuggingFace API metadata
    raw_config: dict  # Original config.json (unflattened)

    @classmethod
    def from_configs(cls, model_id: str, configs: dict) -> "ConfigContext":
        """Create ConfigContext from raw configs dictionary.

        For VLM models with nested text_config, the text_config fields are
        "promoted" to root level (without overwriting existing root fields).
        This allows existing extractors to work without modification.
        """
        raw_config = configs.get("config.json", {})
        config = cls._flatten_vlm_config(raw_config)

        return cls(
            model_id=model_id,
            config=config,
            tokenizer_config=configs.get("tokenizer_config.json", {}),
            generation_config=configs.get("generation_config.json", {}),
            adapter_config=configs.get("adapter_config.json"),
            metadata=configs.get("_metadata", {}),
            raw_config=raw_config,
        )

    @staticmethod
    def _flatten_vlm_config(config: dict) -> dict:
        """Flatten VLM config by promoting text_config fields to root level.

        VLM models (like Qwen3-VL, LLaVA, etc.) have their LLM config nested
        under text_config or llm_config. This method promotes those fields
        to the root level so extractors can find them.

        Handles various nesting patterns:
        - Direct: config.text_config (Qwen3-VL, LLaVA)
        - Nested: config.thinker_config.text_config (Qwen2.5-Omni)

        Args:
            config: Original config.json dictionary

        Returns:
            Flattened config with text_config fields at root level
        """
        # Keys that may contain the text/LLM config directly
        text_config_keys = ["text_config", "llm_config", "language_config"]
        # Keys that may contain a nested text_config (Omni models)
        parent_config_keys = ["thinker_config", "encoder_config"]

        nested_config = None

        # First try direct text_config at root level
        for key in text_config_keys:
            if key in config and isinstance(config[key], dict):
                nested_config = config[key]
                break

        # If not found, try nested within parent config (e.g., thinker_config.text_config)
        if nested_config is None:
            for parent_key in parent_config_keys:
                parent = config.get(parent_key)
                if isinstance(parent, dict):
                    for key in text_config_keys:
                        if key in parent and isinstance(parent[key], dict):
                            nested_config = parent[key]
                            break
                    if nested_config:
                        break

        if nested_config is None:
            return config

        # Create new config with nested fields promoted to root
        # Root-level fields take priority (don't overwrite)
        flattened = dict(nested_config)  # Start with nested config
        flattened.update(config)  # Root fields overwrite nested ones

        return flattened


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
