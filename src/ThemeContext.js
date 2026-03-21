import { createContext, useContext } from "react";
import { THEMES_DEFAULT } from "./constants.js";

export const ThemeCtx = createContext(THEMES_DEFAULT);
export function useTheme(){ return useContext(ThemeCtx); }
