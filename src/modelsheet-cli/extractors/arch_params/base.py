"""Base class for architecture-specific parameter calculators."""

from abc import ABC, abstractmethod
from typing import Optional, Tuple


class ArchParamCalculator(ABC):
    """Base class for architecture-specific parameter calculators.

    Subclass this for each model_type that needs custom parameter math.
    Register the subclass in __init__.py's ARCH_PARAM_CALCULATORS dict.

    Convention:
        - total:  all stored parameters (determines model file size)
        - active: parameters used per single forward pass / token
    """

    def __init__(self, cfg: dict, metadata: dict):
        self.cfg = cfg
        self.metadata = metadata

    @abstractmethod
    def calc(self) -> Tuple[Optional[int], Optional[int]]:
        """Return (total_parameters, active_parameters)."""
        ...

    # ── Shared helpers ─────────────────────────────────────────────────────

    def h(self) -> int:
        return self.cfg.get("hidden_size", 0)

    def L(self) -> int:
        return self.cfg.get("num_hidden_layers", 0)

    def vocab(self) -> int:
        return self.cfg.get("vocab_size", 0)

    def embedding(self) -> int:
        return self.vocab() * self.h()
