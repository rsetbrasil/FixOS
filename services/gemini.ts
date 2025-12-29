
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Guideline: Create a new GoogleGenAI instance right before making an API call 
// to ensure it always uses the most up-to-date API key from the environment/dialog.

/**
 * Generates a technical report suggestion based on a problem description.
 * Uses gemini-3-flash-preview for fast text generation.
 */
export const generateTechnicalReport = async (problemDescription: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Com base no seguinte problema técnico relatado: "${problemDescription}", gere uma sugestão curta e profissional de laudo técnico de reparo (em português) para ser enviado ao cliente. Seja direto e explique o que provavelmente precisa ser feito.`,
    });
    // Property .text is used correctly as per guidelines (not a method)
    return response.text || "Não foi possível gerar sugestão automática.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Não foi possível gerar sugestão automática.";
  }
};

/**
 * Analyzes shop statistics to provide strategic business advice.
 * Uses thinkingBudget to guide the model's reasoning process.
 * Guideline: Using gemini-3-pro-preview for complex reasoning tasks.
 */
export const getBusinessInsights = async (stats: any): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
      // Complex reasoning task: analyze data and provide strategic advice
      model: 'gemini-3-pro-preview',
      contents: `Como consultor de negócios, analise estes dados de uma oficina: ${JSON.stringify(stats)}. Forneça 3 dicas rápidas para aumentar os lucros ou melhorar a eficiência. Formate em markdown curto.`,
      config: {
        // Disabling thinking for lower latency as the prompt asks for "quick tips"
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    // Property .text is used correctly as per guidelines (not a method)
    return response.text || "Dicas de IA indisponíveis no momento.";
  } catch (error) {
    console.error("Gemini Business Insight Error:", error);
    return "Dicas de IA indisponíveis no momento.";
  }
};
