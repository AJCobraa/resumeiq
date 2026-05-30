import os
from pathlib import Path

# The base directories
BASE_DIR = Path(__file__).parent.parent / "modules" / "study_center" / "content"
SD_DIR = BASE_DIR / "system-design"
OOD_DIR = BASE_DIR / "ood"

# Ensure directories exist
SD_DIR.mkdir(parents=True, exist_ok=True)
OOD_DIR.mkdir(parents=True, exist_ok=True)

SD_CHAPTERS = [
    ("00-foreword.md", "Foreword", []),
    ("01-join-the-community.md", "Join the Community", []),
    ("02-scale-from-zero.md", "Scale From Zero to Millions of Users", ["<!-- diagram:ScaleFromZero -->"]),
    ("03-back-of-envelope-estimation.md", "Back-of-the-Envelope Estimation", []),
    ("04-framework-for-system-design.md", "A Framework for System Design Interviews", []),
    ("05-design-rate-limiter.md", "Design a Rate Limiter", ["<!-- diagram:RateLimiterFlow -->", "<!-- diagram:TokenBucketAnimation -->"]),
    ("06-design-consistent-hashing.md", "Design Consistent Hashing", ["<!-- diagram:ConsistentHashRing -->"]),
    ("07-design-key-value-store.md", "Design a Key-Value Store", ["<!-- diagram:LeaderElectionFlow -->"]),
    ("08-design-unique-id-generator.md", "Design a Unique ID Generator", []),
    ("09-design-url-shortener.md", "Design a URL Shortener", ["<!-- diagram:URLShortenerFlow -->"]),
    ("10-design-web-crawler.md", "Design a Web Crawler", ["<!-- diagram:WebCrawlerArchitecture -->"]),
    ("11-design-notification-system.md", "Design a Notification System", ["<!-- diagram:NotificationSystem -->"]),
    ("12-design-news-feed-system.md", "Design a News Feed System", ["<!-- diagram:NewsFeedFanout -->"]),
    ("13-design-chat-system.md", "Design a Chat System", ["<!-- diagram:ChatSystemArchitecture -->"]),
    ("14-design-search-autocomplete.md", "Design a Search Autocomplete System", []),
    ("15-design-youtube.md", "Design YouTube", []),
    ("16-design-google-drive.md", "Design Google Drive", []),
    ("17-proximity-service.md", "Proximity Service", []),
    ("18-nearby-friends.md", "Nearby Friends", []),
    ("19-google-maps.md", "Google Maps", []),
    ("20-distributed-message-queue.md", "Distributed Message Queue", []),
    ("21-metrics-monitoring-alerting.md", "Metrics Monitoring and Alerting System", []),
    ("22-ad-click-event-aggregation.md", "Ad Click Event Aggregation", []),
    ("23-hotel-reservation-system.md", "Hotel Reservation System", []),
    ("24-distributed-email-service.md", "Distributed Email Service", []),
    ("25-s3-like-object-storage.md", "S3-like Object Storage", []),
    ("26-realtime-gaming-leaderboard.md", "Real-time Gaming Leaderboard", []),
    ("27-payment-system.md", "Payment System", []),
    ("28-digital-wallet.md", "Digital Wallet", []),
    ("29-stock-exchange.md", "Stock Exchange", []),
    ("30-the-learning-continues.md", "The Learning Continues", []),
]

OOD_CHAPTERS = [
    ("01-what-is-ood-interview.md", "What is an OOD Interview", []),
    ("02-framework-for-ood-interview.md", "A Framework for OOD Interviews", []),
    ("03-oop-fundamentals.md", "OOP Fundamentals", []),
    ("04-design-parking-lot.md", "Design a Parking Lot", []),
    ("05-design-movie-ticket-booking.md", "Design a Movie Ticket Booking System", []),
    ("06-design-unix-file-search.md", "Design a Unix File Search", []),
    ("07-design-vending-machine.md", "Design a Vending Machine", []),
    ("08-design-elevator-system.md", "Design an Elevator System", []),
    ("09-design-grocery-store-system.md", "Design a Grocery Store System", []),
    ("10-design-tic-tac-toe.md", "Design Tic-Tac-Toe", []),
    ("11-design-blackjack-game.md", "Design a Blackjack Game", []),
    ("12-design-shipping-locker.md", "Design a Shipping Locker System", []),
    ("13-design-atm-system.md", "Design an ATM System", []),
    ("14-design-restaurant-management.md", "Design a Restaurant Management System", []),
]

STUB_CONTENT_TEMPLATE = """# {title}

## Introduction
This is a comprehensive guide to understanding and designing systems for this topic. In real-world interviews at companies like **Google** and **Amazon**, you will often encounter variations of this problem.

Think of this system like a highly organized library: users make requests, the system finds the exact resource, and returns it efficiently without losing track of other requests.

## Step 1: Understand the Problem & Establish Design Scope
- **Candidate:** What are the core features?
- **Interviewer:** Focus on the primary use case first.
- **Candidate:** What is the scale?
- **Interviewer:** Assume 10 million daily active users (DAU).

## Step 2: Propose High-Level Design
We will break the system down into a few core components:
1. **API Gateway:** Entry point for all clients.
2. **Web Servers:** Stateless tier for handling business logic.
3. **Database:** Storage layer.

```mermaid
graph TD
    A[Client] --> B[API Gateway]
    B --> C[Web Servers]
    C --> D[(Database)]
    C --> E[(Cache)]
```

{diagrams}

## Step 3: Design Deep Dive
Let's explore the key decisions in our architecture.

### Pros and Cons of Database Choices

| Approach | Pros | Cons |
|---|---|---|
| Relational (SQL) | ACID compliance, strong consistency | Harder to scale horizontally |
| NoSQL | Easy to scale, flexible schema | Eventual consistency |

## Step 4: Wrap Up
To conclude the interview, it's great to summarize the design and mention potential bottlenecks if the system were to scale 100x.

> 💡 **Interview Tip:** Always mention monitoring, alerting, and logging at the end of your design. Interviewers love candidates who think about operability!

### Key Takeaways
- Clarify requirements before jumping into the design.
- Start simple, then scale.
- Trade-offs are everywhere; there is no perfect system.
- Caching is your best friend for read-heavy workloads.
- Always be prepared to discuss failure scenarios.
"""

def generate_files(chapters, directory):
    for filename, title, diagrams in chapters:
        file_path = directory / filename
        diagrams_str = "\n".join(diagrams)
        content = STUB_CONTENT_TEMPLATE.format(title=title, diagrams=diagrams_str)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Created: {file_path}")

print("Generating System Design Chapters...")
generate_files(SD_CHAPTERS, SD_DIR)

print("Generating OOD Chapters...")
generate_files(OOD_CHAPTERS, OOD_DIR)

print("Done generating stubs!")
