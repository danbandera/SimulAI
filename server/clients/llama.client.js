import { OpenAI } from "@llamaindex/openai";

class LlamaClient {
  constructor({ apiKey }) {
    this.llm = new OpenAI({
      apiKey: apiKey,
      maxRetries: 3,
      timeout: 30000,
    });
  }

  async complete({ model, system, prompt }) {
    try {
      const messages = [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ];

      const response = await this.llm.chat({
        messages: messages,
        model: model,
        temperature: 0.7,
        maxTokens: 1000,
      });

      return {
        choices: [
          {
            text: response.message.content,
          },
        ],
      };
    } catch (error) {
      console.error("Llama API Error:", error);
      throw error;
    }
  }
}

export default LlamaClient;
