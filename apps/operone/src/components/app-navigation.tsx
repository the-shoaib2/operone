import {
  Activity,
  Users,
  Calendar,
  MessageSquare,
  Database,
  UserCog,
  Ambulance,
  LineChart,
  Bot,
  LifeBuoy,
  Send,
  Settings,
  SquarePlus,
  Search,
  Library,
} from "lucide-react"

// Define role-based navigation items
export const getNavItems = (role: string) => {
  const baseItems = [
    {
      title: "Dashboard",
      url: "/dashboard/chat",
      icon: Activity,
      isActive: true,
      items: [
        { title: "Chat", url: "/dashboard/chat" },
        { title: "Memory", url: "/dashboard/memory" },
        { title: "Settings", url: "/settings/account" }
      ]
    }
  ]

  const roleBasedItems: Record<string, any> = {
    SUPER_ADMIN: [
      {
        title: "Users Management",
        url: "/users/list",
        icon: Users,
        items: [
          { title: "All Users", url: "/users/list" },
          { title: "Roles & Permissions", url: "/users/roles" },
          { title: "Add User", url: "/users/add" },
          { title: "User Activity", url: "/users/activity" }
        ]
      },
      {
        title: "Doctors Panel",
        url: "/doctors",
        icon: UserCog,
        items: [
          { title: "Verify Doctors", url: "/doctors/verify" },
          { title: "Specializations", url: "/doctors/specializations" },
          { title: "Performance", url: "/doctors/performance" },
          { title: "Complaints", url: "/doctors/complaints" }
        ]
      },
      {
        title: "System",
        url: "/system",
        icon: Database,
        items: [
          { title: "Database", url: "/system/database" },
          { title: "Settings", url: "/system/settings" },
          { title: "Logs", url: "/system/logs" },
          { title: "Backups", url: "/system/backups" },
          { title: "API Keys", url: "/system/api-keys" },
          { title: "Security", url: "/system/security" }
        ]
      },
      {
        title: "Analytics",
        url: "/analytics",
        icon: LineChart,
        items: [
          { title: "User Growth", url: "/analytics/users" },
          { title: "AI Performance", url: "/analytics/ai" },
          { title: "System Health", url: "/analytics/system" },
          { title: "Revenue", url: "/analytics/revenue" }
        ]
      },
      {
        title: "AI Management",
        url: "/ai-management",
        icon: Bot,
        items: [
          { title: "Model Performance", url: "/ai-management/performance" },
          { title: "Training Data", url: "/ai-management/training" },
          { title: "Model Versions", url: "/ai-management/versions" },
          { title: "Error Analysis", url: "/ai-management/errors" },
          { title: "API Usage", url: "/ai-management/api" }
        ]
      }
    ],
    ADMIN: [
      {
        title: "User Management",
        url: "/users",
        icon: Users,
        items: [
          { title: "View Users", url: "/users" },
          { title: "Add User", url: "/users/add" },
          { title: "User Reports", url: "/users/reports" },
          { title: "Access Control", url: "/users/access" }
        ]
      },
      {
        title: "Appointments",
        url: "/appointments",
        icon: Calendar,
        items: [
          { title: "All Appointments", url: "/appointments" },
          { title: "Schedule Management", url: "/appointments/schedule" },
          { title: "Cancellations", url: "/appointments/cancellations" },
          { title: "Reports", url: "/appointments/reports" }
        ]
      },
      {
        title: "Emergency Services",
        url: "/emergency",
        icon: Ambulance,
        items: [
          { title: "Active Requests", url: "/emergency/active" },
          { title: "Response Times", url: "/emergency/response" },
          { title: "Hospital Network", url: "/emergency/hospitals" },
          { title: "Emergency Logs", url: "/emergency/logs" }
        ]
      }
    ],
    DOCTOR: [
      {
        title: "Appointments",
        url: "/appointments",
        icon: Calendar,
        items: [
          { title: "My Schedule", url: "/appointments/schedule" },
          { title: "Patient Appointments", url: "/appointments/patients" },
          { title: "Emergency Slots", url: "/appointments/emergency" },
          { title: "History", url: "/appointments/history" }
        ]
      },
      {
        title: "Patients",
        url: "/patients",
        icon: Users,
        items: [
          { title: "My Patients", url: "/patients" },
          { title: "Patient Records", url: "/patients/records" },
          { title: "Risk Assessments", url: "/patients/risks" },
          { title: "Treatment Plans", url: "/patients/treatments" }
        ]
      }
    ],
    GUEST: []
  }

  // Common items based on role
  const commonItems = [
    {
      title: "Messages",
      url: "/messages",
      icon: MessageSquare,
      items: [
        { title: "Inbox", url: "/messages" },
        { title: "Sent", url: "/messages/sent" },
        { title: "Important", url: "/messages/important" },
        { title: "Archived", url: "/messages/archived" }
      ]
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      items: [
        { title: "Account", url: "/settings/account" },
        { title: "Preferences", url: "/settings/preferences" },
        { title: "Billing", url: "/settings/billing" },
        { title: "System", url: "/settings/system" },
        { title: "Help & Legal", url: "/settings/help" }
      ]
    }
  ]

  const items = role === 'GUEST' 
    ? [...baseItems, ...(roleBasedItems[role] || [])]
    : [...baseItems, ...(roleBasedItems[role] || []), ...commonItems]

  return items
}

// Common navigation items for all roles
export const commonNavItems = [
  {
    title: "Support",
    url: "/support",
    icon: LifeBuoy,
  },
  {
    title: "Feedback",
    url: "/feedback",
    icon: Send,
  },
]

// Quick Actions for sidebar
export const quickActions = [
  {
    title: "New Chat",
    url: "/chat/new",
    icon: SquarePlus,
  },
  {
    title: "Search",
    url: "/search",
    icon: Search,
  },
  {
    title: "Library",
    url: "/library",
    icon: Library,
  },
]

// Conversations data
export const conversations = [
  { id: 1, title: "Healthcare AI Discussion", url: "/chat/1", date: "Today" },
  { id: 2, title: "Patient Management System", url: "/chat/2", date: "Yesterday" },
  { id: 3, title: "Medical Diagnosis AI", url: "/chat/3", date: "2 days ago" },
  { id: 4, title: "Treatment Planning", url: "/chat/4", date: "Last week" },
]

// Projects data
export const projects = [
  { 
    id: 1, 
    name: "Healthcare AI Platform",
    conversations: [
      { id: 1, title: "Initial Requirements", url: "/project/1/conv/1" },
      { id: 2, title: "Architecture Design", url: "/project/1/conv/2" },
      { id: 3, title: "Implementation Phase", url: "/project/1/conv/3" },
    ]
  },
  { 
    id: 2, 
    name: "Patient Portal",
    conversations: [
      { id: 1, title: "User Research", url: "/project/2/conv/1" },
      { id: 2, title: "UI/UX Design", url: "/project/2/conv/2" },
    ]
  },
]

// Utility function for truncating text
export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
} 