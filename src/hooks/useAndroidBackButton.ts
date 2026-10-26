import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

import { isAndroidApp } from '@/lib/amberSigner';

// Anything the user can dismiss: dialogs, the settings sheet, open menus.
const OPEN_LAYER = '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"]';

/**
 * Android back button, in the order people expect: close whatever is open on top,
 * otherwise go back a page, and only leave the app when there is nowhere left to go.
 */
export function useAndroidBackButton() {
  useEffect(() => {
    if (!isAndroidApp()) return;

    const listener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (document.querySelector(OPEN_LAYER)) {
        // Radix closes the top layer on Escape, so the dialog's own close logic still runs
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      } else if (canGoBack) {
        window.history.back();
      } else {
        void CapacitorApp.exitApp();
      }
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);
}
