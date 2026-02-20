import DashboardLayout from "../../components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Label } from "../../components/ui/label";
import { Sparkles, FileDown } from "lucide-react";
import { Link } from "react-router";

export default function BlueprintCoverage() {
  const blueprintData = [
    {
      system: "Cardiovascular System",
      categories: [
        { name: "Normal Processes", count: 12, max: 15 },
        { name: "Pathologic Processes", count: 18, max: 20 },
        { name: "Congenital Defects", count: 3, max: 10 },
        { name: "Diagnostic Tests", count: 8, max: 10 },
      ],
    },
    {
      system: "Nervous System",
      categories: [
        { name: "Normal Processes", count: 5, max: 15 },
        { name: "Pathologic Processes", count: 8, max: 20 },
        { name: "Neuropharmacology", count: 0, max: 10 },
        { name: "Behavioral Science", count: 2, max: 10 },
      ],
    },
    {
      system: "Renal System",
      categories: [
        { name: "Normal Processes", count: 4, max: 15 },
        { name: "Pathologic Processes", count: 6, max: 20 },
        { name: "Acid-Base Disorders", count: 3, max: 10 },
        { name: "Pharmacology", count: 2, max: 10 },
      ],
    },
  ];

  const gapsData = [
    { topic: "Neuropharmacology", system: "Nervous System" },
    { topic: "Congenital Heart Defects", system: "Cardiovascular System" },
    { topic: "Renal Tubular Disorders", system: "Renal System" },
  ];

  const getIntensityColor = (count: number, max: number) => {
    const percentage = (count / max) * 100;
    if (count === 0) return "bg-white border";
    if (percentage < 33) return "bg-primary/20";
    if (percentage < 66) return "bg-primary/60";
    return "bg-primary";
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-2">USMLE Step 1 Blueprint Coverage</h1>
          <p className="text-muted-foreground">
            Visualize question coverage across the USMLE blueprint
          </p>
        </div>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Download Coverage Report
        </Button>
      </div>

      {/* Filter Toggle */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <RadioGroup defaultValue="course" className="flex gap-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="my" id="my" />
              <Label htmlFor="my" className="cursor-pointer font-normal">
                My Questions
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="course" id="course" />
              <Label htmlFor="course" className="cursor-pointer font-normal">
                This Course
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="institution" id="institution" />
              <Label htmlFor="institution" className="cursor-pointer font-normal">
                Institution-Wide
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Heatmap Visualization */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Blueprint Heatmap</CardTitle>
              <p className="text-sm text-muted-foreground">
                Color intensity shows question count
              </p>
            </CardHeader>
            <CardContent>
              {/* Legend */}
              <div className="mb-6 flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Coverage:</span>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded border bg-white" />
                  <span>No Coverage</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-primary/20" />
                  <span>Low</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-primary/60" />
                  <span>Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-primary" />
                  <span>High</span>
                </div>
              </div>

              {/* Heatmap */}
              <div className="space-y-8">
                {blueprintData.map((system) => (
                  <div key={system.system}>
                    <h4 className="mb-4 font-semibold">{system.system}</h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {system.categories.map((category) => (
                        <div
                          key={category.name}
                          className={`group relative cursor-pointer rounded-lg p-4 transition-all hover:scale-105 ${getIntensityColor(
                            category.count,
                            category.max
                          )}`}
                        >
                          <p className="mb-2 text-sm font-medium">
                            {category.name}
                          </p>
                          <p className="text-2xl font-bold">{category.count}</p>
                          <p className="text-xs text-muted-foreground">
                            of {category.max} questions
                          </p>
                          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/80 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button variant="secondary" size="sm">
                              <Sparkles className="mr-2 h-4 w-4" />
                              Generate
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gaps Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle>Topics Without Questions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Priority areas for question generation
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gapsData.map((gap, index) => (
                <div key={index} className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <p className="mb-1 font-medium">{gap.topic}</p>
                  <p className="mb-3 text-xs text-muted-foreground">{gap.system}</p>
                  <Link to="/generate/topic">
                    <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
