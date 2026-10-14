import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  selected: string;
  displayName?: string;
  error: string;
  message: string;
  configured: boolean;
};

export function AccountPageHeader({ selected, displayName, error, message, configured }: Props) {
  return <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/accounts"
              className="text-sm text-muted-foreground hover:underline"
            >
              ← Accounts
            </Link>
            <h1 className="mt-2 text-3xl font-bold">
              {displayName ?? "TikTok account"}
            </h1>
            <p className="mt-1 text-muted-foreground">
              Select a date to see its posts and previews.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/accounts/${encodeURIComponent(selected)}/settings`}>
                Settings
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/accounts">All accounts</Link>
            </Button>
          </div>
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
            Set the TikTok client key, secret, and registered redirect URI to
            connect an account.
          </Card>
        )}

  </>;
}
