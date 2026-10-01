"""Reviewed decision-model families; keep task and backbone architecture separate."""

DECISION_FAMILIES = {
    "internlm": ("intern-decision-",),
    "shanghai_ai_laboratory": ("intern-decision-",),
    "convaiinnovations": ("laya", "laya-multilingual", "laya-typed-decisions"),
    "fastino": ("gliner2.5-decide", "gliner2.5-multi-decide"),
    "contrastive-lm": ("clm-v0.1-",),
}


def model_category(model_id: str) -> str:
    org, _, name = model_id.lower().partition("/")
    for family in DECISION_FAMILIES.get(org, ()):
        if name == family or (family.endswith("-") and name.startswith(family)) or name.startswith(family + "-"):
            return "decision"
    return "language"
