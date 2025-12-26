
import { GoogleGenAI } from "@google/genai";

// Guideline: Create a new GoogleGenAI instance right before making an API call 
// to ensure it always uses the most up-to-date API key from the environment/dialog.

export const generateTechnicalReport = async (problemDescription: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Com base no seguinte problema técnico relatado: "${problemDescription}", gere uma sugestão curta e profissional de laudo técnico de reparo (em português) para ser enviado ao cliente. Seja direto e explique o que provavelmente precisa ser feito.`,
    });
    // Property .text is used correctly as per guidelines
    return response.text || "Não foi possível gerar sugestão automática.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Não foi possível gerar sugestão automática.";
  }
};

export const getBusinessInsights = async (stats: any) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Como consultor de negócios, analise estes dados de uma oficina: ${JSON.stringify(stats)}. Forneça 3 dicas rápidas para aumentar os lucros ou melhorar a eficiência. Formate em markdown curto.`,
    });
    // Property .text is used correctly as per guidelines
    return response.text || "Dicas de IA indisponíveis no momento.";
  } catch (error) {
    return "Dicas de IA indisponíveis no momento.";
  }
};
