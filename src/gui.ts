import {
	CGameRules,
	Color,
	ConVarsSDK,
	EntityManager,
	ETormentorLocation,
	GameRules,
	GameState,
	GUIInfo,
	MathSDK,
	Menu,
	Miniboss,
	MinibossSpawner,
	MinimapSDK,
	PathData,
	Rectangle,
	RendererSDK,
	SoundSDK,
	Vector2
} from "github.com/octarine-public/wrapper/index"

import { MenuManager } from "./menu"

export class GUI {
	public IsVsible = false

	private lastAlive = true
	private lastLocation: ETormentorLocation | -1 = -1
	private readonly nightTime = 5 * 60

	constructor(private readonly menu: MenuManager) {}

	private get iconSize() {
		return this.menu.IconSize.value + 44
	}
	private get baseSpawnTime() {
		return ConVarsSDK.GetFloat("dota_tormentor_spawn_time", 1200)
	}
	private get isInitialSpawn(): boolean {
		const gameTime = GameRules!.GameTime
		return gameTime < this.baseSpawnTime
	}
	private respawnTime(gameRules: CGameRules): number {
		const time = Math.max(gameRules.TormentorPhaseEndTime - gameRules.GameTime, 0)
		const respawnTime = ConVarsSDK.GetFloat("dota_tormentor_respawn_time_base", 600)
		return this.isInitialSpawn
			? this.baseSpawnTime
			: time <= 0
				? this.nightTime
				: respawnTime
	}
	public Draw(gameRules: CGameRules, spawner: MinibossSpawner): void {
		this.DrawMiniMap(spawner)

		const position = spawner.Position.Clone()
		if (spawner.IsAlive) {
			position.AddScalarZ(200)
		}
		const w2s = RendererSDK.WorldToScreen(position)
		if (w2s === undefined || this.ContainsHUD(w2s)) {
			return
		}
		const rect = this.GetPosition(w2s),
			remainingTime = this.getRemainingTime(gameRules),
			isCircle = this.menu.ModeImage.SelectedID === 0
		if (this.IsVsible && spawner.IsAlive) {
			this.DrawTimer(rect, remainingTime)
			return
		}

		this.DrawStatus(rect, spawner.IsAlive)
		this.DrawImage(isCircle, rect, spawner)
		this.DrawTimer(rect, remainingTime)

		const ratio = Math.max(100 * (remainingTime / this.respawnTime(gameRules)), 0)
		const width = Math.round(GUIInfo.ScaleHeight(2) + Math.round(rect.Height / 15))

		this.DrawOutlineMode(isCircle, rect, width)
		this.DrawArc(rect, width, spawner.IsAlive ? -ratio : ratio, isCircle)
	}
	public PostDataUpdate(spawner: MinibossSpawner): void {
		this.UpdateStateAndSendPing(spawner)
	}
	public Destroy() {
		this.IsVsible = false
		this.lastAlive = true
		this.lastLocation = -1
		MinimapSDK.DeleteIcon("tormentor_icon")
	}
	protected ContainsHUD(position: Vector2): boolean {
		return (
			GUIInfo.ContainsShop(position) ||
			GUIInfo.ContainsMiniMap(position) ||
			GUIInfo.ContainsScoreboard(position)
		)
	}
	protected DrawMiniMap(spawner: MinibossSpawner): void {
		MinimapSDK.DrawIcon(
			"tormentor",
			spawner.Position,
			350,
			spawner.IsAlive ? Color.Aqua : Color.Red,
			undefined,
			"tormentor_icon"
		)
	}
	protected DrawImage(isCircle: boolean, rect: Rectangle, spawner: MinibossSpawner) {
		const texture = this.GetImageTexture(spawner.IsAlive)
		RendererSDK.Image(texture, rect.pos1, isCircle ? 0 : -1, rect.Size, Color.White)
	}
	protected DrawTimer(rect: Rectangle, remainingTime: number): void {
		if (remainingTime === 0) {
			return
		}
		const text =
			remainingTime > 60
				? MathSDK.FormatTime(remainingTime)
				: remainingTime.toFixed(remainingTime < 2 ? 1 : 0)
		RendererSDK.TextByFlags(text, rect, Color.White, 3)
	}
	protected DrawStatus(rec: Rectangle, isAlive: boolean): void {
		const rect = rec.Clone()
		rect.SubtractY(rec.Height / 2 + 10)
		const text = Menu.Localization.Localize(isAlive ? "Alive" : "Dead")
		RendererSDK.TextByFlags(text, rect, Color.White, 3)
	}
	protected DrawArc(
		position: Rectangle,
		width: number,
		ratio: number,
		isCircle: boolean
	) {
		if (isCircle) {
			RendererSDK.Arc(
				270,
				-ratio,
				position.pos1,
				position.Size,
				false,
				width,
				Color.Green
			)
		} else {
			RendererSDK.Radial(
				270,
				-ratio,
				position.pos1,
				position.Size,
				Color.Black,
				undefined,
				undefined,
				Color.Green,
				false,
				3,
				true
			)
		}
	}
	protected DrawOutlineMode(
		isCircle: boolean,
		position: Rectangle,
		width: number,
		color: Color = Color.Black
	) {
		if (isCircle) {
			RendererSDK.OutlinedCircle(position.pos1, position.Size, color, width)
			return
		}
		RendererSDK.OutlinedRect(
			position.pos1.AddScalar(-1),
			position.Size.AddScalar(3 - 1),
			width,
			color
		)
	}
	protected GetPosition(w2s: Vector2): Rectangle {
		const menuSize = this.iconSize
		const size = GUIInfo.ScaleVector(menuSize, menuSize)
		const pos = w2s.Subtract(size.DivideScalar(2))
		return new Rectangle(pos, pos.Add(size))
	}
	protected GetImageTexture(isAlive: boolean): string {
		return (
			PathData.AbilityImagePath +
			(isAlive
				? "/miniboss_alleviation_png.vtex_c"
				: "/miniboss_unyielding_shield_png.vtex_c")
		)
	}
	protected UpdateStateAndSendPing(spawner: MinibossSpawner) {
		if (this.lastAlive !== spawner.IsAlive) {
			const boss = EntityManager.GetEntitiesByClass(Miniboss)[0]
			this.lastAlive = spawner.IsAlive
			this.IsVsible = boss?.IsVisible ?? false
			this.pingMinimap(spawner)
		}
		if (this.lastLocation !== spawner.LocationType) {
			this.lastLocation = spawner.LocationType
			this.pingMinimap(spawner)
		}
	}
	private getRemainingTime(gameRules: CGameRules): number {
		const time = Math.max(gameRules.TormentorPhaseEndTime - gameRules.GameTime, 0)
		return time === 0 ? this.nightTime - (gameRules.GameTime % this.nightTime) : time
	}
	private pingMinimap(spawner: MinibossSpawner) {
		if (!this.menu.State.value || this.isInitialSpawn) {
			return
		}
		if (this.menu.NotifyMinimap.value) {
			MinimapSDK.DrawPing(spawner.Position, Color.White, GameState.RawGameTime + 7)
			SoundSDK.EmitStartSoundEvent("General.Ping")
		}
	}
}
