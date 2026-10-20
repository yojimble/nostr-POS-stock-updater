import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nostrpos.stockupdater',
  appName: 'Nostr Stock Updater',
  webDir: 'dist',
  plugins: {
    // Draw edge to edge, and tell the page how much room the system bars take
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
