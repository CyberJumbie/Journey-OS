import { useState } from "react";
import { Link } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  FileDown, 
  Users, 
  BookOpen, 
  FileText,
  Award
} from "lucide-react";

export default function Analytics() {
  const [timePeriod, setTimePeriod] = useState("30-days");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data
  const institutionMetrics = {
    totalQuestions: 1247,
    totalCourses: 28,
    activeFaculty: 45,
    avgQualityScore: 0.87,
    approvalRate: 82,
    questionsThisMonth: 342,
    blueprintCoverage: 76,
    trend: {
      questions: +12.5,
      courses: +3,
      faculty: +2,
      quality: +0.05,
    },
  };

  const monthlyTrend = [
    { month: "Sep", questions: 156, approved: 128, rejected: 28 },
    { month: "Oct", questions: 198, approved: 165, rejected: 33 },
    { month: "Nov", questions: 234, approved: 192, rejected: 42 },
    { month: "Dec", questions: 189, approved: 154, rejected: 35 },
    { month: "Jan", questions: 298, approved: 245, rejected: 53 },
    { month: "Feb", questions: 342, approved: 281, rejected: 61 },
  ];

  const departmentData = [
    { name: "Basic Sciences", questions: 425, coverage: 82, quality: 0.89 },
    { name: "Clinical Sciences", questions: 378, coverage: 74, quality: 0.85 },
    { name: "Pathology", questions: 215, coverage: 79, quality: 0.88 },
    { name: "Pharmacology", questions: 142, coverage: 68, quality: 0.84 },
    { name: "Microbiology", questions: 87, coverage: 71, quality: 0.86 },
  ];

  const facultyLeaderboard = [
    { rank: 1, name: "Dr. Sarah Chen", questions: 145, qualityScore: 0.92, approvalRate: 89 },
    { rank: 2, name: "Dr. Michael Torres", questions: 132, qualityScore: 0.90, approvalRate: 87 },
    { rank: 3, name: "Dr. Emily Johnson", questions: 118, qualityScore: 0.91, approvalRate: 85 },
    { rank: 4, name: "Dr. James Williams", questions: 97, qualityScore: 0.88, approvalRate: 84 },
    { rank: 5, name: "Dr. Lisa Anderson", questions: 89, qualityScore: 0.89, approvalRate: 86 },
    { rank: 6, name: "Dr. Robert Martinez", questions: 76, qualityScore: 0.87, approvalRate: 82 },
    { rank: 7, name: "Dr. Jennifer Lee", questions: 68, qualityScore: 0.86, approvalRate: 81 },
    { rank: 8, name: "Dr. David Brown", questions: 54, qualityScore: 0.85, approvalRate: 80 },
  ];

  const difficultyDistribution = [
    { name: "Easy", value: 298, color: "#10B981" },
    { name: "Medium", value: 623, color: "#F59E0B" },
    { name: "Hard", value: 326, color: "#EF4444" },
  ];

  const formatMetric = (value: number, type: 'number' | 'percentage' | 'decimal') => {
    switch (type) {
      case 'percentage':
        return `${value}%`;
      case 'decimal':
        return (value * 100).toFixed(0) + '%';
      default:
        return value.toLocaleString();
    }
  };

  const getTrendIcon = (value: number) => {
    return value > 0 ? (
      <TrendingUp className="w-4 h-4 text-success-color" />
    ) : (
      <TrendingDown className="w-4 h-4 text-error-color" />
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Institution Analytics</h1>
            <p className="text-text-secondary">
              Comprehensive insights across all courses and faculty
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7-days">Last 7 days</SelectItem>
                <SelectItem value="30-days">Last 30 days</SelectItem>
                <SelectItem value="3-months">Last 3 months</SelectItem>
                <SelectItem value="6-months">Last 6 months</SelectItem>
                <SelectItem value="year">This year</SelectItem>
                <SelectItem value="all-time">All time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="basic-sciences">Basic Sciences</SelectItem>
                <SelectItem value="clinical-sciences">Clinical Sciences</SelectItem>
                <SelectItem value="pathology">Pathology</SelectItem>
                <SelectItem value="pharmacology">Pharmacology</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <FileDown className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Total Questions</p>
                  <p className="text-2xl font-semibold mt-1">
                    {formatMetric(institutionMetrics.totalQuestions, 'number')}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-sm text-success-color">
                    {getTrendIcon(institutionMetrics.trend.questions)}
                    <span>+{institutionMetrics.trend.questions}%</span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-primary-color/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary-color" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Active Courses</p>
                  <p className="text-2xl font-semibold mt-1">
                    {formatMetric(institutionMetrics.totalCourses, 'number')}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-sm text-success-color">
                    {getTrendIcon(institutionMetrics.trend.courses)}
                    <span>+{institutionMetrics.trend.courses} courses</span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-primary-color/10 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary-color" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Faculty Contributors</p>
                  <p className="text-2xl font-semibold mt-1">
                    {formatMetric(institutionMetrics.activeFaculty, 'number')}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-sm text-success-color">
                    {getTrendIcon(institutionMetrics.trend.faculty)}
                    <span>+{institutionMetrics.trend.faculty} this month</span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-primary-color/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary-color" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Avg Quality Score</p>
                  <p className="text-2xl font-semibold mt-1">
                    {formatMetric(institutionMetrics.avgQualityScore, 'decimal')}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-sm text-success-color">
                    {getTrendIcon(institutionMetrics.trend.quality)}
                    <span>+{(institutionMetrics.trend.quality * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-primary-color/10 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-primary-color" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="faculty">Faculty</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6">
              {/* Monthly Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Question Generation Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" stroke="#6B7280" />
                      <YAxis stroke="#6B7280" />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="questions" 
                        stroke="#4169E1" 
                        strokeWidth={2}
                        name="Generated"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="approved" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        name="Approved"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="rejected" 
                        stroke="#EF4444" 
                        strokeWidth={2}
                        name="Rejected"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Difficulty Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Difficulty Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={difficultyDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {difficultyDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Questions by Department */}
            <Card>
              <CardHeader>
                <CardTitle>Questions by Department</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" stroke="#6B7280" />
                    <YAxis dataKey="name" type="category" stroke="#6B7280" width={150} />
                    <Tooltip />
                    <Bar dataKey="questions" fill="#4169E1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Department Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentData.map((dept, index) => (
                    <div key={index} className="border border-border-subtle rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{dept.name}</h4>
                        <Badge variant="secondary">{dept.questions} questions</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-text-secondary">Questions</p>
                          <p className="font-medium text-lg">{dept.questions}</p>
                        </div>
                        <div>
                          <p className="text-text-secondary">Blueprint Coverage</p>
                          <p className="font-medium text-lg">{dept.coverage}%</p>
                        </div>
                        <div>
                          <p className="text-text-secondary">Quality Score</p>
                          <p className="font-medium text-lg">{(dept.quality * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faculty" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Faculty Leaderboard</CardTitle>
                <p className="text-sm text-text-secondary mt-1">
                  Top contributors ranked by question generation activity
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {facultyLeaderboard.map((faculty) => (
                    <div
                      key={faculty.rank}
                      className="flex items-center justify-between p-3 border border-border-subtle rounded-lg hover:border-primary-color/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-primary-color/10 rounded-full flex items-center justify-center font-medium text-primary-color">
                          {faculty.rank}
                        </div>
                        <div>
                          <p className="font-medium">{faculty.name}</p>
                          <p className="text-sm text-text-secondary">
                            {faculty.questions} questions generated
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-right">
                          <p className="text-text-secondary">Quality</p>
                          <p className="font-medium">{(faculty.qualityScore * 100).toFixed(0)}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-text-secondary">Approval Rate</p>
                          <p className="font-medium">{faculty.approvalRate}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
