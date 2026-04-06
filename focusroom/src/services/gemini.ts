import { GoogleGenerativeAI } from '@google/generative-ai'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const getGeminiApiKey = () => import.meta.env.VITE_GEMINI_API_KEY as string | undefined

export const sendGeminiMessage = async (messages: ChatMessage[]) => {
  const apiKey = getGeminiApiKey()

  if (!apiKey) {
    throw new Error('Missing Gemini API key. Set VITE_GEMINI_API_KEY in your environment.')
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Try gemini-2.0-flash-exp first, then fall back to gemini-1.5-flash
    let model
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
    } catch {
      model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    }

    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) {
      throw new Error('No message to send.')
    }

    const result = await model.generateContent(lastMessage.content)
    const answer = result.response.text()

    if (!answer) {
      throw new Error('Gemini returned an empty response.')
    }

    return answer
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gemini API error: ${error.message}`)
    }
    throw error
  }
}
