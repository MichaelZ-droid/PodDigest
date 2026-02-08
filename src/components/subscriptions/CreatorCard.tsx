import { Creator, getPlatformName } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, ExternalLink, Mic } from 'lucide-react';

interface CreatorCardProps {
  creator: Creator;
  subscriptionId: string;
  onUnsubscribe: (subscriptionId: string, creatorName: string) => void;
}

export function CreatorCard({ creator, subscriptionId, onUnsubscribe }: CreatorCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="h-14 w-14 shrink-0 rounded-full overflow-hidden bg-muted">
          {creator.avatar_url ? (
            <img
              src={creator.avatar_url}
              alt={creator.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <Mic className="h-6 w-6" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium truncate">{creator.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {getPlatformName(creator.platform)}
                </Badge>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => window.open(creator.homepage_url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  打开主页
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onUnsubscribe(subscriptionId, creator.name)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  取消订阅
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {creator.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
              {creator.description}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
