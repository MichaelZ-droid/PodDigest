import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { SummaryView } from '@/components/episodes/SummaryView';
import { TimestampNav } from '@/components/episodes/TimestampNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ExternalLink, Clock, Mic, Loader2 } from 'lucide-react';
import { Episode, Creator, Summary, formatDuration, formatRelativeTime, getPlatformName, STATUS_CONFIG } from '@/types';
import { cn } from '@/lib/utils';

export default function EpisodeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchEpisode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchEpisode = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('episodes')
      .select(`
        *,
        creator:creators(*),
        summary:summaries(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching episode:', error);
    } else {
      const transformedData = {
        ...data,
        creator: data.creator as Creator,
        summary: Array.isArray(data.summary) ? data.summary[0] : data.summary,
      } as Episode;
      setEpisode(transformedData);
    }
    setLoading(false);
  };

  const handleTimestampClick = (time: number) => {
    if (episode?.original_url) {
      // For xiaoyuzhou, try to open with timestamp
      const url = new URL(episode.original_url);
      url.searchParams.set('t', String(time));
      window.open(url.toString(), '_blank');
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-6 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/2 mb-8" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  if (!episode) {
    return (
      <MainLayout>
        <div className="p-6 max-w-4xl mx-auto text-center py-20">
          <p className="text-muted-foreground mb-4">内容不存在或已被删除</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            返回首页
          </Button>
        </div>
      </MainLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[episode.status];
  const isProcessing = ['downloading', 'transcribing', 'summarizing'].includes(episode.status);

  return (
    <MainLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>

        {/* Header */}
        <div className="mb-6">
          {/* Creator info */}
          <div className="flex items-center gap-3 mb-3">
            {episode.creator?.avatar_url ? (
              <img
                src={episode.creator.avatar_url}
                alt={episode.creator.name}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Mic className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium">{episode.creator?.name}</p>
              <Badge variant="outline" className="text-xs">
                {getPlatformName(episode.creator?.platform || 'xiaoyuzhou')}
              </Badge>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-3">{episode.title}</h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDuration(episode.duration)}
            </span>
            <span>{formatRelativeTime(episode.published_at)}</span>
            <Badge className={cn("text-xs", statusConfig.color)}>
              {isProcessing && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {statusConfig.label}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(episode.original_url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              打开原链接
            </Button>
          </div>
        </div>

        {/* Content */}
        {episode.status === 'completed' && episode.summary ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Summary */}
            <div className="lg:col-span-2">
              <SummaryView summary={episode.summary} />
            </div>
            
            {/* Timestamps */}
            <div className="lg:col-span-1">
              <TimestampNav
                timestamps={episode.summary.timestamps || []}
                onTimestampClick={handleTimestampClick}
              />
            </div>
          </div>
        ) : episode.status === 'failed' ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
            <p className="text-destructive font-medium mb-2">处理失败</p>
            <p className="text-sm text-muted-foreground">
              {episode.error_message || '未知错误，请稍后重试'}
            </p>
          </div>
        ) : (
          <div className="bg-muted/50 rounded-xl p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="font-medium mb-2">内容正在处理中</p>
            <p className="text-sm text-muted-foreground">
              {episode.status === 'pending' && '等待处理...'}
              {episode.status === 'downloading' && '正在下载音频...'}
              {episode.status === 'transcribing' && '正在转录语音...'}
              {episode.status === 'summarizing' && '正在生成AI摘要...'}
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
