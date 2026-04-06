import { GoogleGenerativeAI } from '@google/generative-ai'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const getGeminiApiKey = () => import.meta.env.VITE_GEMINI_API_KEY as string | undefined

const modelCandidates = ['gemini-1.5-flash', 'gemini-2.0-flash']

const isQuotaError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false
  }

  return /429|quota exceeded|rate limit|limit: 0/i.test(error.message)
}

const buildPrompt = (messages: ChatMessage[]) => {
  const conversation = messages
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
    .join('\n')

  return [
    'You are FocusRoom AI, a helpful study assistant inside a productivity app.',
    'Answer clearly, directly, and with practical steps when possible.',
    'If the user asks a follow-up question, use the prior conversation for context.',
    'If the answer is uncertain, say so briefly and offer the best available guidance.',
    '',
    conversation,
    'Assistant:',
  ].join('\n')
}

export const sendGeminiMessage = async (messages: ChatMessage[]) => {
  const apiKey = getGeminiApiKey()

  if (!apiKey) {
    throw new Error('Missing Gemini API key. Set VITE_GEMINI_API_KEY in your environment.')
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) {
      throw new Error('No message to send.')
    }

    const prompt = buildPrompt(messages)

    let lastError: unknown

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent(prompt)
        const answer = result.response.text()

        if (!answer) {
          throw new Error('Gemini returned an empty response.')
        }

        return answer
      } catch (error) {
        lastError = error
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Gemini request failed for all configured models.')
  } catch (error) {
    if (isQuotaError(error)) {
      throw new Error(
        'Gemini quota has been exceeded for this project. Enable billing or switch to a project with available Gemini quota, then try again.',
      )
    }

    if (error instanceof Error) {
      throw new Error(`Gemini API error: ${error.message}`)
    }

    throw error
  }
}
