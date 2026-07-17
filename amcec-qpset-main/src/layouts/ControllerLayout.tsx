import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Users, ShieldCheck, FileLock2, BookOpenCheck, BarChart3, LogOut, Database, CalendarRange, Layers } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { AppFooter } from '@/components/AppLayout';
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarHeader, SidebarFooter, useSidebar } from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import amcecLogo from '@/assets/amcec-logo.png';

const navigationGroups = [
  {
    label: 'Control Center',
    items: [
      { title: 'Executive Dashboard', url: '/controller/dashboard', icon: LayoutDashboard },
      { title: 'Exam Cycles & Schedules', url: '/controller/create-assessment', icon: CalendarRange },
      { title: 'Course Allocations', url: '/controller/assign', icon: ClipboardList },
      { title: 'Assigned Papers Grid', url: '/controller/assigned-grid', icon: Layers },
    ]
  },
  {
    label: 'Quality & Security',
    items: [
      { title: 'Academic Quality Audit', url: '/controller/review', icon: ShieldCheck },
      { title: 'Security & Access Logs', url: '/controller/security', icon: FileLock2 },
    ]
  },
  {
    label: 'Registries',
    items: [
      { title: 'HOD Registry', url: '/controller/hods', icon: Users },
      { title: 'Faculty Registry', url: '/controller/faculty', icon: Users },
      { title: 'Course Database', url: '/controller/courses-db', icon: BookOpenCheck },
    ]
  },
  {
    label: 'Intellect & Analytics',
    items: [
      { title: 'Analytics & Compliance', url: '/controller/reports', icon: BarChart3 },
      { title: 'Intellectual Repository', url: '/controller/repository', icon: Database },
    ]
  }
];

function ControllerSidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={amcecLogo} alt="AMCEC" className="h-10 w-10 object-contain rounded" />
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-sidebar-foreground leading-tight">QPSet</p>
              <p className="text-[10px] text-sidebar-foreground/70 leading-tight">AMCEC, Bengaluru</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="space-y-4 py-2">
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40 px-3 mb-1">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end 
                        className="hover:bg-sidebar-accent transition-colors py-1.5 h-8 text-xs" 
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => { logout(); navigate('/'); }}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function ControllerLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ControllerSidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="ml-0" />
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Controller of Examinations</span>
            </div>
            <div className="flex items-center gap-3">
              <NotificationDropdown />
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{currentUser?.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser?.title}</p>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 bg-background">{children}</main>
          <AppFooter />
        </div>
      </div>
    </SidebarProvider>
  );
}
