import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Wand2,
  Network,
  BookOpen,
  Users,
  GraduationCap,
  Settings,
} from "lucide-react";

const menuItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/setup", label: "Setup Wizard", icon: Wand2 },
  { path: "/admin/frameworks", label: "Frameworks", icon: Network },
  { path: "/admin/knowledge", label: "Knowledge", icon: BookOpen },
  { path: "/admin/faculty", label: "Faculty", icon: Users },
  { path: "/admin/courses", label: "Courses", icon: GraduationCap, disabled: true },
  { path: "/admin/settings", label: "Settings", icon: Settings, disabled: true },
];

export default function AdminSidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-white border-r border-[--border-light] min-h-screen p-4">
      <div className="mb-8">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex items-center gap-1">
            <span className="text-[18px] font-serif font-bold text-[--navy-deep] tracking-tight">Journey</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-[--radius-sm] border border-[--navy-deep] text-[8px] font-mono text-[--navy-deep] uppercase tracking-wider">
              OS
            </span>
          </div>
        </div>
        <div className="px-3 mt-1">
          <div className="text-[10px] font-mono uppercase tracking-[0.08em] text-[--text-muted]">Admin Panel</div>
        </div>
      </div>

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
                  ? "bg-[--blue-mid] text-[--navy-deep] font-semibold shadow-sm"
                  : "text-[--text-secondary] hover:bg-[--parchment] hover:text-[--ink]"
              }`}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              <Icon className="size-5" />
              <span className="text-[14px] font-sans">{item.label}</span>
              {item.disabled && (
                <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-[--text-muted]">Soon</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}