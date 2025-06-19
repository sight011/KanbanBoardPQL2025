import React, { useState } from 'react';
import api from '../api/axios';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/api/login', { email, password }, { withCredentials: true });
      onLogin(res.data); // Pass user info up
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: '40px auto', padding: 24, background: '#222', borderRadius: 8, color: '#fff' }}>
      <h2 style={{ marginBottom: 16 }}>Login</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 4, border: '1px solid #444', background: '#111', color: '#fff' }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 4, border: '1px solid #444', background: '#111', color: '#fff' }}
      />
      <button type="submit" style={{ width: '100%', padding: 10, borderRadius: 4, background: '#007bff', color: '#fff', border: 'none', fontWeight: 600 }}>Login</button>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
    </form>
  );
} 