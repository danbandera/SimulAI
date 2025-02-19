import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

function sendEmail({ email, subject, message }) {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mail_configs = {
      from: process.env.SMTP_FROM_EMAIL,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; width: 80%; background-color: #f9fafb; padding: 20px;">
          <div style="width: 100%; margin: 0 auto;">
            ${message}
          </div>
        </div>
      `,
    };

    transporter.sendMail(mail_configs, function (error, info) {
      if (error) {
        console.error("Email error:", error);
        reject({ message: "An error has occurred", details: error.message });
      } else {
        resolve({
          message: "Email sent successfully",
          messageId: info.messageId,
        });
      }
    });
  });
}

router.post("/send", async (req, res) => {
  const { email, subject, message } = req.body;

  // Validate required fields
  if (!email || !subject || !message) {
    return res.status(400).json({
      error: "Missing required fields: email, subject, or message",
    });
  }

  try {
    const result = await sendEmail({ email, subject, message });
    res.status(200).json(result);
  } catch (error) {
    console.error("Send email error:", error);
    res.status(500).json(error);
  }
});

export default router;
