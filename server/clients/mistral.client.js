import { Mistral } from "@mistralai/mistralai";

class MistralClient {
  constructor({ apiKey }) {
    this.client = new Mistral({ apiKey });
  }

  async chat({ model, messages }) {
    try {
      const chatResponse = await this.client.chat.complete({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
      });

      return {
        choices: [
          {
            message: {
              content: chatResponse.choices[0].message.content,
            },
          },
        ],
      };
    } catch (error) {
      console.error("Mistral API Error:", error);
      throw error;
    }
  }
}

export default MistralClient;
