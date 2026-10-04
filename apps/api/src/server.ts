import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { PrismaDataStore } from './data.js';
import { LocalEventPublisher, SnsEventPublisher } from './events.js';

const config = loadConfig();
const store = new PrismaDataStore();
const publisher = config.SNS_TOPIC_ARN
  ? new SnsEventPublisher(config.SNS_TOPIC_ARN, config.AWS_REGION)
  : new LocalEventPublisher();
const server = createApp(store, publisher, config).listen(config.PORT, () =>
  console.info(
    JSON.stringify({ level: 'info', message: 'CloudTask API started', port: config.PORT }),
  ),
);

const shutdown = (signal: string) => {
  console.info(JSON.stringify({ level: 'info', message: 'Shutting down', signal }));
  server.close(() => {
    store.disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
