import DashboardLayout from "../../components/layout/DashboardLayout";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Search, BookOpen, Video, HelpCircle, Mail, AlertCircle, Lightbulb } from "lucide-react";
import { Link } from "react-router";

export default function Help() {
  const quickLinks = [
    { icon: BookOpen, title: "Getting Started", description: "Learn the basics", href: "#" },
    { icon: Video, title: "Video Tutorials", description: "Watch how-to videos", href: "#" },
    { icon: HelpCircle, title: "FAQ", description: "Common questions", href: "#" },
    { icon: Mail, title: "Contact Support", description: "Get in touch", href: "#" },
    { icon: AlertCircle, title: "Report a Bug", description: "Let us know", href: "#" },
    { icon: Lightbulb, title: "Feature Requests", description: "Suggest improvements", href: "#" },
  ];

  const articles = [
    {
      title: "How to generate your first question",
      category: "Getting Started",
      views: "1.2k",
    },
    {
      title: "Understanding quality scores",
      category: "Question Review",
      views: "890",
    },
    {
      title: "Using the AI refinement feature",
      category: "Advanced Features",
      views: "756",
    },
    {
      title: "Uploading and processing syllabi",
      category: "Course Management",
      views: "654",
    },
    {
      title: "USMLE blueprint coverage explained",
      category: "Analytics",
      views: "543",
    },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2">Help & Support</h1>
          <p className="text-muted-foreground">
            Find answers and get help with the question bank
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-12">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="What can we help you with?"
            className="h-14 pl-12 text-lg"
          />
        </div>

        {/* Quick Links Grid */}
        <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <a key={link.title} href={link.href}>
              <Card className="group transition-shadow hover:shadow-lg">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-lg bg-primary/10 p-3 transition-colors group-hover:bg-primary">
                    <link.icon className="h-6 w-6 text-primary transition-colors group-hover:text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold">{link.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {link.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>

        {/* Popular Articles */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-6">Popular Articles</h3>
            <div className="space-y-4">
              {articles.map((article, index) => (
                <a
                  key={index}
                  href="#"
                  className="flex items-center justify-between rounded-lg p-4 transition-colors hover:bg-muted"
                >
                  <div className="flex-1">
                    <p className="mb-1 font-medium">{article.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {article.category}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{article.views} views</p>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <h3 className="mb-2">Still need help?</h3>
            <p className="mb-6 text-muted-foreground">
              Our support team is here to assist you
            </p>
            <div className="space-y-2">
              <p className="flex items-center justify-center gap-2 text-sm">
                <Mail className="h-4 w-4" />
                <a
                  href="mailto:support@msm-questionbank.edu"
                  className="text-primary hover:underline"
                >
                  support@msm-questionbank.edu
                </a>
              </p>
              <p className="text-sm text-muted-foreground">
                Response time: Within 24 hours
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
