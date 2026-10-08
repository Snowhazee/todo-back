import React, { useState, useEffect, useMemo } from 'react';

import {
  CheckCircle2,
  Circle,
  Trash2,
  Plus,
  Clock,
  Settings,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Server,
  Check,
  X,
  Search,
  Edit2,
  ArrowUpDown,
  LogOut,
  User as UserIcon,
  Lock,
  Mail,
  ArrowRight,
} from 'lucide-react';

const getInitialApiUrl = () => {
  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_URL
  ) {
    return import.meta.env.VITE_API_URL;
  }

  if (
    typeof process !== 'undefined' &&
    process.env &&
    process.env.REACT_APP_API_URL
  ) {
    return process.env.REACT_APP_API_URL;
  }

  return 'http://localhost:5000';
};

export default function App() {
  // =========================
  // Auth
  // =========================
  const [token, setToken] = useState(
    localStorage.getItem('taskflow_token') || null
  );

  const [currentUser, setCurrentUser] = useState(
    localStorage.getItem('taskflow_user') || null
  );

  const [isAuthMode, setIsAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // =========================
  // Todos
  // =========================
  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');

  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // =========================
  // API
  // =========================
  const [apiUrl, setApiUrl] = useState(getInitialApiUrl);
  const [pendingApiUrl, setPendingApiUrl] = useState(getInitialApiUrl);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  // =========================
  // Authentication
  // =========================
  const handleAuth = async (e) => {
    e.preventDefault();

    setAuthError('');
    setIsAuthLoading(true);

    const endpoint =
      isAuthMode === 'login'
        ? '/api/auth/login'
        : '/api/auth/register';

    try {
      const response = await fetch(
        `${apiUrl.replace(/\/$/, '')}${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: authEmail,
            password: authPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setToken(data.token);
      setCurrentUser(data.email);

      localStorage.setItem('taskflow_token', data.token);
      localStorage.setItem('taskflow_user', data.email);

      setAuthPassword('');
      setAuthEmail('');
      setIsConnected(true);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setTodos([]);

    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_user');
  };

  // =========================
  // Fetch Todos
  // =========================
  const fetchTodos = async (targetUrl = apiUrl) => {
    if (!token) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `${targetUrl.replace(/\/$/, '')}/api/todos`,
        {
          method: 'GET',
          headers: getHeaders(),
        }
      );

      if (response.status === 401) {
        handleLogout();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();

      setTodos(data);
      setIsConnected(true);
    } catch (err) {
      console.warn('Backend issue:', err.message);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTodos(apiUrl);
    }
  }, [apiUrl, token]);

  // =========================
  // Add Todo
  // =========================
  const handleAddTodo = async (e) => {
    e.preventDefault();

    const trimmed = newTodoText.trim();

    if (!trimmed) return;

    const tempId = `local-${Date.now()}`;

    const newTodo = {
      _id: tempId,
      text: trimmed,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setTodos((prev) => [newTodo, ...prev]);
    setNewTodoText('');

    try {
      const response = await fetch(
        `${apiUrl.replace(/\/$/, '')}/api/todos`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            text: trimmed,
          }),
        }
      );

      if (response.status === 401) {
        return handleLogout();
      }

      if (!response.ok) {
        throw new Error('Failed to create on server');
      }

      const savedTodo = await response.json();

      setTodos((prev) =>
        prev.map((todo) =>
          todo._id === tempId ? savedTodo : todo
        )
      );
    } catch (err) {
      console.error('Error saving todo:', err);

      setTodos((prev) =>
        prev.filter((todo) => todo._id !== tempId)
      );
    }
  };

  // =========================
  // Toggle Todo
  // =========================
  const handleToggleTodo = async (todo) => {
    const updatedStatus = !todo.completed;

    setTodos((prev) =>
      prev.map((item) =>
        item._id === todo._id
          ? {
              ...item,
              completed: updatedStatus,
            }
          : item
      )
    );

    try {
      const response = await fetch(
        `${apiUrl.replace(/\/$/, '')}/api/todos/${todo._id}`,
        {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({
            completed: updatedStatus,
          }),
        }
      );

      if (response.status === 401) {
        handleLogout();
      }
    } catch (err) {
      setTodos((prev) =>
        prev.map((item) =>
          item._id === todo._id
            ? {
                ...item,
                completed: todo.completed,
              }
            : item
        )
      );
    }
  };

  // =========================
  // Edit Todo
  // =========================
  const handleStartEdit = (todo) => {
    setEditingId(todo._id);
    setEditingText(todo.text);
  };

  const handleSaveEdit = async (id) => {
    const trimmed = editingText.trim();

    if (!trimmed) return;

    const previousTodos = [...todos];

    setTodos((prev) =>
      prev.map((todo) =>
        todo._id === id
          ? {
              ...todo,
              text: trimmed,
              updatedAt: new Date().toISOString(),
            }
          : todo
      )
    );

    setEditingId(null);

    try {
      const response = await fetch(
        `${apiUrl.replace(/\/$/, '')}/api/todos/${id}`,
        {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({
            text: trimmed,
          }),
        }
      );

      if (response.status === 401) {
        handleLogout();
      }

      if (!response.ok) {
        throw new Error('Update failed');
      }
    } catch (err) {
      setTodos(previousTodos);
    }
  };

  // =========================
  // Delete Todo
  // =========================
  const confirmDelete = async () => {
    if (!deleteCandidate) return;

    const targetId = deleteCandidate._id;

    setTodos((prev) =>
      prev.filter((todo) => todo._id !== targetId)
    );

    setDeleteCandidate(null);

    try {
      const response = await fetch(
        `${apiUrl.replace(/\/$/, '')}/api/todos/${targetId}`,
        {
          method: 'DELETE',
          headers: getHeaders(),
        }
      );

      if (response.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  // =========================
  // Helpers
  // =========================
  const formatDateTime = (isoDate) => {
    if (!isoDate) return '';

    try {
      return new Date(isoDate).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const filteredTodos = useMemo(() => {
    const result = todos.filter((todo) => {
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'active'
          ? !todo.completed
          : todo.completed;

      const matchesSearch = todo.text
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });

    return [...result].sort((a, b) => {
      if (sortBy === 'newest') {
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      }

      if (sortBy === 'oldest') {
        return (
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
        );
      }

      if (sortBy === 'az') {
        return a.text.localeCompare(b.text, undefined, {
          sensitivity: 'base',
        });
      }

      if (sortBy === 'za') {
        return b.text.localeCompare(a.text, undefined, {
          sensitivity: 'base',
        });
      }

      if (sortBy === 'status') {
        return Number(a.completed) - Number(b.completed);
      }

      return 0;
    });
  }, [todos, filter, searchQuery, sortBy]);

  const completedCount = todos.filter(
    (todo) => todo.completed
  ).length;

  const activeCount = todos.length - completedCount;

  // =========================
  // Auth Screen
  // =========================
  if (!token) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center px-4">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="fixed top-5 right-5 p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition"
          title="API Configuration"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="w-full max-w-[400px]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-slate-900 text-white mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              TaskFlow
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {isAuthMode === 'login'
                ? 'Sign in to manage your tasks.'
                : 'Create your account and get organized.'}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <form
              onSubmit={handleAuth}
              className="flex flex-col gap-4"
            >
              {authError && (
                <div className="flex gap-2.5 items-start rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Email
                </label>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) =>
                      setAuthEmail(e.target.value)
                    }
                    placeholder="you@example.com"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Password
                </label>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) =>
                      setAuthPassword(e.target.value)
                    }
                    placeholder="••••••••"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="h-11 mt-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAuthLoading
                  ? 'Please wait...'
                  : isAuthMode === 'login'
                  ? 'Sign in'
                  : 'Create account'}

                {!isAuthLoading && (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-slate-100 text-center text-sm">
              <span className="text-slate-500">
                {isAuthMode === 'login'
                  ? "Don't have an account? "
                  : 'Already have an account? '}
              </span>

              <button
                onClick={() =>
                  setIsAuthMode(
                    isAuthMode === 'login'
                      ? 'register'
                      : 'login'
                  )
                }
                className="text-slate-900 font-medium hover:underline"
              >
                {isAuthMode === 'login'
                  ? 'Sign up'
                  : 'Log in'}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">
            Secured with JWT authentication
          </p>
        </div>

        {/* API Settings */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">
                  API Settings
                </h2>

                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-5">
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Backend URL
                </label>

                <div className="relative">
                  <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  <input
                    type="text"
                    value={pendingApiUrl}
                    onChange={(e) =>
                      setPendingApiUrl(e.target.value)
                    }
                    className="w-full h-10 rounded-xl border border-slate-200 pl-10 pr-3 text-xs font-mono text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="h-9 px-4 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    setApiUrl(pendingApiUrl);
                    setIsSettingsOpen(false);
                  }}
                  className="h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================
  // Main App
  // =========================
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>

              <div>
                <h1 className="text-lg font-semibold tracking-tight">
                  TaskFlow
                </h1>

                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected
                        ? 'bg-emerald-500'
                        : 'bg-slate-300'
                    }`}
                  />

                  <span className="text-xs text-slate-400">
                    {isConnected
                      ? 'Connected'
                      : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchTodos(apiUrl)}
                title="Refresh"
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300 transition flex items-center justify-center"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    isLoading ? 'animate-spin' : ''
                  }`}
                />
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                title="Settings"
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300 transition flex items-center justify-center"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                onClick={handleLogout}
                title="Logout"
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 transition flex items-center justify-center"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
            <UserIcon className="w-3.5 h-3.5" />

            <span>
              Signed in as{' '}
              <span className="font-medium text-slate-700">
                {currentUser}
              </span>
            </span>
          </div>
        </header>

        {/* Add Todo */}
        <form onSubmit={handleAddTodo} className="mb-6">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 transition">
            <input
              type="text"
              value={newTodoText}
              onChange={(e) =>
                setNewTodoText(e.target.value)
              }
              placeholder="Add a new task..."
              className="flex-1 min-w-0 h-10 px-3 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            />

            <button
              type="submit"
              disabled={!newTodoText.trim()}
              className="h-10 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium flex items-center gap-1.5 transition disabled:opacity-30"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">
                Add
              </span>
            </button>
          </div>
        </form>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400">
              Active
            </p>

            <p className="text-xl font-semibold text-slate-900 mt-1">
              {activeCount}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400">
              Completed
            </p>

            <p className="text-xl font-semibold text-slate-900 mt-1">
              {completedCount}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex bg-white border border-slate-200 rounded-lg p-1">
            {['all', 'active', 'completed'].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition ${
                  filter === item
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex gap-2 sm:ml-auto">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 mr-1.5" />

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value)
                }
                className="h-9 bg-transparent text-xs text-slate-600 outline-none"
              >
                <option value="newest">
                  Newest
                </option>
                <option value="oldest">
                  Oldest
                </option>
                <option value="az">
                  A → Z
                </option>
                <option value="za">
                  Z → A
                </option>
                <option value="status">
                  Pending first
                </option>
              </select>
            </div>

            <div className="relative flex-1 sm:flex-none sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />

              <input
                type="text"
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                placeholder="Search tasks..."
                className="w-full h-9 bg-white border border-slate-200 rounded-lg pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Todo List */}
        <div className="space-y-2">
          {filteredTodos.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl py-14 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-5 h-5 text-slate-400" />
              </div>

              <p className="text-sm font-medium text-slate-700">
                No tasks found
              </p>

              <p className="text-xs text-slate-400 mt-1">
                Add a task to get started.
              </p>
            </div>
          ) : (
            filteredTodos.map((todo) => {
              const formattedDate = formatDateTime(
                todo.createdAt || todo.timestamp
              );

              const isEditing =
                editingId === todo._id;

              return (
                <div
                  key={todo._id}
                  className={`group bg-white border rounded-xl p-4 transition ${
                    todo.completed
                      ? 'border-slate-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() =>
                        handleToggleTodo(todo)
                      }
                      disabled={isEditing}
                      className="mt-0.5 shrink-0"
                    >
                      {todo.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500 transition" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={editingText}
                            onChange={(e) =>
                              setEditingText(
                                e.target.value
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEdit(
                                  todo._id
                                );
                              }

                              if (e.key === 'Escape') {
                                setEditingId(null);
                              }
                            }}
                            className="flex-1 h-9 rounded-lg border border-slate-300 px-2.5 text-sm outline-none focus:border-slate-500"
                          />

                          <button
                            onClick={() =>
                              handleSaveEdit(
                                todo._id
                              )
                            }
                            className="w-9 h-9 rounded-lg text-emerald-600 hover:bg-emerald-50 flex items-center justify-center"
                          >
                            <Check className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              setEditingId(null)
                            }
                            className="w-9 h-9 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p
                            onDoubleClick={() =>
                              !todo.completed &&
                              handleStartEdit(todo)
                            }
                            className={`text-sm leading-6 break-words cursor-default ${
                              todo.completed
                                ? 'text-slate-400 line-through'
                                : 'text-slate-800'
                            }`}
                          >
                            {todo.text}
                          </p>

                          {formattedDate && (
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                              <Clock className="w-3 h-3" />

                              <span>
                                {formattedDate}
                              </span>

                              {todo.updatedAt && (
                                <span>
                                  · edited
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                        <button
                          onClick={() =>
                            handleStartEdit(todo)
                          }
                          className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() =>
                            setDeleteCandidate(todo)
                          }
                          className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <span>
            {todos.length} {todos.length === 1 ? 'task' : 'tasks'}
          </span>

          <span>
            TaskFlow
          </span>
        </footer>
      </div>

      {/* API Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Server className="w-4 h-4 text-slate-600" />
                </div>

                <h2 className="font-semibold text-slate-900">
                  API Settings
                </h2>
              </div>

              <button
                onClick={() =>
                  setIsSettingsOpen(false)
                }
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5">
              <label className="block text-xs font-medium text-slate-600 mb-2">
                Backend URL
              </label>

              <input
                type="text"
                value={pendingApiUrl}
                onChange={(e) =>
                  setPendingApiUrl(e.target.value)
                }
                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs font-mono text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() =>
                  setIsSettingsOpen(false)
                }
                className="h-9 px-4 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setApiUrl(pendingApiUrl);
                  setIsSettingsOpen(false);
                }}
                className="h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>

            <h3 className="font-semibold text-slate-900">
              Delete task?
            </h3>

            <p className="text-sm text-slate-500 mt-1.5 leading-5">
              Are you sure you want to remove this task?
            </p>

            <div className="mt-3 px-3 py-2.5 rounded-lg bg-slate-50 text-xs text-slate-600 break-words">
              {deleteCandidate.text}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() =>
                  setDeleteCandidate(null)
                }
                className="h-9 px-4 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
