# School transactional emails — configuration remaining

Dedicated School Supabase project: `zmzunjphubbdumowcurk`.
Never reuse Event/TOTF authentication credentials or API keys.

## Templates

French confirmation and recovery templates are saved in the School dashboard.
Sources: `supabase/templates/confirm-signup.html` and `supabase/templates/reset-password.html`.
Each uses the official `{{ .ConfirmationURL }}` variable and links only to the School application.
No test email or staff invitation has been sent.

## Domain verification, 19 October 2026

Domain: `juste-debout.com`, Resend region `eu-west-1`.
DKIM verified by Resend. Public DNS confirms the SPF TXT at `send.juste-debout.com`.
The public MX query returned no MX answer for `send.juste-debout.com`.
Required additional DNS record (do not replace the root domain mail records):

| Type | Host within juste-debout.com | Priority | Target |
|---|---|---|---|
| MX | send | 10 | feedback-smtp.eu-west-1.amazonses.com. |

After DNS publication, verify the domain again in Resend.

## SMTP setup, not yet enabled

Once verified, create a dedicated sending-only API key for School, scoped to this domain.
Configure the School project's Auth / Emails / SMTP settings:

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: the dedicated School API key, entered securely; never commit or paste into chat.
- Sender name: `Juste Debout School`
- Sender address: confirm the intended School mailbox before activation.

Keep email confirmations enabled and retain School-only redirect URLs.
Test actual receipt and return links for confirmation and password recovery with an authorized test recipient before opening registration to students.
Invitations and responsibility activation remain deferred.
