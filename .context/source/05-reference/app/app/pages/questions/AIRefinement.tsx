import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Textarea } from "../../components/ui/textarea";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { CheckCircle, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

export default function AIRefinement() {
  const navigate = useNavigate();
  const { questionId } = useParams();
  const [message, setMessage] = useState("");
  const [version, setVersion] = useState(1);
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: "user" | "ai"; content: string }>
  >([]);

  const question = {
    stem: "A 62-year-old man with a history of hypertension and hyperlipidemia presents to the emergency department with severe substernal chest pain that began 2 hours ago. The pain radiates to his left arm and is associated with diaphoresis and nausea. His vital signs are: BP 145/95 mmHg, HR 102/min, RR 20/min, T 37.1°C. An ECG shows ST-segment elevation in leads II, III, and aVF. Which of the following coronary arteries is most likely occluded?",
    options: [
      { letter: "A", text: "Left anterior descending artery", correct: false },
      { letter: "B", text: "Left circumflex artery", correct: false },
      { letter: "C", text: "Right coronary artery", correct: true },
      { letter: "D", text: "Left main coronary artery", correct: false },
      { letter: "E", text: "Diagonal branch", correct: false },
    ],
    explanation:
      "The ECG findings of ST-segment elevation in leads II, III, and aVF are classic for an inferior wall myocardial infarction. The right coronary artery (RCA) is the most common culprit vessel in inferior MIs.",
  };

  const suggestions = [
    "Make this harder",
    "Improve the explanation",
    "Better distractors",
    "More concise stem",
  ];

  const handleSend = () => {
    if (!message.trim()) return;

    // Add user message
    setChatHistory([...chatHistory, { role: "user", content: message }]);

    // Simulate AI response
    setTimeout(() => {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "I'll enhance the clinical complexity. Here are the changes I'm making:\n\n• Adding specific lab values (Troponin I: 2.5 ng/mL, CK-MB: 45 U/L)\n• Including additional ECG findings (reciprocal ST depression in V1-V3)\n• Making distractors more challenging with specific anatomical considerations\n\nThe question has been updated to version " +
            (version + 1),
        },
      ]);
      setVersion((v) => v + 1);
    }, 1000);

    setMessage("");
  };

  const handleAccept = () => {
    toast.success("Changes accepted successfully");
    setTimeout(() => navigate(`/questions/${questionId}`), 1000);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1>AI Refinement Assistant</h1>
            <Badge variant="secondary">Version {version}</Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/questions/${questionId}`)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          {/* Left Panel - Question Preview */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h4>Question Preview</h4>
                  <Tabs defaultValue="current" className="w-auto">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="current">Current</TabsTrigger>
                      <TabsTrigger value="original">Original</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <ScrollArea className="h-[600px]">
                  <div className="space-y-6 pr-4">
                    {/* Stem */}
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Stem
                      </p>
                      <p className="leading-relaxed">{question.stem}</p>
                    </div>

                    {/* Options */}
                    <div>
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Options
                      </p>
                      <div className="space-y-2">
                        {question.options.map((option) => (
                          <div
                            key={option.letter}
                            className={`rounded-lg border p-3 ${
                              option.correct
                                ? "border-success bg-success/5"
                                : "border-border"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="font-medium">{option.letter}.</span>
                              <span className="flex-1">{option.text}</span>
                              {option.correct && (
                                <CheckCircle className="h-4 w-4 text-success" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Explanation
                      </p>
                      <div className="rounded-lg bg-accent/30 p-4">
                        <p className="text-sm leading-relaxed">
                          {question.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={handleAccept}
                className="flex-1 bg-success hover:bg-success/90"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Accept Changes
              </Button>
              <Button variant="outline" className="flex-1">
                Revert to Original
              </Button>
            </div>
          </div>

          {/* Right Panel - Chat */}
          <Card>
            <CardContent className="flex h-[calc(100vh-12rem)] flex-col p-0">
              {/* Chat Header */}
              <div className="border-b p-6">
                <h4>Describe how you'd like to improve this question</h4>
                <p className="text-sm text-muted-foreground">
                  The AI will help you refine the question based on your feedback
                </p>
              </div>

              {/* Chat Area */}
              <ScrollArea className="flex-1 p-6">
                {chatHistory.length === 0 ? (
                  <div className="space-y-6">
                    <Card className="bg-accent/30">
                      <CardContent className="p-6">
                        <h4 className="mb-4">How would you like to refine this question?</h4>
                        <div className="flex flex-wrap gap-2">
                          {suggestions.map((suggestion) => (
                            <Button
                              key={suggestion}
                              variant="outline"
                              size="sm"
                              onClick={() => setMessage(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatHistory.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-4 ${
                            msg.role === "user"
                              ? "bg-foreground text-white"
                              : "bg-muted"
                          }`}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            {msg.role === "ai" && (
                              <Sparkles className="h-4 w-4 text-primary" />
                            )}
                            <span className="text-xs font-medium">
                              {msg.role === "user" ? "You" : "AI Assistant"}
                            </span>
                          </div>
                          <p className="whitespace-pre-line text-sm leading-relaxed">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Input Area */}
              <div className="border-t p-6">
                <div className="flex gap-3">
                  <Textarea
                    placeholder="Describe your refinement request..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={3}
                    className="resize-none"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim()}
                    className="bg-primary hover:bg-primary/90"
                    size="icon"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Shift + Enter for new line
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
