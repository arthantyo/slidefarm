import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useProjectStore } from "@/stores/project-store";

export type Account = { openId: string; displayName: string; scopes: string[] };

export function useAccountBootstrap(setError: Dispatch<SetStateAction<string>>, setMessage: Dispatch<SetStateAction<string>>) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [configured, setConfigured] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");
    if (authError)
      setError(
        authError === "configure"
          ? "TikTok Login Kit settings are incomplete."
          : authError,
      );
    if (params.has("connected")) setMessage("TikTok account connected.");
    if (authError || params.has("connected"))
      window.history.replaceState(null, "", window.location.pathname);
    void fetch("/api/tiktok/accounts", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load accounts.");
        return response.json() as Promise<{
          configured: boolean;
          accounts: Account[];
        }>;
      })
      .then((result) => {
        setConfigured(result.configured);
        setAccounts(result.accounts);
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Could not load accounts.",
        ),
      );
    void useProjectStore.getState().load();
  }, [setError, setMessage]);

  return { accounts, configured };
}
