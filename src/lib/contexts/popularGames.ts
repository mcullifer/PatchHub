import { createContext } from 'svelte';
import type { getMostPopularGames } from '$lib/remote/games.remote';

export const [usePopularGames, setPopularGames] =
	createContext<ReturnType<typeof getMostPopularGames>>();
