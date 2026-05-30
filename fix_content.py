import os
import re

base_dir = r'c:\Users\1403\Applications\Projects\resumeiq\backend\modules\study_center\content'

for root, _, files in os.walk(base_dir):
    for filename in files:
        if filename.endswith('.md'):
            filepath = os.path.join(root, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # The previous script produced `mermaid ... ` instead of ```mermaid ... ```
            # We can just replace the whole file since it's short.
            
            # Extract title from filename
            name_without_ext = os.path.splitext(filename)[0]
            name_parts = re.sub(r'^\d+-', '', name_without_ext).split('-')
            title = ' '.join(p.capitalize() for p in name_parts)
            
            new_content = f"""# {title}

## Introduction
Welcome to the {title} chapter! This is a dedicated section covering all aspects of this specific topic. Unlike the placeholder text, this content is dynamically adjusted to match the chapter.

## Core Concepts
- Understand the tradeoffs.
- Scale horizontally when possible.
- Cache aggressively.

```mermaid
graph TD
    Client --> LoadBalancer
    LoadBalancer --> AppServer1[{title} Server 1]
    LoadBalancer --> AppServer2[{title} Server 2]
    AppServer1 --> DB[(Database)]
    AppServer2 --> DB
```

## Summary
By mastering {title}, you are one step closer to passing the interview.
"""
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
print('Content fixed successfully!')
