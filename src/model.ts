import { GlyphOf, GUI, StateTint, TormentorState } from "./gui"
import { MenuManager } from "./menu"

/** How long a ping stays on the minimap, and how long until the next one, in seconds. */
const PING_SECONDS = 7
/** How long the card of an alert stays on screen, in seconds. */
const NOTICE_SECONDS = 6
/** How long the Tormentor keeps a pit before it crosses the map, in seconds: the day-night cycle. */
const MOVE_SECONDS = 5 * 60
/** How long after the last hit the fight at the pit is taken to be over, in seconds. */
const FIGHT_SECONDS = 3
/** The sound of the coming Tormentor, and the sharper one of a fight at its pit. */
const SPAWN_SOUND = "General.Ping"
const ATTACK_SOUND = "General.PingWarning"

export class TormentorModel {
	/** Whether the coming spawn has been announced this cycle. */
	private announced = false
	/** Whether the Tormentor stood in its pit on the last update; nothing before the first one. */
	private wasAlive: Nullable<boolean>
	private lastLocation: Nullable<ETormentorLocation>
	/** The raw game time the fight is over at unless another hit lands: a hit past it starts one. */
	private attackedUntil = 0
	private readonly gui = new GUI()
	/** Holds the next ping back while the last one is still up. */
	private readonly sleeper = new TickSleeper()
	/** Holds the attack alerts back for the menu's anti-spam window after one. */
	private readonly quiet = new TickSleeper()

	constructor(public readonly Entity: MinibossSpawner) {}

