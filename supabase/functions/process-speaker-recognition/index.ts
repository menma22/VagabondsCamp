import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SpeakerRecognitionRequest {
  audioUrl: string;
  meetingId: string;
  action: "register" | "identify";
  speakerId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { audioUrl, meetingId, action, speakerId }: SpeakerRecognitionRequest = await req.json();

    const SPEAKER_API_URL = Deno.env.get("SPEAKER_API_URL");
    const SPEAKER_API_KEY = Deno.env.get("SPEAKER_API_KEY");

    if (!SPEAKER_API_URL || !SPEAKER_API_KEY) {
      throw new Error("Speaker API configuration missing");
    }

    // Download audio from Supabase Storage
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error("Failed to download audio file");
    }

    const audioBlob = await audioResponse.blob();

    // Prepare request to FastAPI
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.wav");

    let endpoint = "";
    if (action === "register" && speakerId) {
      endpoint = `${SPEAKER_API_URL}/api/register-speaker?speaker_id=${speakerId}`;
    } else if (action === "identify") {
      endpoint = `${SPEAKER_API_URL}/api/identify-speaker?threshold=0.5`;
    } else {
      throw new Error("Invalid action or missing parameters");
    }

    // Call FastAPI speaker recognition service
    const recognitionResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "X-API-Key": SPEAKER_API_KEY,
      },
      body: formData,
    });

    if (!recognitionResponse.ok) {
      const errorText = await recognitionResponse.text();
      throw new Error(`Speaker API error: ${errorText}`);
    }

    const result = await recognitionResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        meetingId,
        action,
        result,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing speaker recognition:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
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
