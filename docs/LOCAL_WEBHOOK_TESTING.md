# Local Razorpay Webhook Testing Guide

This guide explains how to receive Razorpay webhook events on your local machine during development.

Razorpay cannot send webhooks to `localhost`. You need a public HTTPS URL that tunnels traffic to your local FastAPI server. We use **Cloudflare Quick Tunnel** (`cloudflared`) for this — no account needed.

---

## Prerequisites

- FastAPI backend running locally on port `8000`
- Razorpay test-mode account at [dashboard.razorpay.com](https://dashboard.razorpay.com)
- `RAZORPAY_WEBHOOK_SECRET` set in `backend/.env`

---

## Step 1 — Generate a Webhook Secret

Generate a random 64-character hex secret:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy the output. You will paste this in **two places**:

1. `backend/.env` → `RAZORPAY_WEBHOOK_SECRET=<paste here>`
2. Razorpay Dashboard → Webhook Secret field (Step 5)

> [!IMPORTANT]
> Both values must match exactly. If they differ, signature verification will fail with HTTP 400.

---

## Step 2 — Install Cloudflared

### Windows

```powershell
winget install --id Cloudflare.cloudflared
```

### macOS

```bash
brew install cloudflared
```

### Linux (Ubuntu/Debian)

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o cloudflared && chmod +x cloudflared && sudo mv cloudflared /usr/local/bin/
```

Verify installation:

```bash
cloudflared --version
```

---

## Step 3 — Start FastAPI Locally

Start the backend in Docker or directly:

```bash
# Docker (recommended)
docker compose up

# Or direct
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Confirm the health check:

```bash
curl http://localhost:8000/api/health
# → {"status":"ok","service":"resumeiq-backend"}
```

---

## Step 4 — Start the Cloudflare Tunnel

In a **separate terminal**:

```bash
cloudflared tunnel --url http://localhost:8000
```

The output will include a line like:

```
+-----------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at:          |
|  https://random-words-here.trycloudflare.com               |
+-----------------------------------------------------------+
```

Copy that `https://...trycloudflare.com` URL.

### Update `.env`

Paste the tunnel URL into `backend/.env`:

```env
WEBHOOK_PUBLIC_URL=https://random-words-here.trycloudflare.com
```

### Restart FastAPI

After updating `.env`, restart the backend. On startup you will see:

```
========================================================================
RAZORPAY WEBHOOK URL:
https://random-words-here.trycloudflare.com/api/billing/webhook/razorpay
========================================================================
```

This is the full URL to paste into Razorpay Dashboard.

> [!NOTE]
> The tunnel URL changes every time you restart `cloudflared`. When it changes, update both `.env` and the Razorpay Dashboard.

---

## Step 5 — Configure Razorpay Dashboard

1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com).
2. Switch to **Test Mode** (toggle in top-right).
3. Navigate to **Settings → Webhooks → Add New Webhook**.
4. **Webhook URL**: Paste the full URL from Step 4:
   ```
   https://random-words-here.trycloudflare.com/api/billing/webhook/razorpay
   ```
5. **Secret**: Paste the same secret you generated in Step 1 (the one in your `.env`).
6. **Active Events** — select at minimum:
   - `payment.captured`
   - `payment.failed`
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.cancelled`
   - `subscription.halted`
   - `subscription.completed`
7. Click **Create Webhook**.

---

## Step 6 — Test Webhook Delivery

### Option A — Trigger a Real Test Payment

1. Open the frontend at `http://localhost:5173`.
2. Sign in and go to Plans & Billing.
3. Choose a plan and complete checkout with Razorpay test card:
   - Card: `4111 1111 1111 1111`
   - Expiry: any future date
   - CVV: any 3 digits
   - OTP: `1234` (test mode)
4. Watch the backend terminal for webhook logs:
   ```
   INFO: Webhook received: type=payment.captured, event_id=evt_xxx
   INFO: Webhook result: type=payment.captured, event_id=evt_xxx, status=processed
   ```

### Option B — Use the Razorpay Dashboard Test Button

1. In Dashboard → Webhooks, find your configured webhook.
2. Click the webhook entry.
3. Click **Send Test** on any event.
4. Confirm the backend receives it:
   ```
   INFO: Webhook received: type=payment.captured, event_id=evt_test_xxx
   ```

### Option C — Manual cURL Test

Generate a test signature and send a request:

```bash
# In Python
python -c "
import hmac, hashlib, json

secret = 'your_webhook_secret_here'
body = json.dumps({'event': 'payment.captured', 'payload': {'payment': {'entity': {'id': 'pay_test', 'order_id': 'order_test'}}}})
sig = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
print(f'Signature: {sig}')
print(f'Body: {body}')
"
```

