"""
Prompt builders for Study Center V2 features.
Pure string construction. No DB access or AI calls.
"""
import json


def build_skill_gap_prompt(
    missing_keywords: list[str],
    found_keywords: list[str],
    job_title: str,
    company: str,
    resume_summary: str
) -> str:
    """
    Builds the prompt for analyzing a user's resume gaps against a JD.
    Instructs the AI to act as a senior technical recruiter and categorize
    the skills into specific domains.
    """
    missing_json = json.dumps(missing_keywords)
    found_json = json.dumps(found_keywords)

    return f"""You are a senior technical recruiter at a top-tier tech company.
Analyze the candidate's skills for this specific role and categorize them by domain.

ROLE CONTEXT:
Title: {job_title}
Company: {company}

CANDIDATE SUMMARY:
{resume_summary}

SKILLS IDENTIFIED AS MISSING FROM RESUME:
{missing_json}

SKILLS IDENTIFIED AS PRESENT IN RESUME:
{found_json}

INSTRUCTIONS:
1. Group all skills (both missing and present) into these domain categories: 
   Frontend, Backend, DevOps, System Design, Data/ML, Soft Skills, Domain Knowledge, Other
2. For each skill, determine its importance level for this specific role: "critical", "important", or "optional"
3. Skills from the MISSING list must have status="missing"
4. Skills from the PRESENT list must have status="has"
5. If the candidate's summary suggests they have partial exposure to a missing skill, you may mark it status="partial"
6. Compute an overall_score as an integer percentage: (found / (found + missing)) * 100

Return ONLY valid JSON in this exact structure, with no markdown fences or preamble:
{{
  "overall_score": 72,
  "domains": [
    {{
      "domain": "Backend",
      "skills": [
        {{ "name": "Redis", "status": "missing", "importance": "critical" }},
        {{ "name": "Node.js", "status": "has", "importance": "critical" }}
      ]
    }}
  ]
}}"""


def build_roadmap_prompt(
    skill_name: str,
    role_context: str,
    experience_level: str,
    gap_status: str | None,
    answers: dict | None = None
) -> str:
    """
    Builds the prompt for generating an interactive learning roadmap for a specific skill.
    """
    context_str = f"Role context: {role_context}\n" if role_context else ""
    gap_str = f"The candidate's current status for this skill is: {gap_status}\n" if gap_status else ""
    answers_str = f"The candidate answered the following tailoring questions:\n{json.dumps(answers, indent=2)}\n" if answers else ""

    return f"""You are a senior curriculum designer and staff engineer.
Design a highly structured, interactive learning roadmap for a specific technical skill.

SKILL TO LEARN: {skill_name}
TARGET AUDIENCE: {experience_level}
{context_str}{gap_str}{answers_str}
INSTRUCTIONS:
1. Generate a complete learning roadmap tailored to the target audience's experience level and their specific answers to the tailoring questions.
   - Beginners need foundational concepts.
   - Experienced users should bypass basics and focus on advanced patterns, internals, and scale.
2. If role context or answers are provided, emphasize topics most relevant to them.
3. Structure the roadmap into 3-4 sequential phases.
4. Generate exactly 25-40 nodes total across all phases.
5. Create logical prerequisite edges between nodes.
6. For spatial layout, assign position_x and position_y integers to each node:
   - Phase 1 nodes should be near y=0
   - Phase 2 nodes near y=300
   - Phase 3 nodes near y=600
   - Phase 4 (if any) near y=900
   - Spread nodes horizontally (x-axis) with roughly 200px spacing between parallel topics.

Return ONLY valid JSON in this exact structure, with no markdown fences or preamble:
{{
  "title": "{skill_name} Mastery",
  "description": "A comprehensive guide to mastering {skill_name}.",
  "phases": [
    {{ "id": "phase-1", "label": "Foundations", "order": 1 }}
  ],
  "nodes": {{
    "node-slug-id": {{
      "id": "node-slug-id",
      "title": "Topic Title",
      "phase_id": "phase-1",
      "node_type": "MILESTONE" | "TOPIC" | "SUBTOPIC",
      "importance": "REQUIRED" | "RECOMMENDED" | "OPTIONAL",
      "description": "2-3 sentences explaining what this is and why it matters.",
      "estimated_hours": 2,
      "gap_status": {json.dumps(gap_status)},
      "position_x": 200,
      "position_y": 50,
      "resources": [
        {{
          "title": "Resource Title",
          "type": "ARTICLE" | "VIDEO" | "DOCUMENTATION" | "COURSE",
          "is_paid": false,
          "url": "https://actual-url-or-search-query",
          "platform": "Platform Name (e.g., YouTube, Official Docs)"
        }}
      ]
    }}
  }},
  "edges": [
    {{
      "id": "edge-1",
      "from_node_id": "source-node-slug",
      "to_node_id": "target-node-slug",
      "edge_type": "REQUIRED_BEFORE" | "SUGGESTED_BEFORE" | "ALTERNATIVE_TO"
    }}
  ]
}}"""


