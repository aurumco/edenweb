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
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20.317 4.3671a19.8062 19.8062 0 00-4.885-1.515.0741.0741 0 00-.0785.0371c-.211.3671-.445.8447-.608 1.2321a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.2288.077.077 0 00-.079-.037 19.7355 19.7355 0 00-4.885 1.515.0699.0699 0 00-.032.0274C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.0605 19.9081 19.9081 0 005.993 3.03.0766.0766 0 00.084-.027 14.716 14.716 0 001.312-2.13.0765.0765 0 00-.042-.1066c-.694-.263-1.356-.603-2.002-.997a.0765.0765 0 00-.012-.1249c.134-.1008.268-.2064.397-.3057a.0671.0671 0 00.027-.0845c4.488 2.139 9.372 2.139 13.805 0a.067.067 0 00.029-.0831c.13-.0993.263-.2049.396-.3057a.0755.0755 0 00-.011-.1249 12.872 12.872 0 00-2.002.996.0761.0761 0 00-.042.1066c.37.604.744 1.189 1.312 2.13a.076.076 0 00.084.028 19.963 19.963 0 005.993-3.029.082.082 0 00.032-.0605c.5-4.379-.838-8.178-3.549-11.620a.061.061 0 00-.032-.03zM8.02 15.3312c-1.1825 0-2.1588-.9718-2.1588-2.1584 0-1.1865.9606-2.1583 2.1588-2.1583 1.1982 0 2.1587.9718 2.1518 2.1583 0 1.1866-.9606 2.1584-2.1518 2.1584zm7.9611 0c-1.1825 0-2.1587-.9718-2.1587-2.1584 0-1.1865.9606-2.1583 2.1587-2.1583 1.1983 0 2.1588.9718 2.1519 2.1583 0 1.1866-.9536 2.1584-2.1519 2.1584z" />
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
          src="/login.jpg"
          alt="Eden"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
