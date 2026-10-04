import type { SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { z } from 'zod';

const auditEventSchema = z.object({
  eventType: z.literal('task.created'),
  version: z.literal('1'),
  timestamp: z.iso.datetime(),
  data: z.object({
    taskId: z.uuid(),
    userId: z.uuid(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  }),
});
const snsEnvelopeSchema = z.object({ Type: z.literal('Notification'), Message: z.string() });

export const parseRecord = (body: string) => {
  const parsed: unknown = JSON.parse(body);
  const envelope = snsEnvelopeSchema.safeParse(parsed);
  return auditEventSchema.parse(envelope.success ? JSON.parse(envelope.data.Message) : parsed);
};

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: { itemIdentifier: string }[] = [];
  for (const record of event.Records) {
    try {
      const auditEvent = parseRecord(record.body);
      console.info(
        JSON.stringify({
          level: 'info',
          message: 'Task audit event processed',
          eventType: auditEvent.eventType,
          version: auditEvent.version,
          timestamp: auditEvent.timestamp,
          taskId: auditEvent.data.taskId,
          userId: auditEvent.data.userId,
          priority: auditEvent.data.priority,
          sqsMessageId: record.messageId,
        }),
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Malformed audit event',
          sqsMessageId: record.messageId,
          error: error instanceof Error ? error.message : 'Unknown parse error',
        }),
      );
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
};
