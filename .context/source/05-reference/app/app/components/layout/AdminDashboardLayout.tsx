import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Wand2,
  Network,
  BookOpen,
  Users,
  GraduationCap,
  Settings,
  Bell,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";

interface AdminDashboardLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/setup", label: "Setup Wizard", icon: Wand2 },
  { path: "/admin/frameworks", label: "Frameworks", icon: Network },
  { path: "/admin/ilos", label: "ILO Management", icon: BookOpen },
  { path: "/admin/knowledge", label: "Knowledge Browser", icon: BookOpen },
  { path: "/admin/faculty", label: "Faculty", icon: Users },
  { path: "/admin/courses", label: "Courses", icon: GraduationCap, disabled: true },
  { path: "/admin/settings", label: "Settings", icon: Settings, disabled: true },
];

export default function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const handleSignOut = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[--cream]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-[--border-light] bg-white shadow-[--shadow-nav]">
        <div className="flex h-16 items-center px-6">
          {/* Logo and Brand */}
          <Link to="/admin" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="flex items-center gap-1">
              <span className="text-[22px] font-serif font-bold text-[--navy-deep] tracking-tight">Journey</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-[--radius-sm] text-[9px] font-mono text-[--green] uppercase tracking-wider" style={{ backgroundColor: '#d8d8121A', border: '1px solid #d8d8124D' }}>
                OS
              </span>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-4">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-[--navy-deep] hover:bg-[--parchment]"
              onClick={() => navigate("/notifications")}
            >
              <Bell className="h-5 w-5" />
              <Badge
                variant="danger"
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center"
              >
                2
              </Badge>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-[--parchment]">
                  <Avatar>
                    <AvatarFallback className="bg-[--blue] text-[--navy-deep] font-sans font-semibold">
                      AD
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72" align="end">
                <div className="flex flex-col space-y-1 p-3">
                  <p className="text-[14px] font-sans font-semibold leading-none text-[--ink]">Admin User</p>
                  <p className="text-[13px] font-sans leading-none text-[--text-muted]">
                    admin@msm.edu
                  </p>
                  <Badge variant="admin" className="mt-2 w-fit">
                    Administrator
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin")}>
                  Admin Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  Faculty Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/help")}>
                  Help & Support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-[--danger] focus:text-[--danger]"
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Collapsible Sidebar - Expands on Hover */}
        <aside
          className={`sticky top-16 h-[calc(100vh-4rem)] border-r border-[--border-light] bg-white transition-all duration-300 ${
            sidebarHovered ? "w-64" : "w-16"
          }`}
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
        >
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.path}
                      to={item.disabled ? "#" : item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-[--radius-md] transition-all duration-[--duration-fast] ${
                        item.disabled
                          ? "text-[--text-muted] cursor-not-allowed opacity-50"
                          : isActive
                          ? "bg-[--parchment] text-[--navy-deep] font-semibold shadow-sm"
                          : "text-[--text-secondary] hover:bg-[--parchment] hover:text-[--ink]"
                      }`}
                      onClick={(e) => item.disabled && e.preventDefault()}
                      title={!sidebarHovered ? item.label : undefined}
                    >
                      <Icon className="size-5 shrink-0" />
                      {sidebarHovered && (
                        <>
                          <span className="text-[14px] font-sans whitespace-nowrap">{item.label}</span>
                          {item.disabled && (
                            <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-[--text-muted]">Soon</span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto bg-[--cream]">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}