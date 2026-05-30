"""
Seed script for Study Center courses and chapters.

Usage:
    cd backend
    python -m scripts.seed_courses

Upserts courses and chapters from the content directory.
"""
import asyncio
import os
import sys
from pathlib import Path

# Add backend to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import select
from core.database import async_session
from modules.study_center.models import Course, Chapter


# Course definitions
COURSES = [
    {
        "course_id": "system-design",
        "title": "System Design Interview",
        "description": "Master the art of designing large-scale distributed systems. This comprehensive course covers everything from scaling fundamentals to real-world system design problems asked at top tech companies like Google, Meta, Amazon, and Netflix.",
        "coin_cost": 300,
        "tags": ["system-design", "interviews", "backend"],
        "content_dir": "system-design",
        "free_files": ["00-foreword.md"],
        "chapter_id_prefix": "sd",
    },
    {
        "course_id": "ood",
        "title": "Object-Oriented Design Interview",
        "description": "Ace your OOD interviews with practical design problems. Learn to break down real-world systems into clean, extensible object-oriented designs using proven design patterns and SOLID principles.",
        "coin_cost": 200,
        "tags": ["ood", "interviews", "patterns"],
        "content_dir": "ood",
        "free_files": ["01-what-is-ood-interview.md"],
        "chapter_id_prefix": "ood",
    },
]

# Human-readable titles for chapters (derived from filename)
def filename_to_title(filename: str) -> str:
    """Convert '02-scale-from-zero.md' to 'Scale From Zero'."""
    name = filename.replace(".md", "")
    # Remove the number prefix (e.g. "02-")
    parts = name.split("-", 1)
    if len(parts) > 1 and parts[0].isdigit():
        name = parts[1]
    # Convert kebab-case to title case
    return name.replace("-", " ").title()


TITLE_OVERRIDES = {
    # System Design
    "00-foreword.md": "Foreword",
    "01-join-the-community.md": "Join the Community",
    "02-scale-from-zero.md": "Scale From Zero to Millions of Users",
    "03-back-of-envelope-estimation.md": "Back-of-the-Envelope Estimation",
    "04-framework-for-system-design.md": "A Framework for System Design Interviews",
    "05-design-rate-limiter.md": "Design a Rate Limiter",
    "06-design-consistent-hashing.md": "Design Consistent Hashing",
    "07-design-key-value-store.md": "Design a Key-Value Store",
    "08-design-unique-id-generator.md": "Design a Unique ID Generator",
    "09-design-url-shortener.md": "Design a URL Shortener",
    "10-design-web-crawler.md": "Design a Web Crawler",
    "11-design-notification-system.md": "Design a Notification System",
    "12-design-news-feed-system.md": "Design a News Feed System",
    "13-design-chat-system.md": "Design a Chat System",
    "14-design-search-autocomplete.md": "Design a Search Autocomplete System",
    "15-design-youtube.md": "Design YouTube",
    "16-design-google-drive.md": "Design Google Drive",
    "17-proximity-service.md": "Proximity Service",
    "18-nearby-friends.md": "Nearby Friends",
    "19-google-maps.md": "Google Maps",
    "20-distributed-message-queue.md": "Distributed Message Queue",
    "21-metrics-monitoring-alerting.md": "Metrics Monitoring and Alerting System",
    "22-ad-click-event-aggregation.md": "Ad Click Event Aggregation",
    "23-hotel-reservation-system.md": "Hotel Reservation System",
    "24-distributed-email-service.md": "Distributed Email Service",
    "25-s3-like-object-storage.md": "S3-like Object Storage",
    "26-realtime-gaming-leaderboard.md": "Real-time Gaming Leaderboard",
    "27-payment-system.md": "Payment System",
    "28-digital-wallet.md": "Digital Wallet",
    "29-stock-exchange.md": "Stock Exchange",
    "30-the-learning-continues.md": "The Learning Continues",
    # OOD
    "01-what-is-ood-interview.md": "What is an Object-Oriented Design Interview",
    "02-framework-for-ood-interview.md": "A Framework for OOD Interviews",
    "03-oop-fundamentals.md": "OOP Fundamentals",
    "04-design-parking-lot.md": "Design a Parking Lot",
    "05-design-movie-ticket-booking.md": "Design a Movie Ticket Booking System",
    "06-design-unix-file-search.md": "Design a Unix File Search",
    "07-design-vending-machine.md": "Design a Vending Machine",
    "08-design-elevator-system.md": "Design an Elevator System",
    "09-design-grocery-store-system.md": "Design a Grocery Store System",
    "10-design-tic-tac-toe.md": "Design Tic-Tac-Toe",
    "11-design-blackjack-game.md": "Design a Blackjack Game",
    "12-design-shipping-locker.md": "Design a Shipping Locker System",
    "13-design-atm-system.md": "Design an ATM System",
    "14-design-restaurant-management.md": "Design a Restaurant Management System",
}


async def seed():
    content_base = Path(__file__).parent.parent / "modules" / "study_center" / "content"

    async with async_session() as db:
        for course_def in COURSES:
            course_id = course_def["course_id"]

            # Upsert course
            result = await db.execute(
                select(Course).where(Course.course_id == course_id)
            )
            course = result.scalar_one_or_none()

            if course:
                course.title = course_def["title"]
                course.description = course_def["description"]
                course.coin_cost = course_def["coin_cost"]
                course.tags = course_def["tags"]
                course.is_active = True
                print(f"  Updated course: {course_id}")
            else:
                course = Course(
                    course_id=course_id,
                    title=course_def["title"],
                    description=course_def["description"],
                    coin_cost=course_def["coin_cost"],
                    tags=course_def["tags"],
                    is_active=True,
                )
                db.add(course)
                print(f"  Created course: {course_id}")

            # Read content directory for chapter files
            content_dir = content_base / course_def["content_dir"]
            if not content_dir.exists():
                print(f"  WARNING: Content directory not found: {content_dir}")
                continue

            md_files = sorted([
                f for f in os.listdir(content_dir) if f.endswith(".md")
            ])

            for order_index, filename in enumerate(md_files):
                # Extract chapter number from filename prefix
                prefix_num = filename.split("-")[0]
                chapter_id = f"{course_def['chapter_id_prefix']}-{prefix_num}"

                # Get title
                title = TITLE_OVERRIDES.get(filename, filename_to_title(filename))

                # Is this chapter free?
                is_free = filename in course_def["free_files"]

                # Upsert chapter
                ch_result = await db.execute(
                    select(Chapter).where(Chapter.chapter_id == chapter_id)
                )
                existing_ch = ch_result.scalar_one_or_none()

                if existing_ch:
                    existing_ch.title = title
                    existing_ch.order_index = order_index
                    existing_ch.filename = filename
                    existing_ch.is_free = is_free
                else:
                    db.add(Chapter(
                        chapter_id=chapter_id,
                        course_id=course_id,
                        title=title,
                        order_index=order_index,
                        filename=filename,
                        is_free=is_free,
                    ))

                status = "FREE" if is_free else "PAID"
                print(f"    [{status}] {chapter_id}: {title}")

            await db.commit()

    print("\n✅ Seed complete!")


if __name__ == "__main__":
    asyncio.run(seed())
