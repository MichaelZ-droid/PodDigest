import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Loader2, Link2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AddCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type ProcessingStep = 'idle' | 'subscribing' | 'fetching' | 'processing' | 'done';

export function AddCreatorDialog({ open, onOpenChange, onSuccess }: AddCreatorDialogProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<ProcessingStep>('idle');
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  const parseXiaoyuzhouUrl = (url: string) => {
    // Example: https://www.xiaoyuzhoufm.com/podcast/5e280fab418a84a0461fc579
    const match = url.match(/xiaoyuzhoufm\.com\/podcast\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const getStepText = () => {
    switch (step) {
      case 'subscribing': return '正在创建订阅...';
      case 'fetching': return '正在获取播客信息...';
      case 'processing': return '正在生成 AI 摘要...';
      case 'done': return '处理完成！';
      default: return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error('请输入播客主页链接');
      return;
    }

    // Currently only support xiaoyuzhou
    if (!url.includes('xiaoyuzhoufm.com')) {
      toast.error('目前仅支持小宇宙播客链接');
      return;
    }

    const podcastId = parseXiaoyuzhouUrl(url);
    if (!podcastId) {
      toast.error('无效的小宇宙链接，请输入播客主页链接');
      return;
    }

    setLoading(true);
    setStep('subscribing');
    setProgress(10);

    try {
      // Check if creator already exists
      const { data: existingCreator } = await supabase
        .from('creators')
        .select('id')
        .eq('platform', 'xiaoyuzhou')
        .eq('platform_id', podcastId)
        .maybeSingle();

      let creatorId: string;

      if (existingCreator) {
        creatorId = existingCreator.id;
      } else {
        // Create new creator (basic info, will be updated by backend)
        const { data: newCreator, error: createError } = await supabase
          .from('creators')
          .insert({
            name: `播客 ${podcastId.slice(0, 6)}...`,
            platform: 'xiaoyuzhou',
            platform_id: podcastId,
            homepage_url: url.trim(),
          })
          .select('id')
          .single();

        if (createError) {
          throw createError;
        }
        creatorId = newCreator.id;
      }

      // Check if already subscribed
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user!.id)
        .eq('creator_id', creatorId)
        .maybeSingle();

      if (existingSub) {
        toast.error('你已经订阅了这个播客');
        setLoading(false);
        setStep('idle');
        return;
      }

      // Create subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user!.id,
          creator_id: creatorId,
        });

      if (subError) {
        throw subError;
      }

      setProgress(30);
      setStep('fetching');

      // Call Edge Function to fetch podcast info and episodes
      const { data: fetchResult, error: fetchError } = await supabase.functions.invoke(
        'fetch-xiaoyuzhou-podcast',
        { body: { podcastId, creatorId } }
      );

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        toast.warning('订阅成功，但获取内容时出错，请稍后刷新');
        onSuccess();
        return;
      }

      console.log('Fetch result:', fetchResult);
      setProgress(60);
      setStep('processing');

      // Wait for processing to complete (poll for status)
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if any episodes are completed
        const { data: episodes } = await supabase
          .from('episodes')
          .select('id, status')
          .eq('creator_id', creatorId)
          .in('status', ['completed', 'failed']);

        if (episodes && episodes.length > 0) {
          const completed = episodes.filter(e => e.status === 'completed').length;
          setProgress(60 + Math.min(completed * 20, 35));
          
          if (completed >= 1) {
            break;
          }
        }
        
        attempts++;
      }

      setProgress(100);
      setStep('done');
      
      toast.success('订阅成功！已生成内容摘要');
      
      // Wait a moment to show success state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUrl('');
      setStep('idle');
      setProgress(0);
      onSuccess();

    } catch (error) {
      console.error('Error adding creator:', error);
      toast.error('添加订阅失败，请稍后重试');
      setStep('idle');
      setProgress(0);
    }

    setLoading(false);
  };

  const handleClose = (open: boolean) => {
    if (!loading) {
      setStep('idle');
      setProgress(0);
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加播客订阅</DialogTitle>
          <DialogDescription>
            粘贴小宇宙播客主页链接，系统将自动获取内容并生成摘要
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="podcast-url">播客主页链接</Label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="podcast-url"
                placeholder="https://www.xiaoyuzhoufm.com/podcast/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              目前支持小宇宙平台，更多平台即将支持
            </p>
          </div>

          {/* Processing Progress */}
          {loading && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                {step === 'done' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                <span className="text-muted-foreground">{getStepText()}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              添加订阅
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
