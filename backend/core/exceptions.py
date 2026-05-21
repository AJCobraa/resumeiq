import re

class GemmaOverloadError(Exception):
    """Raised when the Google Gemini AI service returns a 503, 429, or specific transient error."""
    def __init__(self, message: str, status_code: int = 503, is_timeout: bool = False):
        self.message = message
        self.status_code = status_code
        self.is_timeout = is_timeout
        super().__init__(self.message)

def is_ai_transient_error(exc_or_text) -> tuple[bool, bool]:
    """
    Detects if an exception or error string represents a transient AI service issue.
    Returns (is_transient, is_timeout).
    
    Logic:
    - Timeout keywords or status_code 504: Transient Timeout (is_transient=True, is_timeout=True)
    - 429, 503 status: Definitive Transient Overload (is_transient=True, is_timeout=False)
    - 500 status (or no status):
      - Treat as transient overload ONLY if it matches an overload keyword (e.g., overloaded, quota, rate limit)
      - Treat as transient timeout ONLY if it matches a timeout keyword (e.g., deadline exceeded, timed out)
      - Otherwise, NOT transient.
    """
    error_str = str(exc_or_text).lower()
    
    # Extract status code if available
    status_code = getattr(exc_or_text, 'code', None) or getattr(exc_or_text, 'status_code', None)
    try:
        if status_code is not None:
            status_code = int(status_code)
    except (ValueError, TypeError):
        status_code = None

    # Check for timeout keywords (highest priority) or status_code 504 (Gateway Timeout)
    timeout_keywords = ["deadline exceeded", "timed out", "timeout"]
    has_timeout_keyword = any(kw in error_str for kw in timeout_keywords)
    
    if has_timeout_keyword or status_code == 504:
        return True, True

    # 429 and 503 are definitive overloads (no keywords required)
    if status_code in [429, 503]:
        return True, False
        
    # Overload keywords
    overload_keywords = [
        "overloaded", "rate limit", "exhausted", "quota", 
        "capacity", "high demand", "too many requests"
    ]
    has_overload_keyword = any(kw in error_str for kw in overload_keywords)
    
    # 500, or unknown/missing status code require keywords
    if status_code == 500 or status_code is None:
        if has_overload_keyword:
            return True, False
            
    return False, False


