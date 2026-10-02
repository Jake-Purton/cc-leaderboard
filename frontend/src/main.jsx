import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import Leaderboard from './pages/Leaderboard.jsx';
import Notes from './pages/Notes.jsx';
import './styles.css';

function App() {
  return (
    <>
      <header className="topbar">
        <span className="brand">📌 Notice Board</span>
        <nav>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/notes">Post-its</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="*" element={<Navigate to="/leaderboard" replace />} />
      </Routes>
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
