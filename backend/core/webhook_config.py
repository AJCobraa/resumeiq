"""
Webhook URL Configuration — Local development helper.

Reads WEBHOOK_PUBLIC_URL from the environment (set to the Cloudflare tunnel URL
during local testing) and prints the complete Razorpay webhook endpoint URL
at startup for easy copy-paste into the Razorpay Dashboard.

This is a local dev convenience only — in production the URL is configured
directly in the Razorpay Dashboard and this helper is informational.
"""
import os


def get_webhook_base_url() -> str:
    """Returns the public base URL without trailing slash."""
    return os.getenv("WEBHOOK_PUBLIC_URL", "").rstrip("/")


def get_razorpay_webhook_url() -> str:
    """Returns the full webhook endpoint URL for Razorpay Dashboard."""
    base = get_webhook_base_url()
    if not base:
        return "WEBHOOK_PUBLIC_URL not set"
    return f"{base}/api/billing/webhook/razorpay"


def print_webhook_url():
    """Prints the final webhook URL at startup for copy/paste."""
    url = get_razorpay_webhook_url()
    print("\n" + "=" * 72)
    if "not set" in url:
        print("RAZORPAY WEBHOOK URL:  (not configured)")
        print("Set WEBHOOK_PUBLIC_URL in .env to your tunnel URL")
    else:
        print("RAZORPAY WEBHOOK URL:")
        print(url)
    print("=" * 72 + "\n")
