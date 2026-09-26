import { canvas, surface } from "../render"
import { MenuManager } from "./menu"

/** What the Tormentor is doing, which decides the colour the chip wears and what it reads. */
export const enum TormentorState {
	/** The Tormentor is on its way: the chip counts down to its spawn. */
	Waiting,
	/** The Tormentor stands in its pit: the chip counts down to its move across the map. */
	Alive,
	/** Someone is hitting the Tormentor: the same count, in the colour of a fight. */
	Attacked
}

/**
 * The chip the pit wears in the world, in dp at the slider's middle: the card the menu's own
 * panels wear - its glass, its hairline rim, its frost and its halo, whatever the theme set - washed
 * in the colour of the Tormentor's state, its own art and the time left. The slider scales the
 * whole thing about {@link SIZE_BASE}.
 */
const HEIGHT = 24
/**
 * The corner, in dp: the menu's own card radius, which carries the theme's radius scale with it,
 * held to a pill so a wide radius on a low chip never turns its corners inside out.
 */
const RADIUS = Math.min(MenuSDK.HudCardRadius, HEIGHT / 2)
const PAD = 7
const GAP = 6
const GLYPH = 18
const FONT = 12
const WEIGHT = MenuSDK.HudBold
const DIGIT = /\d/g
/** How deep the glass is washed in the tint over the theme's own colour, out of 255. */
const TINT = 36
/** The slider value the chip is drawn at 1:1 on; every notch is a twelfth either way. */
const SIZE_BASE = 4
const SIZE_STEP = 12
/** How high over the pit the chip stands while the Tormentor is up, in world units: clear of it. */
const BOSS_LIFT = 200
/** How long the chip takes to glide most of the way up over the Tormentor, or back down, in ms. */
const GLIDE_MS = 120
/** How long the plate takes to turn most of the way to the colour of a new state, in ms. */
const RECOLOR_MS = 160
/**
 * How long the reading takes to come most of the way in, or to go back out, in ms: the plate opens
 * under it as it fades in, and closes over it as it fades out, rather than the chip jumping a
 * word wider or narrower on the frame the reading started or stopped.
 */
const REVEAL_MS = 80
/** How long one set of waves runs out over the minimap, in seconds. */
const WAVE_SECONDS = 2
/** The minimap's name for the Tormentor, and the key its icon is kept under. */
const MINIMAP_ICON = "tormentor"
const MINIMAP_KEY = "tormentor_icon"
/**
 * The Tormentor's own art: the icon the game's top bar counts it down under, cut for the side
 * the pit stands on. The top pit is the Radiant's, the bottom one the Dire's.
 */
const RADIANT_GLYPH = `${PathData.ImagePath}/hud/tormentor_timer_icon_radiant_png.vtex_c`
const DIRE_GLYPH = `${PathData.ImagePath}/hud/tormentor_timer_icon_dire_png.vtex_c`

/** The art of the pit at `location`: on the chip in the world and on the card of an alert. */
export function GlyphOf(location: ETormentorLocation) {
	return location === ETormentorLocation.TORMENTOR_LOCATION_TOP
		? RADIANT_GLYPH
		: DIRE_GLYPH
}

/**
 * The colour the chip is known by in each state: the cold steel of the Tormentor's crystal while
 * it is on its way, the green of its aura once it stands, the orange of a fight.
 */
const WaitingTint = new Color(120, 190, 230)
const AliveTint = new Color(96, 220, 120)
const AttackedTint = new Color(255, 140, 70)

export function StateTint(state: TormentorState) {
	switch (state) {
		case TormentorState.Alive:
			return AliveTint
		case TormentorState.Attacked:
			return AttackedTint
		default:
			return WaitingTint
	}
}

