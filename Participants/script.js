// NAVIGATION
function goToDashboard() {
  window.location.href = "dashboard.html";
}

function goToProfile() {
  window.location.href = "index.html";
}

function goToSearch() {
  window.location.href = "search.html";
}

function goToTeam() {
  window.location.href = "team.html";
}

// RELIABILITY SCORE
function calculateScore() {
  const exp = document.getElementById("experience").value;
  const commit = document.getElementById("commitment").value;
  const conf = document.getElementById("confidence").value;

  const score = (commit * 0.4) + (exp * 10 * 0.3) + (conf * 10 * 0.3);

  document.getElementById("result").innerText = "Score: " + score;
}

// SEARCH
function searchHackathon() {
  const input = document.getElementById("searchInput").value;
  const results = document.getElementById("results");

  results.innerHTML = `
    <div class="card">
      <h3>${input} Hackathon</h3>
      <p>Status: Open</p>
    </div>
  `;
}

// TEAM GENERATION
function generateTeam() {
  const team = document.getElementById("teamResults");

  team.innerHTML = `
    <div class="card">
      <h3>Frontend Dev</h3>
      <p>Score: 85</p>
    </div>
    <div class="card">
      <h3>Backend Dev</h3>
      <p>Score: 90</p>
    </div>
    <div class="card">
      <h3>Designer</h3>
      <p>Score: 80</p>
    </div>
  `;
}