import transporter from "../config/mailer.js";

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const result = await transporter.sendMail({
      from: `"BRICS 2026" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent successfully to ${to}: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
};
