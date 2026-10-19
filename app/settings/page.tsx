'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getUserApiKey, removeUserApiKey, saveUserApiKey } from '@/lib/ai/user-key';
import { useTheme } from '@/components/theme-provider';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');
  const [imageModel, setImageModel] = useState('');
  const [effectiveModel, setEffectiveModel] = useState('');
  const [imageModelMessage, setImageModelMessage] = useState('');
  const [savingImageModel, setSavingImageModel] = useState(false);
  const [pinterest, setPinterest] = useState({ token: '', hasToken: false });
  const [pinterestMessage, setPinterestMessage] = useState('');
  const [savingPinterest, setSavingPinterest] = useState(false);
  const [tiktok, setTikTok] = useState({ clientKey: '', clientSecret: '', hasSecret: false, redirectUri: '' });
  const [tiktokMessage, setTikTokMessage] = useState('');
  const [savingTikTok, setSavingTikTok] = useState(false);

  useEffect(() => { setSaved(Boolean(getUserApiKey())); }, []);
  useEffect(() => {
    void fetch('/api/settings/image-model', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load the image model setting.');
        return response.json() as Promise<{ model: string | null; effectiveModel: string }>;
      })
      .then((result) => { setImageModel(result.model ?? ''); setEffectiveModel(result.effectiveModel); })
      .catch((error) => setImageModelMessage(error instanceof Error ? error.message : 'Could not load the image model setting.'));
  }, []);
  useEffect(() => {
    void fetch('/api/settings/pinterest', { cache: 'no-store' })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not load Pinterest settings.'); return result; })
      .then((result) => setPinterest((current) => ({ ...current, ...result })))
      .catch((error) => setPinterestMessage(error instanceof Error ? error.message : 'Could not load Pinterest settings.'));
  }, []);
  useEffect(() => {
    void fetch('/api/settings/tiktok', { cache: 'no-store' })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not load TikTok settings.'); return result; })
      .then((result) => setTikTok((current) => ({ ...current, ...result })))
      .catch((error) => setTikTokMessage(error instanceof Error ? error.message : 'Could not load TikTok settings.'));
  }, []);

  async function saveTikTok(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingTikTok(true); setTikTokMessage('');
    try {
      const response = await fetch('/api/settings/tiktok', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tiktok) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save TikTok settings.');
      setTikTok({ ...result, clientSecret: '' });
      setTikTokMessage('TikTok settings saved.');
    } catch (error) { setTikTokMessage(error instanceof Error ? error.message : 'Could not save TikTok settings.'); }
    finally { setSavingTikTok(false); }
  }

  async function savePinterest(removeToken = false) {
    setSavingPinterest(true); setPinterestMessage('');
    try {
      const response = await fetch('/api/settings/pinterest', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...pinterest, removeToken }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save Pinterest settings.');
      setPinterest({ ...result, token: '' });
      setPinterestMessage(removeToken ? 'Apify token removed.' : 'Pinterest settings saved.');
    } catch (error) { setPinterestMessage(error instanceof Error ? error.message : 'Could not save Pinterest settings.'); }
    finally { setSavingPinterest(false); }
  }

  async function saveImageModel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingImageModel(true);
    setImageModelMessage('');
    try {
      const response = await fetch('/api/settings/image-model', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: imageModel.trim() }),
      });
      const result = await response.json() as { effectiveModel?: string; error?: string };
      if (!response.ok || !result.effectiveModel) throw new Error(result.error || 'Could not save the image model.');
      setImageModel(imageModel.trim());
      setEffectiveModel(result.effectiveModel);
      setImageModelMessage('Image model saved.');
    } catch (error) { setImageModelMessage(error instanceof Error ? error.message : 'Could not save the image model.'); }
    finally { setSavingImageModel(false); }
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = key.trim();
    if (!value) { setMessage('Enter an API key.'); return; }
    try {
      saveUserApiKey(value);
      setKey('');
      setSaved(true);
      setMessage('API key saved on this device. Try an AI action to check that it works.');
    } catch { setMessage('Could not save the key on this device.'); }
  }

  function remove() {
    try {
      removeUserApiKey();
      setKey('');
      setSaved(false);
      setMessage('API key removed from this device.');
    } catch { setMessage('Could not remove the key.'); }
  }

  return <DashboardShell><main className="mx-auto max-w-3xl px-6 py-8">
    <h1 className="text-3xl font-bold">Settings</h1>
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">Appearance</h2>
      <p className="mt-2 text-sm text-muted-foreground">Choose how SlideFarm looks on this device.</p>
      <div className="mt-4 flex gap-2" role="group" aria-label="Color theme">
        <Button type="button" variant={theme === 'light' ? 'default' : 'outline'} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>Light</Button>
        <Button type="button" variant={theme === 'dark' ? 'default' : 'outline'} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>Dark</Button>
      </div>
    </section>
    <section className="mt-6 rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">Image generation model</h2>
      <p className="mt-2 text-sm text-muted-foreground">Choose the OpenAI image model used for new images, remixes, and workflow image generation.</p>
      <form onSubmit={saveImageModel} className="mt-5 space-y-3">
        <Label htmlFor="image-model">Model ID</Label>
        <Input id="image-model" value={imageModel} onChange={(event) => setImageModel(event.target.value)} maxLength={100} spellCheck={false} placeholder="Use the configured default" />
        <p className="text-sm text-muted-foreground">Current model: {effectiveModel || 'Loading…'}. Leave the field blank to use the server default.</p>
        <Button type="submit" disabled={savingImageModel}>{savingImageModel ? 'Saving…' : 'Save image model'}</Button>
      </form>
      {imageModelMessage && <p role="status" className="mt-3 text-sm">{imageModelMessage}</p>}
    </section>
    <section className="mt-6 rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">TikTok Login Kit</h2>
      <p className="mt-2 text-sm text-muted-foreground">Enter your TikTok app client key, client secret, and registered redirect URI to connect accounts. These settings are saved on the local server.</p>
      <form onSubmit={saveTikTok} className="mt-5 space-y-3">
        <Label htmlFor="tiktok-client-key">Client key</Label>
        <Input id="tiktok-client-key" spellCheck={false} autoComplete="off" value={tiktok.clientKey} onChange={(event) => setTikTok({ ...tiktok, clientKey: event.target.value })} />
        <Label htmlFor="tiktok-client-secret">Client secret</Label>
        <Input id="tiktok-client-secret" type="password" spellCheck={false} autoComplete="off" value={tiktok.clientSecret} onChange={(event) => setTikTok({ ...tiktok, clientSecret: event.target.value })} placeholder={tiktok.hasSecret ? 'Secret saved - enter a new one to replace it' : 'Enter your client secret'} />
        <p className="text-xs text-muted-foreground">Status: {tiktok.hasSecret ? 'Secret saved' : 'No secret saved'}</p>
        <Label htmlFor="tiktok-redirect-uri">Redirect URI</Label>
        <Input id="tiktok-redirect-uri" type="url" spellCheck={false} value={tiktok.redirectUri} onChange={(event) => setTikTok({ ...tiktok, redirectUri: event.target.value })} placeholder="https://your-domain.example/api/tiktok/callback" />
        <p className="text-xs text-muted-foreground">Use the exact URI registered in your TikTok developer app. Localhost redirects may use an HTTP URL with a port.</p>
        <Button type="submit" disabled={savingTikTok}>{savingTikTok ? 'Saving.' : 'Save TikTok settings'}</Button>
      </form>
      {tiktokMessage && <p role="status" className="mt-3 text-sm">{tiktokMessage}</p>}
    </section>
    <section className="mt-6 rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">Pinterest import</h2>
      <p className="mt-2 text-sm text-muted-foreground">Use Apify&apos;s epctex/pinterest-scraper Actor to search pins and import board images. Your API token is saved on the local server.</p>
      <form onSubmit={(event) => { event.preventDefault(); void savePinterest(); }} className="mt-5 space-y-3">
        <Label htmlFor="pinterest-token">Apify API token</Label>
        <Input id="pinterest-token" type="password" autoComplete="off" spellCheck={false} value={pinterest.token} onChange={(event) => setPinterest({ ...pinterest, token: event.target.value })} placeholder={pinterest.hasToken ? 'Token saved - enter a new token to replace it' : 'Enter your Apify API token'} />
        <p className="text-xs text-muted-foreground">Status: {pinterest.hasToken ? 'Token saved' : 'No token saved'}</p>
        <div className="flex gap-2"><Button type="submit" disabled={savingPinterest || (!pinterest.token && !pinterest.hasToken)}>Save Pinterest settings</Button>{pinterest.hasToken && <Button type="button" variant="outline" disabled={savingPinterest} onClick={() => void savePinterest(true)}>Remove token</Button>}</div>
      </form>
      {pinterestMessage && <p role="status" className="mt-3 text-sm">{pinterestMessage}</p>}
    </section>
    <section className="mt-6 rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">OpenAI API key</h2>
      <p className="mt-2 text-sm text-muted-foreground">SlideFarm uses the OpenAI API for slide generation, remixing, images, text rewriting, and captions. You need an OpenAI API key from the API Platform. A ChatGPT login or subscription is not an API key.</p>
      <div className="mt-5 rounded-lg border border-border bg-background p-4 text-sm">
        <h3 className="font-semibold">Set up your key</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>Sign in to the <a className="text-foreground underline underline-offset-2" href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI API key page</a> and create a standard API key. Copy it when it appears.</li>
          <li>Check your <a className="text-foreground underline underline-offset-2" href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noopener noreferrer">API billing settings</a> if your account needs credits or a payment method. API usage is billed separately from a ChatGPT subscription.</li>
          <li>Paste the key below and select <strong className="text-foreground">Save key</strong>. Then try generating a slide or image.</li>
        </ol>
      </div>
      <p className="mt-3 text-sm">Status: {saved ? 'Key saved' : 'No personal key saved'}</p>
      <form onSubmit={save} className="mt-5 space-y-3">
        <Label htmlFor="openai-api-key">API key</Label>
        <Input id="openai-api-key" type="password" autoComplete="off" spellCheck={false} value={key} onChange={(event) => setKey(event.target.value)} placeholder={saved ? 'Enter a new key to replace the saved one' : 'Enter your API key'} />
        <div className="flex gap-3"><Button type="submit">Save key</Button>{saved && <Button type="button" variant="outline" onClick={remove}>Remove key</Button>}</div>
      </form>
      {message && <p role="status" className="mt-3 text-sm">{message}</p>}
      <p className="mt-5 text-sm text-muted-foreground">Your key stays in this device&apos;s app profile and is sent to SlideFarm&apos;s local server for these AI requests. Saving it does not check whether it works. Anyone with access to this device can use the saved key. Workflow jobs use the server key.</p>
      <p className="mt-3 text-sm text-muted-foreground">If an AI request fails, check that the key is active and that API billing is set up. Replace the saved key here if you created a new one.</p>
    </section>
  </main></DashboardShell>;
}
