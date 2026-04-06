let masterKey = null;
let userId = null;

// Generate userId from master password (for demo purposes)
function unlockVault() {
  const masterPassword = document.getElementById('master-password').value;
  
  if (masterPassword.length < 8) {
    alert('Master password must be at least 8 characters');
    return;
  }

  // Generate encryption key from master password
  masterKey = CryptoJS.SHA256(masterPassword).toString();
  userId = CryptoJS.MD5(masterPassword).toString(); // User ID

  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('vault-section').style.display = 'block';
  
  loadPasswords();
}

// Encrypt password using AES
function encryptPassword(password) {
  return CryptoJS.AES.encrypt(password, masterKey).toString();
}

// Decrypt password using AES
function decryptPassword(encryptedPassword) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, masterKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    return '[Decryption Failed]';
  }
}

// Save password to vault
async function savePassword() {
  const website = document.getElementById('website').value;
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  if (!website || !username || !password) {
    alert('Please fill all fields');
    return;
  }

  const encryptedPassword = encryptPassword(password);

  try {
    const response = await fetch('http://localhost:5000/api/vault/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        website,
        username,
        encryptedPassword
      })
    });

    const data = await response.json();
    
    if (data.success) {
      alert('Password saved successfully!');
      document.getElementById('website').value = '';
      document.getElementById('username').value = '';
      document.getElementById('password').value = '';
      loadPasswords();
    }
  } catch (error) {
    alert('Error saving password: ' + error.message);
  }
}

// Load and display passwords
async function loadPasswords() {
  try {
    const response = await fetch(`http://localhost:5000/api/vault/retrieve/${userId}`);
    const data = await response.json();

    if (data.success) {
      displayPasswords(data.data);
    }
  } catch (error) {
    console.error('Error loading passwords:', error);
  }
}

// Display passwords in UI
function displayPasswords(entries) {
  const listDiv = document.getElementById('password-list');
  listDiv.innerHTML = '';

  entries.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'password-entry';
    div.innerHTML = `
      <h3>${entry.website}</h3>
      <p><strong>Username:</strong> ${entry.username}</p>
      <p><strong>Password:</strong> 
        <span id="pwd-${entry._id}">••••••••</span>
        <button onclick="togglePassword('${entry._id}', '${entry.encryptedPassword}')">Show</button>
        <button onclick="copyPassword('${entry.encryptedPassword}')">Copy</button>
      </p>
    `;
    listDiv.appendChild(div);
  });
}

// Toggle password visibility
function togglePassword(id, encryptedPassword) {
  const span = document.getElementById(`pwd-${id}`);
  if (span.textContent === '••••••••') {
    span.textContent = decryptPassword(encryptedPassword);
  } else {
    span.textContent = '••••••••';
  }
}

// Copy password to clipboard
function copyPassword(encryptedPassword) {
  const password = decryptPassword(encryptedPassword);
  navigator.clipboard.writeText(password);
  alert('Password copied to clipboard!');
}
