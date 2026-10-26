// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import { Suspense, useState } from 'react';
import NostrProvider from '@/components/NostrProvider';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NostrLoginProvider, useNostrLogin } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { AppConfig } from '@/contexts/AppContext';
import AppRouter from './AppRouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Settings, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAppContext } from '@/hooks/useAppContext';
import { cn } from '@/lib/utils';
import { useUserRelayList } from '@/hooks/useUserRelayList';
import { SettingsSheetContext } from '@/contexts/SettingsSheetContext';
import { useAndroidBackButton } from '@/hooks/useAndroidBackButton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ANON_ZAPS_KEY } from '@/lib/posSettings';

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      gcTime: Infinity,
    },
  },
});

const defaultConfig: AppConfig = {
  theme: "light",
  relayUrls: ["wss://relay.damus.io", "wss://relay.plebeian.market", "wss://nos.lol"],
};

const presetRelays = [
  { url: 'wss://relay.damus.io', name: 'Damus' },
  { url: 'wss://relay.plebeian.market', name: 'Plebeian Market' },
  { url: 'wss://nos.lol', name: 'nos.lol' },
  { url: 'wss://relay.nostr.band', name: 'Nostr.Band' },
  { url: 'wss://relay.primal.net', name: 'Primal' },
  { url: 'wss://ditto.pub/relay', name: 'Ditto' },
];

function AppContent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { config, updateConfig } = useAppContext();
  const { logins } = useNostrLogin();
  useAndroidBackButton();

  // One box per relay; the list grows and shrinks to fit
  const [relayInputs, setRelayInputs] = useState<string[]>(
    config.relayUrls.length ? config.relayUrls : ['wss://relay.damus.io'],
  );
  const [anonymousZaps, setAnonymousZaps] = useLocalStorage<boolean>(ANON_ZAPS_KEY, false);

  const { data: myRelays, isLoading: myRelaysLoading } = useUserRelayList();

  // Fill the relay boxes from the user's NIP-65 list (not saved until "Save changes")
  const applyMyRelays = () => {
    const urls = (myRelays ?? []).map((r) => r.url);
    if (urls.length) setRelayInputs(urls);
  };

  const updateRelayInput = (index: number, value: string) =>
    setRelayInputs((prev) => prev.map((url, i) => (i === index ? value : url)));

  const handleSaveRelay = () => {
    const newRelayUrls: string[] = [];

    for (const raw of relayInputs) {
      const url = raw.trim();
      if (url === '') continue; // empty boxes are ignored
      if (!url.startsWith('wss://')) {
        toast.error(`Invalid relay URL: ${url}. Must start with wss://`);
        return;
      }
      if (!newRelayUrls.includes(url)) newRelayUrls.push(url);
    }

    if (newRelayUrls.length === 0) {
      toast.error("Please enter at least one valid relay URL.");
      return;
    }

    updateConfig((prevConfig) => ({ ...prevConfig, relayUrls: newRelayUrls }));
    toast.success("Relay URLs updated successfully!");
    setIsSettingsOpen(false);
  };

  // Signed out: centre the sign-in card. Signed in: pin every tab to the top so the tab bar does not jump between tabs.
  return (
    <div className={cn("flex-grow flex justify-center", logins.length === 0 ? "items-center" : "items-start")}>
      <SettingsSheetContext.Provider value={{ openSettings: () => setIsSettingsOpen(true) }}>
        <AppRouter />
      </SettingsSheetContext.Provider>
      {/* Signed in, settings live in the profile picture's menu; signed out there is no picture */}
      {logins.length === 0 && (
        <Button
          variant="outline"
          size="icon"
          aria-label="Settings"
          className="fixed top-1 right-2 h-8 w-8 rounded-full shadow-md z-50 mt-[env(safe-area-inset-top)]"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}

      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        {/* don't focus the first relay box on open: it selects the text and raises the keyboard */}
        <SheetContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>
              Choose your preferred relays.
            </SheetDescription>
          </SheetHeader>
          {(myRelaysLoading || (myRelays && myRelays.length > 0)) && (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium">Your relays (NIP-65)</p>
              {myRelaysLoading ? (
                <p className="text-xs text-muted-foreground">Looking up your relay list…</p>
              ) : (
                <>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {myRelays!.map((r) => (
                      <li key={r.url} className="truncate">
                        {r.url}
                        {r.mode !== 'both' && ` (${r.mode})`}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" size="sm" onClick={applyMyRelays}>
                    Use my relays
                  </Button>
                </>
              )}
            </div>
          )}
          <div className="grid gap-3 py-4 px-2 -mx-2 max-h-[50vh] overflow-y-auto">
            {relayInputs.map((url, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  aria-label={`Relay ${index + 1}`}
                  value={url}
                  onChange={(e) => updateRelayInput(index, e.target.value)}
                  placeholder="wss://your-relay.com"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove relay ${index + 1}`}
                  disabled={relayInputs.length === 1}
                  onClick={() => setRelayInputs((prev) => prev.filter((_, i) => i !== index))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setRelayInputs((prev) => [...prev, ''])}>
              Add relay
            </Button>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveRelay}>Save changes</Button>
          </div>

          <Separator className="my-6" />

          <div className="flex items-start gap-3">
            <Switch
              id="anon-zaps"
              checked={anonymousZaps}
              onCheckedChange={setAnonymousZaps}
              className="mt-0.5"
            />
            <Label htmlFor="anon-zaps" className="font-normal leading-snug">
              Anonymous zap receipts
              <span className="block text-xs text-muted-foreground mt-1">
                {anonymousZaps
                  ? "Sales aren't linked to your Nostr identity, and your signer is never asked to approve one."
                  : 'Sales appear publicly as self-zaps from your account, and your signer must auto-approve kind 9734.'}
              </span>
            </Label>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// The credit only shows on the signed-out screen; once someone is logged in it is out of the way.
function CreditFooter() {
  const { logins } = useNostrLogin();
  if (logins.length > 0) return null;

  return (
    <div className="text-center text-xs text-muted-foreground mt-8 mb-4"> {/* Footer */}
      <p>
        Vibecoded with love by <a href="https://njump.me/yojimble@getalby.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#ff07a9' }}>Yojimble</a> using <a href="https://soapbox.pub/mkstack" target="_blank" rel="noopener noreferrer" className="underline">MKStack</a>
      </p>
    </div>
  );
}

export function App() {
  return (
    <UnheadProvider head={head}>
      <div className="flex flex-col min-h-screen"> {/* Added flex-col min-h-screen */}
        <AppProvider storageKey="nostr:app-config" defaultConfig={defaultConfig} presetRelays={presetRelays}>
          <QueryClientProvider client={queryClient}>
            <NostrLoginProvider storageKey='nostr:login'>
              <NostrProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <Suspense>
                    <AppContent /> {/* Render AppContent here */}
                  </Suspense>
                  <CreditFooter />
                </TooltipProvider>
              </NostrProvider>
            </NostrLoginProvider>
          </QueryClientProvider>
        </AppProvider>
      </div>
    </UnheadProvider>
  );
}

export default App;
