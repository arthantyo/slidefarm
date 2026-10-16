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
  const [pinterest, setPinterest] = useState({ key: '', hasKey: false, host: '', searchPath: '', boardPath: '' });
  const [pinterestMessage, setPinterestMessage] = useState('');
  const [savingPinterest, setSavingPinterest] = useState(false);

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

  async function savePinterest(removeKey = false) {
    setSavingPinterest(true); setPinterestMessage('');
    try {
      const response = await fetch('/api/settings/pinterest', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...pinterest, removeKey }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save Pinterest settings.');
      setPinterest({ ...result, key: '' });
      setPinterestMessage(removeKey ? 'RapidAPI key removed.' : 'Pinterest settings saved.');
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
      <h2 className="text-xl font-semibold">Pinterest import</h2>
      <p className="mt-2 text-sm text-muted-foreground">Connect a Pinterest provider from RapidAPI to search pins and import board images. Your key is saved on this device and used by the local server.</p>
      <form onSubmit={(event) => { event.preventDefault(); void savePinterest(); }} className="mt-5 space-y-3">
        <Label htmlFor="pinterest-key">RapidAPI key</Label>
        <Input id="pinterest-key" type="password" autoComplete="off" spellCheck={false} value={pinterest.key} onChange={(event) => setPinterest({ ...pinterest, key: event.target.value })} placeholder={pinterest.hasKey ? 'Key saved — enter a new key to replace it' : 'Enter your RapidAPI key'} />
        <p className="text-xs text-muted-foreground">Status: {pinterest.hasKey ? 'Key saved' : 'No key saved'}</p>
        <Label htmlFor="pinterest-host">RapidAPI host</Label>
        <Input id="pinterest-host" spellCheck={false} value={pinterest.host} onChange={(event) => setPinterest({ ...pinterest, host: event.target.value })} placeholder="provider.p.rapidapi.com" />
        <Label htmlFor="pinterest-search-path">Pin search endpoint path</Label>
        <Input id="pinterest-search-path" spellCheck={false} value={pinterest.searchPath} onChange={(event) => setPinterest({ ...pinterest, searchPath: event.target.value })} placeholder="/search" />
        <Label htmlFor="pinterest-board-path">Board endpoint path</Label>
        <Input id="pinterest-board-path" spellCheck={false} value={pinterest.boardPath} onChange={(event) => setPinterest({ ...pinterest, boardPath: event.target.value })} placeholder="/board" />
        <p className="text-xs text-muted-foreground">The search endpoint receives a <code>query</code> parameter; the board endpoint receives a <code>url</code> parameter. Choose a RapidAPI provider that supports both.</p>
        <div className="flex gap-2"><Button type="submit" disabled={savingPinterest || (!pinterest.key && !pinterest.hasKey)}>Save Pinterest settings</Button>{pinterest.hasKey && <Button type="button" variant="outline" disabled={savingPinterest} onClick={() => void savePinterest(true)}>Remove key</Button>}</div>
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
