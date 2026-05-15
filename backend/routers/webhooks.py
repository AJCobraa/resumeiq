"""
Razorpay Webhook Router — receives and processes incoming webhook events.

This route does NOT require Firebase Auth (webhooks come from Razorpay servers).
Security is enforced via HMAC-SHA256 signature verification using
RAZORPAY_WEBHOOK_SECRET over the raw request body.

Per Razorpay docs: "Do not parse or cast the webhook request body" before
signature verification.  The signature is in the X-Razorpay-Signature header.
Idempotency uses the x-razorpay-event-id header.
"""
import json
import logging

from fastapi import APIRouter, Request, Response, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session
from services.webhook_service import (
    verify_razorpay_webhook_signature,
    process_razorpay_webhook,
)

logger = logging.getLogger("resumeiq.webhooks")

router = APIRouter(prefix="/api/billing", tags=["Webhooks"])


@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    """
    Receive Razorpay webhook events.

    Security:
      - No Firebase auth — webhooks are machine-to-machine.
      - Signature verified via X-Razorpay-Signature header + raw body.

    Returns:
      - 200 for processed / duplicate / ignored events.
      - 400 for invalid signature or malformed payload.
    """
    # 1. Read raw body BEFORE any parsing (required for signature verification)
    raw_body = await request.body()

    # 2. Verify webhook signature
    received_signature = request.headers.get("X-Razorpay-Signature", "")
    if not received_signature:
        logger.warning("Webhook received without X-Razorpay-Signature header")
        raise HTTPException(status_code=400, detail="Missing webhook signature.")

    if not verify_razorpay_webhook_signature(raw_body, received_signature):
        logger.warning("Webhook signature verification failed")
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    # 3. Parse the JSON payload (only after signature is verified)
    try:
        event_payload = json.loads(raw_body)
    except (json.JSONDecodeError, ValueError):
        logger.warning("Webhook body is not valid JSON")
        raise HTTPException(status_code=400, detail="Malformed webhook payload.")

    event_type = event_payload.get("event", "unknown")
    event_id = request.headers.get("x-razorpay-event-id", event_payload.get("id"))

    logger.info("Webhook received: type=%s, event_id=%s", event_type, event_id)

    # Inject event_id from header into payload for the processor
    if event_id and "event_id" not in event_payload:
        event_payload["event_id"] = event_id

    # 4. Process the event inside a DB session
    # We need to manually manage the session here since this route
    # does not use Depends (no Firebase auth middleware in the chain).
    from core.database import async_session

    async with async_session() as db:
        try:
            result = await process_razorpay_webhook(db, raw_body, event_payload)
            logger.info(
                "Webhook result: type=%s, event_id=%s, status=%s",
                event_type, event_id, result.get("status"),
            )
            return Response(
                content=json.dumps(result),
                status_code=200,
                media_type="application/json",
            )
        except Exception:
            logger.exception("Webhook processing failed for event %s", event_id)
            # Return 200 even on internal errors so Razorpay doesn't keep retrying
            # The error is logged for investigation.
            return Response(
                content=json.dumps({"status": "error", "message": "Internal processing error."}),
                status_code=200,
                media_type="application/json",
            )
