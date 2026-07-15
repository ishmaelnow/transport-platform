# Resend Invitation Delivery Webhooks

This guide explains webhooks for a junior developer and documents how invitation email delivery is
tracked in the Admin application.

## What Is a Webhook?

A normal API request starts inside our application:

```text
Admin app ──request──> Resend
```

A webhook reverses the direction. Resend calls an endpoint in our application when something happens:

```text
Resend ──event──> Admin app webhook endpoint
```

This is useful because final email delivery happens asynchronously. Resend may accept an email now,
while the recipient's mail server accepts, delays, or rejects it later.

An HTTP success response from the send-email API therefore means "Resend accepted the request." It does
not mean "the recipient's mail server received the message."

## Invitation Delivery Flow

```text
Platform administrator
        │
        │ creates or resends invitation
        ▼
Admin API creates invitation token and database record
        │
        │ POST /emails with invitation_id tag
        ▼
Resend accepts email
        │
        │ application records delivery as pending
        ▼
Recipient mail server accepts, delays, or rejects email
        │
        │ signed webhook event
        ▼
POST /api/webhooks/resend
        │
        ├─ verify signature and timestamp
        ├─ read invitation_id tag
        └─ update tenant_invitations through a server-only Supabase client
```

The `invitation_id` email tag correlates a Resend event with exactly one invitation. Correlation by
recipient email alone would be unsafe because the same address can receive multiple invitations.

## Delivery State Mapping

| Resend event             | Application status | Meaning                                       |
| ------------------------ | ------------------ | --------------------------------------------- |
| API request accepted     | `pending`          | Resend accepted the send request.             |
| `email.delivery_delayed` | `pending`          | The recipient server has not accepted it yet. |
| `email.delivered`        | `sent`             | The recipient server accepted the email.      |
| `email.bounced`          | `failed`           | The recipient server rejected the email.      |
| `email.failed`           | `failed`           | Resend could not send the email.              |
| `email.suppressed`       | `failed`           | Resend blocked sending to this recipient.     |

Even `email.delivered` does not guarantee inbox placement. A provider such as Gmail or Yahoo can accept
a message and then place it in spam, quarantine it, or apply another internal filter.

## Project Files

- `apps/admin/src/lib/invitations/email.ts` sends invitations and attaches the `invitation_id` tag.
- `apps/admin/src/app/api/webhooks/resend/route.ts` receives webhook HTTP requests and updates Supabase.
- `apps/admin/src/lib/invitations/resend-webhook.ts` verifies signatures and maps events to statuses.
- `apps/admin/src/lib/invitations/resend-webhook.test.ts` tests signature verification and event mapping.
- `apps/admin/src/lib/config.ts` validates the required server environment variables.
- `packages/platform/supabase/src/index.ts` creates the server-only Supabase service client.

## Why Signature Verification Matters

The webhook URL is public. Without verification, anyone could send a fake request and mark an invitation
as delivered or failed.

Resend signs the raw HTTP body and sends these headers:

```text
svix-id
svix-timestamp
svix-signature
```

The application:

1. Reads the request with `request.text()` so the raw body is preserved.
2. Rejects missing signature headers.
3. Rejects timestamps more than five minutes from the server time to reduce replay risk.
4. Computes the expected HMAC using `RESEND_WEBHOOK_SECRET`.
5. Compares signatures with `timingSafeEqual`.
6. Parses and processes the payload only after verification succeeds.

Do not call `request.json()` before verifying the signature. Parsing and re-serializing JSON can change
the exact bytes and invalidate a legitimate signature.

## Required Environment Variables

Production requires:

```env
RESEND_API_KEY=re_example
RESEND_WEBHOOK_SECRET=whsec_example
SUPABASE_SERVICE_ROLE_KEY=sb_secret_example
```

These are examples only. Never commit real values.

- `RESEND_API_KEY` authorizes outgoing email API calls.
- `RESEND_WEBHOOK_SECRET` proves incoming webhook requests came from Resend.
- `SUPABASE_SERVICE_ROLE_KEY` lets the verified server endpoint update delivery metadata without a user session.

