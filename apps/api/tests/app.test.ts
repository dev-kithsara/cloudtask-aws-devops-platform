import type { Priority, Task, User } from '@prisma/client';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import type { DataStore, EventPublisher } from '../src/types.js';

class MemoryStore implements DataStore {
  users: User[] = [];
  tasks: Task[] = [];
  connect = vi.fn(async () => undefined);
  disconnect = vi.fn(async () => undefined);
  user = {
    findByEmail: async (email: string) => this.users.find((u) => u.email === email) ?? null,
    create: async (email: string, passwordHash: string) => {
      const now = new Date();
      const user = { id: crypto.randomUUID(), email, passwordHash, createdAt: now, updatedAt: now };
      this.users.push(user);
      return user;
    },
  };
  task = {
    list: async (userId: string) => this.tasks.filter((t) => t.userId === userId),
    find: async (id: string, userId: string) =>
      this.tasks.find((t) => t.id === id && t.userId === userId) ?? null,
    create: async (input: {
      title: string;
      description?: string | null;
      priority: Priority;
      dueDate?: Date | null;
      userId: string;
    }) => {
      const now = new Date();
      const task: Task = {
        id: crypto.randomUUID(),
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        completed: false,
        dueDate: input.dueDate ?? null,
        userId: input.userId,
        createdAt: now,
        updatedAt: now,
      };
      this.tasks.push(task);
      return task;
    },
    update: async (id: string, userId: string, input: Partial<Task>) => {
      const task = this.tasks.find((t) => t.id === id && t.userId === userId);
      if (!task) return null;
      Object.assign(task, input, { updatedAt: new Date() });
      return task;
    },
    delete: async (id: string, userId: string) => {
      const index = this.tasks.findIndex((t) => t.id === id && t.userId === userId);
      if (index < 0) return false;
      this.tasks.splice(index, 1);
      return true;
    },
  };
}

const config: Config = {
  NODE_ENV: 'test',
  PORT: 3000,
  DATABASE_URL: 'unused',
  JWT_SECRET: 'a-test-secret-that-is-at-least-32-characters',
  CORS_ORIGIN: 'http://localhost:5173',
  AWS_REGION: 'us-east-1',
};
let store: MemoryStore;
let publisher: EventPublisher & { publishTaskCreated: ReturnType<typeof vi.fn> };
let app: ReturnType<typeof createApp>;

const register = async (email = 'student@example.com') =>
  (await request(app).post('/api/auth/register').send({ email, password: 'StrongPassword123!' }))
    .body.data.token as string;

beforeEach(() => {
  store = new MemoryStore();
  publisher = { publishTaskCreated: vi.fn(async () => undefined) };
  app = createApp(store, publisher, config);
});

describe('operational endpoints', () => {
  it('reports health', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
  it('reports readiness and database failure', async () => {
    expect((await request(app).get('/ready')).status).toBe(200);
    store.connect.mockRejectedValueOnce(new Error('database unavailable'));
    expect((await request(app).get('/ready')).status).toBe(503);
  });
});

describe('authentication and tasks', () => {
  it('validates registration and permits login', async () => {
    expect(
      (await request(app).post('/api/auth/register').send({ email: 'bad', password: 'short' }))
        .status,
    ).toBe(400);
    await register();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@example.com', password: 'StrongPassword123!' });
    expect(login.status).toBe(200);
    expect(login.body.data.token).toBeTypeOf('string');
  });
  it('rejects unauthenticated task access', async () => {
    expect((await request(app).get('/api/tasks')).status).toBe(401);
  });
  it('creates, publishes, updates and deletes a task', async () => {
    const token = await register();
    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Ship portfolio', priority: 'HIGH' });
    expect(created.status).toBe(201);
    expect(publisher.publishTaskCreated).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: created.body.data.id, priority: 'HIGH' }),
    );
    const updated = await request(app)
      .patch(`/api/tasks/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ completed: true });
    expect(updated.body.data.completed).toBe(true);
    expect(
      (
        await request(app)
          .delete(`/api/tasks/${created.body.data.id}`)
          .set('Authorization', `Bearer ${token}`)
      ).status,
    ).toBe(204);
  });
  it('enforces user isolation', async () => {
    const first = await register('first@example.com');
    const second = await register('second@example.com');
    const task = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${first}`)
      .send({ title: 'Private task' });
    expect(
      (
        await request(app)
          .get(`/api/tasks/${task.body.data.id}`)
          .set('Authorization', `Bearer ${second}`)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .patch(`/api/tasks/${task.body.data.id}`)
          .set('Authorization', `Bearer ${second}`)
          .send({ completed: true })
      ).status,
    ).toBe(404);
  });
});
