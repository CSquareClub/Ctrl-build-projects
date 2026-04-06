document.getElementById("profileForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const formData = new FormData(this);

  let data = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });

  // Convert values to numbers
  let commitment = Number(data.commitmentHours);
  let experience = Number(data.experience);
  let confidence = Number(data.confidence);

  // Reliability Score Formula
  let score =
    (commitment * 0.4) +
    (experience * 10 * 0.3) +
    (confidence * 10 * 0.3);

  score = Math.round(score);

  // Display
  document.getElementById("resultCard").classList.remove("hidden");
  document.getElementById("score").innerText = score + "%";

  // Message logic
  let message = "";

  if (score > 75) {
    message = "🔥 Highly Reliable - Strong Teammate!";
  } else if (score > 50) {
    message = "⚡ Moderately Reliable - Good Potential";
  } else {
    message = "⚠️ Needs Improvement - Low Commitment";
  }

  document.getElementById("message").innerText = message;
});