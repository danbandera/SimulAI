import axios from "../config/axios";

interface EmailData {
  to: string;
  name: string;
  password: string;
}

export const sendWelcomeEmail = async (emailData: EmailData) => {
  try {
    const response = await axios.post("/email", emailData);
    return response.data;
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    throw error;
  }
};
