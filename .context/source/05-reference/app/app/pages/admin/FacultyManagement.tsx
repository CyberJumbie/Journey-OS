import { useState } from "react";
import AdminDashboardLayout from "../../components/layout/AdminDashboardLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import {
  UserPlus,
  Mail,
  RotateCw,
  X,
  Users,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface FacultyInvitation {
  id: string;
  email: string;
  name: string;
  department: string;
  sections: string[];
  status: "invited" | "pending_approval" | "active";
  invitedAt: string;
  lastSentAt?: string;
}

const DEPARTMENTS = [
  "Anatomy",
  "Biochemistry",
  "Cardiology",
  "Emergency Medicine",
  "Family Medicine",
  "Internal Medicine",
  "Neurology",
  "Obstetrics and Gynecology",
  "Pathology",
  "Pediatrics",
  "Pharmacology",
  "Physiology",
  "Psychiatry",
  "Radiology",
  "Surgery",
];

export default function FacultyManagement() {
  const [activeTab, setActiveTab] = useState<"invited" | "pending_approval" | "active">("invited");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data - replace with API
  const [invitations, setInvitations] = useState<FacultyInvitation[]>([
    {
      id: "1",
      email: "john.smith@msm.edu",
      name: "Dr. John Smith",
      department: "Cardiology",
      sections: ["CARD-501", "MED-302"],
      status: "invited",
      invitedAt: "2026-02-14T10:30:00",
      lastSentAt: "2026-02-14T10:30:00",
    },
    {
      id: "2",
      email: "jane.doe@msm.edu",
      name: "Dr. Jane Doe",
      department: "Pediatrics",
      sections: ["PED-201"],
      status: "invited",
      invitedAt: "2026-02-12T14:20:00",
      lastSentAt: "2026-02-15T09:15:00",
    },
    {
      id: "3",
      email: "robert.jones@msm.edu",
      name: "Dr. Robert Jones",
      department: "Internal Medicine",
      sections: ["IM-101", "IM-102", "IM-301"],
      status: "active",
      invitedAt: "2026-02-01T08:00:00",
    },
  ]);

  // Mock sections - replace with API
  const [availableSections] = useState([
    { id: "1", code: "ANAT-101", name: "Gross Anatomy" },
    { id: "2", code: "CARD-501", name: "Advanced Cardiology" },
    { id: "3", code: "MED-302", name: "Clinical Medicine" },
    { id: "4", code: "PED-201", name: "Pediatric Care" },
    { id: "5", code: "IM-101", name: "Internal Medicine I" },
    { id: "6", code: "IM-102", name: "Internal Medicine II" },
    { id: "7", code: "IM-301", name: "Advanced Internal Medicine" },
  ]);

  const [inviteForm, setInviteForm] = useState({
    email: "",
    department: "",
    sections: [] as string[],
  });

  const filteredInvitations = invitations.filter(inv => inv.status === activeTab);

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.department) {
      alert("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      // API call to send magic link
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newInvitation: FacultyInvitation = {
        id: Date.now().toString(),
        email: inviteForm.email,
        name: inviteForm.email.split("@")[0],
        department: inviteForm.department,
        sections: inviteForm.sections,
        status: "invited",
        invitedAt: new Date().toISOString(),
        lastSentAt: new Date().toISOString(),
      };

      setInvitations([...invitations, newInvitation]);
      setShowInviteModal(false);
      setInviteForm({ email: "", department: "", sections: [] });
    } catch (error) {
      alert("Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (id: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setInvitations(invitations.map(inv => 
        inv.id === id 
          ? { ...inv, lastSentAt: new Date().toISOString() }
          : inv
      ));
    } catch (error) {
      alert("Failed to resend invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setInvitations(invitations.filter(inv => inv.id !== id));
      setRevokeTarget(null);
    } catch (error) {
      alert("Failed to revoke invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setInviteForm(prev => ({
      ...prev,
      sections: prev.sections.includes(sectionId)
        ? prev.sections.filter(id => id !== sectionId)
        : [...prev.sections, sectionId]
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "invited":
        return <Badge className="bg-[--warning-bg] text-[--green-dark]">Pending</Badge>;
      case "pending_approval":
        return <Badge className="bg-[--info-bg] text-[--blue]">Approval</Badge>;
      case "active":
        return <Badge className="bg-[--success-bg] text-[--green]">Active</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const tabCounts = {
    invited: invitations.filter(i => i.status === "invited").length,
    pending_approval: invitations.filter(i => i.status === "pending_approval").length,
    active: invitations.filter(i => i.status === "active").length,
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Faculty Management</h1>
            <p className="text-gray-600 mt-1">
              Invite faculty via magic links and manage access
            </p>
          </div>

          {/* Invite Modal */}
          <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="size-4 mr-2" />
                Invite Faculty
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Invite Faculty Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="faculty@msm.edu"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="department">Department *</Label>
                  <select
                    id="department"
                    value={inviteForm.department}
                    onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select department...</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Sections (Optional)</Label>
                  <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                    {availableSections.map(section => (
                      <label key={section.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={inviteForm.sections.includes(section.code)}
                          onChange={() => toggleSection(section.code)}
                          className="size-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="font-mono text-sm text-gray-700">{section.code}</span>
                        <span className="text-sm text-gray-600">{section.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleInvite}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="size-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowInviteModal(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("invited")}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === "invited"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Invited ({tabCounts.invited})
          </button>
          <button
            onClick={() => setActiveTab("pending_approval")}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === "pending_approval"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Pending Approval ({tabCounts.pending_approval})
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === "active"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Active ({tabCounts.active})
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[--radius-xl] border border-[--border-light] overflow-hidden">
          {filteredInvitations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[--parchment] border-b border-[--border-light]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Faculty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Sections
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--border-light]">
                  {filteredInvitations.map(invitation => (
                    <tr key={invitation.id} className="hover:bg-[--parchment] transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{invitation.name}</div>
                          <div className="text-sm text-gray-600">{invitation.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {invitation.department}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {invitation.sections.length > 0 ? (
                            invitation.sections.map(section => (
                              <Badge key={section} variant="secondary" className="text-xs">
                                {section}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(invitation.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatDate(invitation.lastSentAt || invitation.invitedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {invitation.status === "invited" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResend(invitation.id)}
                                disabled={isLoading}
                              >
                                <RotateCw className="size-4 mr-1" />
                                Resend
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRevokeTarget(invitation.id)}
                                disabled={isLoading}
                              >
                                <X className="size-4 mr-1" />
                                Revoke
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              {activeTab === "invited" ? (
                <>
                  <Mail className="size-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No pending invitations</p>
                  <p className="text-sm text-gray-500">
                    Use 'Invite Faculty' to send magic links
                  </p>
                </>
              ) : activeTab === "pending_approval" ? (
                <>
                  <Users className="size-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No pending approvals</p>
                  <p className="text-sm text-gray-500">
                    Faculty awaiting approval will appear here
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No active faculty yet</p>
                  <p className="text-sm text-gray-500">
                    Accepted invitations will appear here
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Revoke Confirmation Dialog */}
        <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke Invitation?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the magic link. The faculty member will not be able to accept this invitation.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => revokeTarget && handleRevoke(revokeTarget)}
                className="bg-red-600 hover:bg-red-700"
              >
                Revoke Invitation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminDashboardLayout>
  );
}