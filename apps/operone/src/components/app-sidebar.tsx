import * as React from "react"
import { Command, MessageSquare, FolderOpen, ChevronRight, ChevronDown, Plus } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts"
import { useProject } from "@/contexts/project-context"
import { CreateProjectDialog } from "@/components/project/create-project-dialog"
import { commonNavItems, quickActions, truncateText } from "@/components/app-navigation"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const location = useLocation()
  const { 
    projects, 
    chats, 
    createChat,
    setCurrentChat,
    setCurrentProject 
  } = useProject()
  
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = React.useState(false)
  
  // Optimized data structure like ChatGPT
  const [expandedSections, setExpandedSections] = React.useState({
    chats: false,
    projects: true
  })

  const toggleSection = (section: 'chats' | 'projects') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }
  
  // Get chats not associated with any project (general chats)
  const generalChats = chats.filter(chat => !chat.projectId)
  
  // Handle creating a new project
  const handleCreateProject = (project: any) => {
    setCurrentProject(project)
    // Navigate to the new project
    window.location.href = `/project/${project.id}`
  }
  
  
  // Simple static navigation items
  const navMainItems = React.useMemo(() => [], [])

  const getInitials = (user: any) => {
    if (!user || !user?.name) return 'GU'
    const names = user.name.split(' ')
    return names.length > 1 
      ? `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase()
      : `${user.name.charAt(0)}`.toUpperCase()
  }

  // Check if we're on a settings page
  const isSettingsPage = location.pathname.startsWith('/settings')

  // Filter out settings items from secondary nav when on settings pages
  const filteredNavSecondary = React.useMemo(() => {
    if (!isSettingsPage) return commonNavItems
    
    return commonNavItems.filter(item => 
      !item.url?.startsWith('/settings')
    )
  }, [isSettingsPage])

  const sidebarData = {
    user: {
      name: user?.name || 'Guest User',
      email: user?.email || 'guest@example.com',
      avatar: user?.image || null,
      initials: getInitials(user)
    },
    navMain: navMainItems,
    navSecondary: filteredNavSecondary,
    projects: projects,
    teams: [{
      name: "Operone",
      logo: Command,
      plan: "Professional"
    }]
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2">
              <div className="relative group flex-1">
                <SidebarMenuButton size="lg" asChild className="flex-1">
                  <Link to="/dashboard/chat">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <Command className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">Operone</span>
                      <span className="truncate text-xs">AI</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
                <SidebarTrigger className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background rounded-md p-1 group-data-[state=expanded]:hidden" />
              </div>
              <SidebarTrigger className="opacity-0 group-data-[state=expanded]:opacity-100 transition-opacity duration-200 group-data-[state=icon]:hidden hover:bg-muted rounded-md" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Non-collapsible Quick Actions */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {quickActions.map((action) => (
                <SidebarMenuItem key={action.url}>
                  <SidebarMenuButton asChild>
                    <Link to={action.url} className="flex items-center gap-2">
                      <action.icon className="w-4 h-4" />
                      <span>{action.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <NavMain items={sidebarData.navMain} />
        
        {/* Chats Section */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden gap-0 py-1">
          <SidebarGroupLabel className="px-0">
            <SidebarMenuButton 
              onClick={() => toggleSection('chats')}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chats
              </span>
              {expandedSections.chats ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </SidebarMenuButton>
          </SidebarGroupLabel>
          {expandedSections.chats && (
            <SidebarGroupContent>
              <div className="max-h-64 overflow-y-auto">
                <SidebarMenu>
                  {/* Create New Chat */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="text-sidebar-foreground/70">
                      <button
                        onClick={() => {
                          const newChat = createChat()
                          setCurrentChat(newChat)
                          window.location.href = '/dashboard/chat'
                        }}
                        className="flex items-center gap-2 w-full"
                      >
                        <Plus className="w-4 h-4" />
                        <span>New chat</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  {generalChats.map((chat) => (
                    <SidebarMenuItem key={chat.id}>
                      <SidebarMenuButton asChild>
                        <Link to={`/dashboard/chat?chatId=${chat.id}`} className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MessageSquare className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{truncateText(chat.title, 20)}</span>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {chat.updatedAt.toLocaleDateString()}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </div>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {/* Projects Section */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden gap-0 py-1">
          <SidebarGroupLabel className="px-0">
            <SidebarMenuButton 
              onClick={() => toggleSection('projects')}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Projects
              </span>
              {expandedSections.projects ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </SidebarMenuButton>
          </SidebarGroupLabel>
          {expandedSections.projects && (
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Create New Project */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="text-sidebar-foreground/70">
                    <button
                      onClick={() => setCreateProjectDialogOpen(true)}
                      className="flex items-center gap-2 w-full"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New project</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                {/* Projects with nested conversations */}
                {projects.map((project) => {
                  const projectChats = chats.filter(chat => chat.projectId === project.id)
                  return (
                    <SidebarMenuItem key={project.id}>
                      <SidebarMenuButton asChild>
                        <Link to={`/project/${project.id}`} className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4" />
                          <span>{project.name}</span>
                          {projectChats.length > 0 && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              {projectChats.length}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                      {projectChats.length > 0 && (
                        <SidebarMenuSub>
                          {projectChats.map((chat) => (
                            <SidebarMenuSubItem key={chat.id}>
                              <SidebarMenuSubButton asChild>
                                <Link to={`/project/${project.id}?chatId=${chat.id}`} className="flex items-center gap-2 min-w-0 flex-1">
                                  <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{truncateText(chat.title, 18)}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {/* <NavProjects projects={sidebarData.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
      
      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={createProjectDialogOpen}
        onOpenChange={setCreateProjectDialogOpen}
        onSuccess={handleCreateProject}
      />
    </Sidebar>
  )
}
