import nodemailer from "nodemailer";

// Email-safe colors (CSS variables don't work in email clients).
// Change these to update branding across all email templates.
export const emailColors = {
  primary: "#4f46e5",
  primaryForeground: "#ffffff",
  muted: "#737373",
  background: "#ffffff",
  foreground: "#0a0a0a",
} as const;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  return transporter.sendMail({
    from: `"Peer Connect" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}
