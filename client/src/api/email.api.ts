import axios from "../config/axios";

interface EmailData {
  email: string;
  subject: string;
  message: string;
}

export const sendEmail = async (emailData: EmailData) => {
  try {
    const response = await axios.post("/email/send", emailData);
    return response.data;
  } catch (error: any) {
    console.error("Error sending email:", error);
    throw error;
  }
};
