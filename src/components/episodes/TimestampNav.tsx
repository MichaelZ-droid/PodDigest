import { useState } from 'react';
import { Timestamp, formatTimestamp } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimestampNavProps {
  timestamps: Timestamp[];
  onTimestampClick: (time: number) => void;
}

export function TimestampNav({ timestamps, onTimestampClick }: TimestampNavProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!timestamps || timestamps.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            时间戳导航
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            暂无时间戳信息
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleClick = (timestamp: Timestamp, index: number) => {
    setActiveIndex(index);
    onTimestampClick(timestamp.time);
  };

  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          时间戳导航
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 pt-0 space-y-1">
            {timestamps.map((timestamp, index) => (
              <button
                key={index}
                onClick={() => handleClick(timestamp, index)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-all group",
                  "hover:bg-accent",
                  activeIndex === index && "bg-primary/10 border border-primary/20"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex items-center gap-1 text-sm font-mono shrink-0 rounded px-2 py-0.5",
                    activeIndex === index 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  )}>
                    <Play className="h-3 w-3" />
                    {formatTimestamp(timestamp.time)}
                  </div>
                </div>
                <p className="font-medium mt-2 text-sm">
                  {timestamp.topic}
                </p>
                {timestamp.summary && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {timestamp.summary}
                  </p>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
