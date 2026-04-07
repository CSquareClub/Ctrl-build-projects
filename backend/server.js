import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'

const app = express()
const port = Number(process.env.PORT || 8787)
const apiKey = process.env.GEMINI_API_KEY
const configuredModels = (process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || '')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean)
const modelCandidates = [...new Set([...configuredModels, 'gemini-1.5-flash'])]

// Greeting detection
const isGreeting = (message) => {
  const greetings = ['hi', 'hello', 'hey', 'yo', 'hii', 'hlo', 'greetings', 'sup', 'whats up']
  return greetings.some((greeting) => message.toLowerCase().trim() === greeting)
}

// Delay utility
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const isQuotaError = (errorMessage) => /429|quota|rate limit|resource has been exhausted/i.test(errorMessage)
const isModelNotFoundError = (errorMessage) => /404\s*Not\s*Found|is not found|not supported for generateContent/i.test(errorMessage)

// Retry logic for API calls
const callGeminiWithRetry = async (genAI, message, models, maxRetries = 3) => {
  let lastError

  for (const modelName of models) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent(message)
        const answer = result.response.text()?.trim()

        if (!answer) {
          throw new Error('Gemini returned an empty response.')
        }

        return answer
      } catch (error) {
        lastError = error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        if (isModelNotFoundError(errorMessage)) {
          console.warn(`Gemini model unavailable: ${modelName}. Trying next model...`)
          break
        }

        if (isQuotaError(errorMessage) && attempt < maxRetries) {
          console.log(`Quota error, retrying in 2 seconds (attempt ${attempt}/${maxRetries}) on ${modelName}...`)
          await delay(2000)
          continue
        }

        throw error
      }
    }
  }

  if (lastError instanceof Error && isModelNotFoundError(lastError.message)) {
    throw new Error(`No supported Gemini model found. Tried: ${models.join(', ')}`)
  }

  throw lastError
}

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(express.static('public'))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

// Main chat endpoint
app.post('/chat', async (req, res) => {
  const userMessage = req.body?.message?.trim()

  // Validate input
  if (!userMessage) {
    return res.status(400).json({ response: 'Please provide a message.' })
  }

  // Check for greetings first (no API call needed)
  if (isGreeting(userMessage)) {
    return res.json({ response: 'Whatsup 👋 How can I help you today?' })
  }

  // Validate API key
  if (!apiKey) {
    return res.status(500).json({ response: 'Server configuration error. API key missing.' })
  }

  try {
    // Add delay to avoid rapid-fire requests
    await delay(1000)

    const genAI = new GoogleGenerativeAI(apiKey)
    const response = await callGeminiWithRetry(genAI, userMessage, modelCandidates)

    // Clean response (remove markdown symbols if any)
    const cleanResponse = response
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/\*/g, '') // Remove italic markers
      .replace(/#{1,6}\s/g, '') // Remove headers
      .trim()

    return res.json({ response: cleanResponse })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (isQuotaError(errorMessage)) {
      return res.status(429).json({
        response: 'API quota exceeded. Please check your billing and try again later.',
      })
    }

    if (isModelNotFoundError(errorMessage) || /No supported Gemini model found/i.test(errorMessage)) {
      return res.status(503).json({
        response: 'AI model unavailable on this server. Please update GEMINI_MODEL(S) and try again.',
      })
    }

    console.error('Gemini API error:', errorMessage)
    return res.status(500).json({
      response: 'Server busy, please try again in a moment.',
    })
  }
})

// Legacy endpoint for compatibility
app.post('/api/ai/chat', async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : []
  const lastUserMessage = messages
    .reverse()
    .find((m) => m.role === 'user')?.content

  if (!lastUserMessage) {
    return res.status(400).json({ error: 'No user message found.' })
  }

  // Forward to new /chat endpoint
  const response = await fetch(`http://localhost:${port}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: lastUserMessage }),
  })

  const data = await response.json()
  
  if (response.ok) {
    return res.json({ answer: data.response })
  } else {
    return res.status(response.status).json({ error: data.response })
  }
})

app.listen(port, () => {
  console.log(`🤖 AI Chat Assistant listening on http://localhost:${port}`)
  console.log(`🧠 Gemini model candidates: ${modelCandidates.join(', ')}`)
  console.log(`📝 POST /chat - Send user messages`)
  console.log(`❤️  GET /health - Health check`)
})
