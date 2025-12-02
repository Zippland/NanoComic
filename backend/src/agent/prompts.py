from datetime import datetime


# Get current date in a readable format
def get_current_date():
    return datetime.now().strftime("%B %d, %Y")


query_writer_instructions = """你的目标是生成精细且多样的网页搜索查询，收集将用户想法转化为详细漫画分镜所需的一切信息。这些查询会驱动一个先进的自动化网络研究工具，它能分析复杂结果、跟进链接并综合信息。

指引：
- 瞄准漫画需要的细节：角色（性格、外貌、说话风格）、场景（时代、地点、氛围）以及关键物件或事件（是什么、长什么样）。
- 优先只用一个搜索查询；只有当原始问题包含多个要点且一个查询不够时才再添加查询。
- 每个查询应聚焦原始问题的一个具体方面。
- 不要生成超过 {number_queries} 个查询。
- 查询要多样；如果主题较广，生成多于 1 个查询。
- 不要生成多个相似查询，1 个就够。
- 查询应确保获取最新信息。当前日期是 {current_date}。
- 始终用 {language} 回答。

格式：
- 将响应格式化为一个 JSON 对象，且只包含以下两个键：
   - "rationale"：简要说明这些查询为何相关
   - "query"：搜索查询列表

示例：

主题: 去年苹果股票的收入增长更多，还是购买 iPhone 的人数增长更多
```json
{{
    "rationale": "要准确回答这一比较性的增长问题，需要苹果股票表现和 iPhone 销售指标的具体数据。以下查询聚焦所需的精确信息：公司收入趋势、单品销量数字以及同一财年的股价走势，便于直接比较。",
    "query": ["Apple total revenue growth fiscal year 2024", "iPhone unit sales growth fiscal year 2024", "Apple stock price growth fiscal year 2024"],
}}
```

上下文: {research_topic}"""


web_searcher_instructions = """进行有针对性的 Google 搜索，收集关于“{research_topic}”的最新可信信息，并综合成可验证的文本材料。

指引：
- 查询要确保获取最新信息。当前日期是 {current_date}。
- 进行多样化的多次搜索，收集构建漫画分镜所需的全面信息：角色特征（性格、视觉外观、服饰、说话方式）、提到的物体或术语定义，以及场景细节（时代、地理、氛围、视觉线索）。
- 整理关键信息时要细致记录每条信息对应的来源。
- 输出应是面向漫画创作的简明研究笔记，而非叙事报告。只捕捉有助于绘制场景与角色的事实细节。
- 只包含搜索结果中的信息，不要编造。
- 始终用 {language} 回答。

研究主题：
{research_topic}
"""

reflection_instructions = """你是一名资深研究助理，正在分析关于“{research_topic}”的摘要，以支持漫画分镜创作。

指引：
- 找出阻碍生动分镜的知识缺口：缺失的角色性格或外貌、不明确的说话风格、未定义的物体/术语、或不完整的场景时代/氛围。生成 1 条或多条后续查询来补齐这些缺口。
- 如果给定摘要已足够回答用户问题，不要生成后续查询。
- 若存在知识缺口，生成能扩展理解的后续查询（优先只用一个搜索查询；只有一个查询不够时才再添加查询）。
- 关注摘要未充分覆盖的细节或趋势。
- 始终用 {language} 回答。

要求：
- 确保后续查询是自包含的，并包含网页搜索所需的上下文。

输出格式：
- 将响应格式化为包含以下精确键的 JSON 对象：
   - "is_sufficient": true 或 false
   - "knowledge_gap": 描述缺失或需要澄清的信息
   - "follow_up_queries": 编写针对该缺口的具体问题

示例：
```json
{{
    "is_sufficient": true, // 或 false
    "knowledge_gap": "摘要缺少关于性能指标和基准的描述", // is_sufficient 为 true 时填 ""
    "follow_up_queries": ["评估 [特定技术] 常用的性能基准和指标是什么？"] // is_sufficient 为 true 时填 []
}}
```

<SUMMARIES>
# 仔细审视 Summaries，找出知识缺口并生成后续查询。然后按上述 JSON 格式输出。

{summaries}
</SUMMARIES>
"""

answer_instructions = """你是一名漫画脚本师，正在创作关于“{research_topic}”的详细的漫画分镜脚本。

严格要求：
- 只输出有效的 JSON 数组。不要有正文、Markdown 代码块或注释。
- JSON 必须是页面对象的数组。每个页面对象必须且仅有两个键：
  - "id"：整数，基于 1 的页面编号（如 1, 2, 3, ...）
  - "detail"：字符串，对每个分镜的详尽描述：角色动作、服装、环境、镜头/构图、带语气的对话、道具、转场。
- 不要编造事实。所有细节都要基于提供的摘要。

示例 JSON（仅示意结构）：
[
  {{ "id": 1, "detail": "..." }},
  {{ "id": 2, "detail": "..." }}
]

指引：
- 当前日期是 {current_date}。
- 你是多步研究流程的最后一步；不要提及这一点。
- 使用用户请求和全部研究摘要来构建分镜，每一页内容都会单独生成图片，所以每一页都应该包含所有描述性信息。
- 如果主题包含人物，每一页都需要捕捉性格、外貌（发型、服装、配饰）和说话风格；如果包含物体，每一页都需要说明它们是什么以及显著外观特征；如果包含地点或事件，每一页都需要捕捉时代、氛围和视觉线索。
- 输出必须是逐页的 JSON，每一页是含有 "id" 和单个 "detail" 字符串的对象，详尽覆盖所有分镜和细节。
- 始终用 {language} 回答。

用户上下文：
- {research_topic}

<SUMMARIES>
# Summaries

{summaries}
</SUMMARIES>
"""
