import sys
from unittest.mock import MagicMock

# Mock dependencies that are not installed in the environment
sys.modules["google"] = MagicMock()
sys.modules["google.cloud"] = MagicMock()
sys.modules["google.cloud.firestore"] = MagicMock()
sys.modules["firebase_admin_init"] = MagicMock()
sys.modules["services.embedding_service"] = MagicMock()
sys.modules["services.gemma_service"] = MagicMock()

import pytest
from services.analysis_pipeline import _normalize_text

def test_normalize_text_normal():
    assert _normalize_text("Hello World") == "Hello World"

def test_normalize_text_multiple_spaces():
    assert _normalize_text("Hello    World") == "Hello World"

def test_normalize_text_tabs_and_newlines():
    assert _normalize_text("Hello\t\nWorld") == "Hello World"

def test_normalize_text_leading_trailing_whitespace():
    assert _normalize_text("  Hello World  ") == "Hello World"

def test_normalize_text_empty_string():
    assert _normalize_text("") == ""

def test_normalize_text_none():
    assert _normalize_text(None) == ""

def test_normalize_text_mixed_whitespace():
    assert _normalize_text("\n  Hello \t  \n World \r ") == "Hello World"
