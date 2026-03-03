const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

interface GenerateTTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  languageCode?: string;
}

/**
 * Genera audio TTS via ElevenLabs API.
 * Retorna un Buffer con el MP3 generado.
 * Voz masculina, clara, en castellano — optimizada para entorno de fábrica.
 */
export async function generateTTS(options: GenerateTTSOptions): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY no configurada");
  }

  const voiceId = options.voiceId || process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
  const modelId = options.modelId || "eleven_multilingual_v2";
  const languageCode = options.languageCode || "es";

  const response = await fetch(
    `${ELEVENLABS_API_URL}/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: options.text,
        model_id: modelId,
        language_code: languageCode,
        voice_settings: {
          stability: 0.7,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("ElevenLabs API error:", response.status, errorText);
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Genera TTS y sube el audio a GCS.
 * Retorna el path GCS (sin tenant prefix).
 */
export async function generateAndUploadTTS(
  stepId: string,
  text: string
): Promise<string> {
  const { uploadBuffer } = await import("@/lib/gcs");

  const audioBuffer = await generateTTS({ text });
  const gcsPath = `tts/${stepId}.mp3`;
  await uploadBuffer(audioBuffer, gcsPath, "audio/mpeg");

  return gcsPath;
}
