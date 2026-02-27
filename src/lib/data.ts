import { Tables } from "@/integrations/supabase/types";

export type Member = Tables<"members">;

export interface AccessLog {
  id: string;
  memberId: string;
  memberName: string;
  tier: string;
  timestamp: string;
  status: "granted" | "denied" | "pending";
  confidence: number;
  photoUrl: string;
}

export const MAX_MEMBERS = 20;
