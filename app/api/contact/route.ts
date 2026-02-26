import { NextRequest, NextResponse } from "next/server";
import { resend } from "@/lib/services/resend";
import { getEmailBranding } from "@/lib/config/app-settings";
import ContactFormEmail from "@/emails/ContactFormEmail";
import { getErrorMessage } from "@/lib/error-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body;

    console.log("Contact form submission received:", { name, email, subject });

    // Basic validation
    if (!name || !email || !subject || !message) {
      console.warn("Contact form validation failed: Missing fields");
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Send email to site owner
    // In a real app, this would be the site owner's email
    // For this demo, we'll send it to the configured "from" address or a specific admin email
    // Fallback to delivered@resend.dev for testing if no env var is set
    const adminEmail =
      process.env.RESEND_MERCHANT_EMAIL || "delivered@resend.dev";

    console.log(`Attempting to send email to: ${adminEmail}`);

    const { storeName, logoUrl } = await getEmailBranding();

    const { data, error } = await resend.emails.send({
      from: `${storeName} <onboarding@resend.dev>`,
      to: [adminEmail],
      subject: `[Contact Form] ${subject}`,
      react: ContactFormEmail({ name, email, subject, message, logoUrl }),
      replyTo: email,
    });

    if (error) {
      console.error("Resend API returned error:", error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    console.log("Email sent successfully. Resend Data:", data);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Contact API unexpected error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to process contact form") },
      { status: 500 }
    );
  }
}