	private get menu() {
		return MenuManager.Menu
	}
	private get isAlive() {
		return this.Entity.IsAliveTormentor
	}
	private get isAttacked() {
		return this.attackedUntil > GameState.RawGameTime
	}
	private get state() {
		if (!this.isAlive) {
			return TormentorState.Waiting
		}
		return this.isAttacked ? TormentorState.Attacked : TormentorState.Alive
	}
	/**
	 * What the chip counts down: the spawn while the Tormentor is gone, the next crossing of the
	 * map while it stands. The rules carry the end of a spawn phase; a standing Tormentor keeps
	 * no phase end and crosses on the day-night clock instead.
	 */
	public get Remaining() {
		const rules = Dota2SDK.GameRules
		if (rules === undefined) {
			return 0
		}
		const left = rules.TormentorPhaseEndTime - rules.GameTime
		if (left > 0) {
			return this.floorTime(left)
		}
		return this.isAlive
			? this.floorTime(MOVE_SECONDS - (rules.GameTime % MOVE_SECONDS))
			: 0
	}
	public Draw() {
		this.gui.DrawWorld(
			this.Entity.Position,
			this.Entity.LocationType,
			this.state,
			this.Remaining,
			this.menu
		)
		this.gui.DrawOnMinimap(this.Entity.Position, this.isAlive)
	}
	public PostDataUpdate() {
		const alive = this.isAlive,
			location = this.Entity.LocationType
		// the first update only reads where things stand: nothing has happened yet
		if (this.wasAlive !== undefined) {
			if (alive !== this.wasAlive) {
				if (!alive) {
					this.attackedUntil = 0
					this.killAlert()
				}
			} else if (alive && location !== this.lastLocation) {
				this.moveAlert(location)
			}
		}
		this.wasAlive = alive
		this.lastLocation = location
		if (!alive) {
			this.spawnAlert()
		}
	}
	/**
	 * A hit on the Tormentor: its reflect flashed. One past the last fight starts another and
	 * tells of it; the waves on the minimap are the chip's own.
	 */
	public Hit() {
		const rawTime = GameState.RawGameTime
		if (!this.isAlive) {
			return
		}
		const started = this.attackedUntil <= rawTime
		this.attackedUntil = rawTime + FIGHT_SECONDS
		this.gui.Hit(rawTime)
		if (started) {
			this.attackAlert()
		}
	}
	public Destroy() {
		this.attackedUntil = 0
		this.gui.Destroy()
	}
	/**
	 * The alerts of the coming Tormentor: the notice on its channel, and on top of it the ping on
	 * the minimap, once a cycle in the window the menu set before the spawn. Outside the window
	 * there is nothing to do but arm the notice for the next cycle.
	 */
	private spawnAlert() {
		const remaining = this.Remaining
		if (remaining > this.menu.SpawnBefore.value) {
			this.announced = false
			return
		}
		if (remaining <= 0 || this.announced || !this.enabled(this.menu.SpawnAlert)) {
			return
		}
		this.announced = true
		// the time left, not the slider: a script started inside the window reads what is true
		const seconds = Math.max(Math.ceil(remaining), 1).toString()
		this.notify(
			Menu.Localization.Localize("Spawns in {n} seconds").replace("{n}", seconds),
			StateTint(TormentorState.Waiting)
		)
		this.pingMinimap(Color.White, SPAWN_SOUND)
	}
	/** The Tormentor crossed the map while it stood: which pit it is in now. */
	private moveAlert(location: ETormentorLocation) {
		if (!this.enabled(this.menu.SpawnAlert)) {
			return
		}
		const side =
			location === ETormentorLocation.TORMENTOR_LOCATION_TOP
				? "Moved to the top side"
				: "Moved to the bottom side"
		this.notify(Menu.Localization.Localize(side), StateTint(TormentorState.Alive))
		this.pingMinimap(Color.White, SPAWN_SOUND)
	}
	/**
	 * The alerts of a fight at the pit: the notice on its channel and the ping on the minimap,
	 * held back for the anti-spam window after the last one, so a fight broken off and taken up
	 * again does not tell of itself twice.
	 */
	private attackAlert() {
		const menu = this.menu
		if (!this.enabled(menu.AttackAlert) || this.quiet.Sleeping) {
			return
		}
		this.quiet.Sleep(menu.AntiSpam.value * 1000)
		const tint = StateTint(TormentorState.Attacked)
		this.notify(Menu.Localization.Localize("Under attack"), tint)
		// a ping of the coming Tormentor does not hold this one back: the fight is on right now
		this.sleeper.ResetTimer()
		this.pingMinimap(tint, ATTACK_SOUND)
	}
	/** The Tormentor went down: the end of the fight, whatever the anti-spam window holds. */
	private killAlert() {
		if (!this.enabled(this.menu.AttackAlert)) {
			return
		}
		const tint = MenuSDK.HudColors.kill
		this.notify(Menu.Localization.Localize("Has been killed"), tint)
		this.sleeper.ResetTimer()
		this.pingMinimap(tint, SPAWN_SOUND)
	}
	private enabled(alert: Menu.Toggle) {
		return this.menu.State.value && alert.value
	}
	/** Pings the pit on the minimap and sounds it, unless the row is off or the last ping is up. */
	private pingMinimap(color: Color, sound: string) {
		if (!this.menu.NotifyMinimap.value || this.sleeper.Sleeping) {
			return
		}
		MinimapSDK.DrawPing(
			this.Entity.Position,
			color,
			GameState.RawGameTime + PING_SECONDS
		)
		SoundSDK.EmitStartSoundEvent(sound)
		this.sleeper.Sleep(PING_SECONDS * 1000)
	}
	/** Tells of the Tormentor on the channel the menu picked, or nowhere while it is on "Disable". */
	private notify(message: string, color: Color) {
		const channel = this.menu.Channel
		if (channel === undefined) {
			return
		}
		NotificationsSDK.Show({
			title: Menu.Localization.Localize("Tormentor"),
			message,
			// the art of the pit the Tormentor is at, the same the chip in the world wears
			titleIcon: GlyphOf(this.Entity.LocationType),
			color,
			duration: NOTICE_SECONDS,
			channel
		})
	}
	private floorTime(value: number) {
		return Math.floor(value * 10) / 10
	}
}
