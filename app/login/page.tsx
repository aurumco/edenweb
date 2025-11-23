"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleDiscordLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.edenhub.net";
    window.location.href = `${apiUrl}/api/auth/login`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Login form */}
      <div className="w-full md:w-1/2 flex items-center justify-center px-4 py-8 md:py-0">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Log in to</h2>
            <h1 className="text-4xl font-bold">eden.</h1>
          </div>

          {/* Discord Login Button */}
          <Button
            onClick={handleDiscordLogin}
            size="lg"
            className="w-full gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold h-12"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 127.14 96.36"
              fill="currentColor"
            >
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22c1.24-23.25-15.28-47.25-18.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
            </svg>
            Login with Discord
          </Button>

          {/* Footer text */}
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              By logging in, you agree to our{" "}
              <a href="#" className="text-primary hover:underline">
                Terms of Service
              </a>
              {" "}and{" "}
              <a href="#" className="text-primary hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Image (hidden on mobile) */}
      <div className="hidden md:flex w-1/2 relative overflow-hidden bg-muted">
        <Image
          src="/login.webp"
          alt="Eden"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
