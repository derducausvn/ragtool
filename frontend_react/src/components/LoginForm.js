import React, { useState } from 'react';

const LoginForm = ({ onLogin, onMicrosoftLogin, error }) => {
  const [form, setForm] = useState({ username: '', password: '' });

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(form);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 via-blue-400 to-blue-300 font-sans">
      <div className="bg-white/90 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 backdrop-blur-sm">
        <h2 className="text-2xl font-extrabold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 tracking-tight drop-shadow">Sign in to F24 AI Assistant</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-gray-700 mb-2 font-medium">Username</label>
            <input
              type="text"
              name="username"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              required
            />
          </div>
          <div className="mb-5">
            <label className="block text-gray-700 mb-2 font-medium">Password</label>
            <input
              type="password"
              name="password"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <div className="text-red-500 mb-4 text-center text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 text-white py-2 rounded font-semibold shadow-md hover:from-blue-700 hover:to-blue-500 transition"
          >
            Sign In
          </button>
        </form>
        <div className="mt-6 text-center">
          <button
            type="button"
            className="w-full bg-gray-100 text-gray-600 py-2 rounded border border-gray-300 hover:bg-gray-200 transition mt-2 font-medium"
            onClick={onMicrosoftLogin}
          >
            Microsoft Auth to be implemented
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