All three values are server-only. Never prefix them with `NEXT_PUBLIC_`. The Supabase secret bypasses RLS,
so it must never appear in browser bundles, logs, screenshots, chat, or source control.

## Production Setup

### 1. Configure the Resend webhook

In the Resend dashboard, create or edit a webhook with this endpoint:

```text
https://admin.eshapp.com/api/webhooks/resend
```

Subscribe to:

```text
email.delivered
email.delivery_delayed
email.bounced
email.failed
email.suppressed
```

Copy its signing secret into the Vercel Production environment as `RESEND_WEBHOOK_SECRET`.

Webhooks are not retroactive. Events produced before the webhook was created will not appear automatically.

### 2. Configure Supabase server access

Create a dedicated Supabase secret key for the Vercel Admin backend. Store it in the Vercel Production
environment as `SUPABASE_SERVICE_ROLE_KEY`.

The variable retains the established project name, but it can contain Supabase's newer `sb_secret_...`
key format. A dedicated key is preferable because it can be rotated without affecting other services.

### 3. Deploy

Environment variable changes apply only to new deployments. Deploy the commit containing the webhook code
after both secrets have been saved in Vercel.

## Testing End to End

1. Confirm the latest Vercel deployment is `Ready`.
2. Confirm the Resend webhook is `enabled` and listening for all five events.
3. Send a new invitation to a controlled test inbox.
4. Confirm the Admin UI initially reports `pending`.
5. Open Resend's Emails page and inspect the message event timeline.
6. Open the webhook in Resend and confirm it received the corresponding event.
7. Refresh the Admin UI.
8. Confirm a delivered email changes to `sent`; a rejected email changes to `failed`.
9. Confirm the invitation link uses `https://admin.eshapp.com/invite/accept`.

Use a newly sent email for testing. An email sent before webhook creation will not generate a historical event.

## HTTP Responses and Retries

The endpoint returns:

- `200` for a verified event that was processed or intentionally ignored.
- `400` when signature headers are missing, the signature is invalid, the timestamp is stale, or the event
  cannot be processed.

Resend may deliver a webhook more than once. Database updates are designed to be safe when repeated. A
late `email.delivery_delayed` event is also prevented from changing an already delivered invitation back
to `pending`.

## Troubleshooting

### No webhook events appear

- Confirm a new email was sent after webhook creation.
- Confirm the webhook status is `enabled`.
- Confirm all required event types are selected.
- Confirm the endpoint uses `https://admin.eshapp.com/api/webhooks/resend`.
- Confirm the latest Vercel deployment contains the webhook route.

### Webhook requests return 400

- Confirm `RESEND_WEBHOOK_SECRET` matches this specific webhook's signing secret.
- Confirm the raw request body is verified before JSON parsing.
- Check Vercel function logs for `/api/webhooks/resend`.
- Confirm Vercel was redeployed after the secret was added.

### Webhook is delivered but the database does not change

- Confirm `SUPABASE_SERVICE_ROLE_KEY` exists in the Vercel Production environment.
- Confirm the key belongs to the same Supabase project as `NEXT_PUBLIC_SUPABASE_URL`.
- Confirm the email contains an `invitation_id` tag in the Resend dashboard.
- Check Vercel function logs and Supabase API logs.

### Resend says delivered but the user cannot find the email

`email.delivered` means the recipient's mail server accepted the message. Ask the user to check spam, junk,
quarantine, filters, and the exact recipient spelling. Inbox placement happens after Resend receives the
recipient server's acceptance response.

## Safe Development Rules

- Never disable webhook signature verification to make a test pass.
- Never expose the Supabase secret key to client components.
- Never log webhook secrets, service keys, invitation tokens, or full signed payload headers.
- Do not identify an invitation only by recipient email; keep the `invitation_id` tag.
- Treat webhook delivery as at-least-once and keep handlers idempotent.
- Return quickly and avoid unrelated business work in the webhook request.
- Rotate a secret immediately if it is exposed.
