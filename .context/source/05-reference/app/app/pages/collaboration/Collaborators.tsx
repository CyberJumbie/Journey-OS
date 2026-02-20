import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { 
  UserPlus, 
  Mail, 
  Crown, 
  MoreVertical, 
  Shield,
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: "owner" | "editor" | "viewer";
  status: "active" | "pending";
  joinedAt: string;
  avatar?: string;
}

const collaborators: Collaborator[] = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@msm.edu",
    role: "owner",
    status: "active",
    joinedAt: "2026-01-15",
  },
  {
    id: "2",
    name: "Dr. Michael Chen",
    email: "michael.chen@msm.edu",
    role: "editor",
    status: "active",
    joinedAt: "2026-02-01",
  },
  {
    id: "3",
    name: "Dr. Emily Rodriguez",
    email: "emily.rodriguez@msm.edu",
    role: "editor",
    status: "active",
    joinedAt: "2026-02-10",
  },
  {
    id: "4",
    name: "Dr. James Wilson",
    email: "james.wilson@msm.edu",
    role: "viewer",
    status: "pending",
    joinedAt: "2026-02-15",
  },
];

export default function Collaborators() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCollaborators = collaborators.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = () => {
    // Send invitation
    setShowInviteForm(false);
    setInviteEmail("");
  };

  const getRoleIcon = (role: string) => {
    if (role === "owner") return <Crown className="size-4 text-[#FFC645]" />;
    if (role === "editor") return <Shield className="size-4 text-blue-600" />;
    return <Shield className="size-4 text-gray-400" />;
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === "owner") return "bg-[#FFC645]/10 text-[#FFC645]";
    if (role === "editor") return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/courses/${courseId}`)}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900">Course Collaborators</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage who can access and edit this course
            </p>
          </div>
          <Button onClick={() => setShowInviteForm(!showInviteForm)}>
            <UserPlus className="size-4" />
            Invite Collaborator
          </Button>
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Invite New Collaborator</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="colleague@msm.edu"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setInviteRole("editor")}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      inviteRole === "editor"
                        ? 'border-[#FFC645] bg-[#FFC645]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="size-4 text-blue-600" />
                      <span className="font-medium text-gray-900">Editor</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Can create, edit, and review questions
                    </p>
                  </button>
                  <button
                    onClick={() => setInviteRole("viewer")}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      inviteRole === "viewer"
                        ? 'border-[#FFC645] bg-[#FFC645]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="size-4 text-gray-400" />
                      <span className="font-medium text-gray-900">Viewer</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Can only view questions and course content
                    </p>
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleInvite}>
                  <Mail className="size-4" />
                  Send Invitation
                </Button>
                <Button variant="outline" onClick={() => setShowInviteForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Roles Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">About Roles</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex gap-2">
              <Crown className="size-4 text-[#FFC645] shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Owner:</span> Full access to all features including managing collaborators
              </div>
            </div>
            <div className="flex gap-2">
              <Shield className="size-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Editor:</span> Can create, edit, review, and approve questions
              </div>
            </div>
            <div className="flex gap-2">
              <Shield className="size-4 text-gray-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Viewer:</span> Read-only access to view questions and course materials
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Search collaborators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Collaborators List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Collaborators ({filteredCollaborators.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredCollaborators.map((collaborator) => (
              <div key={collaborator.id} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-full bg-gradient-to-br from-[#FFC645] to-[#FFB020] flex items-center justify-center text-white font-semibold shrink-0">
                    {collaborator.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">{collaborator.name}</h3>
                          {collaborator.status === "pending" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{collaborator.email}</p>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(collaborator.role)}`}>
                            {getRoleIcon(collaborator.role)}
                            {collaborator.role}
                          </span>
                          <span className="text-xs text-gray-500">
                            Joined {new Date(collaborator.joinedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {collaborator.role !== "owner" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {collaborator.status === "pending" ? (
                              <>
                                <DropdownMenuItem>
                                  <CheckCircle2 className="size-4 text-green-600" />
                                  Approve Invitation
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <XCircle className="size-4" />
                                  Cancel Invitation
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem>Change Role</DropdownMenuItem>
                                <DropdownMenuItem>Resend Invitation</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  Remove Access
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex gap-3 text-sm">
              <div className="size-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <UserPlus className="size-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-900">
                  <span className="font-medium">Dr. Emily Rodriguez</span> was added as an editor
                </p>
                <p className="text-xs text-gray-500">2 days ago</p>
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Shield className="size-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-900">
                  <span className="font-medium">Dr. Michael Chen's</span> role was changed to editor
                </p>
                <p className="text-xs text-gray-500">1 week ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}