import { Link, useNavigate } from "router";
import { Bell, Search, Menu } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";

interface TopNavigationProps {
  showSearch?: boolean;
}

export default function TopNavigation({ showSearch = false }: TopNavigationProps) {
  const navigate = useNavigate();

  const handleSignOut = () => {
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[--border-default] bg-white shadow-[--shadow-nav]">
      <div className="flex h-16 items-center px-6">
        {/* Logo and Brand */}
        <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="flex items-center gap-1">
            <span className="text-[22px] font-serif font-bold text-[--navy-deep] tracking-tight">Journey</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[--radius-sm] text-[9px] font-mono text-[--green] uppercase tracking-wider" style={{ backgroundColor: '#d8d8121A', border: '1px solid #d8d8124D' }}>
              OS
            </span>
          </div>
        </Link>

        {/* Navigation Links - Desktop */}
        <nav className="ml-12 hidden md:flex items-center gap-6">
          <Link
            to="/dashboard"
            className="text-[14px] font-sans font-medium text-[--navy-deep] transition-colors hover:text-[--blue]"
          >
            Dashboard
          </Link>
          <Link
            to="/courses"
            className="text-[14px] font-sans font-medium text-[--blue-mid] transition-colors hover:text-[--navy-deep]"
          >
            Courses
          </Link>
          <Link
            to="/repository"
            className="text-[14px] font-sans font-medium text-[--blue-mid] transition-colors hover:text-[--navy-deep]"
          >
            Repository
          </Link>
          <Link
            to="/analytics/personal"
            className="text-[14px] font-sans font-medium text-[--blue-mid] transition-colors hover:text-[--navy-deep]"
          >
            Analytics
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {/* Search */}
          {showSearch && (
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--text-muted]" />
              <Input
                type="search"
                placeholder="Search questions..."
                className="w-64 pl-9"
              />
            </div>
          )}

          {/* Mobile Menu */}
          <Button variant="ghost" size="icon" className="md:hidden text-[--navy-deep] hover:bg-[--parchment]">
            <Menu className="h-5 w-5" />
          </Button>

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
              3
            </Badge>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-[--parchment]">
                <Avatar>
                  <AvatarFallback className="bg-[--green] text-[--navy-deep] font-sans font-semibold">
                    DS
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="end">
              <div className="flex flex-col space-y-1 p-3">
                <p className="text-[14px] font-sans font-semibold leading-none text-[--ink]">Dr. Sarah Johnson</p>
                <p className="text-[13px] font-sans leading-none text-[--text-muted]">
                  sarah.johnson@msm.edu
                </p>
                <Badge variant="faculty" className="mt-2 w-fit">
                  Faculty
                </Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/courses")}>
                All Courses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/templates")}>
                Question Templates
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/analytics/personal")}>
                My Questions
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
  );
}