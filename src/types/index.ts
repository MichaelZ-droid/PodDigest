// Database types
export interface Creator {
  id: string;
  name: string;
  avatar_url: string | null;
  platform: 'xiaoyuzhou' | 'bilibili' | 'youtube';
  platform_id: string;
  homepage_url: string;
  rss_url: string | null;
  description: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  creator_id: string;
  created_at: string;
  creator?: Creator;
}

export interface Episode {
  id: string;
  creator_id: string;
  title: string;
  platform_episode_id: string;
  original_url: string;
  duration: number | null;
  published_at: string | null;
  thumbnail_url: string | null;
  audio_url: string | null;
  stored_audio_path: string | null;
  status: 'pending' | 'downloading' | 'transcribing' | 'summarizing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  creator?: Creator;
  summary?: Summary;
}

export interface Summary {
  id: string;
  episode_id: string;
  transcript: string | null;
  summary: string | null;
  key_points: string[];
  keywords: string[];
  timestamps: Timestamp[];
  created_at: string;
}

export interface Timestamp {
  time: number; // seconds
  topic: string;
  summary: string;
}

export interface ReadHistory {
  id: string;
  user_id: string;
  episode_id: string;
  read_at: string;
}

// UI types
export type StatusType = Episode['status'];

export interface StatusConfig {
  label: string;
  color: string;
  icon: string;
}

export const STATUS_CONFIG: Record<StatusType, StatusConfig> = {
  pending: { label: '等待处理', color: 'bg-muted text-muted-foreground', icon: 'Clock' },
  downloading: { label: '下载中', color: 'bg-info/10 text-info', icon: 'Download' },
  transcribing: { label: '转录中', color: 'bg-warning/10 text-warning', icon: 'Mic' },
  summarizing: { label: '生成摘要', color: 'bg-primary/10 text-primary', icon: 'Sparkles' },
  completed: { label: '已完成', color: 'bg-success/10 text-success', icon: 'Check' },
  failed: { label: '处理失败', color: 'bg-destructive/10 text-destructive', icon: 'AlertCircle' },
};

// Helper functions
export function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '未知时间';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export function getPlatformName(platform: string): string {
  const names: Record<string, string> = {
    xiaoyuzhou: '小宇宙',
    bilibili: 'B站',
    youtube: 'YouTube',
  };
  return names[platform] || platform;
}
