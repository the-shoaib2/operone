"use client";

import { Button, Card, CardContent } from "@repo/ui";
import { Loader2, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { useSession } from "next-auth/react";


export function ProfileCard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({ redirectTo: '/login' });
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Card className="overflow-hidden relative">
      <CardContent className="p-2 sm:p-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 lg:gap-3">
          {/* Profile Section */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "Profile"}
                  width={48}
                  height={48}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 shadow-md"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 border-2 border-primary/20 flex items-center justify-center shadow-md">
                  <span className="text-sm sm:text-base font-bold text-primary">
                    {session?.user?.name?.charAt(0) || "U"}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                {session?.user?.name}
              </h2>
              <p className="text-xs sm:text-xs font-bold text-muted-foreground truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 w-full lg:w-auto">
            <Button
              onClick={handleSignOut}
              disabled={isSigningOut}
              variant="outline"
              size="sm"
              className="flex-1 lg:flex-none text-xs  hover:bg-destructive hover:text-destructive-foreground"
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Signing Out...
                </>
              ) : (
                <>
                  <LogOut className="w-3 h-3 mr-1" />
                  Sign Out
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="p-2 "
              onClick={() => router.push("/settings")}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
