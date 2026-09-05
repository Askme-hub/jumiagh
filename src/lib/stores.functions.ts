import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { PublicStore } from "./stores";

/** Public (no auth) fetch of an approved seller store — used by the route loader for SEO metadata. */
export const fetchPublicStore = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const client = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: rows, error } = await client.rpc("public_store", { _slug: data.slug });
    if (error) return null;
    return ((rows as PublicStore[] | null) ?? [])[0] ?? null;
  });
