import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email
  };
}

export async function getUncachableResendClient() {
  const credentials = await getCredentials();
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: connectionSettings.settings.from_email
  };
}

export async function sendPasswordResetEmail(email: string, resetToken: string, firstName: string) {
  const { client, fromEmail } = await getUncachableResendClient();
  
  const resetLink = `${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : 'http://localhost:5000'}/reset-password?token=${resetToken}`;
  
  await client.emails.send({
    from: fromEmail,
    to: email,
    subject: 'Reset Your Password - ResumeBook',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Reset Your Password</h1>
        <p>Hi ${firstName},</p>
        <p>We received a request to reset your password for your ResumeBook account.</p>
        <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
        <a href="${resetLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Reset Password</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>Best regards,<br>The ResumeBook Team</p>
      </div>
    `
  });
}
