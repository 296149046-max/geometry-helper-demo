const OpenAI = require("openai");

const SYSTEM_PROMPT = `
你是一位擅长初中几何教学的老师。
你的任务是分析学生输入的几何题，并返回一个 JSON 对象。

要求：
1. 不要输出 markdown，不要输出解释性前言，只返回 JSON。
2. 尽量识别题目中的已知条件、题目信号、辅助线方向、分层提示、完整思路、总结。
3. 如果适合当前演示站的动态图例，请在 strategyId 和 diagramType 中使用以下值之一：
   - parallel-broken-angle / parallel_broken_angle
   - parallel-above-angle / parallel_above_angle
   - rotation-height-area / rotation_height_area
4. 如果不适合这三种图例，就把 strategyId 填为 none，diagramType 填为 none。
5. solution 必须是字符串数组。
6. conditions、signals、knowledge 都必须是字符串数组。

JSON 字段：
{
  "conditions": string[],
  "signals": string[],
  "strategyName": string,
  "strategyId": string,
  "diagramType": string,
  "knowledge": string[],
  "auxiliaryLine": string,
  "hint1": string,
  "hint2": string,
  "solution": string[],
  "summary": string
}
`.trim();

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: "DEEPSEEK_API_KEY is not configured" });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com"
    });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const problem = String(body.problem || "").trim();

    if (!problem) {
      return badRequest(res, "Problem text is required");
    }

    const response = await client.chat.completions.create({
      model: "deepseek-v4-flash",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: problem
        }
      ]
    });

    return res.status(200).json({
      result: response.choices[0] && response.choices[0].message
        ? response.choices[0].message.content
        : ""
    });
  } catch (error) {
    return res.status(500).json({
      error: error && error.message ? error.message : "Unknown server error"
    });
  }
};
