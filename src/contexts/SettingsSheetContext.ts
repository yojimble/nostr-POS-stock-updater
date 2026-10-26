import { createContext, useContext } from 'react';

interface SettingsSheetContextType {
  openSettings: () => void;
}

export const SettingsSheetContext = createContext<SettingsSheetContextType>({ openSettings: () => {} });

export const useSettingsSheet = () => useContext(SettingsSheetContext);
