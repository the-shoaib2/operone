import * as React from "react"
import { useLocation, Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components"

// Route to breadcrumb label mapping
const routeLabels: Record<string, string> = {
    dashboard: "Dashboard",
    chat: "Chat",
    memory: "Memory",
    analytics: "Analytics",
    notifications: "Notifications",
    settings: "Settings",
    account: "Account",
    billing: "Billing",
    preferences: "Preferences",
    system: "System",
    help: "Help & Legal",
}

export function BreadcrumbNav() {
    const location = useLocation()

    // Parse pathname into breadcrumb segments
    const pathSegments = location.pathname
        .split("/")
        .filter(Boolean)

    // Generate breadcrumb items
    const breadcrumbs = pathSegments.map((segment, index) => {
        const path = `/${pathSegments.slice(0, index + 1).join("/")}`
        const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
        const isLast = index === pathSegments.length - 1

        return {
            path,
            label,
            isLast,
        }
    })

    // Don't show breadcrumbs on root
    if (breadcrumbs.length === 0) {
        return null
    }

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {breadcrumbs.map((crumb) => (
                    <React.Fragment key={crumb.path}>
                        <BreadcrumbItem>
                            {crumb.isLast ? (
                                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink asChild>
                                    <Link to={crumb.path}>{crumb.label}</Link>
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                        {!crumb.isLast && (
                            <BreadcrumbSeparator>
                                <ChevronRight className="h-4 w-4" />
                            </BreadcrumbSeparator>
                        )}
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
