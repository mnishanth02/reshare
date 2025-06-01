import { api } from "@/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";

export function useCurrentUser() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.current);
  return {
    isLoading: isLoading || (isAuthenticated && user === null),
    isAuthenticated: isAuthenticated && user !== null,
    user,
  };
}
