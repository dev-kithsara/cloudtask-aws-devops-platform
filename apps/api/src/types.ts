import type { Priority, Task, User } from '@prisma/client';

export type SafeUser = Pick<User, 'id' | 'email' | 'createdAt' | 'updatedAt'>;
export interface DataStore {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  user: {
    findByEmail(email: string): Promise<User | null>;
    create(email: string, passwordHash: string): Promise<User>;
  };
  task: {
    list(userId: string): Promise<Task[]>;
    find(id: string, userId: string): Promise<Task | null>;
    create(input: {
      title: string;
      description?: string | null;
      priority: Priority;
      dueDate?: Date | null;
      userId: string;
    }): Promise<Task>;
    update(
      id: string,
      userId: string,
      input: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'completed' | 'dueDate'>>,
    ): Promise<Task | null>;
    delete(id: string, userId: string): Promise<boolean>;
  };
}

export interface EventPublisher {
  publishTaskCreated(event: { taskId: string; userId: string; priority: Priority }): Promise<void>;
}
