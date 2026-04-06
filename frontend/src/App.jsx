import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TriageResultsPage from './pages/TriageResultsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/triage" element={<TriageResultsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
