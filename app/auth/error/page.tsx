"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home, RotateCcw, Loader2 } from "lucide-react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Map error codes to user-friendly messages
  const getErrorMessage = () => {
    switch (error) {
      case "access_denied":
        return {
          title: "Access Denied",
          description: "You cancelled the Discord login. Please try again.",
          icon: "🚫",
        };
      case "invalid_request":
        return {
          title: "Invalid Request",
          description: "The login request was invalid. Please try again.",
          icon: "⚠️",
        };
      case "server_error":
        return {
          title: "Server Error",
          description: "An error occurred on Discord's server. Please try again later.",
          icon: "🔧",
        };
      default:
        return {
          title: "Login Error",
          description: "An error occurred during login. Please try again.",
          icon: "❌",
        };
    }
  };

  const { title, description, icon } = getErrorMessage();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-destructive/50 bg-gradient-to-br from-card to-card/80">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="text-6xl">{icon}</div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl text-destructive">{title}</CardTitle>
            <CardDescription className="text-base">{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorDescription && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-muted-foreground font-mono break-all">
                {decodeURIComponent(errorDescription)}
              </p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => router.push("/login")}
              className="w-full gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full gap-2"
            >
              <Link href="/">
                <Home className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            If the problem persists, contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
