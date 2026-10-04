import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { handler, parseRecord } from '../src/handler.js';

const record = (body: string, messageId = 'message-1'): SQSRecord => ({
  messageId,
  receiptHandle: '',
  body,
  attributes: {
    ApproximateReceiveCount: '1',
    SentTimestamp: '0',
    SenderId: 'test',
    ApproximateFirstReceiveTimestamp: '0',
  },
  messageAttributes: {},
  md5OfBody: '',
  eventSource: 'aws:sqs',
  eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test',
  awsRegion: 'us-east-1',
});
const valid = {
  eventType: 'task.created',
  version: '1',
  timestamp: new Date().toISOString(),
  data: { taskId: crypto.randomUUID(), userId: crypto.randomUUID(), priority: 'HIGH' },
};

describe('audit consumer', () => {
  it('parses an SNS-wrapped task event and logs it', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const body = JSON.stringify({ Type: 'Notification', Message: JSON.stringify(valid) });
    expect(parseRecord(body).eventType).toBe('task.created');
    expect(await handler({ Records: [record(body)] } as SQSEvent)).toEqual({
      batchItemFailures: [],
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
  it('returns malformed records for retry and eventual DLQ delivery', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await handler({ Records: [record('{"bad":true}')] } as SQSEvent)).toEqual({
      batchItemFailures: [{ itemIdentifier: 'message-1' }],
    });
    spy.mockRestore();
  });
});
