import "./translations"

import { MenuManager } from "./menu"
import { TormentorModel } from "./model"

/** The flash of the Tormentor's reflect: it plays on every hit it takes, in either pit. */
const REFLECT_PARTICLES = new Set([
	"particles/neutral_fx/miniboss_damage_reflect.vpcf",
	"particles/neutral_fx/miniboss_damage_reflect_dire.vpcf"
])

new (class CTormentorESP {
	private readonly menu!: MenuManager
	private tormentor: Nullable<TormentorModel>

	constructor(canBeInitialized: boolean) {
		if (!canBeInitialized) {
			return
		}
		this.menu = new MenuManager()
		EventsSDK.on("Draw", this.Draw.bind(this))
		EventsSDK.on("GameEnded", this.GameEnded.bind(this))
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))

		EventsSDK.on("EntityCreated", this.EntityCreated.bind(this))
		EventsSDK.on("EntityDestroyed", this.EntityDestroyed.bind(this))

		EventsSDK.on("ParticleCreated", this.ParticleUpdated.bind(this))
		EventsSDK.on("ParticleUpdated", this.ParticleUpdated.bind(this))
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
	protected ParticleUpdated(particle: NetworkedParticle) {
		if (REFLECT_PARTICLES.has(particle.PathNoEcon)) {
			this.tormentor?.Hit()
		}
	}
})(true)
