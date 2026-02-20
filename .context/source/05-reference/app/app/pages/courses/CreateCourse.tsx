import { useState } from "react";
import { useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";

export default function CreateCourse() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/courses/1/upload-syllabus");
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Step {step} of 3</span>
            <span className="font-medium">{Math.round((step / 3) * 100)}%</span>
          </div>
          <Progress value={(step / 3) * 100} className="h-2" />
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create New Course</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter course details to get started
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleContinue} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="courseName">Course Name *</Label>
                <Input
                  id="courseName"
                  placeholder="e.g., Pathology"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseCode">Course Code *</Label>
                <Input
                  id="courseCode"
                  placeholder="e.g., PATH-250"
                  required
                  className="h-11"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester *</Label>
                  <Select required>
                    <SelectTrigger id="semester" className="h-11">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fall-2025">Fall 2025</SelectItem>
                      <SelectItem value="spring-2026">Spring 2026</SelectItem>
                      <SelectItem value="summer-2026">Summer 2026</SelectItem>
                      <SelectItem value="fall-2026">Fall 2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearLevel">Year Level *</Label>
                  <Select required>
                    <SelectTrigger id="yearLevel" className="h-11">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the course..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="flex justify-between gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  Continue
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
