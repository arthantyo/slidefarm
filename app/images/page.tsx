'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Folder, FolderPlus, ImagePlus, Search, Upload } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from '@/components/ui/context-menu';
import type { ImageLibrary } from '@/lib/server/image-library';

type Pin = { id: string; url: string };
const UNLISTED = 'unlisted';

export default function ImagesPage() {
  const [library, setLibrary] = useState<ImageLibrary>({ folders: [], images: [] });
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [mode, setMode] = useState<'search' | 'board'>('search');
  const [query, setQuery] = useState('');
  const [pins, setPins] = useState<Pin[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [collectionName, setCollectionName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'folder' | 'image'; id: string; name: string } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ type: 'folder' | 'image'; id: string; name: string } | null>(null);
  const [renameName, setRenameName] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { void fetch('/api/image-library').then((r) => { if (!r.ok) throw new Error('Could not load images.'); return r.json(); }).then(setLibrary).catch((cause) => setError(String(cause))); }, []);
  async function submit(url: string, body: BodyInit, headers?: HeadersInit) {
    const response = await fetch(url, { method: 'POST', body, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not save images.');
    setLibrary(data as ImageLibrary);
    return data as ImageLibrary;
  }
  async function change(body: object): Promise<boolean> {
    setError('');
    try {
      const response = await fetch('/api/image-library', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update images.');
      setLibrary(data as ImageLibrary);
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update images.'); return false; }
  }
  function openRename(type: 'folder' | 'image', id: string, name: string) {
    setRenameTarget({ type, id, name });
    setRenameName(name);
  }
  async function saveRename() {
    if (!renameTarget || !renameName.trim()) return;
    const target = renameTarget;
    const saved = await change(target.type === 'folder'
      ? { action: 'renameFolder', folderId: target.id, name: renameName.trim() }
      : { action: 'renameImage', imageId: target.id, name: renameName.trim() });
    if (saved) setRenameTarget(null);
  }
  async function createFolder() {
    setBusy(true); setError('');
    try { await submit('/api/image-library', JSON.stringify({ action: 'folder', name: folderName.trim() }), { 'Content-Type': 'application/json' }); setFolderId(null); setFolderOpen(false); setFolderName(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create folder.'); }
    finally { setBusy(false); }
  }
  async function upload(files: FileList | null) {
    if (!files) return;
    setBusy(true); setError('');
    try { for (const file of Array.from(files)) { const form = new FormData(); form.set('file', file); form.set('folderId', folderId && folderId !== UNLISTED ? folderId : ''); await submit('/api/image-library/upload', form); } }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not upload image.'); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ''; }
  }
  async function search() {
    setBusy(true); setError(''); setPins([]); setSelected([]);
    try {
      const response = await fetch(`/api/pinterest?mode=${mode}&query=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPins(data.images as Pin[]);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not search Pinterest.'); }
    finally { setBusy(false); }
  }
  async function importSelected() {
    setBusy(true); setError('');
    try {
      let target = folderId === UNLISTED ? null : folderId;
      if (collectionName.trim()) {
        const result = await submit('/api/image-library', JSON.stringify({ action: 'folder', name: collectionName.trim() }), { 'Content-Type': 'application/json' });
        target = result.folders[result.folders.length - 1].id;
      }
      await submit('/api/image-library', JSON.stringify({ action: 'import', urls: selected, folderId: target }), { 'Content-Type': 'application/json' });
      setFolderId(target ?? UNLISTED); setImportOpen(false); setPins([]); setSelected([]); setCollectionName('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not import images.'); }
    finally { setBusy(false); }
  }
  const visible = folderId === null ? [] : library.images.filter((image) => image.folderId === (folderId === UNLISTED ? null : folderId));
  const currentFolder = library.folders.find((folder) => folder.id === folderId);
  const unlistedImages = library.images.filter((image) => !image.folderId);
  const previewImage = library.images.find((image) => image.id === previewId);
  return <DashboardShell><main className="mx-auto max-w-7xl px-6 py-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Images</h1><p className="mt-1 text-muted-foreground">Keep images and collections ready for your slides.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setFolderOpen(true)}><FolderPlus className="mr-2 h-4 w-4" />New folder</Button><Button variant="outline" onClick={() => fileInput.current?.click()} disabled={busy}><Upload className="mr-2 h-4 w-4" />Upload</Button><Button onClick={() => setImportOpen(true)}><ImagePlus className="mr-2 h-4 w-4" />Add from Pinterest</Button></div></div>
    <input ref={fileInput} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => void upload(event.target.files)} />
    {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
    <div className="mb-6 flex items-center gap-2 text-sm"><Button variant="ghost" size="sm" onClick={() => setFolderId(null)}>Images</Button>{folderId !== null && <><span>/</span><span className="font-medium">{folderId === UNLISTED ? 'Unlisted' : currentFolder?.name}</span></>}</div>
    {folderId === null && <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <button type="button" onClick={() => setFolderId(UNLISTED)} onDragOver={(event) => { if (event.dataTransfer.types.includes('application/x-slidefarm-image')) { event.preventDefault(); setDragOver(UNLISTED); } }} onDragLeave={() => setDragOver(null)} onDrop={(event) => { event.preventDefault(); setDragOver(null); const imageId = event.dataTransfer.getData('application/x-slidefarm-image'); if (imageId) void change({ action: 'move', imageId, folderId: null }); }} className={`overflow-hidden rounded-lg border bg-card text-left hover:bg-accent ${dragOver === UNLISTED ? 'ring-2 ring-primary' : ''}`}><div className="flex aspect-[4/3] items-center justify-center bg-muted">{unlistedImages[0] ? <img src={unlistedImages[0].src} alt="" className="h-full w-full object-cover" /> : <Folder className="h-12 w-12 text-muted-foreground" />}</div><div className="p-3"><span className="block truncate font-medium">Unlisted</span><span className="text-xs text-muted-foreground">{unlistedImages.length} images</span></div></button>
      {library.folders.map((folder) => { const images = library.images.filter((image) => image.folderId === folder.id); return <ContextMenu key={folder.id}><ContextMenuTrigger asChild><button type="button" onClick={() => setFolderId(folder.id)} onDragOver={(event) => { if (event.dataTransfer.types.includes('application/x-slidefarm-image')) { event.preventDefault(); setDragOver(folder.id); } }} onDragLeave={() => setDragOver(null)} onDrop={(event) => { event.preventDefault(); setDragOver(null); const imageId = event.dataTransfer.getData('application/x-slidefarm-image'); if (imageId) void change({ action: 'move', imageId, folderId: folder.id }); }} className={`overflow-hidden rounded-lg border bg-card text-left hover:bg-accent ${dragOver === folder.id ? 'ring-2 ring-primary' : ''}`}><div className="flex aspect-[4/3] items-center justify-center bg-muted">{images[0] ? <img src={images[0].src} alt="" className="h-full w-full object-cover" /> : <Folder className="h-12 w-12 text-muted-foreground" />}</div><div className="p-3"><span className="block truncate font-medium">{folder.name}</span><span className="text-xs text-muted-foreground">{images.length} images</span></div></button></ContextMenuTrigger><ContextMenuContent><ContextMenuItem onSelect={() => setFolderId(folder.id)}>Open</ContextMenuItem><ContextMenuItem onSelect={() => openRename('folder', folder.id, folder.name)}>Rename</ContextMenuItem><ContextMenuItem className="text-destructive" onSelect={() => setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name })}>Delete folder</ContextMenuItem></ContextMenuContent></ContextMenu>; })}
    </div>}
    {visible.length > 0 ? <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5">{visible.map((item) => <ContextMenu key={item.id}><ContextMenuTrigger asChild><div role="button" tabIndex={0} onClick={() => { setPreviewId(item.id); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPreviewId(item.id); } }} draggable onDragStart={(event) => { event.dataTransfer.setData('application/x-slidefarm-image', item.id); event.dataTransfer.effectAllowed = 'move'; }} className="mb-3 cursor-pointer break-inside-avoid overflow-hidden rounded-lg border bg-card"><img src={item.src} alt={item.name} draggable={false} className="h-auto w-full" /><p className="truncate p-2 text-xs text-muted-foreground" title={item.name}>{item.name}</p></div></ContextMenuTrigger><ContextMenuContent><ContextMenuSub><ContextMenuSubTrigger>Move to</ContextMenuSubTrigger><ContextMenuSubContent><ContextMenuItem disabled={item.folderId === null} onSelect={() => void change({ action: 'move', imageId: item.id, folderId: null })}>Unlisted</ContextMenuItem>{library.folders.map((folder) => <ContextMenuItem key={folder.id} disabled={item.folderId === folder.id} onSelect={() => void change({ action: 'move', imageId: item.id, folderId: folder.id })}>{folder.name}</ContextMenuItem>)}</ContextMenuSubContent></ContextMenuSub><ContextMenuItem onSelect={() => openRename('image', item.id, item.name)}>Rename</ContextMenuItem><ContextMenuItem className="text-destructive" onSelect={() => setDeleteTarget({ type: 'image', id: item.id, name: item.name })}>Delete image</ContextMenuItem></ContextMenuContent></ContextMenu>)}</div> : folderId !== null ? <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">No images here yet. Upload images or import from Pinterest.</div> : null}
    <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle><AlertDialogDescription>{deleteTarget?.type === 'folder' ? <>The folder &quot;{deleteTarget.name}&quot; will be deleted. Its images will be moved to Unlisted.</> : <>This permanently deletes &quot;{deleteTarget?.name}&quot;.</>}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction asChild><Button variant="destructive" onClick={() => { if (!deleteTarget) return; void change(deleteTarget.type === 'folder' ? { action: 'deleteFolder', folderId: deleteTarget.id } : { action: 'deleteImage', imageId: deleteTarget.id }); setDeleteTarget(null); }}>Delete {deleteTarget?.type}</Button></AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Dialog open={renameTarget !== null} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}><DialogContent><DialogHeader><DialogTitle>Rename {renameTarget?.type}</DialogTitle></DialogHeader><Input aria-label="New name" autoFocus maxLength={renameTarget?.type === 'folder' ? 80 : 120} value={renameName} onChange={(event) => setRenameName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void saveRename(); }} /><Button disabled={!renameName.trim()} onClick={() => void saveRename()}>Save name</Button></DialogContent></Dialog>
    <Dialog open={previewImage !== undefined} onOpenChange={(open) => { if (!open) setPreviewId(null); }}><DialogContent className="flex h-[90vh] max-w-[95vw] items-center justify-center border-0 bg-transparent p-0 shadow-none sm:max-w-[95vw] [&>button]:rounded-full [&>button]:bg-background [&>button]:p-1"><DialogHeader className="sr-only"><DialogTitle>{previewImage?.name}</DialogTitle></DialogHeader>{previewImage && <img src={previewImage.src} alt={previewImage.name} className="max-h-full max-w-full object-contain" />}</DialogContent></Dialog>
    <Dialog open={folderOpen} onOpenChange={setFolderOpen}><DialogContent><DialogHeader><DialogTitle>New folder</DialogTitle></DialogHeader><Input placeholder="Folder name" value={folderName} onChange={(event) => setFolderName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && folderName.trim()) void createFolder(); }} /><Button disabled={!folderName.trim() || busy} onClick={() => void createFolder()}>Create folder</Button></DialogContent></Dialog>
    <Dialog open={importOpen} onOpenChange={setImportOpen}><DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>Add images from Pinterest</DialogTitle></DialogHeader><div className="flex flex-wrap gap-2"><Button size="sm" variant={mode === 'search' ? 'default' : 'outline'} onClick={() => setMode('search')}>Search</Button><Button size="sm" variant={mode === 'board' ? 'default' : 'outline'} onClick={() => setMode('board')}>Board link</Button></div><div className="flex gap-2"><Input aria-label={mode === 'search' ? 'Pinterest search' : 'Pinterest board link'} placeholder={mode === 'search' ? 'Search Pinterest' : 'https://www.pinterest.com/user/board/'} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && query.trim()) void search(); }} /><Button disabled={!query.trim() || busy} onClick={() => void search()}><Search className="mr-2 h-4 w-4" />{busy ? 'Loading…' : 'Find'}</Button></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {pins.length > 0 && <><p className="text-sm text-muted-foreground">Select images to import. {selected.length} selected.</p><div className="columns-2 gap-3 sm:columns-3 md:columns-4">{pins.map((pin) => <button key={pin.id} type="button" aria-pressed={selected.includes(pin.url)} onClick={() => setSelected((current) => current.includes(pin.url) ? current.filter((url) => url !== pin.url) : [...current, pin.url])} className={`mb-3 w-full break-inside-avoid overflow-hidden rounded-lg border-2 ${selected.includes(pin.url) ? 'border-primary' : 'border-transparent'}`}><img src={pin.url} alt="Pinterest result" className="h-auto w-full" /></button>)}</div><Input placeholder="New collection name (optional)" value={collectionName} onChange={(event) => setCollectionName(event.target.value)} /><Button disabled={!selected.length || busy} onClick={() => void importSelected()}>Import {selected.length} {selected.length === 1 ? 'image' : 'images'}{collectionName.trim() ? ' into collection' : ''}</Button></>}
    </DialogContent></Dialog>
  </main></DashboardShell>;
}

