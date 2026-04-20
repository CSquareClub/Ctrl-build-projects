document.addEventListener('DOMContentLoaded', () => {
  const btnStart = document.getElementById('btnStart');
  const btnStop = document.getElementById('btnStop');
  const btnDash = document.getElementById('btnDash');
  const durPills = document.querySelectorAll('.dur-pill');
  const timerBig = document.getElementById('timerBig');
  const timerSub = document.getElementById('timerSub');
  const sDot = document.getElementById('sDot');
  const sLabel = document.getElementById('sLabel');
  const focusVal = document.getElementById('focusVal');
  const distractVal = document.getElementById('distractVal');

  let selectedDuration = 45;
  let sessionActive = false;
  let pollInterval = null;

  const customDur = document.getElementById('customDur');

  // Duration selector
  durPills.forEach(pill => {
    pill.addEventListener('click', () => {
      if (sessionActive || pill.tagName === 'INPUT') return;
      durPills.forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedDuration = parseInt(pill.getAttribute('data-val'), 10);
      timerBig.textContent = `${selectedDuration}:00`;
      customDur.value = ''; // clear custom input
    });
  });

  if (customDur) {
    customDur.addEventListener('input', (e) => {
      if (sessionActive) return;
      const val = parseInt(e.target.value, 10);
      if (val > 0) {
        durPills.forEach(p => p.classList.remove('selected'));
        selectedDuration = val;
        timerBig.textContent = `${selectedDuration}:00`;
      }
    });
  }

  // Start Session
  btnStart.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'MANUAL_START', duration: selectedDuration }, (res) => {
      if (res && res.ok) {
        updateState();
      }
    });
  });

  // Stop Session
  btnStop.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'MANUAL_STOP' }, (res) => {
      if (res && res.ok) {
        updateState();
      }
    });
  });

  // Open Dashboard
  btnDash.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/analytics' });
  });

  // UI Polling
  function updateState() {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
      if (!state) return;

      sessionActive = state.sessionActive;
      
      if (state.socketConnected) {
        sDot.className = 's-dot on';
        sLabel.textContent = 'Backend online';
      } else {
        sDot.className = 's-dot off';
        sLabel.textContent = 'Backend offline';
      }

      focusVal.textContent = state.focusScore ?? 100;
      distractVal.textContent = state.distractionCount ?? 0;

      if (sessionActive) {
        btnStart.disabled = true;
        btnStop.disabled = false;
        durPills.forEach(p => p.style.pointerEvents = 'none');
        
        // Calculate remaining
        const elapsed = (Date.now() - state.sessionStartTime) / 1000;
        const total = state.sessionDuration * 60;
        const remain = Math.max(0, total - elapsed);
        
        const m = Math.floor(remain / 60);
        const s = Math.floor(remain % 60);
        timerBig.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        timerSub.textContent = 'Focus Session Active';
      } else {
        btnStart.disabled = false;
        btnStop.disabled = true;
        durPills.forEach(p => p.style.pointerEvents = 'auto');
        timerSub.textContent = 'No session running';
        timerBig.textContent = `${selectedDuration}:00`;
      }
    });
  }

  // Poll state every second
  updateState();
  pollInterval = setInterval(updateState, 1000);
});
