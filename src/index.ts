import "./translations"

import {
	DOTAGameState,
	DOTAGameUIState,
	Entity,
	EventsSDK,
	GameRules,
	GameState,
	Miniboss,
	MinibossSpawner,
	NetworkedParticle
} from "github.com/octarine-public/wrapper/index"

import { GUI } from "./gui"
import { MenuManager } from "./menu"

new (class CTormentorESP {
	private readonly gui!: GUI
	private readonly menu!: MenuManager
	private spawner: Nullable<MinibossSpawner>
	private readonly allowParticles = new Set([
		"particles/neutral_fx/miniboss_damage_reflect.vpcf",
		"particles/neutral_fx/miniboss_damage_reflect_dire.vpcf"
	])

	constructor(canBeInitialized: boolean) {
		if (!canBeInitialized) {
			return
		}
		this.menu = new MenuManager()
		this.gui = new GUI(this.menu)

		EventsSDK.on("Draw", this.Draw.bind(this))
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))

		EventsSDK.on("EntityCreated", this.EntityCreated.bind(this))
		EventsSDK.on("EntityDestroyed", this.EntityDestroyed.bind(this))

		EventsSDK.on("EntityVisibleChanged", this.EntityVisibleChanged.bind(this))
		EventsSDK.on("ParticleUpdated", this.ParticleUpdated.bind(this))
	}
	private get shouldDraw() {
		if (!this.menu.State.value) {
			return false
		}
		if (!this.isUIGame || this.isPostGame) {
			return false
		}
		return GameRules !== undefined && this.spawner !== undefined
	}
	private get isUIGame() {
		return GameState.UIState === DOTAGameUIState.DOTA_GAME_UI_DOTA_INGAME
	}
	private get isPostGame() {
		return (
			GameRules === undefined ||
			GameRules.GameState === DOTAGameState.DOTA_GAMERULES_STATE_POST_GAME
		)
	}
	protected Draw() {
		if (this.shouldDraw) {
			this.gui.Draw(GameRules!, this.spawner!)
		}
	}
	protected PostDataUpdate(dt: number) {
		if (dt === 0 || this.isPostGame) {
			return
		}
		if (GameRules !== undefined && this.spawner !== undefined) {
			this.gui.PostDataUpdate(this.spawner)
		}
	}
	protected EntityCreated(entity: Entity) {
		if (entity instanceof MinibossSpawner) {
			this.spawner = entity
		}
	}
	protected EntityDestroyed(entity: Entity) {
		if (entity === this.spawner) {
			this.spawner = undefined
			this.gui.Destroy()
		}
	}
	public EntityVisibleChanged(entity: Entity) {
		if (entity instanceof Miniboss) {
			this.gui.IsVsible = entity.IsVisible
		}
	}
	public ParticleUpdated(particle: NetworkedParticle) {
		if (this.allowParticles.has(particle.PathNoEcon)) {
			this.gui.UpdateLastAttack()
		}
	}
})(true)
