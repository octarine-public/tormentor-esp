import "./translations"

import { MenuManager } from "./menu"
import { TormentorModel } from "./model"

new (class CTormentorESP {
	private readonly menu!: MenuManager
	private tormentor: Nullable<TormentorModel>

	constructor(canBeInitialized: boolean) {
		if (!canBeInitialized) {
			return
		}
		this.menu = new MenuManager()
		EventsSDK.on("Draw", this.Draw.bind(this))
		EventsSDK.on("Draw2D", this.Draw2D.bind(this))
		EventsSDK.on("GameEnded", this.GameEnded.bind(this))
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))

		EventsSDK.on("EntityCreated", this.EntityCreated.bind(this))
		EventsSDK.on("EntityDestroyed", this.EntityDestroyed.bind(this))

		EventsSDK.on("GameEvent", this.GameEvent.bind(this))
	}
	private get isUIGame() {
		return GameState.UIState === DOTAGameUIState.DOTA_GAME_UI_DOTA_INGAME
	}
	private get isPostGame() {
		return (
			Dota2SDK.GameRules === undefined ||
			Dota2SDK.GameRules.GameState === DOTAGameState.DOTA_GAMERULES_STATE_POST_GAME
		)
	}
	private get shouldDraw() {
		return this.menu.State.value && this.isUIGame && !this.isPostGame
	}
	protected GameEnded() {
		this.tormentor?.Destroy()
		this.tormentor = undefined
	}
	protected Draw() {
		if (this.shouldDraw) {
			this.tormentor?.Draw()
		}
	}
	protected Draw2D() {
		if (this.shouldDraw) {
			this.tormentor?.Draw2D()
		}
	}
	protected PostDataUpdate(dt: number) {
		if (dt !== 0 && !this.isPostGame) {
			this.tormentor?.PostDataUpdate()
		}
	}
	protected EntityCreated(entity: Entity) {
		if (entity instanceof MinibossSpawner) {
			this.tormentor = new TormentorModel(entity)
		}
	}
	protected EntityDestroyed(entity: Entity) {
		const tormentor = this.tormentor
		if (tormentor !== undefined && tormentor.Entity === entity) {
			tormentor.Destroy()
			this.tormentor = undefined
		}
	}
	/**
	 * A hit on the Tormentor. The game sends the damage event of the unit in the fog too, while
	 * the flash of its reflect is only sent where the pit is seen.
	 */
	protected GameEvent(eventName: string, obj: IEntityHurt) {
		if (this.tormentor === undefined || eventName !== "entity_hurt") {
			return
		}
		if (EntityManager.EntityByIndex(obj.entindex_killed) instanceof Miniboss) {
			this.tormentor.Hit()
		}
	}
})(true)
