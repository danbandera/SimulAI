import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

// Configure your email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    debug: true, // Enable debug output
  });
};

router.post("/", async (req, res) => {
  const { to, name, password } = req.body;

  // Add validation
  if (!to || !name || !password) {
    return res.status(400).json({
      error: "Missing required fields: email, name, or password",
    });
  }

  try {
    // Verify required environment variables
    const requiredEnvVars = [
      "SMTP_HOST",
      "SMTP_USER",
      "SMTP_PASSWORD",
      "SMTP_FROM_EMAIL",
    ];
    const missingEnvVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingEnvVars.length > 0) {
      throw new Error(
        `Missing environment variables: ${missingEnvVars.join(", ")}`
      );
    }

    const transporter = createTransporter();

    // Test the connection before sending
    try {
      await transporter.verify();
      console.log("SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("SMTP Verification failed:", verifyError);
      return res.status(500).json({
        error: "Email configuration error",
        details:
          "Failed to connect to email server. Please check SMTP settings.",
        code: verifyError.code,
      });
    }

    const mailOptions = {
      from: process.env.SMTP_FROM_EMAIL,
      to: to,
      subject: "Welcome to Our Platform - Your Account Details",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome ${name}!</h1>
          <p>Your account has been created successfully.</p>
          <p><strong>Here are your login credentials:</strong></p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
            <p>Email: ${to}</p>
            <p>Temporary Password: ${password}</p>
          </div>
          <p>Please login at: <a href="${process.env.FRONTEND_URL}/login">${process.env.FRONTEND_URL}/login</a></p>
          <p style="color: #ff0000;">Important: For security reasons, please change your password after your first login.</p>
          <p>If you have any questions, please contact our support team.</p>
          <p>Best regards,<br>Your Team</p>
        </div>
      `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);

    res.status(200).json({
      message: "Welcome email sent successfully",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("Email error:", error);
    const errorResponse = {
      error: "Failed to send welcome email",
      details: error.message,
      code: error.code || "UNKNOWN",
    };

    // Specific error handling for common SMTP errors
    if (error.code === "EAUTH") {
      errorResponse.details =
        "Email authentication failed. Please check SMTP credentials.";
    } else if (error.code === "ESOCKET") {
      errorResponse.details =
        "Failed to connect to email server. Please check SMTP settings.";
    }

    res.status(500).json(errorResponse);
  }
});

export default router;
