import { FavoritesService } from '$lib/services/FavoritesService';
import { GameService } from '$lib/services/GameService';
import { SoftwareService } from '$lib/services/SoftwareService';

export class ApiService {
	private fetchFn: typeof fetch;
	games: GameService;
	favorites: FavoritesService;
	software: SoftwareService;

	constructor(fetchFn?: typeof fetch) {
		this.fetchFn = fetchFn || fetch;
		this.games = new GameService(this.fetchFn);
		this.favorites = new FavoritesService(this.fetchFn);
		this.software = new SoftwareService(this.fetchFn);
	}
}
