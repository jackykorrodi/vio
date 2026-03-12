import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, sessionId } = await request.json();
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Gültige E-Mail erforderlich' }, { status: 400 });
    }

    if (process.env.RESEND_API_KEY) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vio-beta.vercel.app';
      const resumeUrl = sessionId ? `${appUrl}/campaign/resume/${sessionId}` : appUrl;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'VIO Team <noreply@vio.swiss>',
          to: email,
          subject: 'Deine VIO Kampagne – jederzeit weiter bearbeiten',
          text: `Hallo,\n\ndu kannst deine Kampagne jederzeit weiter bearbeiten – auch wenn du jetzt keine Zeit hast.\n\nKlick einfach auf diesen Link:\n${resumeUrl}\n\nAlles wird genau so sein wie du es verlassen hast.\n\nBis bald,\nDas VIO Team`,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[send-resume-link] error:', e);
    return NextResponse.json({ success: true }); // silent fail
  }
}
