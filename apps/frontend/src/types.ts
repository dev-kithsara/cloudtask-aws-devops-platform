export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  completed: boolean;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface TaskInput {
  title: string;
  description?: string | null;
  priority: Priority;
  dueDate?: string | null;
  completed?: boolean;
}
