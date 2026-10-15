'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getUserApiKey, removeUserApiKey, saveUserApiKey } from '@/lib/ai/user-key';

export default function SettingsPage() {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { setSaved(Boolean(getUserApiKey())); }, []);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = key.trim();
    if (!value) { setMessage('Enter an API key.'); return; }
    try {
      saveUserApiKey(value);
      setKey('');
      setSaved(true);
      setMessage('API key saved in this browser.');
    } catch { setMessage('Could not save the key in this browser.'); }
  }

  function remove() {
    try {
      removeUserApiKey();
      setKey('');
      setSaved(false);
      setMessage('API key removed from this browser.');
    } catch { setMessage('Could not remove the key.'); }
  }

  return <><DashboardHeader /><main className="mx-auto max-w-3xl px-6 py-8">
    <h1 className="text-3xl font-bold">Settings</h1>
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">OpenAI API key</h2>
      <p className="mt-2 text-sm text-muted-foreground">Add your OpenAI API key for slide generation, remixing, image generation, text rewriting, and captions on this browser. The key is stored in this browser and sent to Slidefarm only for those requests. Workflow jobs continue to use the server key. Anyone with access to this browser can use the saved key.</p>
      <p className="mt-3 text-sm">Status: {saved ? 'Key saved' : 'No personal key saved'}</p>
      <form onSubmit={save} className="mt-5 space-y-3">
        <Label htmlFor="openai-api-key">API key</Label>
        <Input id="openai-api-key" type="password" autoComplete="off" spellCheck={false} value={key} onChange={(event) => setKey(event.target.value)} placeholder={saved ? 'Enter a new key to replace the saved one' : 'Enter your API key'} />
        <div className="flex gap-3"><Button type="submit">Save key</Button>{saved && <Button type="button" variant="outline" onClick={remove}>Remove key</Button>}</div>
      </form>
      {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    </section>
  </main></>;
}
