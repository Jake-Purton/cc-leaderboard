import { useCallback, useEffect, useState } from 'react';
import { api, poll } from '../api.js';

const MEDALS = ['🥇', '🥈', '🥉'];

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/leaderboard').then(setPlayers).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    return poll(load);
  }, [load]);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const add = (e) => {
    e.preventDefault();
    const total = (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
    run(async () => {
      await api('/leaderboard', { method: 'POST', body: { name, seconds: total } });
      setName('');
      setMinutes('');
      setSeconds('');
    });
  };

  const remove = (p) => {
    if (confirm(`Remove ${p.name} from the leaderboard?`)) {
      run(() => api(`/leaderboard/${p.id}`, { method: 'DELETE' }));
    }
  };

  // Players with equal times share a rank.
  const ranks = players.map((p, i) => (i > 0 && p.seconds === players[i - 1].seconds ? null : i + 1));
  for (let i = 1; i < ranks.length; i++) if (ranks[i] === null) ranks[i] = ranks[i - 1];

  return (
    <main className="page narrow">
      <h1>Leaderboard</h1>

      <form className="add-row" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={40} required aria-label="Name" />
        <span className="time-input">
          <input value={minutes} onChange={(e) => setMinutes(e.target.value)} type="number" min="0" max="5999" placeholder="min" aria-label="Minutes" />
          <span>:</span>
          <input value={seconds} onChange={(e) => setSeconds(e.target.value)} type="number" min="0" max="59" placeholder="sec" aria-label="Seconds" required />
        </span>
        <button className="primary">Add</button>
      </form>
      <p className="hint">Fastest time wins. Submitting a name again keeps their best time.</p>
      {error && <p className="error">{error}</p>}

      {players.length === 0 ? (
        <p className="empty">No times on the board yet.</p>
      ) : (
        <ol className="leaderboard">
          {players.map((p, i) => (
            <li key={p.id} className={ranks[i] <= 3 ? `top top-${ranks[i]}` : ''}>
              <span className="rank">{MEDALS[ranks[i] - 1] || ranks[i]}</span>
              <span className="name">{p.name}</span>
              <span className="score">{formatTime(p.seconds)}</span>
              <span className="controls">
                <button className="ghost" onClick={() => remove(p)} aria-label={`Remove ${p.name}`}>✕</button>
              </span>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