Then send via cURL:

```bash
curl -X POST https://random-words-here.trycloudflare.com/api/billing/webhook/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: <signature_from_above>" \
  -d '<body_from_above>'
```

---

## Step 7 — Verify Results

### Check backend logs

Look for lines like:

```
INFO: Webhook received: type=payment.captured, event_id=evt_xxx
INFO: Webhook result: type=payment.captured, event_id=evt_xxx, status=processed
```

### Check database

Query the `payment_transactions` table for webhook audit fields:

```sql
SELECT id, transaction_type, status, webhook_event_id, webhook_event_type, webhook_status
FROM payment_transactions
WHERE webhook_event_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### Verify idempotency

Send the same webhook event twice. The second time should return:

```json
{"status": "duplicate", "message": "Event already processed."}
```

### Verify invalid signature rejection

```bash
curl -X POST http://localhost:8000/api/billing/webhook/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: invalid_signature" \
  -d '{"event": "payment.captured"}'
# → HTTP 400: {"detail": "Invalid webhook signature."}
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `WEBHOOK_PUBLIC_URL not set` at startup | Set `WEBHOOK_PUBLIC_URL` in `backend/.env` |
| HTTP 400 "Invalid webhook signature" | Ensure `RAZORPAY_WEBHOOK_SECRET` in `.env` matches the secret in Razorpay Dashboard |
| Tunnel URL changed | Restart `cloudflared`, update `.env` and Razorpay Dashboard |
| Events not arriving | Check Razorpay Dashboard → Webhooks → Recent Deliveries for errors |
| "No matching transaction found" | The webhook event references an order/payment not created by your local backend |
| Docker can't reach tunnel | The tunnel points to `localhost:8000` — ensure Docker ports are mapped correctly |

---

## Security Notes

- `RAZORPAY_WEBHOOK_SECRET` is **never** sent to the frontend.
- The webhook route has **no Firebase auth** — security comes from HMAC signature verification only.
- Signatures use `hmac.compare_digest` (timing-safe) — never `==`.
- Raw body is read **before** JSON parsing to ensure signature integrity.
- No full payloads or card data are logged — only event type and event ID.

---

## File Reference

| File | Purpose |
|---|---|
| `backend/core/webhook_config.py` | Reads `WEBHOOK_PUBLIC_URL`, prints webhook URL at startup |
| `backend/routers/webhooks.py` | `POST /api/billing/webhook/razorpay` route |
| `backend/services/webhook_service.py` | Signature verification, event dispatch, coin crediting |
| `backend/.env` | Contains `RAZORPAY_WEBHOOK_SECRET` and `WEBHOOK_PUBLIC_URL` |

---

# Phase 2 — Automated Testing (`dev_start.py`)

To simplify the workflow, use the `dev_start.py` script located in the project root. This script automates tunnel creation, `.env` updates, and (optionally) updating the Razorpay Dashboard via API.

## Prerequisites for Automation

1. **Install dependencies**:
   ```bash
   pip install requests python-dotenv
   ```
2. **Find your Webhook ID** (Optional):
   - Go to Razorpay Dashboard → Settings → Webhooks.
   - Click on your webhook. The ID is in the URL (e.g., `https://dashboard.razorpay.com/app/webhooks/webhook_Lxxxxxxxxxxxxx`).
   - Copy `webhook_Lxxxxxxxxxxxxx`.
3. **Update `.env`**:
   ```env
   RAZORPAY_WEBHOOK_ID=webhook_Lxxxxxxxxxxxxx
   ```

## Running the Automation

From the project root:

```bash
python dev_start.py
```

### What happens:
1. **Tunnel starts**: `cloudflared` is launched in the background.
2. **URL extracted**: The script waits for the public `.trycloudflare.com` URL.
3. **.env updated**: `WEBHOOK_PUBLIC_URL` is automatically written to `backend/.env`.
4. **Razorpay updated**: If `RAZORPAY_WEBHOOK_ID` is present, the script calls the Razorpay API to update the webhook URL to the new tunnel.
5. **FastAPI starts**: `uvicorn` is launched in the background.

Everything is now ready for testing. Press **Ctrl+C** to shut everything down cleanly.

## Manual vs Automation Comparison

| Feature | Manual Phase 1 | Automated Phase 2 |
|---|---|---|
| Tunnel Start | Manual command | Automatic |
| Copy URL | Manual | Automatic |
| Update .env | Manual | Automatic |
| Update Razorpay | Manual Dashboard edit | Automatic API call |
| Start FastAPI | Separate terminal | Automatic |
| Cleanup | Close 2+ terminals | Single Ctrl+C |
