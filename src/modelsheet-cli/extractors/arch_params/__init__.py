"""Architecture-specific parameter calculators.

To add a new architecture:
1. Create a file <arch_name>.py with a class subclassing ArchParamCalculator
2. Register it in ARCH_PARAM_CALCULATORS below using the model_type string

Each calculator receives (cfg: dict, metadata: dict) and returns (total, active).
"""

from typing import Dict, Type
from .base import ArchParamCalculator
from .deepseek_v4 import DeepSeekV4Params
from .qwen3_5_moe import Qwen35MoeParams
from .nemotron_h import NemotronHParams
from .olmoe import OlmoeParams
from .opt import OptParams
from .internvl import InternVLParams

# model_type string → calculator class
ARCH_PARAM_CALCULATORS: Dict[str, Type[ArchParamCalculator]] = {
    "deepseek_v4": DeepSeekV4Params,
    "qwen3_5_moe": Qwen35MoeParams,
    "qwen3_5_moe_text": Qwen35MoeParams,
    "qwen3_next": Qwen35MoeParams,
    "nemotron_h": NemotronHParams,
    "olmoe": OlmoeParams,
    "opt": OptParams,
    "internvl_chat": InternVLParams,
    "internvl": InternVLParams,
}


def get_arch_calculator(model_type: str, cfg: dict, metadata: dict) -> ArchParamCalculator | None:
    """Return an instantiated calculator for the given model_type, or None."""
    cls = ARCH_PARAM_CALCULATORS.get(model_type)
    return cls(cfg, metadata) if cls else None
