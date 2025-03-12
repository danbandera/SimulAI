import OpenAI from "openai";

class OpenAIClient {
  constructor({ apiKey }) {
    this.client = new OpenAI({ apiKey });
  }

  async chat({ model, messages }) {
    try {
      const completion = await this.client.chat.completions.create({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      return {
        choices: [
          {
            message: {
              content: completion.choices[0].message.content,
            },
          },
        ],
      };
    } catch (error) {
      console.error("OpenAI API Error:", error);
      throw error;
    }
  }

  async createTranscription(audioFile) {
    try {
      const transcript = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });
      return transcript;
    } catch (error) {
      console.error("OpenAI Transcription Error:", error);
      throw error;
    }
  }

  async createSpeech(input) {
    try {
      const mp3 = await this.client.audio.speech.create({
        model: "tts-1",
        voice: "fable",
        input: input,
      });
      return mp3;
    } catch (error) {
      console.error("OpenAI Speech Error:", error);
      throw error;
    }
  }
}

export default OpenAIClient;
