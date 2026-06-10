
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getEquipmentAdvice = async (sceneDescription: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest a filming equipment list for the following scene: "${sceneDescription}". 
      Focus on camera choice, lens focal lengths, lighting style, and audio needs. 
      Format as a concise technical recommendation for a professional crew.`,
      config: {
        systemInstruction: "You are a world-class Cinematographer and Gaffer advising a film crew on equipment selection.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI Advice Error:", error);
    return "Unable to get AI advice at this time. Please check your production plan manually.";
  }
};
