import { useParams, Link } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, FileDown, Sparkles } from "lucide-react";

export default function CourseAnalytics() {
  const { courseId } = useParams();

  const weeklyData = [
    { week: "Week 1", questions: 5 },
    { week: "Week 2", questions: 8 },
    { week: "Week 3", questions: 12 },
    { week: "Week 4", questions: 6 },
    { week: "Week 5", questions: 0 },
  ];

  const difficultyData = [
    { name: "Easy", value: 8, color: "#10B981" },
    { name: "Medium", value: 18, color: "#F59E0B" },
    { name: "Hard", value: 12, color: "#EF4444" },
  ];

  const generationData = [
    { date: "Feb 1", count: 2 },
    { date: "Feb 5", count: 5 },
    { date: "Feb 8", count: 8 },
    { date: "Feb 10", count: 6 },
    { date: "Feb 12", count: 10 },
    { date: "Feb 15", count: 7 },
  ];

  const topicsData = [
    { topic: "Myocardial Infarction", count: 12 },
    { topic: "Heart Failure", count: 10 },
    { topic: "Arrhythmias", count: 8 },
    { topic: "Valvular Disease", count: 6 },
    { topic: "ECG Interpretation", count: 5 },
  ];

  const blueprintCoverage = [
    { system: "Cardiovascular", total: 15, covered: 12, percentage: 80 },
    { system: "Pathologic Processes", total: 10, covered: 8, percentage: 80 },
    { system: "Diagnostic Tests", total: 8, covered: 5, percentage: 63 },
    { system: "Pharmacology", total: 12, covered: 6, percentage: 50 },
  ];

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Courses</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/courses/${courseId}`}>Pathology</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Analytics</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-2">Course Analytics: Pathology PATH-250</h1>
          <p className="text-muted-foreground">
            Insights and performance metrics for your course
          </p>
        </div>
        <div className="flex gap-3">
          <Select defaultValue="semester">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semester">This Semester</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="alltime">All Time</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">38</div>
            <p className="mt-1 flex items-center text-xs text-success">
              <TrendingUp className="mr-1 h-3 w-3" />
              +15% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">89%</div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div className="h-2 w-[89%] rounded-full bg-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0.91</div>
            <div className="mt-1 text-warning">★★★★★</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Questions Per Week */}
        <Card>
          <CardHeader>
            <CardTitle>Questions Per Week</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="questions" fill="#FFC645" radius={[8, 8, 0, 0]} />
              </BarChart>
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
                  data={difficultyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {difficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Generation Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Question Generation Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={generationData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#FFC645"
                  strokeWidth={2}
                  dot={{ fill: "#FFC645", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Topics with Most Questions */}
        <Card>
          <CardHeader>
            <CardTitle>Topics with Most Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topicsData.map((item, index) => (
                <div key={item.topic}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium">{item.topic}</span>
                    <span className="text-muted-foreground">{item.count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${(item.count / 12) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blueprint Coverage Detail */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Detailed Coverage Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {blueprintCoverage.map((item) => (
              <div
                key={item.system}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex-1">
                  <p className="mb-2 font-medium">{item.system}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {item.covered} of {item.total} topics covered
                    </span>
                    <span
                      className={
                        item.percentage >= 80
                          ? "text-success"
                          : item.percentage >= 60
                          ? "text-warning"
                          : "text-destructive"
                      }
                    >
                      {item.percentage}%
                    </span>
                  </div>
                </div>
                <Link to="/generate/topic">
                  <Button size="sm" variant="outline">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
