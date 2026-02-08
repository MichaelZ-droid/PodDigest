import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PodcastInfo {
  id: string;
  name: string;
  description: string;
  avatar: string;
}

interface EpisodeInfo {
  id: string;
  title: string;
  duration: number;
  publishedAt: string;
  audioUrl: string;
  thumbnailUrl: string;
  shownotes: string;
}

interface RawEpisode {
  eid: string;
  title: string;
  duration?: number;
  pubDate?: string;
  publishedAt?: string;
  shownotes?: string;
  description?: string;
  enclosure?: { url?: string };
  media?: { source?: { url?: string } };
  image?: { picUrl?: string; smallPicUrl?: string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { podcastId, creatorId } = await req.json();

    if (!podcastId || !creatorId) {
      throw new Error("Missing podcastId or creatorId");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Fetching podcast info for: ${podcastId}`);

    // Fetch podcast info from xiaoyuzhou
    const podcastRes = await fetch(
      `https://www.xiaoyuzhoufm.com/podcast/${podcastId}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
      }
    );

    if (!podcastRes.ok) {
      throw new Error(`Failed to fetch podcast: ${podcastRes.status}`);
    }

    const html = await podcastRes.text();

    // Parse podcast info from HTML/JSON embedded data
    let podcastInfo: PodcastInfo | null = null;
    let episodes: EpisodeInfo[] = [];

    // Try to find __NEXT_DATA__ JSON
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/s);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const pageProps = nextData?.props?.pageProps;
        
        if (pageProps?.podcast) {
          const podcast = pageProps.podcast;
          podcastInfo = {
            id: podcast.pid,
            name: podcast.title || podcast.name,
            description: podcast.description || "",
            avatar: podcast.image?.picUrl || podcast.image?.smallPicUrl || "",
          };
        }

        // Get episodes - try multiple sources
        let episodeList: RawEpisode[] = [];
        if (pageProps?.episodes) {
          episodeList = pageProps.episodes;
        } else if (pageProps?.podcast?.episodes) {
          episodeList = pageProps.podcast.episodes;
        }
        
        // Take first 3 episodes for processing
        episodes = episodeList.slice(0, 3).map((ep: RawEpisode) => ({
          id: ep.eid,
          title: ep.title,
          duration: ep.duration || 0,
          publishedAt: ep.pubDate || ep.publishedAt || new Date().toISOString(),
          audioUrl: ep.enclosure?.url || ep.media?.source?.url || "",
          thumbnailUrl: ep.image?.picUrl || ep.image?.smallPicUrl || podcastInfo?.avatar || "",
          shownotes: ep.shownotes || ep.description || "",
        }));
      } catch (e) {
        console.error("Failed to parse __NEXT_DATA__:", e);
      }
    }

    // Fallback: parse from meta tags
    if (!podcastInfo) {
      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);

      podcastInfo = {
        id: podcastId,
        name: titleMatch ? titleMatch[1] : `播客 ${podcastId}`,
        description: descMatch ? descMatch[1] : "",
        avatar: imageMatch ? imageMatch[1] : "",
      };
    }

    console.log(`Found podcast: ${podcastInfo.name}, Episodes: ${episodes.length}`);

    // Update creator info
    const { error: updateError } = await supabase
      .from("creators")
      .update({
        name: podcastInfo.name,
        description: podcastInfo.description,
        avatar_url: podcastInfo.avatar,
      })
      .eq("id", creatorId);

    if (updateError) {
      console.error("Failed to update creator:", updateError);
    }

    // Insert episodes
    const insertedEpisodeIds: string[] = [];
    
    for (const ep of episodes) {
      const { data: insertedEp, error: epError } = await supabase
        .from("episodes")
        .upsert({
          creator_id: creatorId,
          title: ep.title,
          platform_episode_id: ep.id,
          original_url: `https://www.xiaoyuzhoufm.com/episode/${ep.id}`,
          duration: ep.duration,
          published_at: ep.publishedAt,
          thumbnail_url: ep.thumbnailUrl,
          audio_url: ep.audioUrl,
          status: "pending",
        }, {
          onConflict: "platform_episode_id",
        })
        .select("id")
        .single();

      if (epError) {
        console.error(`Failed to insert episode ${ep.id}:`, epError);
      } else if (insertedEp) {
        insertedEpisodeIds.push(insertedEp.id);
      }
    }

    console.log(`Inserted ${insertedEpisodeIds.length} episodes`);

    // Process first 3 episodes synchronously
    const episodesToProcess = insertedEpisodeIds.slice(0, 3);
    
    for (const episodeId of episodesToProcess) {
      console.log(`Processing episode: ${episodeId}`);
      
      try {
        const processRes = await fetch(`${supabaseUrl}/functions/v1/process-episode`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ episodeId }),
        });

        if (!processRes.ok) {
          const errorText = await processRes.text();
          console.error(`Failed to process episode ${episodeId}:`, errorText);
        } else {
          console.log(`Episode ${episodeId} processed successfully`);
        }
      } catch (e) {
        console.error(`Error processing episode ${episodeId}:`, e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        podcast: podcastInfo,
        episodesCount: episodes.length,
        processedCount: episodesToProcess.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
