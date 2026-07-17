import { useNavigate } from 'react-router-dom';
import { Home, ClipboardList, PenTool, Eye, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { AppFooter } from '@/components/AppLayout';
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarHeader, SidebarFooter, useSidebar } from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import amcecLogo from '@/assets/amcec-logo.png';

const facultyNav = [
  { title: 'My Dashboard', url: '/faculty/dashboard', icon: Home },
  { title: 'My Assignments', url: '/faculty/assignments', icon: ClipboardList },
  { title: 'Create Paper', url: '/faculty/create-paper', icon: PenTool },
  { title: 'Preview Paper', url: '/faculty/preview-paper', icon: Eye },
];

function FacultySidebar() {
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
              <p className="text-[10px] text-sidebar-foreground/70 leading-tight">QP Setter Portal</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {facultyNav.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <FacultySidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="ml-0" />
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline">QP Setter Portal</span>
            </div>
            <div className="flex items-center gap-3">
              <NotificationDropdown />
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{currentUser?.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser?.subject}</p>
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
