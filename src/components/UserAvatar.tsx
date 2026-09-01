import type { User } from "@supabase/supabase-js";
import { useProfile } from "@/lib/profile";

export function UserAvatar({
  user,
  size = 36,
  className = "",
}: {
  user: User | null | undefined;
  size?: number;
  className?: string;
}) {
  const { data: profile } = useProfile(user?.id);
  const url =
    profile?.avatar_url ??
    (user?.user_metadata?.avatar_url as string | undefined) ??
    null;
  const label =
    profile?.display_name || (user?.email ?? "") || "Guest";
  const initial = label.charAt(0).toUpperCase() || "K";

  if (url) {
    return (
      <img
        src={url}
        alt={label}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover border border-border ${className}`}
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.4) }}
      className={`inline-flex items-center justify-center rounded-full bg-primary/15 font-bold text-primary ${className}`}
    >
      {initial}
    </span>
  );
}
