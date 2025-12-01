// =============================================================================
// EDGE FUNCTION FIX: send-baby-invite-email
// Location: Supabase Dashboard > Edge Functions > send-baby-invite-email
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const APP_URL = Deno.env.get("APP_URL") || "https://5d70a094cb.draftbit.dev";

serve(async (req) => {
  try {
    // Parse request body
    const { invite_id } = await req.json();

    if (!invite_id) {
      return new Response(JSON.stringify({ error: "Missing invite_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch the invite details
    const { data: invite, error: inviteError } = await supabase
      .from("baby_invites")
      .select(
        `
        id,
        invited_email,
        invite_token,
        role,
        baby_id,
        babies:baby_id (
          id,
          name
        ),
        inviter:invited_by (
          id,
          email,
          user_metadata
        )
      `,
      )
      .eq("id", invite_id)
      .single();

    if (inviteError || !invite) {
      console.error("Error fetching invite:", inviteError);
      return new Response(JSON.stringify({ error: "Invite not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build the invite URL
    const inviteUrl = `${APP_URL}/invite/accept?token=${invite.invite_token}`;

    // Get inviter name
    const inviterName =
      invite.inviter?.user_metadata?.full_name || invite.inviter?.email?.split("@")[0] || "Someone";

    // Get baby name
    const babyName = invite.babies?.name || "a baby";

    // Prepare email content
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to join ${babyName}'s DearBaby world</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #0A84FF; font-size: 32px; margin-bottom: 8px;">💛</h1>
    <h2 style="font-size: 24px; font-weight: 600; color: #1a1a1a; margin: 0;">You've been invited!</h2>
  </div>

  <div style="background: #f7f7f7; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
    <p style="font-size: 16px; margin: 0 0 16px 0;">
      <strong>${inviterName}</strong> has invited you to join <strong>${babyName}'s</strong> DearBaby world as a <strong>${invite.role}</strong>.
    </p>
    <p style="font-size: 14px; color: #666; margin: 0;">
      DearBaby is a private, beautiful space to capture and share precious memories, milestones, and moments.
    </p>
  </div>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${inviteUrl}"
       style="display: inline-block; background: #0A84FF; color: white; text-decoration: none; padding: 16px 32px; border-radius: 24px; font-weight: 600; font-size: 16px;">
      Accept Invite
    </a>
  </div>

  <div style="border-top: 1px solid #e0e0e0; padding-top: 24px; margin-top: 32px;">
    <p style="font-size: 14px; color: #666; margin: 0 0 12px 0;">
      As a ${invite.role}, you'll be able to:
    </p>
    <ul style="font-size: 14px; color: #666; margin: 0; padding-left: 24px;">
      ${
        invite.role === "owner"
          ? `
        <li>Add and edit memories, photos, and milestones</li>
        <li>Manage family access and invite others</li>
        <li>Full control over the baby's profile</li>
      `
          : invite.role === "editor"
            ? `
        <li>Add and edit memories, photos, and milestones</li>
        <li>View all content and updates</li>
        <li>Contribute to the baby's story</li>
      `
            : `
        <li>View all memories, photos, and milestones</li>
        <li>Enjoy precious moments as they're captured</li>
        <li>Stay connected with the family</li>
      `
      }
    </ul>
  </div>

  <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
    <p style="font-size: 12px; color: #999; margin: 0;">
      This invite link will expire in 7 days.
    </p>
    <p style="font-size: 12px; color: #999; margin: 8px 0 0 0;">
      If you can't click the button above, copy and paste this link:<br>
      <span style="color: #0A84FF; word-break: break-all;">${inviteUrl}</span>
    </p>
  </div>

</body>
</html>
    `;

    // Send email using Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "DearBaby <noreply@dearbaby.app>",
        to: [invite.invited_email],
        subject: `You've been invited to join ${babyName}'s DearBaby world`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Error sending email:", emailResult);
      return new Response(JSON.stringify({ error: "Failed to send email", details: emailResult }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✅ FIX: Update the invite_email_sent column to TRUE
    const { error: updateError } = await supabase
      .from("baby_invites")
      .update({
        invite_email_sent: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invite_id);

    if (updateError) {
      console.error("Error updating invite_email_sent:", updateError);
      // Don't fail the request - email was sent successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invite email sent successfully",
        email_id: emailResult.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in send-baby-invite-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
