"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Ellipsis, ExternalLink, Settings, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DEMO_ACCOUNT_ID, DEMO_ACCOUNT_NAME, demoAccountEnabled, setDemoAccountEnabled } from "@/lib/demo-account";

type Account = {
  openId: string;
  displayName: string;
  avatarUrl?: string;
  scopes: string[];
};

const demoAccount: Account = {
  openId: DEMO_ACCOUNT_ID,
  displayName: DEMO_ACCOUNT_NAME,
  scopes: [],
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [configured, setConfigured] = useState(false);
  const [menu, setMenu] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const displayAccounts = !showDemo || accounts.some(
    (account) => account.displayName.toLowerCase() === demoAccount.displayName,
  )
    ? accounts
    : [demoAccount, ...accounts];

  const connect = async () => {
    if (!window.slidefarmWindow) { window.location.href = "/api/tiktok/connect"; return; }
    setError("");
    setBusy(true);
    try { await window.slidefarmWindow?.connectTikTok(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not start TikTok connection."); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (process.env.NODE_ENV !== 'production' && params.get('demo') === '1') {
      setDemoAccountEnabled(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
    setShowDemo(demoAccountEnabled());
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
        const result = (await response.json()) as {
          accounts?: Account[];
          configured?: boolean;
          error?: string;
        };
        if (!response.ok || !result.accounts)
          throw new Error(result.error || "Could not load accounts.");
        return result;
      })
      .then((result) => {
        setAccounts(result.accounts ?? []);
        setConfigured(Boolean(result.configured));
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Could not load accounts.",
        ),
      );
  }, []);

  const disconnect = async (openId: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/tiktok/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openId }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error || "Could not disconnect account.");
      setAccounts((current) =>
        current.filter((account) => account.openId !== openId),
      );
      setMenu("");
      setMessage("Account disconnected.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not disconnect account.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell>
      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Accounts</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your connected TikTok accounts and their content calendars.
            </p>
          </div>
          <Button disabled={busy} onClick={() => void connect()}>Connect account</Button>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="rounded-md border p-3 text-sm">
            {message}
          </p>
        )}
        {!configured && (
          <Card className="p-5 text-sm text-muted-foreground">
            Set the TikTok client key, secret, and registered redirect URI in{' '}
            <Link href="/settings" className="text-foreground underline underline-offset-2">Settings</Link> to connect an account.
          </Card>
        )}
        <div className="space-y-3">
          {displayAccounts.map((account) => {
            const isDemo = account.openId === demoAccount.openId;
            return (
              <Card
                key={account.openId}
                className="flex items-center gap-4 p-4"
              >
                {account.avatarUrl ? (
                  <Image
                    src={account.avatarUrl}
                    alt=""
                    width={48}
                    height={48}
                    unoptimized
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-semibold">
                    {account.displayName.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {isDemo ? (
                    <div className="flex items-center gap-2">
                      <Link href={`/accounts/${DEMO_ACCOUNT_ID}`} className="font-semibold hover:underline">{account.displayName}</Link>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Demo</span>
                    </div>
                  ) : (
                    <Link
                      href={`/accounts/${encodeURIComponent(account.openId)}`}
                      className="font-semibold hover:underline"
                    >
                      {account.displayName}
                    </Link>
                  )}
                </div>
                <>
                    <Button
                      asChild
                      variant="outline"
                      className="hidden sm:inline-flex"
                    >
                      <Link
                        href={`/accounts/${encodeURIComponent(account.openId)}`}
                      >
                        Open calendar
                      </Link>
                    </Button>
                    <div className="relative">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Manage ${account.displayName}`}
                        aria-expanded={menu === account.openId}
                        onClick={() =>
                          setMenu(menu === account.openId ? "" : account.openId)
                        }
                      >
                        <Ellipsis className="h-5 w-5" />
                      </Button>
                      {menu === account.openId && (
                        <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border bg-background p-1 shadow-lg">
                          <Link
                            href={`/accounts/${encodeURIComponent(account.openId)}`}
                            className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open account
                          </Link>
                          <Link
                            href={`/accounts/${encodeURIComponent(account.openId)}/settings`}
                            className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent"
                          >
                            <Settings className="h-4 w-4" />
                            Settings
                          </Link>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              if (isDemo) {
                                setDemoAccountEnabled(false);
                                setShowDemo(false);
                                setMenu('');
                                setMessage('Demo account hidden for this session.');
                              } else void disconnect(account.openId);
                            }}
                            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-destructive hover:bg-accent"
                          >
                            <Trash2 className="h-4 w-4" />
                            {isDemo ? 'Hide demo account' : 'Disconnect'}
                          </button>
                        </div>
                      )}
                    </div>
                </>
              </Card>
            );
          })}
        </div>
      </main>
    </DashboardShell>
  );
}
