# SlideFarm

SlideFarm runs as an Electron desktop app with a local Next.js server.

## Desktop app

- `npm install` installs the desktop and web dependencies.
- `npm run desktop` installs the small Electron shell dependency, then starts Electron and the local Next.js development server.
- `npm run desktop:build` creates a production build and a platform installer in `dist/`.

The desktop server binds to `127.0.0.1` on an available port. Electron stores project data in its user data directory. Personal OpenAI API keys entered in Settings are stored in the Electron profile for that computer.

## Set up AI features

SlideFarm uses an **OpenAI API key** for slide generation, remixing, image
generation, text rewriting, and captions. Your ChatGPT password or subscription
cannot be entered in the API key field. API usage has its own billing.

1. Sign in to the [OpenAI API key page](https://platform.openai.com/api-keys)
   and create a standard API key. Copy the new key when it is shown.
2. If needed, set up credits or a payment method in
   [API billing](https://platform.openai.com/settings/organization/billing/overview).
3. Open **Settings** in SlideFarm, paste the key into **OpenAI API key**, and
   select **Save key**.
4. Try generating a slide or image. Saving a key does not validate it; if the
   request fails, check the key and API billing, then replace the key in
   Settings.

The key is saved locally in the Electron profile on this device and is sent to
SlideFarm's local server for those AI requests. Anyone with access to this
device can use a saved key. Use **Remove key** in Settings to clear it. Workflow
jobs currently use the server's `OPENAI_API_KEY` instead of the key in Settings.

Projects and folders are saved to `projects.json` in the local app data directory
(`%APPDATA%\\SlideFarm` on Windows, `~/Library/Application Support/SlideFarm`
on macOS, or `$XDG_DATA_HOME/SlideFarm` on Linux). Set `SLIDEFARM_DATA_DIR`
to override that directory. The Electron main process sets it to
`app.getPath('userData')` before starting the Next.js server. The first local
load migrates projects and folders from the old browser storage.

The file API accepts requests only on a localhost URL. The Electron
server binds to the loopback interface.

## TikTok sandbox

In your TikTok Developer sandbox, enable Login Kit and the Content Posting API,
allow the `user.info.basic` and `video.publish` scopes, and register the callback
URL. Set these server environment variables:

```text
TIKTOK_CLIENT_KEY=your-sandbox-client-key
TIKTOK_CLIENT_SECRET=your-sandbox-client-secret
TIKTOK_REDIRECT_URI=https://your-app-domain.example/api/tiktok/callback
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_BUCKET=your-bucket-name
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
TIKTOK_VERIFIED_URL_PREFIX=https://slides.your-domain.example
```

Register the exact callback URI in TikTok Login Kit. For a local SlideFarm
server, an HTTPS tunnel can forward the Web callback to
`/api/tiktok/callback`; account management remains on localhost. If you instead
configure Desktop Login Kit, use a localhost callback such as
`http://localhost:3000/api/tiktok/callback`; SlideFarm uses PKCE for that flow.
Create an R2 bucket and an R2 API token with object write access to that bucket.
Connect the bucket to a public custom domain and verify that domain for Content
Posting in the TikTok sandbox. `TIKTOK_VERIFIED_URL_PREFIX` must be that domain's
HTTPS origin. SlideFarm uploads project slides as `tiktok/slides/*.png` objects
and gives TikTok the public R2 URLs. The Accounts page lists connected profiles;
each profile has its own calendar. Scheduling a project exports its slides to
R2 immediately, then the local SlideFarm server submits the post at the selected
time. Keep that server running for scheduled posts and reopen the calendar after
restarting it. Configure an R2 object
lifecycle rule to remove old `tiktok/slides/` objects only after every scheduled
post that uses them has run and TikTok has had time to fetch them.
The account connection and posting endpoints remain available only through
localhost. Connected account tokens stay in the local data directory. Sandbox
posting is restricted to the TikTok accounts allowed in your sandbox.
