import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AITask } from '@repo/types';
import { Activity, CheckCircle, Clock, XCircle, Play } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

import { TaskDetails } from './TaskDetails';

export function TaskDashboard() {
    const [tasks, setTasks] = useState<AITask[]>([]);
    const [selectedTask, setSelectedTask] = useState<AITask | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTasks();
        const unsubscribe = window.electronAPI.task.onEvent((payload: any) => {
            // Optimistic update or reload
            if (payload.event === 'created') {
                setTasks(prev => [payload.payload, ...prev]);
            } else if (payload.event === 'updated' || payload.event === 'completed' || payload.event === 'failed') {
                setTasks(prev => prev.map(t => t.id === payload.payload.id ? payload.payload : t));
            } else if (payload.event.startsWith('step-')) {
                // For step updates, we might need to reload specific task or update in place if we have full structure
                // Usually step events sending { taskId, step }
                // We can reload for simplicity or find task and update step
                setTasks(prev => prev.map(t => {
                    if (t.id === payload.payload.taskId) {
                        // Shallow clone steps
                        const newSteps = t.steps.map(s => s.id === payload.payload.step.id ? payload.payload.step : s);
                        return { ...t, steps: newSteps, updatedAt: Date.now() };
                    }
                    return t;
                }));
            }
        });
        return () => unsubscribe();
    }, []);

    const loadTasks = async () => {
        try {
            const result = await window.electronAPI.task.list(20);
            setTasks(result);
        } catch (error) {
            console.error('Failed to load tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'running': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4" />;
            case 'failed': return <XCircle className="w-4 h-4" />;
            case 'running': return <Activity className="w-4 h-4 animate-pulse" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-4 p-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Task Operations</h2>
                <Button onClick={loadTasks} variant="outline" size="sm">
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {loading && <div className="col-span-4 text-center text-sm text-muted-foreground">Loading tasks...</div>}
                {!loading && (
                    <>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{tasks.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active</CardTitle>
                                <Play className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {tasks.filter(t => t.status === 'running').length}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {tasks.filter(t => t.status === 'completed').length}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Failed</CardTitle>
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {tasks.filter(t => t.status === 'failed').length}
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Tasks</CardTitle>
                        <CardDescription>
                            A list of AI tasks executed by the system.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-4">
                                {tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex items-center justify-between p-4 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
                                        onClick={() => setSelectedTask(task)}
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{task.prompt.substring(0, 50)}...</span>
                                                <Badge className={`${getStatusColor(task.status)} flex items-center gap-1`}>
                                                    {getStatusIcon(task.status)}
                                                    {task.status}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                ID: {task.id} • Created: {new Date(task.createdAt).toLocaleString()}
                                            </div>
                                            {task.steps.length > 0 && (
                                                <div className="mt-2 text-xs">
                                                    <div className="flex justify-between mb-1">
                                                        <span>Progress</span>
                                                        <span>
                                                            {task.steps.filter(s => s.status === 'completed').length} / {task.steps.length} steps
                                                        </span>
                                                    </div>
                                                    <Progress value={(task.steps.filter(s => s.status === 'completed').length / task.steps.length) * 100} className="h-1" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Task Details Modal */}
                <TaskDetails
                    task={selectedTask}
                    open={!!selectedTask}
                    onOpenChange={(open) => !open && setSelectedTask(null)}
                />
            </div>
        </div>
    );
}
