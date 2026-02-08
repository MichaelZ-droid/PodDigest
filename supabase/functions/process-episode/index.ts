import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let episodeId: string | null = null;

  try {
    const body = await req.json();
    episodeId = body.episodeId;

    if (!episodeId) {
      throw new Error("Missing episodeId");
    }

    console.log(`Processing episode: ${episodeId}`);

    // Get episode info
    const { data: episode, error: epError } = await supabase
      .from("episodes")
      .select("*, creator:creators(*)")
      .eq("id", episodeId)
      .single();

    if (epError || !episode) {
      throw new Error(`Episode not found: ${episodeId}`);
    }

    // Update status to processing
    await supabase
      .from("episodes")
      .update({ status: "transcribing" })
      .eq("id", episodeId);

    // Try to get transcript from xiaoyuzhou episode page
    let transcript = "";
    try {
      const epRes = await fetch(episode.original_url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });
      
      if (epRes.ok) {
        const html = await epRes.text();
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/s);
        
        if (nextDataMatch) {
          const nextData = JSON.parse(nextDataMatch[1]);
          const pageProps = nextData?.props?.pageProps;
          
          // Try to get shownotes or description as transcript
          if (pageProps?.episode?.shownotes) {
            transcript = pageProps.episode.shownotes;
          } else if (pageProps?.episode?.description) {
            transcript = pageProps.episode.description;
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch episode transcript:", e);
    }

    // If no transcript found, use episode title and description for demo
    if (!transcript || transcript.length < 100) {
      transcript = `播客标题: ${episode.title}\n\n这是一期来自 ${episode.creator?.name || '未知播主'} 的播客内容。由于暂时无法获取完整的语音转录，系统将基于已有信息生成摘要。`;
    }

    // Update status to summarizing
    await supabase
      .from("episodes")
      .update({ status: "summarizing" })
      .eq("id", episodeId);

    // Call AI API to generate summary
    const AI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    // Default to SiliconFlow if not configured, as requested by user for Fun-ASR support
    const AI_BASE_URL = Deno.env.get("OPENAI_BASE_URL") || "https://api.siliconflow.cn/v1"; 
    const AI_MODEL = Deno.env.get("AI_MODEL") || "gpt-4o-mini";
    
    console.log(`Using AI Provider: ${AI_BASE_URL}, Model: ${AI_MODEL}`);

    if (!AI_API_KEY) {
      throw new Error("AI API token not configured");
    }

    const duration = episode.duration || 3600;

      // Update status to processing
      await supabase
        .from("episodes")
        .update({ status: "processing" }) // Use a generic processing state or specific one
        .eq("id", episodeId);

      // Check if we need to perform ASR (if no transcript found)
      if (!transcript || transcript.length < 100) {
        console.log("No transcript found, attempting ASR...");
        
        await supabase
          .from("episodes")
          .update({ status: "transcribing" })
          .eq("id", episodeId);

        try {
           // Try to use Fun-ASR / OpenAI compatible ASR
           // Since we are in an Edge Function, we cannot easily download large files.
           // We will try to pass the URL directly if the provider supports it (non-standard but common),
           // OR we skip ASR and mark it as such.
           
           // If user provided a specific base URL for ASR (e.g. SiliconFlow)
           if (AI_BASE_URL && episode.audio_url) {
             console.log(`Attempting ASR with URL: ${episode.audio_url}`);
             
             // Construct request for ASR
             // Note: This assumes the provider supports 'url' parameter in JSON body or similar
             // Standard OpenAI is multipart/form-data.
             
             // For SiliconFlow/FunASR, we might need to check their specific API docs.
             // Assuming they might support a remote URL or we have to skip.
             
             // Fallback: Just log that we would transcribe here.
             console.log("ASR not fully implemented for Edge Functions due to file size limits. Using metadata only.");
             transcript = `(音频转写未执行) 标题: ${episode.title}。 描述: ${transcript || "无"}`;
           }
        } catch (e) {
          console.error("ASR failed:", e);
          transcript = `(音频转写失败) ${transcript || ""}`;
        }
      }

      await supabase
        .from("episodes")
        .update({ status: "summarizing" })
        .eq("id", episodeId);


    const durationMin = Math.round(duration / 60);

    const prompt = `你是一个专业的播客内容分析助手。请根据以下播客信息生成结构化的内容摘要。

播客信息:
- 标题: ${episode.title}
- 播主: ${episode.creator?.name || '未知'}
- 时长: ${durationMin}分钟
- 内容/简介:
${transcript.slice(0, 3000)}

请生成以下内容，使用JSON格式返回:
{
  "summary": "200-300字的内容摘要，概括播客的主要内容和核心观点",
  "key_points": ["关键要点1", "关键要点2", "关键要点3", "关键要点4", "关键要点5"],
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "timestamps": [
    {"time": 0, "topic": "开场介绍", "summary": "节目开始，主持人介绍本期主题"},
    {"time": ${Math.round(duration * 0.1)}, "topic": "第一个话题", "summary": "简要描述"},
    {"time": ${Math.round(duration * 0.3)}, "topic": "第二个话题", "summary": "简要描述"},
    {"time": ${Math.round(duration * 0.5)}, "topic": "第三个话题", "summary": "简要描述"},
    {"time": ${Math.round(duration * 0.7)}, "topic": "第四个话题", "summary": "简要描述"},
    {"time": ${Math.round(duration * 0.9)}, "topic": "总结与结语", "summary": "简要描述"}
  ]
}

注意:
1. 根据播客实际内容生成合理的时间戳和话题
2. 如果内容信息有限，可以基于标题和简介进行合理推断
3. 确保返回的是有效的JSON格式`;

    console.log("Calling AI API for summary...");

    // Adjust base URL if needed (remove /v1 if it's already in the path or add it)
    const baseUrl = AI_BASE_URL.endsWith('/') ? AI_BASE_URL.slice(0, -1) : AI_BASE_URL;
    const chatUrl = `${baseUrl}/chat/completions`;

    const aiRes = await fetch(chatUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
            model: AI_MODEL, 
            messages: [{ role: "user", content: prompt }],
            stream: false,
        max_tokens: 2000,
      }),
    });

    if (!aiRes.ok) {
      const errorText = await aiRes.text();
      throw new Error(`AI API error: ${aiRes.status} - ${errorText}`);
    }

    const aiData = await aiRes.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";

    // Parse AI response
    let summaryData = {
      summary: "",
      key_points: [] as string[],
      keywords: [] as string[],
      timestamps: [] as { time: number; topic: string; summary: string }[],
    };

    try {
      // Extract JSON from response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summaryData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      summaryData.summary = aiContent.slice(0, 500);
    }

    // Save summary to database
    const { error: summaryError } = await supabase
      .from("summaries")
      .upsert({
        episode_id: episodeId,
        transcript: transcript.slice(0, 10000),
        summary: summaryData.summary,
        key_points: summaryData.key_points,
        keywords: summaryData.keywords,
        timestamps: summaryData.timestamps,
      }, {
        onConflict: "episode_id",
      });

    if (summaryError) {
      throw new Error(`Failed to save summary: ${summaryError.message}`);
    }

    // Update episode status to completed
    await supabase
      .from("episodes")
      .update({ status: "completed" })
      .eq("id", episodeId);

    console.log(`Episode ${episodeId} processed successfully`);

    return new Response(
      JSON.stringify({ success: true, episodeId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing episode:", error);

    // Update status to failed
    if (episodeId) {
      await supabase
        .from("episodes")
        .update({ 
          status: "failed",
          // error_message: error.message, // Ensure this column exists or skip it
        })
        .eq("id", episodeId);
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        debug: {
          baseUrl: Deno.env.get("OPENAI_BASE_URL") || "default",
          model: Deno.env.get("AI_MODEL") || "default",
          keyConfigured: !!Deno.env.get("OPENAI_API_KEY")
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
