import { problem } from "../../../../../lib/api/response";
import { handleStripeWebhook } from "../../../../../lib/api/payments";
import { withRequestLogging } from "../../../../../lib/api/request-logging";
import { withRateLimit } from "../../../../../lib/api/rate-limit-wrapper";
import { getJobQueue } from "../../../../../platform/resolve-job-queue";

async function _POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return problem(
      {
        type: "https://lms-219.dev/problems/invalid-input",
        title: "Bad Request",
        status: 400,
        detail: "stripe-signature header is required.",
      },
      request,
    );
  }

  const payload = await request.text();
  const requestId = crypto.randomUUID();

  // When a job queue is configured, enqueue for async processing (fast ack)
  const queue = getJobQueue();
  if (queue) {
    queue.enqueue({
      type: "stripe.webhook.process",
      data: { payload, signature, requestId },
    });

    return new Response(JSON.stringify({ ok: true, queued: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // No queue — process synchronously (existing behavior, used in tests)
  try {
    const result = await handleStripeWebhook({
      payload,
      signature,
      requestId,
    });

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
}

export const POST = withRequestLogging(withRateLimit("webhook", _POST));
