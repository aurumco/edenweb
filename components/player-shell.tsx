"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { LogOut, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Momo_Signature } from "next/font/google";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";

const logoFont = Momo_Signature({ subsets: ["latin"], weight: "400" });

export function PlayerShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/40">
        <div className="container mx-auto max-w-7xl flex h-14 items-center justify-between px-4">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-sm">
            <span className={`${logoFont.className} inline-flex h-8 px-3 items-center justify-center rounded-lg bg-primary/10 text-primary text-base tracking-wide`}>eden.</span>
          </Link>
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full focus-visible:ring-2 focus-visible:ring-ring/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard?tab=characters">My Characters</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard?tab=runs">My Runs</Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <a href="https://discord.gg/e-den" target="_blank" rel="noopener noreferrer">Discord</a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="https://discord.com/channels/@me/1411109696894406746" target="_blank" rel="noopener noreferrer">Support</a>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="rounded-full focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="container mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
