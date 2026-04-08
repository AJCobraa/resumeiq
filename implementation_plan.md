# Add Transparency Detail View to Job Analysis

The user wants a "detail view" to transparently show exactly what keywords and sentences matched (and didn't match) between the resume and the job description, both for ATS Keyword Match and Semantic Match.

## Is this a good idea?
**Yes, absolutely.** Providing transparency into "black box" AI scores is one of the most highly requested features in resume builder/parsing tools. It gives the user actionable insight into exactly why their score is 64%, rather than just telling them it's low.

## Token Cost Implications
**The token cost will be effectively the same.**
- **ATS Keywords:** Our backend already generates `strongMatches` and `missingKeywords` alongside the ATS score using the Gemma model. There is exactly **0** added cost for this. We just need to display it!
- **Semantic Score (Sentences):** Currently, the backend embeds the entire JD as a single block to compare against the resume text. To do line-by-line semantic highlighting, we will chunk the JD text into sentences and submit them all at once to the embedding API (`text-embedding-004`). Because embedding costs are calculated based on the total number of input characters/tokens in the batch, sending 1 message of 500 words costs the exact same as sending 20 sentences of 25 words.

## Proposed Changes

### Backend
1. **`backend/services/embedding_service.py`**
   - Provide a method to embed a list of JD sentences in a single batch call.

2. **`backend/services/analysis_pipeline.py`**
   - Modify the JD embedding generation. Split `jd_text` using a simple heuristic (e.g. by newlines/periods) into sentences/bullet points.
   - Calculate cosine similarity for **each** sentence against the resume chunks.
   - The overall `semanticScore` will be the average of the top sentences (similar to current logic).
   - Add a new `semanticDetails` array to the saved document and the returned JSON. Schema: 
     `[ { "text": "Sentence from JD", "score": 85 }, ... ]`

### Frontend 
1. **`frontend/src/pages/Dashboard.jsx`**
   - **[MODIFY]** Add a "Detail View" button in `JobDetailPanel` next to the top-level scores.
   - **[MODIFY]** Add a new `MatchDetailsModal` or expanding section.
   - **[MODIFY]** Within the new view, create a two-section toggle:
     - **ATS Match:** Render `strongMatches` array correctly as Green pills, and `missingKeywords` as Red pills.
     - **Semantic Match:** Iterate over the `semanticDetails` array and render each sentence. Color code them: Green for > 65% match, Yellow for medium, Red/Gray for < 40% match.

## User Review Required
> [!IMPORTANT]
> - Do you prefer the **Detail View** to be a new Modal popup, or an inline expandable section right inside the current Job Analysis window? (I recommend an inline expandable section below the scores for a smoother user experience).
> - Let me know if you approve this approach so I can begin execution!
