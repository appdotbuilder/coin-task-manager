import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/App';
import { trpc } from '@/utils/trpc';
import { CreateTaskDialog } from '@/components/CreateTaskDialog';
import { 
  Coins, 
  Plus, 
  User, 
  LogOut, 
  CheckCircle, 
  Clock, 
  Link as LinkIcon,
  Trophy,
  Target,
  TrendingUp,
  Activity,
  ExternalLink,
  Zap
} from 'lucide-react';
import type { DashboardData, TaskWithCreator } from '../../../server/src/schema';

export function Dashboard() {
  const { user, logout, refreshUser } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [availableTasks, setAvailableTasks] = useState<TaskWithCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<number>>(new Set());

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      const [dashboardResult, tasksResult] = await Promise.all([
        trpc.getDashboard.query(),
        trpc.getTasks.query()
      ]);
      
      setDashboardData(dashboardResult);
      setAvailableTasks(tasksResult.filter((task: TaskWithCreator) => task.status === 'open'));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleTaskCreated = async () => {
    await Promise.all([loadDashboardData(), refreshUser()]);
  };

  const handleCompleteTask = async (taskId: number) => {
    if (completingTaskIds.has(taskId)) return;
    
    setCompletingTaskIds(prev => new Set([...prev, taskId]));
    
    try {
      await trpc.completeTask.mutate({ task_id: taskId });
      await Promise.all([loadDashboardData(), refreshUser()]);
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setCompletingTaskIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glassmorphism p-8 rounded-2xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glassmorphism p-8 rounded-2xl text-center">
          <p className="text-white">Failed to load dashboard data</p>
          <Button onClick={loadDashboardData} className="mt-4 btn-primary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const openTasks = dashboardData.created_tasks.filter(task => task.status === 'open');
  const completedTasks = dashboardData.created_tasks.filter(task => task.status === 'completed');
  const myAvailableTasks = availableTasks.filter(task => task.creator_user_id !== user?.user_id);

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="glassmorphism rounded-2xl p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="glassmorphism rounded-full w-16 h-16 flex items-center justify-center animate-glow">
                <User className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Welcome back, {user?.username}!
                </h1>
                <p className="text-blue-200">Ready to earn some coins?</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="glassmorphism rounded-xl px-4 py-2 flex items-center space-x-2 animate-pulse-slow">
                <Coins className="w-6 h-6 text-yellow-400" />
                <span className="text-2xl font-bold text-white">{user?.coin || 0}</span>
                <span className="text-yellow-400 font-medium">coins</span>
              </div>
              
              <Button 
                onClick={handleLogout}
                variant="outline"
                className="btn-secondary"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glassmorphism border-white/20 bg-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center text-sm font-medium">
                <Trophy className="w-4 h-4 mr-2 text-yellow-400" />
                Total Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{user?.coin || 0}</div>
              <p className="text-xs text-blue-200">coins earned</p>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-white/20 bg-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center text-sm font-medium">
                <Target className="w-4 h-4 mr-2 text-green-400" />
                Tasks Created
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{dashboardData.created_tasks.length}</div>
              <p className="text-xs text-blue-200">{openTasks.length} active</p>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-white/20 bg-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center text-sm font-medium">
                <CheckCircle className="w-4 h-4 mr-2 text-blue-400" />
                Tasks Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{dashboardData.completed_tasks_count}</div>
              <p className="text-xs text-blue-200">lifetime completions</p>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-white/20 bg-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center text-sm font-medium">
                <Activity className="w-4 h-4 mr-2 text-purple-400" />
                Available Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{myAvailableTasks.length}</div>
              <p className="text-xs text-blue-200">ready to complete</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <div className="glassmorphism rounded-2xl p-6">
          <Tabs defaultValue="available" className="w-full">
            <TabsList className="grid w-full grid-cols-3 glassmorphism bg-white/10">
              <TabsTrigger 
                value="available" 
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-blue-200"
              >
                <Zap className="w-4 h-4 mr-2" />
                Available Tasks ({myAvailableTasks.length})
              </TabsTrigger>
              <TabsTrigger 
                value="created" 
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-blue-200"
              >
                <Target className="w-4 h-4 mr-2" />
                My Tasks ({dashboardData.created_tasks.length})
              </TabsTrigger>
              <TabsTrigger 
                value="completed" 
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-blue-200"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Completed ({dashboardData.completed_tasks_count})
              </TabsTrigger>
            </TabsList>

            {/* Available Tasks */}
            <TabsContent value="available" className="space-y-4 mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">Tasks You Can Complete</h3>
                <Button 
                  onClick={() => setIsCreateTaskOpen(true)}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Task
                </Button>
              </div>
              
              {myAvailableTasks.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-blue-300 mx-auto mb-4 opacity-50" />
                  <p className="text-blue-200 text-lg">No tasks available right now</p>
                  <p className="text-blue-300 text-sm">Check back later or create your own task!</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {myAvailableTasks.map((task: TaskWithCreator) => (
                    <Card key={task.task_id} className="glassmorphism border-white/20 bg-white/5 card-hover">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <LinkIcon className="w-4 h-4 text-blue-400" />
                              <a 
                                href={task.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-300 hover:text-blue-200 underline flex items-center"
                              >
                                {task.link.length > 50 ? `${task.link.substring(0, 50)}...` : task.link}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-blue-200 mb-3">
                              <User className="w-3 h-3" />
                              <span>Created by {task.creator_username}</span>
                              <span>•</span>
                              <span>{new Date(task.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="glassmorphism rounded-lg px-3 py-2 mb-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
                              <div className="flex items-center justify-center">
                                <Coins className="w-5 h-5 text-yellow-400 mr-1" />
                                <span className="text-xl font-bold text-white">{task.coin_reward}</span>
                              </div>
                              <p className="text-xs text-yellow-300">reward</p>
                            </div>
                            
                            <Button
                              onClick={() => handleCompleteTask(task.task_id)}
                              disabled={completingTaskIds.has(task.task_id)}
                              className="btn-primary w-full"
                            >
                              {completingTaskIds.has(task.task_id) ? (
                                <>
                                  <div className="spinner mr-2"></div>
                                  Completing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Complete Task
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* My Created Tasks */}
            <TabsContent value="created" className="space-y-4 mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">Tasks I Created</h3>
                <Button 
                  onClick={() => setIsCreateTaskOpen(true)}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Another
                </Button>
              </div>
              
              {dashboardData.created_tasks.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-blue-300 mx-auto mb-4 opacity-50" />
                  <p className="text-blue-200 text-lg">You haven't created any tasks yet</p>
                  <p className="text-blue-300 text-sm mb-6">Create your first task to get others to help you!</p>
                  <Button 
                    onClick={() => setIsCreateTaskOpen(true)}
                    className="btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Task
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {dashboardData.created_tasks.map((task) => (
                    <Card key={task.task_id} className="glassmorphism border-white/20 bg-white/5">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <LinkIcon className="w-4 h-4 text-blue-400" />
                              <a 
                                href={task.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-300 hover:text-blue-200 underline flex items-center"
                              >
                                {task.link.length > 50 ? `${task.link.substring(0, 50)}...` : task.link}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </div>
                            <p className="text-sm text-blue-200">
                              Created on {new Date(task.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <div className="glassmorphism rounded-lg px-3 py-2 mb-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
                              <div className="flex items-center justify-center">
                                <Coins className="w-5 h-5 text-yellow-400 mr-1" />
                                <span className="text-xl font-bold text-white">{task.coin_reward}</span>
                              </div>
                              <p className="text-xs text-yellow-300">reward</p>
                            </div>
                            
                            <Badge 
                              variant={task.status === 'completed' ? 'default' : 'secondary'}
                              className={`${
                                task.status === 'completed' 
                                  ? 'bg-green-500/20 text-green-300 border-green-500/20' 
                                  : 'bg-orange-500/20 text-orange-300 border-orange-500/20'
                              }`}
                            >
                              {task.status === 'completed' ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Completed
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 mr-1" />
                                  Open
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Completed Tasks Summary */}
            <TabsContent value="completed" className="space-y-4 mt-6">
              <h3 className="text-xl font-semibold text-white">Completion Statistics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glassmorphism border-white/20 bg-white/5">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                      Your Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200">Tasks Completed</span>
                      <span className="text-2xl font-bold text-white">{dashboardData.completed_tasks_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200">Total Coins Earned</span>
                      <span className="text-2xl font-bold text-yellow-400">{user?.coin || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200">Tasks Created</span>
                      <span className="text-2xl font-bold text-white">{dashboardData.created_tasks.length}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glassmorphism border-white/20 bg-white/5">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                      Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {dashboardData.completed_tasks_count >= 1 && (
                      <div className="flex items-center p-2 bg-green-500/10 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                        <span className="text-green-300">First Task Completed!</span>
                      </div>
                    )}
                    {dashboardData.created_tasks.length >= 1 && (
                      <div className="flex items-center p-2 bg-blue-500/10 rounded-lg">
                        <Target className="w-5 h-5 text-blue-400 mr-2" />
                        <span className="text-blue-300">Task Creator!</span>
                      </div>
                    )}
                    {(user?.coin || 0) >= 100 && (
                      <div className="flex items-center p-2 bg-yellow-500/10 rounded-lg">
                        <Coins className="w-5 h-5 text-yellow-400 mr-2" />
                        <span className="text-yellow-300">Coin Collector!</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Create Task Dialog */}
        <CreateTaskDialog
          isOpen={isCreateTaskOpen}
          onClose={() => setIsCreateTaskOpen(false)}
          onTaskCreated={handleTaskCreated}
          currentBalance={user?.coin || 0}
        />
      </div>
    </div>
  );
}