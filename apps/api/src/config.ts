import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://cloudtask:cloudtask@localhost:5432/cloudtask'),
  JWT_SECRET: z.string().min(32).default('local-development-secret-at-least-32-chars'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  AWS_REGION: z.string().default('us-east-1'),
  SNS_TOPIC_ARN: z.string().optional(),
});

export type Config = z.infer<typeof schema>;
export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => schema.parse(env);
