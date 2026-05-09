// Game remote functions
export { getGameNews, getMostPopularGames, searchGames } from './games.remote';

// Software remote functions
export { getSoftwareSourceSummaries } from './software.remote';

// Favorites remote functions
export {
	addExternalItemFavorite,
	addProjectFavorite,
	getFavorites,
	removeExternalItemFavorite,
	removeProjectFavorite
} from './favorites.remote';
