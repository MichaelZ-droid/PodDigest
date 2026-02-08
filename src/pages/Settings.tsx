import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Link2, Bell } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { user } = useAuth();
  const [feishuConfig, setFeishuConfig] = useState({
    appId: '',
    appSecret: '',
    tableId: '',
    enabled: false,
  });

  const handleSaveFeishu = () => {
    // TODO: Save to database
    toast.success('飞书配置已保存（功能开发中）');
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">设置</h1>
          <p className="text-muted-foreground text-sm mt-1">
            管理你的账户和应用设置
          </p>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList>
            <TabsTrigger value="account" className="gap-2">
              <User className="h-4 w-4" />
              账户
            </TabsTrigger>
            <TabsTrigger value="feishu" className="gap-2">
              <Link2 className="h-4 w-4" />
              飞书同步
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              通知
            </TabsTrigger>
          </TabsList>

          {/* Account Tab */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>账户信息</CardTitle>
                <CardDescription>
                  你的基本账户信息
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user?.email?.split('@')[0]}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>邮箱地址</Label>
                  <Input value={user?.email || ''} disabled />
                  <p className="text-xs text-muted-foreground">
                    邮箱地址不可修改
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feishu Sync Tab */}
          <TabsContent value="feishu">
            <Card>
              <CardHeader>
                <CardTitle>飞书多维表格同步</CardTitle>
                <CardDescription>
                  将播客摘要自动同步到飞书多维表格，方便管理和检索
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>启用飞书同步</Label>
                    <p className="text-sm text-muted-foreground">
                      新内容处理完成后自动同步到飞书
                    </p>
                  </div>
                  <Switch
                    checked={feishuConfig.enabled}
                    onCheckedChange={(checked) =>
                      setFeishuConfig((prev) => ({ ...prev, enabled: checked }))
                    }
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="app-id">App ID</Label>
                    <Input
                      id="app-id"
                      placeholder="cli_xxxxxxxx"
                      value={feishuConfig.appId}
                      onChange={(e) =>
                        setFeishuConfig((prev) => ({ ...prev, appId: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="app-secret">App Secret</Label>
                    <Input
                      id="app-secret"
                      type="password"
                      placeholder="xxxxxxxx"
                      value={feishuConfig.appSecret}
                      onChange={(e) =>
                        setFeishuConfig((prev) => ({ ...prev, appSecret: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="table-id">多维表格 ID</Label>
                    <Input
                      id="table-id"
                      placeholder="bascnxxxxxxxx"
                      value={feishuConfig.tableId}
                      onChange={(e) =>
                        setFeishuConfig((prev) => ({ ...prev, tableId: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      在飞书多维表格 URL 中可以找到
                    </p>
                  </div>
                </div>

                <Button onClick={handleSaveFeishu}>
                  保存配置
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>通知设置</CardTitle>
                <CardDescription>
                  管理你的通知偏好
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>新内容通知</Label>
                    <p className="text-sm text-muted-foreground">
                      订阅的播客有新内容时通知
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>处理完成通知</Label>
                    <p className="text-sm text-muted-foreground">
                      AI摘要生成完成时通知
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <p className="text-sm text-muted-foreground pt-4 border-t">
                  通知功能正在开发中，敬请期待
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
