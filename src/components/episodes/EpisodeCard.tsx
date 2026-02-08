import { Episode, formatDuration, formatRelativeTime, getPlatformName, STATUS_CONFIG } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Check, Loader2, AlertCircle, Download, Mic, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EpisodeCardProps {
  episode: Episode;
  onClick: () => void;
}

const StatusIcons = {
  Clock,
  Download,
  Mic,
  Sparkles,
  Check,
  AlertCircle,
};

export function EpisodeCard({ episode, onClick }: EpisodeCardProps) {
  const statusConfig = STATUS_CONFIG[episode.status];
  const IconComponent = StatusIcons[statusConfig.icon as keyof typeof StatusIcons] || Clock;
  const isProcessing = ['pending', 'downloading', 'transcribing', 'summarizing'].includes(episode.status);
  
  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/30",
        episode.status === 'completed' && "hover:bg-accent/30",
        isProcessing && "bg-muted/30"
      )}
      onClick={onClick}
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="relative h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-muted">
          {episode.thumbnail_url ? (
            <img
              src={episode.thumbnail_url}
              alt={episode.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <Mic className="h-8 w-8" />
            </div>
          )}
          {/* Duration badge */}
          {episode.duration && (
            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
              {formatDuration(episode.duration)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Creator info */}
          <div className="flex items-center gap-2 mb-1">
            {episode.creator?.avatar_url && (
              <img
                src={episode.creator.avatar_url}
                alt={episode.creator.name}
                className="h-5 w-5 rounded-full"
              />
            )}
            <span className="text-sm text-muted-foreground truncate">
              {episode.creator?.name || '未知播主'}
            </span>
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {getPlatformName(episode.creator?.platform || 'xiaoyuzhou')}
            </Badge>
          </div>

          {/* Title */}
          <h3 className="font-medium line-clamp-2 mb-2">{episode.title}</h3>

          {/* Meta info */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{formatRelativeTime(episode.published_at)}</span>
            
            {/* Status badge */}
            <Badge className={cn("text-xs", statusConfig.color)}>
              {isProcessing && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {!isProcessing && <IconComponent className="h-3 w-3 mr-1" />}
              {statusConfig.label}
            </Badge>
          </div>

          {/* Summary preview (if completed) */}
          {episode.status === 'completed' && episode.summary?.summary && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
              {episode.summary.summary}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
