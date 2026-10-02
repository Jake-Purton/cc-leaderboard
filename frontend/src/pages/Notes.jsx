import { useCallback, useEffect, useRef, useState } from 'react';
import { api, poll } from '../api.js';

const COLORS = ['yellow', 'pink', 'blue', 'green', 'orange'];
const NOTE_SIZE = 180;

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');
  const [color, setColor] = useState('yellow');
  const [error, setError] = useState('');
  const wallRef = useRef(null);
  const drag = useRef(null);

  const load = useCallback(() => {
    // Don't overwrite a note while it's being dragged.
    if (drag.current) return;
    api('/notes').then(setNotes).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    return poll(load);
  }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setError('');
    const wall = wallRef.current;
    // Drop new notes somewhere in the currently visible part of the wall.
    const maxX = Math.max(0, wall.clientWidth - NOTE_SIZE - 16);
    const top = Math.max(0, window.scrollY - wall.offsetTop);
    const x = Math.round(Math.random() * maxX);
    const y = Math.round(top + Math.random() * Math.max(0, Math.min(window.innerHeight, wall.clientHeight) - NOTE_SIZE - 120));
    try {
      const note = await api('/notes', { method: 'POST', body: { text, color, x, y } });
      setNotes((ns) => [...ns, note]);
      setText('');
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (note) => {
    setNotes((ns) => ns.filter((n) => n.id !== note.id));
    try {
      await api(`/notes/${note.id}`, { method: 'DELETE' });
    } catch (err) {
      setError(err.message);
      load();
    }
  };

  const onPointerDown = (e, note) => {
    if (e.target.closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: note.id, dx: e.clientX - note.x, dy: e.clientY - note.y, moved: false };
    // Bring to front.
    setNotes((ns) => [...ns.filter((n) => n.id !== note.id), note]);
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const wall = wallRef.current;
    const x = Math.min(Math.max(0, e.clientX - d.dx), wall.clientWidth - NOTE_SIZE);
    const y = Math.min(Math.max(0, e.clientY - d.dy), 5000);
    d.moved = true;
    setNotes((ns) => ns.map((n) => (n.id === d.id ? { ...n, x: Math.round(x), y: Math.round(y) } : n)));
  };

  const onPointerUp = async () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    const note = notes.find((n) => n.id === d.id);
    if (!note) return;
    try {
      await api(`/notes/${note.id}`, { method: 'PATCH', body: { x: note.x, y: note.y } });
    } catch (err) {
      setError(err.message);
    }
  };

  const wallHeight = Math.max(600, ...notes.map((n) => n.y + NOTE_SIZE + 40));

  return (
    <main className="page">
      <h1>Post-its</h1>
      <form className="add-row" onSubmit={add}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a note…"
          maxLength={280}
          required
          aria-label="Note text"
          className="grow"
        />
        <div className="swatches" role="radiogroup" aria-label="Note colour">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              role="radio"
              aria-checked={c === color}
              aria-label={c}
              className={`swatch note-${c}`}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <button className="primary">Stick it</button>
      </form>
      {error && <p className="error">{error}</p>}

      <div className="wall" ref={wallRef} style={{ height: wallHeight }}>
        {notes.length === 0 && <p className="empty">The wall is empty. Add the first note!</p>}
        {notes.map((n) => (
          <div
            key={n.id}
            className={`note note-${n.color}`}
            style={{ left: n.x, top: n.y, width: NOTE_SIZE, minHeight: NOTE_SIZE, '--tilt': `${((n.id * 37) % 7) - 3}deg` }}
            onPointerDown={(e) => onPointerDown(e, n)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <button className="note-delete" onClick={() => remove(n)} aria-label="Remove note">✕</button>
            <p>{n.text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
