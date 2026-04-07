# AI Chat Assistant Backend

A Node.js + Express server providing Gemini API integration for an intelligent study assistant.

## 🚀 Features

- ✅ **Greeting Detection** - Instant responses for greetings (hi, hello, hey, etc.) without API calls
- ✅ **Gemini 1.5 Flash** - Fast, efficient responses using Google's latest model
- ✅ **Retry Logic** - Automatic retry with 2-second delay on quota/rate-limit errors (max 3 attempts)
- ✅ **Request Delay** - 1-2 second delay between requests to avoid rate limiting
- ✅ **Error Handling** - User-friendly error messages for quota, connection, and server errors
- ✅ **Static File Serving** - Built-in web UI at `/public/index.html`
- ✅ **CORS Enabled** - Supports requests from frontend applications
- ✅ **Backwards Compatible** - Legacy `/api/ai/chat` endpoint supported

---

## 📦 Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file in this directory:
```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:
```
GEMINI_API_KEY=your_actual_key_here
PORT=8787
```

Get a free API key: https://aistudio.google.com/app/apikeys

---

## ▶️ Running the Server

### Development Mode
```bash
npm start
# or
node server.js
```

Server will start on `http://localhost:8787`

### With Auto-Restart (Optional)
```bash
npm install -D nodemon
npx nodemon server.js
```

---

## 📡 API Endpoints

### 1. POST `/chat` - Main Chat Endpoint

**Request:**
```json
{
  "message": "hello"
}
```

**Response (Greeting):**
```json
{
  "response": "Whatsup 👋 How can I help you today?"
}
```

**Response (Query):**
```json
{
  "response": "Binary search is an efficient algorithm that finds a target value in a sorted array..."
}
```

**Response (Error):**
```json
{
  "response": "Server busy, please try again in a moment."
}
```

### 2. GET `/health` - Health Check

**Response:**
```json
{
  "ok": true
}
```

### 3. POST `/api/ai/chat` - Legacy Endpoint (Backwards Compatible)

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "hello"}
  ]
}
```

**Response:**
```json
{
  "answer": "Whatsup 👋 How can I help you today?"
}
```

---

## 🎯 Behavior

### Greeting Detection
Instant response without API call for:
- "hi", "hello", "hey", "yo", "hii", "hlo", "greetings", "sup", "whats up"

Response: `Whatsup 👋 How can I help you today?`

### Regular Queries
1. Add 1-second delay to avoid rapid requests
2. Send to Gemini API (gemini-1.5-flash)
3. If quota error (429):
   - Retry after 2 seconds
   - Maximum 3 attempts
4. Return clean text response (stripped of markdown)

### Error Handling
- **Missing API Key**: "Server configuration error. API key missing."
- **Quota Exceeded (429)**: "API quota exceeded. Please check your billing and try again later."
- **Other Errors**: "Server busy, please try again in a moment."

---

## 🌐 Frontend Integration

### Using Fetch API
```javascript
const response = await fetch('http://localhost:8787/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'What is DSA?' })
})

const data = await response.json()
console.log(data.response)
```

### Open Web UI
Visit: `http://localhost:8787`

A beautiful chat interface is served from `/public/index.html`

---

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | - | Google Gemini API Key (required) |
| `PORT` | 8787 | Server port |

---

## 🔧 Troubleshooting

### 429 Quota Exceeded
1. Get a new API key from https://aistudio.google.com/app/apikeys
2. Update `.env` with new key
3. Restart server: `node server.js`

### CORS Errors
- CORS is enabled globally
- Ensure backend is running on port 8787
- Check frontend proxy configuration in Vite/webpack

### Connection Refused
```bash
# Check if port 8787 is in use
lsof -i :8787

# Kill existing process
pkill -f "node server.js"

# Restart
node server.js
```

---

## 📋 Example Usage

### Test Greeting
```bash
curl -X POST http://localhost:8787/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hi"}'
```

### Test Query
```bash
curl -X POST http://localhost:8787/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is binary search?"}'
```

### Health Check
```bash
curl http://localhost:8787/health
```

---

## 📚 Project Structure

```
backend/
├── server.js           # Main Express server
├── package.json        # Dependencies
├── .env               # API keys (not in git)
├── .env.example       # Template
├── public/
│   └── index.html     # Web UI
└── README.md          # This file
```

---

## 🛠️ Development

### Code Style
- ESM modules (import/export)
- Async/await for error handling
- Clear error messages for users

### Testing Endpoints
Use any HTTP client: curl, Postman, Thunder Client, or the built-in web UI

---

## 📝 License

Part of the Aura-Pharm study platform
