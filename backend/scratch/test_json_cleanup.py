
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from services.gemma_service import _clean_json_response

def test_clean_json():
    # Case 1: Raw JSON
    raw = '{"key": "value"}'
    assert _clean_json_response(raw) == raw

    # Case 2: Markdown wrapped
    wrapped = '```json\n{"key": "value"}\n```'
    assert _clean_json_response(wrapped) == '{"key": "value"}'

    # Case 3: Markdown wrapped lowercase
    wrapped_lc = '```json\n{"key": "value"}\n```'
    assert _clean_json_response(wrapped_lc) == '{"key": "value"}'

    # Case 4: Generic code block
    generic = '```\n{"key": "value"}\n```'
    assert _clean_json_response(generic) == '{"key": "value"}'

    # Case 5: Extra whitespace
    extra = '  ```json  \n{"key": "value"}\n  ```  '
    assert _clean_json_response(extra) == '{"key": "value"}'

    print("✅ _clean_json_response tests passed!")

if __name__ == "__main__":
    test_clean_json()
