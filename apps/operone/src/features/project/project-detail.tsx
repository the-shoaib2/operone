import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, MessageSquare, FolderOpen, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProject } from '@/contexts/project-context';
import { ChatLayout } from '@/features/chat/chat';

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { 
    getProjectById, 
    getProjectChats, 
    createChat, 
    setCurrentChat,
    setCurrentProject 
  } = useProject();
  
  const [project, setProject] = useState<any>(null);
  const [projectChats, setProjectChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      const foundProject = getProjectById(projectId);
      if (foundProject) {
        setProject(foundProject);
        setCurrentProject(foundProject);
        setProjectChats(getProjectChats(projectId));
      } else {
        navigate('/dashboard/chat');
      }
    }
  }, [projectId, getProjectById, getProjectChats, setCurrentProject, navigate]);

  const handleCreateNewChat = () => {
    if (project) {
      const newChat = createChat(project.id);
      setCurrentChat(newChat);
      setSelectedChatId(newChat.id);
    }
  };

  const handleSelectChat = (chat: any) => {
    setCurrentChat(chat);
    setSelectedChatId(chat.id);
  };

  const handleBackToProjects = () => {
    setCurrentProject(null);
    setCurrentChat(null);
    navigate('/dashboard/chat');
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  // If a chat is selected, show the chat interface
  if (selectedChatId) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b p-4 bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToProjects}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Project
              </Button>
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-muted-foreground" />
                <div>
                  <h2 className="font-semibold">{project.name}</h2>
                  <p className="text-sm text-muted-foreground">{project.category}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <ChatLayout />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Project Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToProjects}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <div className="flex items-center gap-4 mt-1">
              <Badge variant="secondary">{project.category}</Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Created {project.createdAt.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
        <Button onClick={handleCreateNewChat} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      {/* Project Description */}
      {project.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{project.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Chats Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Conversations ({projectChats.length})
          </CardTitle>
          <CardDescription>
            Chat conversations within this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projectChats.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No conversations yet</h3>
              <p className="text-muted-foreground mb-4">
                Start your first conversation in this project
              </p>
              <Button onClick={handleCreateNewChat}>
                <Plus className="w-4 h-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {projectChats.map((chat) => (
                <div
                  key={chat.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">{chat.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {chat.messages.length} messages • Updated {chat.updatedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Open
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
