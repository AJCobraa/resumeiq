"""
Model Registry — single source of truth for all AI models available in the platform.

Each entry maps a model_key to its display info, cost, and API identifier.
Used by service functions to:
  1. Look up the correct API model ID
  2. Construct the FIXED_COST operation name (base + suffix)
  3. Provide model info to the frontend for the ModelSelector component
"""
from core.constants import FIXED_COST


MODEL_REGISTRY: dict[str, dict] = {
    "gemma-4-31b": {
        "display_name": "Gemma 4 31B",
        "provider": "Google / Groq",
        "description": "Fast and efficient — ideal for quick analysis and roadmaps.",
        "coin_cost_ref": "Uses base operation cost",
        "api_model_id": "gemma-4-31b-it",
        "cost_operation_suffix": "",
        "is_default": True,
    },
    "gemini-lite": {
        "display_name": "Gemini 3.1 Flash Lite",
        "provider": "Google",
        "description": "Lightweight, speedy model for everyday analysis tasks.",
        "coin_cost_ref": "Uses _lite operation cost",
        "api_model_id": "gemini-3.1-flash-lite",
        "cost_operation_suffix": "_lite",
        "is_default": False,
    },
    "gemini-flash": {
        "display_name": "Gemini 3.5 Flash",
        "provider": "Google",
        "description": "Balanced power and reasoning — best for complex skill analysis.",
        "coin_cost_ref": "Uses _flash operation cost",
        "api_model_id": "gemini-3.5-flash",
        "cost_operation_suffix": "_flash",
        "is_default": False,
    },
}


def get_model(model_key: str) -> dict:
    """
    Return the model config dict for a given key.
    Raises ValueError if the key is unknown — callers should catch
    and convert to HTTP 400 as needed.
    """
    model = MODEL_REGISTRY.get(model_key)
    if model is None:
        raise ValueError(f"Unknown model key: {model_key}")
    return model


def get_operation_name(base_operation: str, model_key: str) -> str:
    """
    Construct the full FIXED_COST operation name by appending the model's suffix.

    Examples:
        get_operation_name("generate_roadmap", "gemma-4-31b")  → "generate_roadmap"
        get_operation_name("generate_roadmap", "gemini-flash")  → "generate_roadmap_flash"
    """
    model = get_model(model_key)
    return base_operation + model["cost_operation_suffix"]


def get_registry_for_frontend(base_operation: str) -> dict:
    """
    Build the model registry payload for the frontend ModelSelector.
    Resolves actual coin costs from FIXED_COST for the given base operation.
    """
    result = {}
    for key, model in MODEL_REGISTRY.items():
        op_name = base_operation + model["cost_operation_suffix"]
        result[key] = {
            "display_name": model["display_name"],
            "provider": model["provider"],
            "description": model["description"],
            "coin_cost": FIXED_COST.get(op_name, 0),
            "is_default": model["is_default"],
        }
    return result


# ── Voice Models (Live API / WebSocket only) ──────────────────────────
# These models are NEVER used for text generation.
# They require a WebSocket connection directly from the browser to Google's Live API.
# The backend only issues a short-lived token — it never proxies audio.
VOICE_MODELS: dict[str, dict] = {
    "gemini-audio": {
        "display_name": "Gemini 2.5 Flash Audio",
        "provider": "Google",
        "description": "Real-time voice interview using Gemini Live API native audio dialog.",
        "api_model_id": "gemini-2.5-flash-native-audio-dialog",
        "cost_operation": "voice_interview_token",
    },
    "gemini-live": {
        "display_name": "Gemini 2.0 Flash Live",
        "provider": "Google",
        "description": "High-context voice interview with 65K context window.",
        "api_model_id": "gemini-2.0-flash-live-001",
        "cost_operation": "voice_interview_token_live",
    },
}


def get_voice_model(voice_model_key: str) -> dict:
    """
    Return the voice model config. Raises ValueError for unknown keys.
    Callers should convert to HTTP 400.
    """
    model = VOICE_MODELS.get(voice_model_key)
    if model is None:
        raise ValueError(f"Unknown voice model key: {voice_model_key}")
    return model

