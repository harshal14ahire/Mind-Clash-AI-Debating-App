import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "AI Debate Club",
    },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'POST') {
        const { model, messages, stream = true, max_tokens = 1000 } = req.body;

        try {
            if (stream) {
                const completion = await openai.chat.completions.create({
                    model,
                    messages,
                    stream: true,
                    max_tokens,
                });

                res.setHeader("Content-Type", "text/event-stream");
                res.setHeader("Cache-Control", "no-cache");
                res.setHeader("Connection", "keep-alive");

                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content || "";
                    if (content) {
                        res.write(`data: ${JSON.stringify({ content })}\n\n`);
                    }
                }
                res.write("data: [DONE]\n\n");
                res.end();
            } else {
                const completion = await openai.chat.completions.create({
                    model,
                    messages,
                    max_tokens,
                });
                res.status(200).json(completion.choices[0].message);
            }
        } catch (error: any) {
            console.error("Chat error details:", {
                message: error.message,
                status: error.status,
                code: error.code,
                model: model
            });
            res.status(error.status || 500).json({
                error: error.message || "Failed to generate response",
                code: error.code
            });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
