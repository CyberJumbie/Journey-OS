import DashboardLayout from "../../components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { FileText, CheckCircle, Clock, Trophy } from "lucide-react";

export default function PersonalDashboard() {
  const recentQuestions = [
    { id: "q1", title: "MI diagnosis question", status: "approved", date: "2 hours ago", course: "PATH-250" },
    { id: "q2", title: "Heart failure pathophysiology", status: "pending", date: "5 hours ago", course: "PATH-250" },
    { id: "q3", title: "ECG interpretation", status: "approved", date: "1 day ago", course: "MED-120" },
  ];

  const achievements = [
    { icon: Trophy, title: "First 10 Questions", description: "Generated 10 questions", unlocked: true },
    { icon: CheckCircle, title: "100 Questions Approved", description: "Reach 100 approved questions", unlocked: false, progress: 38 },
    { icon: FileText, title: "Repository Contributor", description: "Add 50 questions to repository", unlocked: false, progress: 28 },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="mb-2">My Question Activity</h1>
        <p className="text-muted-foreground">
          Track your question generation and approval activity
        </p>
      </div>

      {/* Time Period Filter */}
      <Tabs defaultValue="month" className="mb-8">
        <TabsList>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="semester">This Semester</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stats Cards */}
      <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Questions Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">48</div>
            <p className="mt-1 text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Questions Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">38</div>
            <p className="mt-1 text-xs text-success">79% approval rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Time Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">24</div>
            <p className="mt-1 text-xs text-muted-foreground">Estimated hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Repository Contributions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">156</div>
            <p className="mt-1 text-xs text-muted-foreground">Total questions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Questions */}
        <Card>
          <CardHeader>
            <CardTitle>My Recent Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentQuestions.map((question) => (
                <div key={question.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex-1">
                    <p className="mb-1 font-medium">{question.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Badge variant="secondary">{question.course}</Badge>
                      <span>{question.date}</span>
                    </div>
                  </div>
                  {question.status === "approved" ? (
                    <Badge className="bg-success text-success-foreground">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Approved
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-warning text-warning">
                      <Clock className="mr-1 h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>Achievements & Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {achievements.map((achievement, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-4 rounded-lg border p-4 ${
                    achievement.unlocked ? "bg-accent/30" : ""
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                      achievement.unlocked ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <achievement.icon
                      className={`h-6 w-6 ${
                        achievement.unlocked ? "text-primary-foreground" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="mb-1 font-medium">{achievement.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {achievement.description}
                    </p>
                    {!achievement.unlocked && achievement.progress && (
                      <div className="mt-2">
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${achievement.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {achievement.unlocked && (
                    <CheckCircle className="h-5 w-5 text-success" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
