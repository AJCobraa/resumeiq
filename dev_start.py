#!/usr/bin/env python3
"""
ResumeIQ — Local Webhook Automation Script (Phase 2)

This script automates the local development workflow for Razorpay webhooks:
1. Starts a Cloudflare Quick Tunnel on port 8000.
2. Extracts the public HTTPS URL from the tunnel output.
3. Updates WEBHOOK_PUBLIC_URL in backend/.env.
4. Optionally updates the Razorpay Webhook URL via API if RAZORPAY_WEBHOOK_ID is set.
5. Starts the FastAPI backend server.
6. Cleans up all processes on Exit/Ctrl+C.

Usage:
    python dev_start.py
"""
import subprocess
import time
import re
import os
import signal
import sys
from pathlib import Path

# Try to import requests and dotenv, provide helpful error if missing
try:
    import requests
    from dotenv import dotenv_values
except ImportError:
    print("ERROR: Missing dependencies.")
    print("Please run: pip install requests python-dotenv")
    sys.exit(1)

# Paths
ROOT_DIR = Path(__file__).parent.absolute()
BACKEND_DIR = ROOT_DIR / "backend"
ENV_PATH = BACKEND_DIR / ".env"

def print_banner(text):
    print("\n" + "=" * 72)
    print(text)
    print("=" * 72 + "\n")

def check_dependencies():
    """Verify that cloudflared and .env exist."""
    try:
        # On Windows, cloudflared might be in PATH or need .exe extension
        subprocess.run(["cloudflared", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("ERROR: 'cloudflared' not found in PATH.")
        print("Installation instructions:")
        print("  Windows: winget install --id Cloudflare.cloudflared")
        print("  macOS:   brew install cloudflared")
        sys.exit(1)

    if not ENV_PATH.exists():
        print(f"ERROR: backend/.env file not found at {ENV_PATH}")
        print("Please copy backend/.env.example to backend/.env and configure it first.")
        sys.exit(1)

def start_tunnel():
    """Start cloudflared and capture the tunnel URL."""
    print("Starting Cloudflare tunnel (Quick Tunnel mode)...")
    # We capture stdout/stderr to find the URL
    process = subprocess.Popen(
        ["cloudflared", "tunnel", "--url", "http://localhost:8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    tunnel_url = None
    start_time = time.time()
    print("Waiting for tunnel URL...")
    
    # Non-blocking-ish read
    while time.time() - start_time < 30:
        line = process.stdout.readline()
        if not line:
            if process.poll() is not None:
                raise RuntimeError("cloudflared exited unexpectedly.")
            time.sleep(0.1)
            continue
        
        # print(f"DEBUG: {line.strip()}") # Uncomment for debugging
        
        # Look for the .trycloudflare.com URL
        match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
        if match:
            tunnel_url = match.group(0)
            print(f"Tunnel established: {tunnel_url}")
            break
    
    if not tunnel_url:
        process.terminate()
        raise RuntimeError("Failed to obtain tunnel URL from cloudflared within 30 seconds.")
    
    return process, tunnel_url

def update_env(url):
    """Write the new tunnel URL to backend/.env."""
    print(f"Updating WEBHOOK_PUBLIC_URL in {ENV_PATH}...")
    try:
        with open(ENV_PATH, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        new_lines = []
        found = False
        for line in lines:
            if line.strip().startswith("WEBHOOK_PUBLIC_URL="):
                new_lines.append(f"WEBHOOK_PUBLIC_URL={url}\n")
                found = True
            else:
                new_lines.append(line)
        
        if not found:
            new_lines.append(f"\nWEBHOOK_PUBLIC_URL={url}\n")
        
        with open(ENV_PATH, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
    except Exception as e:
        print(f"WARNING: Could not update .env file: {e}")

def update_razorpay_webhook(url):
    env = dotenv_values(ENV_PATH)
    webhook_id = env.get("RAZORPAY_WEBHOOK_ID")
    key_id = env.get("RAZORPAY_KEY_ID")
    key_secret = env.get("RAZORPAY_KEY_SECRET")

    if not webhook_id or webhook_id.strip() == "":
        print("NOTE: RAZORPAY_WEBHOOK_ID not set. Skipping Razorpay API update.")
        return

    full_webhook_url = f"{url}/api/billing/webhook/razorpay"
    print(f"Updating Razorpay Webhook {webhook_id} via API...")

    try:
        # Step 1: GET current webhook to preserve events + other fields
        get_resp = requests.get(
            f"https://api.razorpay.com/v1/webhooks/{webhook_id}",
            auth=(key_id, key_secret)
        )
        if get_resp.status_code != 200:
            print(f"WARNING: Could not fetch webhook. Status: {get_resp.status_code}")
            return
        
        current = get_resp.json()

        # Step 2: PATCH with updated URL, preserving events
        patch_payload = {
            "url": full_webhook_url,
            "alert_email": current.get("alert_email", ""),
            "secret": "",   # leave blank to keep existing secret
            "events": current.get("events", {})
        }

        resp = requests.patch(
            f"https://api.razorpay.com/v1/webhooks/{webhook_id}",
            auth=(key_id, key_secret),
            json=patch_payload
        )
        if resp.status_code == 200:
            print(f"Successfully updated Razorpay Webhook URL to: {full_webhook_url}")
        else:
            print(f"WARNING: Failed to update Razorpay Webhook. Status: {resp.status_code}")
            print(resp.text)
    except Exception as e:
        print(f"WARNING: Error calling Razorpay API: {e}")


def run_backend():
    """Start the FastAPI backend using uvicorn."""
    print("Starting FastAPI backend (uvicorn)...")
    # Use the same python interpreter
    venv_python = BACKEND_DIR / "venv" / "Scripts" / "python.exe"  # Windows
    if not venv_python.exists():
        venv_python = BACKEND_DIR / "venv" / "bin" / "python"      # Linux/Mac
    python_cmd = str(venv_python) if venv_python.exists() else sys.executable
    
    # Run from backend directory so 'main:app' works
    process = subprocess.Popen(
        [python_cmd, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=BACKEND_DIR
    )
    return process

def main():
    print_banner("ResumeIQ — Webhook Automation System")
    check_dependencies()
    
    tunnel_proc = None
    backend_proc = None
    
    try:
        # 1. Start Tunnel
        tunnel_proc, tunnel_url = start_tunnel()
        
        # 2. Update .env
        update_env(tunnel_url)
        
        # 3. Update Razorpay (Optional)
        update_razorpay_webhook(tunnel_url)
        
        # 4. Start Backend
        backend_proc = run_backend()
        
        print_banner(f"AUTOMATION ACTIVE\nTunnel:  {tunnel_url}\nWebhook: {tunnel_url}/api/billing/webhook/razorpay")
        print("Press Ctrl+C to stop both tunnel and backend.")
        
        # Keep the script running while children are alive
        while True:
            time.sleep(1)
            if tunnel_proc.poll() is not None:
                print("Tunnel process died.")
                break
            if backend_proc.poll() is not None:
                print("Backend process died.")
                break
                
    except KeyboardInterrupt:
        print("\nStopping...")
    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
    finally:
        # Cleanup
        if backend_proc:
            print("Terminating backend...")
            backend_proc.terminate()
        if tunnel_proc:
            print("Terminating tunnel...")
            tunnel_proc.terminate()
        print("Cleanup complete. Goodbye!")

if __name__ == "__main__":
    main()