def build_interview_prep_v2_prompt(
    job_title: str,
    company: str,
    company_tier: str,          # "faang" | "unicorn" | "standard"
    company_tier_label: str,
    difficulty: str,            # "standard" | "hard" | "faang"
    questions_per_round: int,
    selected_rounds: list[str], # e.g. ["technical", "behavioral", "resume_deep_dive"]
    missing_keywords: list[str],
    found_keywords: list[str],
    resume_summary: str,
    style_guide: str,
) -> str:
    """
    Builds the prompt for interview prep v2 (round-based, company-specific).

    IMPORTANT: Only rounds listed in selected_rounds are generated.
    The AI does not decide which rounds to include — the caller enforces this.

    DSA round includes resources with LeetCode and NeetCode links.
    Resume Deep Dive round uses resume_summary to ask questions about the candidate's actual experience.
    """
    missing_json = json.dumps(missing_keywords[:12])  # cap to avoid token bloat
    found_json = json.dumps(found_keywords[:12])

    # Build round specifications — only for selected rounds
    ROUND_SPECS = {
        "technical": {
            "id": "technical",
            "name": "Technical Questions",
            "icon_hint": "code",
            "accent_color": "#6366f1",
            "description": (
                "Deep technical questions probing the JD's required skills. "
                "Focus on missing keywords and depth of understanding, not trivia. "
                "Questions should sound like what a real interviewer at this company would ask."
            ),
        },
        "system_design": {
            "id": "system_design",
            "name": "System Design",
            "icon_hint": "topology-star",
            "accent_color": "#8b5cf6",
            "description": (
                "Architecture and scale challenges. Include a realistic constraint "
                "(scale, latency SLA, throughput) in each question. "
                "Calibrate to company tier: FAANG = 10M+ users, unicorn = 100K users."
            ),
        },
        "dsa": {
            "id": "dsa",
            "name": "DSA Patterns",
            "icon_hint": "binary-tree",
            "accent_color": "#ec4899",
            "description": (
                "Algorithm and data structure questions weighted to this company's known interview patterns. "
                "FAANG: hard graph, DP, sliding window. Unicorn: medium arrays, trees. "
                "For each question, include a 'resources' array with 1-2 relevant LeetCode problems "
                "and a NeetCode reference if applicable. "
                "resources format: [{\"label\": \"Two Sum\", \"url\": \"https://leetcode.com/problems/two-sum/\", \"platform\": \"leetcode\"}]"
            ),
        },
        "behavioral": {
            "id": "behavioral",
            "name": "Behavioral",
            "icon_hint": "users",
            "accent_color": "#10b981",
            "description": (
                "STAR-format behavioral questions calibrated to company culture. "
                "For FAANG: focus on Leadership Principles (Amazon) or 'Googleyness' or Meta's values. "
                "For others: ownership, conflict resolution, cross-functional impact. "
                "Questions must NOT be generic. They should reflect what this specific company values."
            ),
        },
        "lld": {
            "id": "lld",
            "name": "Low-Level Design",
            "icon_hint": "layout-grid",
            "accent_color": "#f59e0b",
            "description": (
                "Class design, OOP patterns, SOLID principles. "
                "Questions should involve designing a real component or service relevant to the company's domain. "
                "E.g. 'Design a rate limiter', 'Model a parking lot system', 'Design a notification service'."
            ),
        },
        "resume_deep_dive": {
            "id": "resume_deep_dive",
            "name": "Resume Deep Dive",
            "icon_hint": "file-text",
            "accent_color": "#06b6d4",
            "description": (
                "Questions derived DIRECTLY from the candidate's resume. "
                "Each question must reference a specific project, role, technology, or bullet point from their background. "
                "NEVER ask generic questions in this round. "
                "Examples: 'In your {project} project, how did you handle {challenge}?', "
                "'You listed {skill} — walk me through a time you used it under pressure.'"
            ),
        },
    }

    # Build the rounds instruction block
    rounds_block = ""
    for round_id in selected_rounds:
        spec = ROUND_SPECS.get(round_id)
        if not spec:
            continue
        rounds_block += f"""
  Round ID: "{spec['id']}"
  Name: "{spec['name']}"
  Icon hint: "{spec['icon_hint']}"
  Accent color: "{spec['accent_color']}"
  Instructions: {spec['description']}
  ---"""

    difficulty_map = {
        "standard": "practical, mid-level — focus on whether the candidate can do the job",
        "hard": "senior-level depth — probe edge cases, trade-offs, production experience",
        "faang": "FAANG bar — expert depth, scale, follow-up sub-questions inside each question",
    }
    diff_instruction = difficulty_map.get(difficulty, difficulty_map["hard"])

    return f"""You are a senior technical interviewer and career coach specializing in {company_tier_label} interviews.

INTERVIEW CONTEXT:
  Company: {company}
  Role: {job_title}
  Company Tier: {company_tier_label}
  Difficulty: {difficulty} — {diff_instruction}
  Questions per round: {questions_per_round}

COMPANY-SPECIFIC INTERVIEW STYLE:
{style_guide}

CANDIDATE BACKGROUND (from their resume):
{resume_summary}

CANDIDATE'S MISSING SKILLS (from JD analysis):
{missing_json}

CANDIDATE'S MATCHED SKILLS (from JD analysis):
{found_json}

ROUNDS TO GENERATE (generate ONLY these, in this order):
{rounds_block}

QUESTION FORMAT RULES (apply to every question in every round):
- "id": unique string, e.g. "q_1", "q_2" etc. (reset per round)
- "text": the exact question as a real interviewer would phrase it — specific to {company}'s engineering culture
- "difficulty": "Easy" | "Medium" | "Hard"
- "category": one descriptive word (e.g. "debugging", "scaling", "conflict", "ownership")
- "key_concepts": array of 2-5 concepts the ideal answer should cover
- "study_focus": one paragraph, directional (not prescriptive) — what the candidate should review/understand
- "nudge": one sentence — a thinking prompt shown on-demand (e.g. "Think about: what breaks first under load?")
- "suggested_answer_outline": numbered outline of 3-5 points a strong answer would hit
- "resources": array — REQUIRED for DSA round, empty array for others
  - DSA resources format: {{"label": "Problem Name", "url": "https://leetcode.com/problems/...", "platform": "leetcode"}}
  - Always add NeetCode roadmap as last resource for DSA: {{"label": "NeetCode Roadmap", "url": "https://neetcode.io/roadmap", "platform": "neetcode"}}

ROUND OUTPUT FORMAT:
Each round is an object with:
- "id", "name", "icon_hint", "accent_color" (from spec above)
- "difficulty": the dominant difficulty level for this round
- "estimated_minutes": realistic estimate (questions_per_round * avg minutes per question type)
- "tags": array of 4 most relevant topic tags for this round
- "questions": array of exactly {questions_per_round} question objects

Return ONLY valid JSON — a single object with a "rounds" array and a "meta" object.
No markdown fences. No explanation. Raw JSON only.

{{
  "rounds": [
    {{
      "id": "round_id",
      "name": "Round Name",
      "icon_hint": "icon_hint_string",
      "accent_color": "#hexcolor",
      "difficulty": "Hard",
      "estimated_minutes": 45,
      "tags": ["tag1", "tag2", "tag3", "tag4"],
      "questions": [
        {{
          "id": "q_1",
          "text": "The exact interview question...",
          "difficulty": "Hard",
          "category": "debugging",
          "key_concepts": ["concept1", "concept2"],
          "study_focus": "Focus on understanding...",
          "nudge": "Think about: ...",
          "suggested_answer_outline": "1. First, ... 2. Then, ... 3. Finally, ...",
          "resources": []
        }}
      ]
    }}
  ],
  "meta": {{
    "total_questions": {len(selected_rounds) * questions_per_round},
    "total_rounds": {len(selected_rounds)},
    "estimated_total_hours": 0.0,
    "company_tier": "{company_tier}",
    "company_tier_label": "{company_tier_label}",
    "difficulty": "{difficulty}"
  }}
}}"""


