import { Link } from "react-router";
import { Button } from "../../components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Illustration */}
        <div className="flex justify-center">
          <svg
            width="200"
            height="200"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-muted-foreground opacity-30"
          >
            <circle cx="60" cy="100" r="40" stroke="currentColor" strokeWidth="4" />
            <circle cx="140" cy="100" r="40" stroke="currentColor" strokeWidth="4" />
            <path
              d="M60 80L60 120M140 80L140 120"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M100 140L100 160"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="100" cy="170" r="8" fill="currentColor" />
          </svg>
        </div>

        {/* Error Message */}
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Button */}
        <Link to="/dashboard">
          <Button className="bg-primary hover:bg-primary/90">
            <Home className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
