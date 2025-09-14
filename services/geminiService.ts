import { GoogleGenAI } from "@google/genai";

export const getGoogleSearchContext = async (
  topicSentence: string,
  apiKey: string
): Promise<string> => {
  try {
    if (!apiKey) {
      throw new Error("API_KEY is not provided.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Based on the latest information from Google Search, provide a concise summary of the key entities, visual elements, and the general sentiment associated with the following news topic: "${topicSentence}". Focus on descriptions that would be useful for creating a news feature image.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const context = response.text;
    if (!context) {
        console.warn("Google Search grounding did not return any context.");
        return "";
    }
    return context.trim();
  } catch (error: any) {
    console.error("Error getting Google Search context:", error);
    // Do not fail the entire process if search fails; just return empty context.
    return "";
  }
};

export const generateSafeImagePrompt = async (
  topicSentence: string,
  writingInstructions: string,
  imagePrompt: string,
  searchContext: string,
  apiKey: string
): Promise<string> => {
  try {
    if (!apiKey) {
      throw new Error("API_KEY is not provided.");
    }
    const ai = new GoogleGenAI({ apiKey });
    
    const systemInstruction = `You are a highly creative and safety-conscious prompt engineer for a news publication's text-to-image AI. Your task is to synthesize a user-provided image prompt, a news topic, stylistic instructions, and fresh context from a Google Search to create a completely safe, symbolic, and visually rich final prompt.

**Core Safety Mandate: The final prompt must be 100% policy-compliant and suitable for a general audience. It must not contain any words or concepts related to violence, conflict, aggression, hatred, or direct confrontation between individuals.**

Your process:
1.  **Prioritize User Prompt:** Your primary goal is to refine and enhance the user's provided 'Ready Image Prompt'. This is the core creative direction.
2.  **Synthesize Context:** Analyze the original topic, stylistic instructions, and Google Search context to add detail, ensure relevance, and ground the image in reality.
3.  **Find a Safe, Relevant Metaphor:** If the topic is sensitive, create a powerful visual metaphor that is grounded in the current reality described by the search context.
4.  **Incorporate Style:** Weave the user's 'News Style Instructions' into the visual description of your new prompt. If they ask for 'dark and gritty', describe 'dramatic chiaroscuro lighting and a moody, textured background'.
5.  **Focus on Objects and Atmosphere:** Center the prompt on symbolic objects, artistic styles, and evocative atmospheres rather than on direct actions between people.
6.  **Final Output:** The output must be ONLY the new, safe prompt. Do not include any explanations, prefixes, or the original text. The image should not contain words.`;

    const userPrompt = `Ready Image Prompt: "${imagePrompt}"
Google Search Context: "${searchContext}"
Original Topic: "${topicSentence}"
News Style Instructions: "${writingInstructions}"

Rewrite this into a safe, contextually relevant, and visually descriptive prompt for an image generation AI. Prioritize the 'Ready Image Prompt' as the primary creative direction, but enhance it with details from the topic, context, and style instructions. Follow all the rules in your system instruction.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.5,
      },
    });

    const safePrompt = response.text.trim();
    if (!safePrompt) {
        throw new Error("Failed to generate a safe prompt from the topic.");
    }

    return `${safePrompt}, editorial style, high-quality news feature image, cinematic lighting`;

  } catch (error: any) {
    console.error("Error generating safe prompt:", error);
    throw new Error(`Gemini API Error: Failed to generate a safe prompt. ${error.message}`);
  }
};


export const generateImage = async (prompt: string, apiKey: string, model: string): Promise<string> => {
  try {
    if (!apiKey) {
      throw new Error("API_KEY is not provided.");
    }
    
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // FIX: Switched to `generateImages` with the 'imagen-4.0-generate-001' model for dedicated image generation,
    // adhering to the provided Gemini API guidelines for better performance and correctness.
    const response = await ai.models.generateImages({
        model: model,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
        },
    });

    // FIX: Updated response parsing logic to match the structure of the `generateImages` API response.
    const image = response.generatedImages?.[0]?.image?.imageBytes;

    if (image) {
      return image;
    }
    
    throw new Error("Image generation failed: The model did not return an image. This could be due to safety filters or other issues.");

  } catch (error: any) {
    console.error("Error generating image with Gemini API:", error);
    // Pass a more user-friendly error message
    const message = error.message || "An unknown error occurred during image generation.";
    throw new Error(`Gemini API Error: ${message}`);
  }
};