def build_evaluate_answer_prompt(
    question_text: str,
    key_concepts: list[str],
    answer_text: str,
    job_title: str,
    company: str,
) -> str:
    """
    Builds the prompt for evaluating a candidate's submitted answer.
    Returns a structured evaluation — not a model answer comparison.
    Cost: 15 coins flat.
    """
    concepts_json = json.dumps(key_concepts)

    return f"""You are a senior interviewer at {company} evaluating a candidate's answer to an interview question for a {job_title} role.

QUESTION:
{question_text}

KEY CONCEPTS the ideal answer should cover:
{concepts_json}

CANDIDATE'S ACTUAL ANSWER:
{answer_text}

Evaluate what the candidate actually said — not what they should have said.
Do NOT just list model answer points. Evaluate their specific response.

Return ONLY valid JSON:
{{
  "score": <float 0.0-10.0, one decimal place>,
  "summary": "<one sentence: overall quality of the answer and what it showed>",
  "covered": [
    "<specific thing they said that was correct or strong — quote or paraphrase their actual words>"
  ],
  "missing": [
    "<specific concept or angle they did NOT address — be concrete, not generic>"
  ],
  "strengthen": [
    "<one actionable suggestion per item — specific framing or content they could add>"
  ]
}}

Rules:
- "covered" array: 2-4 items. Only things they actually said.
- "missing" array: 2-3 items. Only concrete gaps, not generic advice.
- "strengthen" array: 1-2 items. Specific, actionable. Can include a short example phrase in quotes.
- Score 0-4: answer misses the core of the question. 5-7: solid with gaps. 8-10: strong, covers key concepts well.
- Never fabricate concepts the candidate covered. Base evaluation strictly on their submitted text."""
