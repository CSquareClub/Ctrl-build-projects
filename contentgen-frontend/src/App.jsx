import "./App.css";

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1 className="heading">ContentGen</h1>
        <p className="subtitle">Generate structured content in seconds</p>
      </header>

      <main className="cards-container">
        <div className="card">
          <h2 className="card-title">Create Content</h2>
          <p className="card-desc">Enter a topic or prompt to get started.</p>

          <label className="label" htmlFor="topic">Topic</label>
          <input
            id="topic"
            className="input"
            type="text"
            placeholder="e.g. How to learn Python"
          />

          <label className="label" htmlFor="format">Format</label>
          <select id="format" className="input">
            <option>Blog Post</option>
            <option>Bullet Points</option>
            <option>Social Media Post</option>
            <option>Email Newsletter</option>
          </select>

          <button className="btn">Generate</button>
        </div>

        <div className="card">
          <h2 className="card-title">Generated Output</h2>
          <p className="card-desc">Your content will appear here.</p>

          <div className="output-box">
            <p className="output-placeholder">Nothing generated yet. Hit Generate!</p>
          </div>

          <button className="btn btn-secondary">Copy to Clipboard</button>
        </div>
      </main>
    </div>
  );
}

export default App;