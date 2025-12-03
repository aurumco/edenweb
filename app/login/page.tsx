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
      {}
      <div className="w-full md:w-1/2 flex items-center justify-center px-4 py-8 md:py-0">
        <div className="w-full max-w-sm space-y-8">
          {}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Log in to</h2>
            <h1 className="text-4xl font-bold">eden.</h1>
          </div>

          {}
          <Button
            onClick={handleDiscordLogin}
            size="lg"
            className="w-full gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold h-12"
          >
            <svg
              className="h-5 w-5"
              role="img"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
            >
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0608 19.917 19.917 0 005.9933 3.0314.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.8156 8.18 1.8156 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286 19.9003 19.9003 0 006.0022-3.03.077.077 0 00.0321-.0613c.4238-4.5065-.519-8.995-3.5654-13.664a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
            </svg>
            Login with Discord
          </Button>

          {}
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

      {}
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
