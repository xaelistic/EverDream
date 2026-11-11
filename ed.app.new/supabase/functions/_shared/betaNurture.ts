/**
 * Beta nurture copy. Keep the words aligned with
 * everdream_website/src/data/newsletter.ts
 *
 * Welcome on join, then one email at day 7, day 14, and day 21.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type Cta = 'app' | 'discord' | 'letters';

type Letter = {
  key: string;
  funnel: string;
  when: string;
  subject: string;
  preheader: string;
  headline: string;
  paragraphs: string[];
  cta: { label: string; to: Cta };
  quiet?: { label: string; to: Cta };
};

const LETTERS: Letter[] = [
  {
    key: 'welcome',
    funnel: 'Subscribe',
    when: 'When you join',
    subject: 'You’re on the EverDream beta list',
    preheader: 'A welcome now, then one note a week for three weeks.',
    headline: 'You’re on the list.',
    paragraphs: [
      'This is the EverDream beta list. Four notes, then we only write when there is a test worth your time.',
      'Today is the welcome. In seven days, a prompt to write one dream. Seven days after that, one picture. Seven days after that, a request for what we should keep.',
      'The app is open if you want to look tonight. You do not have to wait for the next letter.',
    ],
    cta: { label: 'Open EverDream', to: 'app' },
    quiet: { label: 'Read the four notes', to: 'letters' },
  },
  {
    key: 'capture',
    funnel: 'Activate',
    when: 'Day 7',
    subject: 'Write one dream before it fades',
    preheader: 'Tomorrow morning, a few sentences are enough.',
    headline: 'Catch one morning.',
    paragraphs: [
      'Open EverDream when you wake and write the dream while it is still warm. A few sentences count. If typing feels like too much, leave a voice note.',
      'Leave the pictures for next week. This note is only about whether capture is calm enough to use half-asleep.',
    ],
    cta: { label: 'Open the journal', to: 'app' },
  },
  {
    key: 'picture',
    funnel: 'Engage',
    when: 'Day 14',
    subject: 'Turn one dream into a picture',
    preheader: 'Writing stays free. One image is enough this week.',
    headline: 'Give one night a picture.',
    paragraphs: [
      'If a dream is in the journal, make a single image from it. A new account includes 14 starter images. Spend one. The question is whether the picture feels like your dream.',
      'The journal itself does not cost a credit. Images do.',
    ],
    cta: { label: 'Make one image', to: 'app' },
  },
  {
    key: 'circle',
    funnel: 'Stay',
    when: 'Day 21',
    subject: 'Tell us what to keep',
    preheader: 'The last note in this sequence. One reply is enough.',
    headline: 'What should we keep?',
    paragraphs: [
      'This is the last of the four notes. Later letters are for a real test, not a weekly nudge.',
      'If you used the app, reply with one thing that helped and one thing that got in the way. If you would rather talk in a room, Discord is where the beta conversations sit.',
    ],
    cta: { label: 'Join Discord', to: 'discord' },
    quiet: { label: 'Open the app', to: 'app' },
  },
];

export type DispatchResult = {
  configured: boolean;
  claimed: number;
  sent: number;
  failed: number;
};

type DueSend = {
  send_id: string;
  step_key: string;
  attempts: number;
  email: string;
  unsubscribe_token: string;
};

function appUrl(): string {
  return (Deno.env.get('APP_BASE_URL') || 'https://everdream.n1g3.com').replace(/\/$/, '');
}

function siteUrl(): string {
  return (
    Deno.env.get('SITE_URL') ||
    'http://dmfej25dxvx42nhpcnro44us.185.249.74.204.sslip.io'
  ).replace(/\/$/, '');
}

function discordUrl(): string {
  return Deno.env.get('DISCORD_URL') || 'https://discord.gg/everdream';
}

function hrefFor(to: Cta): string {
  if (to === 'app') return appUrl();
  if (to === 'discord') return discordUrl();
  return `${siteUrl()}/beta/letters`;
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function letterByKey(key: string): Letter | undefined {
  return LETTERS.find((letter) => letter.key === key);
}

export function renderLetter(letter: Letter, unsubscribeUrl: string): { html: string; text: string } {
  const cta = hrefFor(letter.cta.to);
  const quiet = letter.quiet
    ? `<p style="margin:16px 0 0;font-family:Inter,Helvetica,Arial,sans-serif;font-size:14px;"><a href="${esc(hrefFor(letter.quiet.to))}" style="color:#a8eddc;text-decoration:none;">${esc(letter.quiet.label)}</a></p>`
    : '';
  const paragraphs = letter.paragraphs
    .map((paragraph) => `<p style="margin:0 0 12px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#b0acc0;">${esc(paragraph)}</p>`)
    .join('');
  const text = [
    `EVERDREAM`,
    `${letter.funnel} · ${letter.when}`,
    letter.headline,
    ...letter.paragraphs,
    `${letter.cta.label}: ${cta}`,
    letter.quiet ? `${letter.quiet.label}: ${hrefFor(letter.quiet.to)}` : '',
    'You’re on this list because you joined the EverDream beta.',
    `Leave the list: ${unsubscribeUrl}`,
  ].filter(Boolean).join('\n\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(letter.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0d0d1a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(letter.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;">
          <tr>
            <td style="padding:8px 8px 18px;">
              <p style="margin:0;font-family:Inter,Helvetica,Arial,sans-serif;font-weight:300;font-size:15px;letter-spacing:0.38em;text-transform:uppercase;color:#e8e6f0;">Everdream</p>
              <p style="margin:6px 0 0;font-family:Inter,Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.12em;color:#706a80;">Dreams · Sleep · Calm reflection</p>
            </td>
          </tr>
          <tr>
            <td style="background:#1a1a2e;border:1px solid rgba(168,237,220,0.14);border-radius:28px;padding:28px 28px 24px;">
              <p style="margin:0 0 16px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8eddc;">${esc(letter.funnel)} · ${esc(letter.when)}</p>
              <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:32px;line-height:1.2;color:#e8e6f0;">${esc(letter.headline)}</h1>
              ${paragraphs}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;">
                <tr>
                  <td style="background:#5ec4a8;border-radius:16px;">
                    <a href="${esc(cta)}" style="display:inline-block;padding:14px 22px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#0d0d1a;text-decoration:none;">${esc(letter.cta.label)}</a>
                  </td>
                </tr>
              </table>
              ${quiet}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 8px 0;font-family:Inter,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#706a80;">
              EverDream · Capture dreams. Understand sleep. Share wonder.<br />
              You’re on this list because you joined the beta.<br />
              <a href="${esc(unsubscribeUrl)}" style="color:#a8eddc;text-decoration:none;">Leave the list</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { html, text };
}

function mailSettings(): { key: string; from: string; replyTo: string | null } | null {
  const key = Deno.env.get('RESEND_API_KEY') || '';
  const from = Deno.env.get('NEWSLETTER_FROM') || '';
  if (!key || !from) return null;
  const replyTo = Deno.env.get('NEWSLETTER_REPLY_TO') || '';
  return { key, from, replyTo: replyTo || null };
}

export function unsubscribeUrl(token: string): string {
  const base = (
    Deno.env.get('SUPABASE_PUBLIC_URL') ||
    'https://supabase.n1g3.com'
  ).replace(/\/$/, '');
  return `${base}/functions/v1/newsletter-unsubscribe?token=${encodeURIComponent(token)}`;
}

export async function dispatchDueNewsletters(
  admin: SupabaseClient,
  batch = 25,
  onlyEmail?: string,
): Promise<DispatchResult> {
  const mail = mailSettings();
  if (!mail) return { configured: false, claimed: 0, sent: 0, failed: 0 };

  const { data, error } = await admin.rpc('claim_due_newsletters', {
    batch,
    only_email: onlyEmail || null,
  });
  if (error) throw new Error(error.message);
  const due = (data || []) as DueSend[];
  let sent = 0;
  let failed = 0;

  for (const row of due) {
    const letter = letterByKey(row.step_key);
    if (!letter) {
      failed += 1;
      await admin.rpc('complete_newsletter_send', {
        target: row.send_id,
        ok: false,
        error_text: 'Unknown nurture step',
      });
      continue;
    }
    const leaveUrl = unsubscribeUrl(row.unsubscribe_token);
    const rendered = renderLetter(letter, leaveUrl);
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mail.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: mail.from,
          to: [row.email],
          subject: letter.subject,
          html: rendered.html,
          text: rendered.text,
          reply_to: mail.replyTo || undefined,
          headers: {
            'List-Unsubscribe': `<${leaveUrl}>`,
          },
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        failed += 1;
        await admin.rpc('complete_newsletter_send', {
          target: row.send_id,
          ok: false,
          error_text: `Resend ${response.status}: ${body.slice(0, 180)}`,
        });
        continue;
      }
      sent += 1;
      await admin.rpc('complete_newsletter_send', {
        target: row.send_id,
        ok: true,
        error_text: null,
      });
    } catch (err) {
      failed += 1;
      await admin.rpc('complete_newsletter_send', {
        target: row.send_id,
        ok: false,
        error_text: err instanceof Error ? err.message : 'Send failed',
      });
    }
  }

  return { configured: true, claimed: due.length, sent, failed };
}
