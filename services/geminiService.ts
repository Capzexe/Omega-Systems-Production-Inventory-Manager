import { apiRequest } from './api';

export const getEquipmentAdvice = async (sceneDescription: string): Promise<string> => {
  try {
    const result = await apiRequest('advice', { method: 'POST', body: JSON.stringify({ prompt: sceneDescription }) });
    return result.text;
  } catch (error) {
    return error instanceof Error ? error.message : 'Unable to get AI advice.';
  }
};
