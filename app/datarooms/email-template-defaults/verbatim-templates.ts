/**
 * Default full-document HTML for dataroom emails. Placeholders match link-iq
 * `replaceDataroomEmailTemplateVars` (and subject line substitution).
 * Header image uses `{{BrandingLogoURL}}` so the dataroom’s configured logo is shown when set.
 */

export const DEFAULT_MAGIC_LINK_LOGIN_EMAIL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Secure Data Room Link</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f7fa; font-family:Arial, Helvetica, sans-serif; color:#191919;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f7fa; margin:0; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px; margin:0 auto; background-color:#ffffff; border-radius:14px; overflow:hidden;">
          <tr>
            <td style="padding:28px 40px 18px 40px; border-top:4px solid #3d88c8;">
              <div style="margin:0 0 22px 0;">
                <img src="{{BrandingLogoURL}}" alt="TerraNet UK" width="120" height="120" style="display:block; width:120px; height:120px; border:0;" />
              </div>

              <h1 style="margin:0 0 18px 0; font-size:24px; line-height:1.3; font-weight:700; color:#191919;">
                Your secure access link
              </h1>

              <p style="margin:0 0 16px 0; font-size:16px; line-height:1.6; color:#191919;">
                Dear {{InviteeEmail}},
              </p>

              <p style="margin:0 0 16px 0; font-size:16px; line-height:1.6; color:#191919;">
                Your unique, single-use link to access the secure data room for <strong>{{DataroomTitle}}</strong> is:
              </p>

              <div style="margin:0 0 24px 0; padding:18px; background-color:#f5f9fc; border:1px solid #d7e7f4; border-radius:10px; word-break:break-word;">
                <a href="{{MagicURL}}" target="_blank" style="font-size:15px; line-height:1.6; color:#3d88c8; text-decoration:none;">
                  {{MagicURL}}
                </a>
              </div>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px 0;">
                <tr>
                  <td align="center" style="border-radius:10px; background-color:#3d88c8;">
                    <a href="{{MagicURL}}" target="_blank" style="display:inline-block; padding:14px 24px; font-size:15px; line-height:1.2; font-weight:700; color:#ffffff; text-decoration:none; border-radius:10px;">
                      Open secure data room
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:#191919;">
                If you did not request this link, or if you require assistance or experience any issues accessing the data room, please contact the person who arranged your initial access.
              </p>

              <p style="margin:0; font-size:15px; line-height:1.6; color:#191919;">
                Kind regards,<br />
                TerraNet UK support
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 40px 30px 40px; border-top:1px solid #e6ebf0;">
              <p style="margin:0; font-size:12px; line-height:1.5; color:#666666;">
                For security reasons, this link may be used once only and may expire after a limited period.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

export const DEFAULT_ACTIVATION_EMAIL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Secure Data Room Access</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f7fa; font-family:Arial, Helvetica, sans-serif; color:#191919;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f7fa; margin:0; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px; margin:0 auto; background-color:#ffffff; border-radius:14px; overflow:hidden;">
          <tr>
            <td style="padding:28px 40px 18px 40px; border-top:4px solid #3d88c8;">
              <div style="margin:0 0 22px 0;">
                <img src="{{BrandingLogoURL}}" alt="TerraNet UK" width="120" height="120" style="display:block; width:120px; height:120px; border:0;" />
              </div>

              <h1 style="margin:0 0 18px 0; font-size:24px; line-height:1.3; font-weight:700; color:#191919;">
                Access granted to secure data room
              </h1>

              <p style="margin:0 0 16px 0; font-size:16px; line-height:1.6; color:#191919;">
                Dear {{InviteeEmail}},
              </p>

              <p style="margin:0 0 16px 0; font-size:16px; line-height:1.6; color:#191919;">
                You have been granted access to the contents of the secure data room for <strong>{{DataroomTitle}}</strong>.
              </p>

              <p style="margin:0 0 24px 0; font-size:16px; line-height:1.6; color:#191919;">
                To activate your account, please use the button below.
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 30px 0;">
                <tr>
                  <td align="center" style="border-radius:10px; background-color:#3d88c8;">
                    <a href="{{MagicURL}}" target="_blank" style="display:inline-block; padding:14px 24px; font-size:15px; line-height:1.2; font-weight:700; color:#ffffff; text-decoration:none; border-radius:10px;">
                      Activate account
                    </a>
                  </td>
                </tr>
              </table>

              <h2 style="margin:0 0 14px 0; font-size:18px; line-height:1.4; font-weight:700; color:#191919;">
                Accessing the data room
              </h2>

              <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#191919;">
                Access to the data room's contents is provided by way of a secure, single-use, time-limited link issued to your registered email address, being the address to which this invitation has been sent.
              </p>

              <p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#191919;">
                To access the contents of the data room, you may:
              </p>

              <ol style="margin:0 0 24px 22px; padding:0; color:#191919;">
                <li style="margin:0 0 10px 0; font-size:15px; line-height:1.6;">
                  Navigate to the login page at
                  <a href="{{LoginUrl}}" target="_blank" style="color:#3d88c8; text-decoration:none;">{{LoginUrl}}</a>.
                </li>
                <li style="margin:0 0 10px 0; font-size:15px; line-height:1.6;">
                  Enter your registered email address and click the <strong>"Send Link"</strong> button.
                </li>
                <li style="margin:0 0 10px 0; font-size:15px; line-height:1.6;">
                  The system will generate a unique link and send it to you by email.
                </li>
                <li style="margin:0 0 10px 0; font-size:15px; line-height:1.6;">
                  Open the email and follow the link provided.
                </li>
                <li style="margin:0 0 10px 0; font-size:15px; line-height:1.6;">
                  The link will be valid for <strong>{{ValidityText}}</strong>.
                </li>
              </ol>

              <div style="margin:0 0 24px 0; padding:16px 18px; background-color:#f5f9fc; border-left:4px solid #3d88c8; border-radius:10px;">
                <p style="margin:0; font-size:15px; line-height:1.6; color:#191919;">
                  Once your account has been activated, it will remain valid until <strong>{{ValidUntil}}</strong>.
                </p>
              </div>

              <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#191919;">
                In the event of any change to the completion date or associated timelines, and the period for which the data room is required, your access will be amended automatically.
              </p>

              <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:#191919;">
                If you require assistance or experience any issues accessing the data room, please contact the person who arranged your access.
              </p>

              <p style="margin:0; font-size:15px; line-height:1.6; color:#191919;">
                Kind regards,<br />
                TerraNet UK support
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 40px 30px 40px; border-top:1px solid #e6ebf0;">
              <p style="margin:0; font-size:12px; line-height:1.5; color:#666666;">
                This is an automated message regarding access to a secure data room. Please do not forward this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

export const DEFAULT_MAGIC_LINK_LOGIN_EMAIL_SUBJECT = "{{DataroomTitle}} — your secure data room link"

export const DEFAULT_ACTIVATION_EMAIL_SUBJECT = "{{DataroomTitle}} — access to your secure data room"

export function getDefaultEmailTemplateBundle(templateKey: "activation" | "magic_link_login"): {
  subject: string
  body_html: string
} {
  if (templateKey === "activation") {
    return {
      subject: DEFAULT_ACTIVATION_EMAIL_SUBJECT,
      body_html: DEFAULT_ACTIVATION_EMAIL_HTML,
    }
  }
  return {
    subject: DEFAULT_MAGIC_LINK_LOGIN_EMAIL_SUBJECT,
    body_html: DEFAULT_MAGIC_LINK_LOGIN_EMAIL_HTML,
  }
}
