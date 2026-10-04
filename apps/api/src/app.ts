import bcrypt from 'bcryptjs';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { z, ZodError } from 'zod';
import type { Config } from './config.js';
import { authMiddleware, type AuthenticatedRequest } from './auth.js';
import { HttpError } from './errors.js';
import type { DataStore, EventPublisher } from './types.js';

const credentials = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(10).max(128),
});
const taskInput = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  dueDate: z.iso.datetime().nullable().optional(),
});
const taskUpdate = taskInput
  .partial()
  .extend({ completed: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');
const asyncRoute =
  (fn: (req: AuthenticatedRequest, res: Response) => Promise<unknown>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

export const createApp = (store: DataStore, publisher: EventPublisher, config: Config) => {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN.split(',').map((v) => v.trim()), credentials: false }));
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'cloudtask-api' }));
  app.get(
    '/ready',
    asyncRoute(async (_req, res) => {
      try {
        await store.connect();
        res.json({ status: 'ready', checks: { database: 'ok' } });
      } catch {
        res.status(503).json({ status: 'not_ready', checks: { database: 'failed' } });
      }
    }),
  );

  app.post(
    '/api/auth/register',
    asyncRoute(async (req, res) => {
      const input = credentials.parse(req.body);
      if (await store.user.findByEmail(input.email))
        throw new HttpError(409, 'Email is already registered');
      const user = await store.user.create(input.email, await bcrypt.hash(input.password, 12));
      const token = jwt.sign({}, config.JWT_SECRET, { subject: user.id, expiresIn: '1h' });
      res.status(201).json({ data: { user: { id: user.id, email: user.email }, token } });
    }),
  );
  app.post(
    '/api/auth/login',
    asyncRoute(async (req, res) => {
      const input = credentials.parse(req.body);
      const user = await store.user.findByEmail(input.email);
      if (!user || !(await bcrypt.compare(input.password, user.passwordHash)))
        throw new HttpError(401, 'Invalid email or password');
      const token = jwt.sign({}, config.JWT_SECRET, { subject: user.id, expiresIn: '1h' });
      res.json({ data: { user: { id: user.id, email: user.email }, token } });
    }),
  );

  const requireAuth = authMiddleware(config.JWT_SECRET);
  app.get(
    '/api/tasks',
    requireAuth,
    asyncRoute(async (req, res) => res.json({ data: await store.task.list(req.userId!) })),
  );
  app.get(
    '/api/tasks/:id',
    requireAuth,
    asyncRoute(async (req, res) => {
      const task = await store.task.find(String(req.params.id), req.userId!);
      if (!task) throw new HttpError(404, 'Task not found');
      res.json({ data: task });
    }),
  );
  app.post(
    '/api/tasks',
    requireAuth,
    asyncRoute(async (req, res) => {
      const input = taskInput.parse(req.body);
      const task = await store.task.create({
        ...input,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        userId: req.userId!,
      });
      await publisher.publishTaskCreated({
        taskId: task.id,
        userId: req.userId!,
        priority: task.priority,
      });
      res.status(201).json({ data: task });
    }),
  );
  app.patch(
    '/api/tasks/:id',
    requireAuth,
    asyncRoute(async (req, res) => {
      const parsed = taskUpdate.parse(req.body);
      const { dueDate, ...fields } = parsed;
      const input = {
        ...fields,
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      };
      const task = await store.task.update(String(req.params.id), req.userId!, input);
      if (!task) throw new HttpError(404, 'Task not found');
      res.json({ data: task });
    }),
  );
  app.delete(
    '/api/tasks/:id',
    requireAuth,
    asyncRoute(async (req, res) => {
      if (!(await store.task.delete(String(req.params.id), req.userId!)))
        throw new HttpError(404, 'Task not found');
      res.status(204).send();
    }),
  );

  app.use((_req, res) =>
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }),
  );
  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    void next;
    if (error instanceof ZodError)
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.issues },
      });
    if (error instanceof HttpError)
      return res
        .status(error.status)
        .json({ error: { code: 'REQUEST_ERROR', message: error.message } });
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Unhandled request error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
    return res
      .status(500)
      .json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  });
  return app;
};
