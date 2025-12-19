"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "user" | "host" | "admin";
  fallbackPath?: string;
}

const ProtectedRoute = ({
  children,
  requiredRole = "user",
  fallbackPath = "/auth",
}: ProtectedRouteProps) => {
  const { authUser, loading, hasPermission } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (loading) return;
      if (!authUser) {
        router.push(fallbackPath);
        return;
      }
      if (requiredRole === "user") {
        if (!cancelled) {
          setAllowed(true);
          setChecking(false);
        }
        return;
      }

      // Optimistic allow: if metadata role already satisfies requiredRole,
      // render immediately and verify in the background.
      const roleHierarchy: Record<string, number> = {
        user: 1,
        host: 2,
        admin: 3,
        super_admin: 4,
      };
      const optimisticOk =
        (roleHierarchy[authUser.role] || 1) >= (roleHierarchy[requiredRole] || 1);
      if (optimisticOk && !cancelled) {
        setAllowed(true);
        setChecking(false);
      }

      const ok = await hasPermission(requiredRole);
      if (!cancelled) {
        if (ok) {
          setAllowed(true);
        } else {
          // Redirect to appropriate dashboard if lacking permission
          router.push(authUser.role === "admin" ? "/admin" : authUser.role === "host" ? "/host-dashboard" : "/profile");
        }
        setChecking(false);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [loading, authUser, requiredRole, hasPermission, router, fallbackPath]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
};

export default ProtectedRoute;
export { ProtectedRoute };
