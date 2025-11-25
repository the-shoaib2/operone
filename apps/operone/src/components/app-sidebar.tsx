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
import { commonNavItems, quickActions, conversations, projects, truncateText } from "@/components/app-navigation"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const location = useLocation()
  
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
    projects: [], // No projects for now
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
                  <Link to="/dashboard/overview">
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
                  {conversations.map((conversation) => (
                    <SidebarMenuItem key={conversation.id}>
                      <SidebarMenuButton asChild>
                        <Link to={conversation.url} className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MessageSquare className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{truncateText(conversation.title, 20)}</span>
                          </div>
                          {conversation.date && (
                            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{conversation.date}</span>
                          )}
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
                    <Link to="/project/new" className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      <span>New project</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                {/* Projects with nested conversations */}
                {projects.map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton className="font-medium text-sidebar-foreground">
                      <FolderOpen className="w-4 h-4" />
                      <span>{project.name}</span>
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      {project.conversations.map((conversation) => (
                        <SidebarMenuSubItem key={conversation.id}>
                          <SidebarMenuSubButton asChild>
                            <Link to={conversation.url} className="flex items-center gap-2 min-w-0 flex-1">
                              <MessageSquare className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{truncateText(conversation.title, 18)}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                ))}
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
    </Sidebar>
  )
}
