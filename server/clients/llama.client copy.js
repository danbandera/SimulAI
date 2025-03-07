import LlamaAI from "llamaai";

class LlamaClient {
  constructor({ apiKey }) {
    this.llama = new LlamaAI(apiKey);
  }

  async complete({ model, system, prompt }) {
    try {
      console.log(model, system, prompt);
      const apiRequestJson = {
        model: model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        // stream: false,
        // max_tokens: 1000,
        // temperature: 0.7,
      };

      const response = await this.llama.run(apiRequestJson);
      console.log(response);

      return {
        choices: [
          {
            text: response.choices[0].message.content,
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
