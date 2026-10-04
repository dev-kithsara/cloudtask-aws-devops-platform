import { useEffect, useState, type FormEvent } from 'react';
import type { Priority, Task, TaskInput } from './types';

export function TaskForm({
  task,
  onSave,
  onCancel,
}: {
  task?: Task;
  onSave: (input: TaskInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setPriority(task?.priority ?? 'MEDIUM');
    setDueDate(task?.dueDate?.slice(0, 10) ?? '');
  }, [task]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        title,
        description: description || null,
        priority,
        dueDate: dueDate ? new Date(`${dueDate}T12:00:00Z`).toISOString() : null,
      });
      if (!task) {
        setTitle('');
        setDescription('');
      }
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="panel space-y-4 p-5" onSubmit={submit}>
      <h2 className="text-lg font-semibold">{task ? 'Edit task' : 'Create task'}</h2>
      <input
        aria-label="Task title"
        className="field"
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        maxLength={160}
      />
      <textarea
        aria-label="Description"
        className="field"
        placeholder="Optional description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={2000}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          aria-label="Priority"
          className="field"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
        >
          <option>LOW</option>
          <option>MEDIUM</option>
          <option>HIGH</option>
        </select>
        <input
          aria-label="Due date"
          className="field"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button className="button" disabled={saving}>
          {saving ? 'Saving…' : 'Save task'}
        </button>
        {onCancel && (
          <button type="button" className="px-4 py-2 text-slate-300" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
