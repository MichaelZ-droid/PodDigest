import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { EpisodeCard } from '@/components/episodes/EpisodeCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Inbox, RefreshCw } from 'lucide-react';
import { Episode, Creator } from '@/types';

type FilterType = 'all' | 'completed' | 'processing' | 'pending';

export default function Home() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasSubscriptions, setHasSubscriptions] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchEpisodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  const fetchEpisodes = async () => {
    setLoading(true);

    // First get user's subscribed creators
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('creator_id')
      .eq('user_id', user!.id);

    if (!subscriptions || subscriptions.length === 0) {
      setEpisodes([]);
      setHasSubscriptions(false);
      setLoading(false);
      return;
    }

    setHasSubscriptions(true);
    const creatorIds = subscriptions.map((s) => s.creator_id);

    // Fetch episodes from subscribed creators
    let query = supabase
      .from('episodes')
      .select(`
        *,
        creator:creators(*),
        summary:summaries(*)
      `)
      .in('creator_id', creatorIds)
      .order('published_at', { ascending: false })
      .limit(50);

    // Apply filter
    if (filter === 'completed') {
      query = query.eq('status', 'completed');
    } else if (filter === 'processing') {
      query = query.in('status', ['pending', 'downloading', 'transcribing', 'summarizing']);
    } else if (filter === 'pending') {
      query = query.eq('status', 'pending');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching episodes:', error);
    } else {
      // Transform data to match Episode type
      const transformedData = (data || []).map((ep) => ({
        ...ep,
        creator: ep.creator as Creator,
        summary: Array.isArray(ep.summary) ? ep.summary[0] : ep.summary,
      })) as Episode[];
      setEpisodes(transformedData);
    }

    setLoading(false);
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">最新内容</h1>
            <p className="text-muted-foreground text-sm mt-1">
              订阅播主的最新更新内容
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={fetchEpisodes} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="processing">处理中</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-xl">
                <div className="flex gap-4">
                  <Skeleton className="h-20 w-20 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !hasSubscriptions ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">还没有订阅任何播客</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              添加你喜欢的播客主，系统会自动获取最新内容并生成AI摘要
            </p>
            <Button onClick={() => navigate('/subscriptions')}>
              <Plus className="h-4 w-4 mr-2" />
              添加订阅
            </Button>
          </div>
        ) : episodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground mb-4">
              {filter === 'all' ? '内容正在处理中，请稍后刷新' : '没有找到符合条件的内容'}
            </p>
            <Button variant="outline" onClick={fetchEpisodes}>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {episodes.map((episode) => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                onClick={() => navigate(`/episode/${episode.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
