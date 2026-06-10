
import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('AI Advice: Gemini API Key is not set. To enable AI suggestions, add GEMINI_API_KEY as a secret in GitHub Actions or configure it in your web server.');
    }
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
};

export const getEquipmentAdvice = async (sceneDescription: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Suggest a filming equipment list for the following scene: "${sceneDescription}". 
      Focus on camera choice, lens focal lengths, lighting style, and audio needs. 
      Format as a concise technical recommendation for a professional crew.`,
      config: {
        systemInstruction: "You are a world-class Cinematographer and Gaffer advising a film crew on equipment selection.",
      }
    });
    return response.text;
  } catch (error: any) {
    console.error("AI Advice Error:", error);
    return `Unable to get AI advice: ${error.message || error}`;
  }
};
