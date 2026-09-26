import { Paths } from "./paths"

/** Icons of the menu: the SDK set where it has one, our own glyphs next to it. */
export const TormentorIcons = {
	/** The page itself: the Tormentor's crystal over its pit. */
	Tormentor: `${Paths.Icons}/tormentor.svg`,
	State: Menu.Icons.Power,
	/** The row that picks where the alerts go. */
	Notification: Menu.Icons.Type,
	/** The wait for the Tormentor: the row that announces it before it spawns. */
	SpawnAlert: Menu.Icons.Hourglass,
	/** How long before the spawn the alert goes out. */
	SpawnBefore: Menu.Icons.Timer,
	/** The row that announces a fight at the pit. */
	AttackAlert: Menu.Icons.CircleAlert,
	/** The window the pit stays quiet for after an attack alert. */
	AntiSpam: Menu.Icons.ShieldCheck,
	/** Waves going out from a point: the ping the alert puts on the minimap. */
	Alert: `${Paths.Icons}/ping.svg`,
	FormatTime: Menu.Icons.ClockSeconds,
	Size: Menu.Icons.Expand
} as const
