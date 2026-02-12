/**
 * Email service for sending magic link login emails via Resend.
 */
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "Stellaris <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL || "stellaris://";

export interface SendMagicLinkResult {
    success: boolean;
    error?: string;
}

/**
 * Send a magic link email to the user.
 * The link uses the app's custom URL scheme to deep-link back.
 */
export async function sendMagicLinkEmail(
    email: string,
    magicToken: string
): Promise<SendMagicLinkResult> {
    const magicLink = `${APP_URL}auth/verify?token=${magicToken}`;

    // If no Resend key configured, log to console (dev mode)
    if (!resend) {
        console.log("──────────────────────────────────────────────");
        console.log("📧 MAGIC LINK (dev mode — no RESEND_API_KEY)");
        console.log(`   Email: ${email}`);
        console.log(`   Token: ${magicToken}`);
        console.log(`   Link:  ${magicLink}`);
        console.log("──────────────────────────────────────────────");
        return { success: true };
    }

    try {
        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: "Sign in to Stellaris ✨",
            html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0B1026; color: #E2E8F0; border-radius: 16px;">
          <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 8px; color: #F3F4F6;">
            ✨ Stellaris
          </h1>
          <p style="font-size: 14px; color: #94A3B8; margin: 0 0 32px;">
            Your astrocartography companion
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #CBD5E1; margin: 0 0 24px;">
            Tap the button below to sign in to your Stellaris account. This link expires in 15 minutes.
          </p>
          <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED, #A78BFA); color: white; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 12px;">
            Sign in to Stellaris →
          </a>
          <p style="font-size: 12px; color: #64748B; margin: 32px 0 0; line-height: 1.5;">
            If you didn't request this email, you can safely ignore it.
            <br/>This link can only be used once.
          </p>
        </div>
      `,
        });

        if (error) {
            console.error("Resend error:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        console.error("Email send error:", err);
        return { success: false, error: err.message || "Failed to send email" };
    }
}
