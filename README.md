# slideshow

Projects and folders are saved to `projects.json` in the local app data directory
(`%APPDATA%\\SlideFarm` on Windows, `~/Library/Application Support/SlideFarm`
on macOS, or `$XDG_DATA_HOME/SlideFarm` on Linux). Set `SLIDEFARM_DATA_DIR`
to override that directory; an Electron main process can set it to
`app.getPath('userData')` before starting the Next.js server. The first local
load migrates projects and folders from the old browser storage.

The file API accepts requests only on a localhost URL. A future Electron
wrapper should bind its Next.js server to the loopback interface.

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
