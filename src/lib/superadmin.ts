import type { Profile } from "@/lib/types";

type ClaimsSource = {
  app_metadata?: Record<string, unknown> | null;
};

const BOOTSTRAP_SUPERADMIN_EMAILS = ["galandar@gmail.com"];

export function configuredSuperadminEmails() {
  const envEmails = (process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set([...envEmails, ...BOOTSTRAP_SUPERADMIN_EMAILS]));
}

export function hasSuperadminClaim(source?: ClaimsSource | null) {
  const metadata = source?.app_metadata;
  if (!metadata) return false;

  if (metadata.role === "superadmin") return true;
  if (metadata.is_superadmin === true || metadata.is_superadmin === "true") return true;
  return Array.isArray(metadata.roles) && metadata.roles.includes("superadmin");
}

export function isConfiguredSuperadmin(profile?: Pick<Profile, "email" | "is_superadmin"> | null) {
  if (profile?.is_superadmin) return true;
  if (!profile?.email) return false;
  return configuredSuperadminEmails().includes(profile.email.toLowerCase());
}
