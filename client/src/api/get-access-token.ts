const HEYGEN_API_KEY = import.meta.env.VITE_HEYGEN_API_KEY;
console.log(HEYGEN_API_KEY);
const BASE_API_URL =
  import.meta.env.VITE_NEXT_PUBLIC_BASE_API_URL || "https://api.heygen.com";
console.log(BASE_API_URL);
export async function getAccessToken() {
  try {
    if (!HEYGEN_API_KEY) {
      throw new Error("API key is missing from environment variables");
    }

    const res = await fetch(`${BASE_API_URL}/v1/streaming.create_token`, {
      method: "POST",
      headers: {
        "x-api-key": HEYGEN_API_KEY,
      },
    });

    const data = await res.json();
    return data.data.token;
  } catch (error) {
    console.error("Error retrieving access token:", error);
    throw new Error("Failed to retrieve access token");
  }
}
