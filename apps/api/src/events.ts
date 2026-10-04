import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import type { Priority } from '@prisma/client';
import type { EventPublisher } from './types.js';

export class SnsEventPublisher implements EventPublisher {
  private readonly client: SNSClient;
  constructor(
    private readonly topicArn: string,
    region: string,
  ) {
    this.client = new SNSClient({ region });
  }
  async publishTaskCreated(data: { taskId: string; userId: string; priority: Priority }) {
    const message = {
      eventType: 'task.created',
      version: '1',
      timestamp: new Date().toISOString(),
      data,
    };
    await this.client.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(message),
        MessageAttributes: { eventType: { DataType: 'String', StringValue: 'task.created' } },
      }),
    );
  }
}

export class LocalEventPublisher implements EventPublisher {
  async publishTaskCreated(data: { taskId: string; userId: string; priority: Priority }) {
    console.info(
      JSON.stringify({
        level: 'info',
        message: 'Local event (SNS disabled)',
        eventType: 'task.created',
        data,
      }),
    );
  }
}
