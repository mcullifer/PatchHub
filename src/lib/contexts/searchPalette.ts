import { createContext } from 'svelte';

// Lets any descendant open the single global search palette owned by the root layout.
export const [getSearchPalette, setSearchPalette] = createContext<{ open: () => void }>();
