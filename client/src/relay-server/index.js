import { RealtimeRelay } from "./lib/relay.js";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error(
    `Environment variable "OPENAI_API_KEY" is required.\n` +
      `Please set it in your .env file.`,
  );
  process.exit(1);
}

const PORT =
  parseInt(import.meta.env.VITE_REACT_APP_LOCAL_RELAY_SERVER_URL) || 8081;

const relay = new RealtimeRelay(OPENAI_API_KEY);
relay.listen(PORT);
