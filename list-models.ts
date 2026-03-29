
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("API Key found:", !!apiKey);
    if (!apiKey) return;

    const ai = new GoogleGenAI({ apiKey });

    try {
        console.log("Fetching models...");
        const result = await ai.models.list();
        console.log("Result received:", typeof result);
        
        // Let's iterate if it's an iterator
        if (Symbol.asyncIterator in result) {
            console.log("Result is an async iterator");
            for await (const model of result as any) {
                console.log("Model:", model.name);
            }
        } else if (Array.isArray(result)) {
            console.log("Result is an array");
            result.forEach((m: any) => console.log("Model:", m.name));
        } else {
            console.log("Result structure:", Object.keys(result));
        }
    } catch (e: any) {
        console.error("List failed:", e.message);
        if (e.stack) console.error(e.stack);
    }
}

listModels();
