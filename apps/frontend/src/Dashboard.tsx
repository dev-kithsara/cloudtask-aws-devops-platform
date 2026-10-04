import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { TaskForm } from './TaskForm';
import type { Task, TaskInput } from './types';

export function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editing, setEditing] = useState<Task>();
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'DONE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await api.listTasks(token));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load tasks');
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);
  const shown = useMemo(
    () => tasks.filter((t) => filter === 'ALL' || (filter === 'DONE' ? t.completed : !t.completed)),
    [tasks, filter],
  );
  const save = async (input: TaskInput) => {
    if (editing) {
      const updated = await api.updateTask(token, editing.id, input);
      setTasks((items) => items.map((item) => (item.id === editing.id ? updated : item)));
      setEditing(undefined);
    } else {
      const created = await api.createTask(token, input);
      setTasks((items) => [created, ...items]);
    }
  };
  const update = async (task: Task, input: Partial<TaskInput>) => {
    const updated = await api.updateTask(token, task.id, input);
    setTasks((items) => items.map((item) => (item.id === task.id ? updated : item)));
  };
  const remove = async (task: Task) => {
    if (!confirm(`Delete “${task.title}”?`)) return;
    await api.deleteTask(token, task.id);
    setTasks((items) => items.filter((item) => item.id !== task.id));
  };
  return (
    <main className="mx-auto min-h-screen max-w-6xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.25em] text-indigo-400">
            AWS DevOps platform
          </p>
          <h1 className="text-3xl font-bold">CloudTask</h1>
        </div>
        <button className="text-sm text-slate-300" onClick={onLogout}>
          Sign out
        </button>
      </header>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <TaskForm
          task={editing}
          onSave={save}
          onCancel={editing ? () => setEditing(undefined) : undefined}
        />
        <section>
          <div className="mb-4 flex gap-2">
            {(['ALL', 'OPEN', 'DONE'] as const).map((value) => (
              <button
                key={value}
                className={`rounded-full px-3 py-1 text-sm ${filter === value ? 'bg-indigo-600' : 'bg-slate-800'}`}
                onClick={() => setFilter(value)}
              >
                {value}
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="panel p-4 text-red-400">
              {error}
            </p>
          )}
          {loading ? (
            <p>Loading tasks…</p>
          ) : shown.length === 0 ? (
            <div className="panel p-10 text-center text-slate-400">No tasks match this view.</div>
          ) : (
            <div className="space-y-3">
              {shown.map((task) => (
                <article key={task.id} className="panel flex gap-4 p-5">
                  <input
                    aria-label={`Complete ${task.title}`}
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => void update(task, { completed: !task.completed })}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        className={`font-semibold ${task.completed ? 'line-through text-slate-500' : ''}`}
                      >
                        {task.title}
                      </h2>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="mt-2 text-sm text-slate-400">{task.description}</p>
                    )}
                    {task.dueDate && (
                      <p className="mt-2 text-xs text-slate-500">
                        Due {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button aria-label={`Edit ${task.title}`} onClick={() => setEditing(task)}>
                    Edit
                  </button>
                  <button
                    aria-label={`Delete ${task.title}`}
                    className="text-red-400"
                    onClick={() => void remove(task)}
                  >
                    Delete
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
