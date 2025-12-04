import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  content: string;
  apiKey: string;
  language?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { content, apiKey, language }: RequestPayload = await req.json();
    const lang = language || 'ja';

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const prompt = lang === 'en'
      ? `Please generate a concise and clear meeting title from the following meeting content. The title should be within 50 characters and represent the main topic of the meeting. Return only the title.\n\nMeeting Content:\n${content.substring(0, 1000)}`
      : `以下の会議内容から、簡潔で分かりやすい会議タイトルを生成してください。タイトルは20文字以内で、会議の主要なトピックを表現してください。タイトルのみを返してください。\n\n会議内容:\n${content.substring(0, 1000)}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }],
          }],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: "Failed to generate title", details: errorText }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const data = await response.json();
    const title = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "無題の会議";

    return new Response(
      JSON.stringify({ title }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});