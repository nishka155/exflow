import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.log(`[email:dev] No RESEND_API_KEY set — logging instead of sending.`);
    console.log(`[email:dev] To: ${to}\nSubject: ${subject}\n${html}`);
    return;
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "ExFlow <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
}
