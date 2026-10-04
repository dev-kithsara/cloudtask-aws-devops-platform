import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from '../src/AuthForm';
import { Dashboard } from '../src/Dashboard';

const fetchMock = vi.fn();
globalThis.fetch = fetchMock;
const json = (data: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify({ data }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

beforeEach(() => fetchMock.mockReset());

describe('frontend', () => {
  it('submits the login form', async () => {
    fetchMock.mockImplementationOnce(() =>
      json({ token: 'jwt', user: { id: '1', email: 'student@example.com' } }),
    );
    const onAuthenticated = vi.fn();
    render(<AuthForm onAuthenticated={onAuthenticated} />);
    await userEvent.type(screen.getByLabelText('Email'), 'student@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'StrongPassword123!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith('jwt'));
  });
  it('renders tasks and completes one', async () => {
    const task = {
      id: '1',
      title: 'Validate infrastructure',
      description: null,
      priority: 'HIGH',
      completed: false,
      dueDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fetchMock
      .mockImplementationOnce(() => json([task]))
      .mockImplementationOnce(() => json({ ...task, completed: true }));
    render(<Dashboard token="jwt" onLogout={() => undefined} />);
    expect(await screen.findByText('Validate infrastructure')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Complete Validate infrastructure'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
