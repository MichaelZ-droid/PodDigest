import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { CreatorCard } from '@/components/subscriptions/CreatorCard';
import { AddCreatorDialog } from '@/components/subscriptions/AddCreatorDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Users } from 'lucide-react';
import { Subscription, Creator } from '@/types';
import { toast } from 'sonner';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchSubscriptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        creator:creators(*)
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('获取订阅列表失败');
    } else {
      const transformedData = (data || []).map((sub) => ({
        ...sub,
        creator: sub.creator as Creator,
      })) as Subscription[];
      setSubscriptions(transformedData);
    }
    setLoading(false);
  };

  const handleUnsubscribe = async (subscriptionId: string, creatorName: string) => {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', subscriptionId);

    if (error) {
      toast.error('取消订阅失败');
    } else {
      toast.success(`已取消订阅 ${creatorName}`);
      fetchSubscriptions();
    }
  };

  const handleAddSuccess = () => {
    setDialogOpen(false);
    fetchSubscriptions();
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">订阅管理</h1>
            <p className="text-muted-foreground text-sm mt-1">
              管理你订阅的播客主
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            添加播主
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 border rounded-xl">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">还没有订阅任何播主</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              添加播主后，系统会自动监控更新并生成内容摘要
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              添加播主
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {subscriptions.map((subscription) => (
              <CreatorCard
                key={subscription.id}
                creator={subscription.creator!}
                subscriptionId={subscription.id}
                onUnsubscribe={handleUnsubscribe}
              />
            ))}
          </div>
        )}

        {/* Add Creator Dialog */}
        <AddCreatorDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={handleAddSuccess}
        />
      </div>
    </MainLayout>
  );
}
