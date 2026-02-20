import { useState } from "react";
import { useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { 
  Search, 
  Plus, 
  BookOpen, 
  Users, 
  FileText, 
  Clock,
  Filter,
  MoreVertical,
  ArrowUpDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

const courses = [
  {
    id: "1",
    name: "Advanced Cardiovascular Medicine",
    code: "CARD-501",
    semester: "Spring 2026",
    students: 45,
    questions: 127,
    status: "active",
    lastUpdated: "2026-02-14",
  },
  {
    id: "2",
    name: "Internal Medicine Fundamentals",
    code: "IM-301",
    semester: "Spring 2026",
    students: 82,
    questions: 243,
    status: "active",
    lastUpdated: "2026-02-13",
  },
  {
    id: "3",
    name: "Clinical Diagnosis & Reasoning",
    code: "DIAG-402",
    semester: "Fall 2025",
    students: 38,
    questions: 89,
    status: "archived",
    lastUpdated: "2025-12-15",
  },
  {
    id: "4",
    name: "Pharmacology in Practice",
    code: "PHARM-350",
    semester: "Spring 2026",
    students: 67,
    questions: 156,
    status: "active",
    lastUpdated: "2026-02-10",
  },
  {
    id: "5",
    name: "Emergency Medicine Protocols",
    code: "EM-450",
    semester: "Fall 2025",
    students: 52,
    questions: 178,
    status: "archived",
    lastUpdated: "2025-11-30",
  },
  {
    id: "6",
    name: "Pediatric Care Essentials",
    code: "PED-320",
    semester: "Spring 2026",
    students: 41,
    questions: 98,
    status: "active",
    lastUpdated: "2026-02-11",
  },
];

export default function AllCourses() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "archived">("all");
  const [sortBy, setSortBy] = useState<"name" | "updated" | "questions">("updated");

  const filteredCourses = courses
    .filter(course => {
      const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           course.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === "all" || course.status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "questions") return b.questions - a.questions;
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    });

  const getStatusColor = (status: string) => {
    return status === "active" 
      ? "bg-green-100 text-green-700" 
      : "bg-gray-100 text-gray-600";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">All Courses</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage and view all your courses
            </p>
          </div>
          <Button onClick={() => navigate("/courses/create")}>
            <Plus className="size-4" />
            Create New Course
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-4 hover:border-[--blue-mid] hover:shadow-[--shadow-sm] transition-all">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-[#FFC645]/10 flex items-center justify-center">
                <BookOpen className="size-5 text-[#FFC645]" />
              </div>
              <div>
                <p className="text-sm text-[--text-secondary]">Total Courses</p>
                <p className="text-xl font-semibold text-[--ink]">{courses.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-4 hover:border-[--blue-mid] hover:shadow-[--shadow-sm] transition-all">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-[--text-secondary]">Total Students</p>
                <p className="text-xl font-semibold text-[--ink]">
                  {courses.reduce((sum, c) => sum + c.students, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-4 hover:border-[--blue-mid] hover:shadow-[--shadow-sm] transition-all">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-[--text-secondary]">Total Questions</p>
                <p className="text-xl font-semibold text-[--ink]">
                  {courses.reduce((sum, c) => sum + c.questions, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-4 hover:border-[--blue-mid] hover:shadow-[--shadow-sm] transition-all">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Clock className="size-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-[--text-secondary]">Active Courses</p>
                <p className="text-xl font-semibold text-[--ink]">
                  {courses.filter(c => c.status === "active").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search courses by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="size-4" />
                    Status: {filterStatus === "all" ? "All" : filterStatus === "active" ? "Active" : "Archived"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                    All Courses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("active")}>
                    Active Only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("archived")}>
                    Archived Only
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <ArrowUpDown className="size-4" />
                    Sort by
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy("updated")}>
                    Last Updated
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("name")}>
                    Course Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("questions")}>
                    Question Count
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Course List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Semester
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCourses.map((course) => (
                  <tr 
                    key={course.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/courses/${course.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{course.name}</p>
                        <p className="text-sm text-gray-600">{course.code}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {course.semester}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-gray-400" />
                        {course.students}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-gray-400" />
                        {course.questions}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}>
                        {course.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-gray-400" />
                        {new Date(course.lastUpdated).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/courses/${course.id}`);
                          }}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/courses/${course.id}/questions`);
                          }}>
                            View Questions
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/analytics/course/${course.id}`);
                          }}>
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            {course.status === "active" ? "Archive Course" : "Activate Course"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredCourses.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="size-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No courses found</p>
              <p className="text-sm text-gray-500">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}