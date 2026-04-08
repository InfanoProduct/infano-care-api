import { env } from 'process';

async function testGroq() {
  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const apiKey = process.env.GROQ_API_KEY; // loaded from environment

  console.log("Testing Groq API with Llama3-70b-8192...");

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: 'You are a bot.' }, { role: 'user', content: 'Hello' }],
        temperature: 0.7,
        max_tokens: 10,
      })
    });

    const data = await response.json();
    console.log("Response data:", JSON.stringify(data, null, 2));

  } catch (error) {
    console.error("Fetch error:", error);
  }
}

testGroq();
