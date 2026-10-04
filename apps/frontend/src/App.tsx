import { useState } from 'react';
import { AuthForm } from './AuthForm';
import { Dashboard } from './Dashboard';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('cloudtask_token') ?? '');
  const authenticate = (value: string) => {
    localStorage.setItem('cloudtask_token', value);
    setToken(value);
  };
  const logout = () => {
    localStorage.removeItem('cloudtask_token');
    setToken('');
  };
  return token ? (
    <Dashboard token={token} onLogout={logout} />
  ) : (
    <AuthForm onAuthenticated={authenticate} />
  );
}
