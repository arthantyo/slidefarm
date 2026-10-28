import { SettingsView } from '@/components/settings/settings-view';

export default function SettingsPage({ searchParams }: { searchParams: { section?: string | string[] } }) {
  const requested = Array.isArray(searchParams.section) ? searchParams.section[0] : searchParams.section;
  return <SettingsView section={requested} />;
}
