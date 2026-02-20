import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { User, Mail, Phone, Building2, Calendar, Save, ArrowLeft } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@msm.edu",
    phone: "(404) 555-0123",
    department: "Internal Medicine",
    title: "Associate Professor",
    joinDate: "2019-08-15",
    specialization: "Cardiology",
    bio: "Board-certified internist with over 15 years of clinical and teaching experience. Passionate about medical education and curriculum development.",
  });

  const handleSave = () => {
    // Save profile data
    setIsEditing(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
              <p className="text-sm text-gray-600">Manage your personal information</p>
            </div>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="size-4" />
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {/* Profile Picture Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start gap-6">
            <div className="size-24 rounded-full bg-gradient-to-br from-[#FFC645] to-[#FFB020] flex items-center justify-center text-white text-3xl font-semibold">
              SJ
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Profile Picture</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload a professional photo to help colleagues recognize you
              </p>
              {isEditing && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Upload Photo</Button>
                  <Button variant="ghost" size="sm">Remove</Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="size-5 text-gray-600" />
            Basic Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="size-5 text-gray-600" />
            Professional Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={!isEditing}
                className="w-full min-h-24 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FFC645]/20 focus:border-[#FFC645] disabled:opacity-50 disabled:bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="size-5 text-gray-600" />
            Account Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Member Since</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(formData.joinDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Account Status</span>
              <span className="text-sm font-medium text-green-600">Active</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Role</span>
              <span className="text-sm font-medium text-gray-900">Faculty Member</span>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Security</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              Change Password
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Two-Factor Authentication
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Active Sessions
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}