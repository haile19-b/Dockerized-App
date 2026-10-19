/**
 * Gemini API Integration Service
 * Uses Google's official SDK to generate responses.
 */

let GoogleGenAI;
let GoogleGenerativeAI;

try {
  ({ GoogleGenAI } = require('@google/genai'));
} catch (e) {
  // @google/genai fallback
}

try {
  ({ GoogleGenerativeAI } = require('@google/generative-ai'));
} catch (e) {
  // @google/generative-ai fallback
}

async function generateChatResponse(userPrompt, conversationHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY;

  // Gracefully handle missing or placeholder API key
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key_here')) {
    return '⚠️ Google Gemini API key is not configured. Please set your `GEMINI_API_KEY` in the `.env` file and restart the backend container to enable live AI responses.';
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // Strategy 1: Use official @google/genai SDK
  if (GoogleGenAI) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn(`[@google/genai] Call with ${modelName} encountered an error: ${err.message}. Trying fallback...`);
    }
  }

  // Strategy 2: Use @google/generative-ai SDK with fallback models
  if (GoogleGenerativeAI) {
    const candidateModels = [modelName, 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    const uniqueModels = [...new Set(candidateModels)];

    for (const modelToTry of uniqueModels) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelToTry });
        const result = await model.generateContent(userPrompt);
        const response = await result.response;
        const text = response.text();
        if (text) {
          return text;
        }
      } catch (err) {
        console.warn(`[@google/generative-ai] Model ${modelToTry} failed: ${err.message}`);
        // If it's an invalid API key, no need to retry models
        if (err.message && (err.message.includes('API_KEY_INVALID') || err.message.includes('API key not valid'))) {
          return '❌ The provided GEMINI_API_KEY is invalid. Please verify your API key in Google AI Studio.';
        }
      }
    }
  }

  return '❌ Unable to generate a response from Gemini at this moment. Please check your API key and network connectivity.';
}

module.exports = {
  generateChatResponse,
};
