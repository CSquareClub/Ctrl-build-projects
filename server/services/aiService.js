const { OpenAI } = require('openai');

class AiService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeIssue(issueData) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured in .env file.');
    }

    const systemPrompt = `You are an elite expert software engineer.
You are given a GitHub issue report, including the description and potentially some comments.
Your task is to analyze it completely and return a STRICT JSON object representing your neural analysis.
The JSON must adhere exactly to this format (do not include markdown wrapping or other text):
{
  "severity": "Low" | "Medium" | "High" | "Critical",
  "category": "Frontend" | "Backend" | "Security" | "Memory Leak" | "Database" | "Architecture" | "Other",
  "confidence": <integer between 0 and 100>,
  "analysis": "<succinct paragraph summarizing your analysis>",
  "root_cause": "<detailed root cause hypothesis>",
  "fix_suggestion": "<bullet points or paragraph on how to fix>",
  "code_patch": "<code>" (If no code is applicable, return empty string)
}`;

    const userContent = `Issue Title: ${issueData.title}
Issue Body: ${issueData.body}
Labels: ${issueData.labels.join(', ')}

Comments:
${issueData.commentsData.slice(0, 5).map(c => `[${c.author}]: ${c.body}`).join('\n')}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // or gpt-3.5-turbo if 4o unavailable depending on billing
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const resultText = response.choices[0].message.content;
      return JSON.parse(resultText);
    } catch (error) {
      console.error('OpenAI Error:', error.message);
      throw new Error('Failed to analyze issue with AI.');
    }
  }
}

module.exports = new AiService();
