import { useQuery } from "@tanstack/react-query";
import { getUserDetails } from "../services/auth";

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: getUserDetails,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
