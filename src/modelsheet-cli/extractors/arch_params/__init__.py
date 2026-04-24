"""Architecture-specific parameter calculators.

To add a new architecture:
1. Create a file <arch_name>.py with a class subclassing ArchParamCalculator
2. Register it in ARCH_PARAM_CALCULATORS below using the model_type string

Each calculator receives (cfg: dict, metadata: dict) and returns (total, active).
"""

from typing import Dict, Type
from .base import ArchParamCalculator
from .deepseek_v4 import DeepSeekV4Params

# model_type string → calculator class
ARCH_PARAM_CALCULATORS: Dict[str, Type[ArchParamCalculator]] = {
    "deepseek_v4": DeepSeekV4Params,
}


def get_arch_calculator(model_type: str, cfg: dict, metadata: dict) -> ArchParamCalculator | None:
    """Return an instantiated calculator for the given model_type, or None."""
    cls = ARCH_PARAM_CALCULATORS.get(model_type)
    return cls(cfg, metadata) if cls else None
