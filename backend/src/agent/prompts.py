from datetime import datetime


# Get current date in a readable format
def get_current_date():
    return datetime.now().strftime("%B %d, %Y")


query_writer_instructions = """Your goal is to generate sophisticated and diverse web search queries that gather everything needed to turn the user's idea into a detailed comic storyboard. These queries will fuel an advanced automated web research tool capable of analyzing complex results, following links, and synthesizing information.

Instructions:
- Target the details required for comics: characters (personality, appearance, speech style), settings (era, location, atmosphere), and key objects or events (what they are and how they look).
- Always prefer a single search query, only add another query if the original question requests multiple aspects or elements and one query is not enough.
- Each query should focus on one specific aspect of the original question.
- Don't produce more than {number_queries} queries.
- Queries should be diverse, if the topic is broad, generate more than 1 query.
- Don't generate multiple similar queries, 1 is enough.
- Query should ensure that the most current information is gathered. The current date is {current_date}.

Format: 
- Format your response as a JSON object with ALL two of these exact keys:
   - "rationale": Brief explanation of why these queries are relevant
   - "query": A list of search queries

Example:

Topic: What revenue grew more last year apple stock or the number of people buying an iphone
```json
{{
    "rationale": "To answer this comparative growth question accurately, we need specific data points on Apple's stock performance and iPhone sales metrics. These queries target the precise financial information needed: company revenue trends, product-specific unit sales figures, and stock price movement over the same fiscal period for direct comparison.",
    "query": ["Apple total revenue growth fiscal year 2024", "iPhone unit sales growth fiscal year 2024", "Apple stock price growth fiscal year 2024"],
}}
```

Context: {research_topic}"""


web_searcher_instructions = """Conduct targeted Google Searches to gather the most recent, credible information on "{research_topic}" and synthesize it into a verifiable text artifact.

Instructions:
- Query should ensure that the most current information is gathered. The current date is {current_date}.
- Conduct multiple, diverse searches to gather comprehensive information for building a comic storyboard: character traits (personality, visual appearance, clothing, speech patterns), definitions of any mentioned objects or terms, and setting details (time period, geography, mood, visual cues).
- Consolidate key findings while meticulously tracking the source(s) for each specific piece of information.
- The output should be concise research notes oriented toward comic creation, not a narrative report. Capture factual details that help draw scenes and characters.
- Only include the information found in the search results, don't make up any information.

Research Topic:
{research_topic}
"""

reflection_instructions = """You are an expert research assistant analyzing summaries about "{research_topic}" to support a comic storyboard.

Instructions:
- Identify knowledge gaps that block a vivid comic storyboard: missing character personality or appearance, unclear speech style, undefined objects/terms, or incomplete setting/era/mood. Generate a follow-up query (1 or multiple) to fill these gaps.
- If provided summaries are sufficient to answer the user's question, don't generate a follow-up query.
- If there is a knowledge gap, generate a follow-up query that would help expand your understanding.
- Focus on technical details, implementation specifics, or emerging trends that weren't fully covered.

Requirements:
- Ensure the follow-up query is self-contained and includes necessary context for web search.

Output Format:
- Format your response as a JSON object with these exact keys:
   - "is_sufficient": true or false
   - "knowledge_gap": Describe what information is missing or needs clarification
   - "follow_up_queries": Write a specific question to address this gap

Example:
```json
{{
    "is_sufficient": true, // or false
    "knowledge_gap": "The summary lacks information about performance metrics and benchmarks", // "" if is_sufficient is true
    "follow_up_queries": ["What are typical performance benchmarks and metrics used to evaluate [specific technology]?"] // [] if is_sufficient is true
}}
```

Reflect carefully on the Summaries to identify knowledge gaps and produce a follow-up query. Then, produce your output following this JSON format:

Summaries:
{summaries}
"""

answer_instructions = """Create a detailed comic storyboard based on the user's request and the provided research summaries.

Strict Requirements:
- Output ONLY valid JSON. No prose, no markdown fences, no comments.
- The JSON must be an object where EACH KEY (string) represents a page (e.g., "page_1", "page_2").
- Each page value must be an object with EXACTLY two keys:
  - "id": integer, the page identifier (use 1-based numbers)
  - "detail": string, a thorough page description that fine-grains every panel: characters' actions, attire, environment, camera/framing, dialogue with tone, props, transitions.
- Do NOT invent facts. Ground all details in the provided summaries.
- Include sources inline inside the "detail" string using markdown links (e.g., [apnews](https://vertexaisearch.cloud.google.com/id/1-0)).

Example JSON (structure only):
{
  "page_1": { "id": 1, "detail": "..." },
  "page_2": { "id": 2, "detail": "..." }
}

Instructions:
- The current date is {current_date}.
- You are the final step of a multi-step research process; don't mention that you are the final step.
- Use the user's request and all research summaries to build the storyboard.
- If the topic includes people, capture personality, visual appearance (hair, clothing, accessories), and speech style. If it includes objects, explain what they are and notable visual traits. If it includes locations or events, capture time period, atmosphere, and visual cues.
- Output must be a page-by-page JSON where each page is an object with "id" and a single "detail" string that thoroughly covers all panels and specifics.

User Context:
- {research_topic}

Summaries:
{summaries}
"""
