import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
console.log('Testing API Key:', apiKey ? (apiKey.substring(0, 5) + '...') : 'MISSING');

if (!apiKey) {
    console.error('API Key is missing');
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function test() {
    try {
        const models = await ai.models.list();
        console.log('Success! Models available:', models.length);
    } catch (error: any) {
        console.error('API Key Test Failed:');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('Full Error:', JSON.stringify(error, null, 2));
    }
}

test();