export class GUI {
	/** Where the chip stands in the world, gliding towards {@link GUI.target}. */
	private readonly position = new Vector3()
	private readonly target = new Vector3()
	private placed = false
	private lastFrame = -1
	/** The colour the chip wears this frame, on its way to the colour of the current state. */
	private readonly tint = new Color()
	private tinted = false
	/**
	 * How much of the reading is there, 0 to 1: the room the plate keeps for it and how strongly it
	 * is drawn. It eases up as a reading starts and back down once it has stopped.
	 */
	private reveal = 0
	/** The last reading the chip had, kept while it fades out so the glyphs and the room stay. */
	private shown = ""
	/**
	 * {@link shown} with every digit a zero: the width it is measured at, so a ticking reading does
	 * not make the chip breathe.
	 */
	private metric = ""
	/** When the last set of waves started on the minimap: a hit past its run starts another. */
	private waveStart = -WAVE_SECONDS
	private readonly box = new Rectangle()
	private readonly pos = new Vector2()
	private readonly size = new Vector2()

	public DrawWorld(
		origin: Vector3,
		location: ETormentorLocation,
		state: TormentorState,
		remaining: number,
		menu: MenuManager
	) {
		const now = hrtime(),
			dt = this.lastFrame < 0 ? 0 : now - this.lastFrame
		this.lastFrame = now

		// the chip stands over the Tormentor while it is up, and back on the pit once it is gone
		this.target.CopyFrom(origin)
		if (state !== TormentorState.Waiting) {
			this.target.AddScalarZ(BOSS_LIFT)
		}
		if (!this.placed) {
			this.position.CopyFrom(this.target)
			this.placed = true
		} else if (!this.position.Equals(this.target)) {
			this.position.LerpForThis(this.target, Math.min(dt / GLIDE_MS, 1))
		}

		const w2s = RendererSDK.WorldToScreen(this.position)
		if (w2s === undefined || GUIInfo.Contains(w2s)) {
			return
		}
		const k = (menu.Size.value + SIZE_STEP) / (SIZE_BASE + SIZE_STEP),
			text = this.reading(remaining, menu)
		if (text.length !== 0 && text !== this.shown) {
			this.shown = text
			this.metric = text.replace(DIGIT, "0")
		}
		this.approach(text.length === 0 ? 0 : 1, dt)

		// the card is laid out at the world scale, so the menu's own scale does not resize it
		MenuSDK.setHudWorldScale(k)
		const height = MenuSDK.hudH(HEIGHT),
			pad = MenuSDK.hudW(PAD),
			gap = MenuSDK.hudW(GAP),
			glyph = MenuSDK.hudH(GLYPH),
			textW =
				this.metric.length === 0
					? 0
					: MenuSDK.HudText.Width(this.metric, FONT, WEIGHT),
			slot = this.reveal * (gap + textW),
			width = Math.round(pad + glyph + slot + pad),
			x = Math.round(w2s.x - width / 2),
			y = Math.round(w2s.y - height / 2),
			centerY = y + height / 2

		MenuSDK.SetActiveSurface(surface)
		try {
			this.recolor(MenuSDK.HudColors.readable(StateTint(state)), dt)
			this.plate(x, y, width, height)
			this.pos.SetVector(x + pad, Math.round(centerY - glyph / 2))
			this.size.SetVector(glyph, glyph)
			// the art is a square icon: its corners are taken off so it sits on the pill
			MenuSDK.HudCard.Image(
				GlyphOf(location),
				this.pos,
				this.size,
				Color.WhiteReadonly,
				255,
				Math.round(glyph / 4)
			)
			if (this.reveal > 0 && textW > 0) {
				// the reading slides out from under the glyph as the plate opens, fading in as it
				// goes, and back under it as the plate closes
				MenuSDK.SetHudAlphaScale(this.reveal * this.reveal)
				MenuSDK.HudText.Center(
					x + width - pad - textW,
					centerY,
					textW,
					this.shown,
					FONT,
					MenuSDK.HudColors.body,
					WEIGHT
				)
			}
		} finally {
			MenuSDK.SetActiveSurface(undefined)
		}
	}
	/** A hit on the Tormentor: a set of waves on the minimap, unless the last one is still running. */
	public Hit(rawTime: number) {
		if (this.waveStart + WAVE_SECONDS <= rawTime) {
			this.waveStart = rawTime
		}
	}
	/** The icon on the minimap, and the waves of a hit running out from it while a set is up. */
	public DrawOnMinimap(origin: Vector3, isAlive: boolean) {
		MinimapSDK.DrawIcon(
			MINIMAP_ICON,
			origin,
			350,
			isAlive ? Color.White : Color.Red,
			0,
			MINIMAP_KEY
		)
		if (this.waveStart + WAVE_SECONDS > GameState.RawGameTime) {
			this.DrawWavesOnMinimap(this.waveStart, origin, Color.Aqua)
		}
	}
	public Destroy() {
		this.waveStart = -WAVE_SECONDS
		MinimapSDK.DeleteIcon(MINIMAP_KEY)
	}
	protected DrawWavesOnMinimap(
		startTime: number,
		position: Vector3,
		color: Color
	): void {
		const waveCount = 2,
			waveDelay = 0.5,
			baseWaveSize = 20,
			elapsed = GameState.RawGameTime - startTime,
			center = MinimapSDK.WorldToMinimap(position)
		if (center === undefined) {
			return
		}
		for (let i = 0; i < waveCount; i++) {
			const waveElapsed = elapsed - i * waveDelay
			if (waveElapsed < 0) {
				continue
			}
			const progress = Math.min(waveElapsed / WAVE_SECONDS, 1)
			if (progress === 1) {
				continue
			}
			const waveSize = new Vector2(baseWaveSize, baseWaveSize).MultiplyScalar(
				1 + progress * 2
			)
			const newCol = color.Clone()
			newCol.a *= (1 - progress) * 0.8
			const width = this.getWidthProgress(progress) * 1.25
			const wavePos = center.Subtract(waveSize.DivideScalar(2))
			canvas.Circle(wavePos, waveSize, {
				color: Color.fromUint32(0),
				borderColor: newCol,
				borderWidth: width
			})
		}
	}
	/**
	 * The plate under the chip: the menu's own card, so the glass, the rim, the blur and the halo are
	 * whatever the theme dresses its panels in, with the state's colour washed over the glass.
	 */
	private plate(x: number, y: number, w: number, h: number) {
		const radius = MenuSDK.hudRadius(RADIUS)
		this.box.pos1.SetVector(x, y)
		this.box.pos2.SetVector(x + w, y + h)
		MenuSDK.HudCard.Frame(this.box, 255, RADIUS)
		MenuSDK.HudCard.Plate(x, y, w, h, radius, this.tint, MenuSDK.hudAlpha(TINT))
	}
	/** Eases {@link GUI.reveal} part of the way to `target`, and snaps the last hair of it. */
	private approach(target: number, dt: number) {
		if (this.reveal === target) {
			return
		}
		this.reveal += (target - this.reveal) * Math.min(dt / REVEAL_MS, 1)
		if (Math.abs(target - this.reveal) < 0.01) {
			this.reveal = target
		}
	}
	/** What the chip reads: the time left, the way the menu asks, or nothing while there is none. */
	private reading(remaining: number, menu: MenuManager) {
		if (remaining <= 0) {
			return ""
		}
		return menu.FormatTime.value
			? Math.formatTime(remaining)
			: remaining.toFixed(remaining > 1 ? 0 : 1)
	}
	/** Turns the chip's colour part of the way to `target`, or all of it on the first frame. */
	private recolor(target: Color, dt: number) {
		if (!this.tinted) {
			this.tint.CopyFrom(target)
			this.tinted = true
			return
		}
		if (this.tint.Equals(target)) {
			return
		}
		const at = Math.min(dt / RECOLOR_MS, 1)
		this.tint.SetColor(
			Math.round(this.tint.r + (target.r - this.tint.r) * at),
			Math.round(this.tint.g + (target.g - this.tint.g) * at),
			Math.round(this.tint.b + (target.b - this.tint.b) * at),
			255
		)
	}
	private getWidthProgress(progress: number) {
		return 5 * (1 - progress)
	}
}
