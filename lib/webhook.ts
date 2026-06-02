import crypto from 'crypto';
import {
  getDb,
  getWebhooks,
  getPendingWebhookQueue,
  updateWebhookQueueItem,
  updateWebhook,
  type WebhookQueueItem,
} from './db';

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function deliverWebhook(
  url: string,
  payload: string,
  secret: string,
  eventType: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const signature = secret ? signPayload(payload, secret) : '';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': eventType,
        'User-Agent': 'ICP-Camp-Registration/1.0',
      },
      body: payload,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Unknown error' };
  }
}

export async function triggerWebhooks(eventType: string, payload: object): Promise<void> {
  const webhooks = getWebhooks().filter((w) => {
    if (!w.is_active) return false;
    const events: string[] = JSON.parse(w.events || '[]');
    return events.includes(eventType);
  });

  const payloadStr = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  for (const webhook of webhooks) {
    if (webhook.frequency === 'realtime') {
      const result = await deliverWebhook(webhook.url, payloadStr, webhook.secret, eventType);
      if (result.ok) {
        updateWebhook(webhook.id, { last_triggered_at: new Date().toISOString() } as any);
        // Also log to queue as delivered
        const db = getDb();
        db.prepare(
          `INSERT INTO webhook_queue (webhook_id, event_type, payload, status, attempts, sent_at)
           VALUES (?, ?, ?, 'sent', 1, datetime('now', 'localtime'))`
        ).run(webhook.id, eventType, payloadStr);
      } else {
        // Retry logic: enqueue for later retry
        const db = getDb();
        db.prepare(
          `INSERT INTO webhook_queue (webhook_id, event_type, payload, status, attempts, error)
           VALUES (?, ?, ?, 'failed', 1, ?)`
        ).run(webhook.id, eventType, payloadStr, result.error || 'Delivery failed');
      }
    } else {
      // Queue for batch delivery
      const db = getDb();
      db.prepare(
        `INSERT INTO webhook_queue (webhook_id, event_type, payload) VALUES (?, ?, ?)`
      ).run(webhook.id, eventType, payloadStr);
    }
  }
}

export async function flushWebhookQueue(webhookId?: number): Promise<{ sent: number; failed: number }> {
  const items = getPendingWebhookQueue(webhookId);
  let sent = 0;
  let failed = 0;

  for (const item of items) {
    const webhook = getDb().prepare('SELECT * FROM webhooks WHERE id = ?').get(item.webhook_id) as any;
    if (!webhook || !webhook.is_active) continue;

    const result = await deliverWebhook(webhook.url, item.payload, webhook.secret, item.event_type);

    if (result.ok) {
      updateWebhookQueueItem(item.id, {
        status: 'sent',
        attempts: item.attempts + 1,
        sent_at: new Date().toISOString(),
      } as any);
      updateWebhook(webhook.id, { last_triggered_at: new Date().toISOString() } as any);
      sent++;
    } else {
      updateWebhookQueueItem(item.id, {
        status: 'failed',
        attempts: item.attempts + 1,
        error: result.error,
      } as any);
      failed++;
    }
  }

  return { sent, failed };
}

export async function testWebhook(webhookId: number): Promise<{ ok: boolean; error?: string; statusCode?: number }> {
  const webhook = getDb().prepare('SELECT * FROM webhooks WHERE id = ?').get(webhookId) as any;
  if (!webhook) return { ok: false, error: 'Webhook not found' };

  const testPayload = JSON.stringify({
    event: 'test',
    timestamp: new Date().toISOString(),
    data: { message: 'This is a test webhook delivery from ICPC Camp Registration' },
  });

  const result = await deliverWebhook(webhook.url, testPayload, webhook.secret, 'test');
  return result;
}
