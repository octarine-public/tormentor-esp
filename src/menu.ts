import { TormentorIcons } from "./icons"
import { AddMapObjectsPage } from "./map-objects"

type ConfigObject = MenuSDK.ConfigObject

function subtreeOf(parent: Nullable<ConfigObject>, name: string): Nullable<ConfigObject> {
	const value = parent?.[name]
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as ConfigObject)
		: undefined
}

/** The node `name` of `parent`, made when the config has none yet. */
function ensureSubtree(parent: ConfigObject, name: string): ConfigObject {
	const own = subtreeOf(parent, name)
	if (own !== undefined) {
		return own
	}
	const made: ConfigObject = {}
	parent[name] = made
	return made
}

/** Moves a saved value from `from` into `into`, where the target has none of its own yet. */
function moveRow(from: ConfigObject, name: string, into: () => ConfigObject) {
	const saved = from[name]
	if (saved === undefined) {
		return
	}
	into()[name] ??= saved
	delete from[name]
}

export class MenuManager {
	public static Menu: MenuManager

	public readonly State: Menu.Toggle
	/** Where the alerts go: as picked in Settings, the game chat, a side card, or nowhere. */
	public readonly Notification: Menu.Dropdown
	/** Whether the Tormentor is announced before it spawns, and when it crosses the map. */
	public readonly SpawnAlert: Menu.Toggle
	/** How long before the Tormentor spawns it is announced, in seconds. */
	public readonly SpawnBefore: Menu.Slider
	/** Whether a fight at the pit is announced the moment it starts, and the death that ends it. */
	public readonly AttackAlert: Menu.Toggle
	/** How long after an attack alert the next one is held back, in seconds; 0 holds nothing back. */
	public readonly AntiSpam: Menu.Slider
	public readonly NotifyMinimap: Menu.Toggle
	public readonly FormatTime: Menu.Toggle
	public readonly Size: Menu.Slider

	private readonly node = AddMapObjectsPage(
		"Tormentor",
		TormentorIcons.Tormentor,
		"Timer of the Tormentor,\nover its pit and on the minimap"
	)

	constructor() {
		this.node.SortNodes = false
		// one section per tab, the way every page of Map objects reads
		this.node.TabbedChildren = true
		// the rows renamed or moved since the first release keep their saved values
		this.migrate(this.node.entry.stored)
		MenuSDK.AddConfigMigration(raw =>
			this.migrate(MenuSDK.ConfigSubtreeOf(raw, this.node.entry))
		)

		const display = this.node.AddNode(
			"Display",
			TormentorIcons.Display,
			"The chip over the pit and its timer"
		)
		display.SortNodes = false
		const alerts = this.node.AddNode(
			"Alerts",
			TormentorIcons.Alerts,
			"Notices, sounds and pings:\nspawn, a fight at the pit and its death"
		)
		alerts.SortNodes = false
		display.Priority = 0
		alerts.Priority = 1

		// the script's own switch stands on the first tab and rides the header of every one
		this.State = display.AddToggle("State", true, undefined, -1)
		this.State.IconPath = TormentorIcons.State
		display.HeaderControl = this.State
		this.node.HeaderControl = this.State
		this.node.Gate = this.State

		this.FormatTime = display.AddToggle(
			"Format time",
			true,
			"Show remaining\ntime as min:sec"
		)
		this.FormatTime.IconPath = TormentorIcons.FormatTime

		// the chip is drawn 1:1 at the middle of the range; the old 0-50 icon size does not carry over
		this.Size = display.AddSlider(
			"Size in world",
			4,
			0,
			8,
			0,
			"Size of the chip drawn over the pit"
		)
		this.Size.IconPath = TormentorIcons.Size

		this.Notification = NotificationsSDK.AddChannelRow(alerts, true)
		this.Notification.IconPath = TormentorIcons.Notification

		this.SpawnAlert = alerts.AddToggle(
			"Spawn alert",
			true,
			"Announces the Tormentor before it spawns\nand when it moves to the other side"
		)
		this.SpawnAlert.IconPath = TormentorIcons.SpawnAlert
		const spawn = alerts.AddSubSettings(this.SpawnAlert, "Spawn alert settings")

		this.SpawnBefore = spawn.AddSlider(
			"Before spawn",
			20,
			3,
			120,
			0,
			"How long before the Tormentor spawns\nthe alert goes out, in seconds"
		)
		this.SpawnBefore.Suffix = "s"
		this.SpawnBefore.IconPath = TormentorIcons.SpawnBefore

		this.AttackAlert = alerts.AddToggle(
			"Attack alert",
			true,
			"Announces the moment someone starts hitting\nthe Tormentor, in the fog too, and its death"
		)
		this.AttackAlert.IconPath = TormentorIcons.AttackAlert
		const attack = alerts.AddSubSettings(this.AttackAlert, "Attack alert settings")

		this.AntiSpam = attack.AddSlider(
			"Anti-spam",
			30,
			0,
			120,
			0,
			"How long after an attack alert\nthe next one is held back, in seconds"
		)
		this.AntiSpam.Suffix = "s"
		this.AntiSpam.IconPath = TormentorIcons.AntiSpam

		this.NotifyMinimap = alerts.AddToggle(
			"Minimap alert",
			true,
			"Also pings the minimap and plays\na sound with every alert"
		)
		this.NotifyMinimap.IconPath = TormentorIcons.Alert

		MenuManager.Menu = this
	}

	/** The channel the alerts are announced on, or nothing while the row is on "Disable". */
	public get Channel(): Nullable<NotificationChannel> {
		return NotificationsSDK.ChannelOf(this.Notification)
	}

	/** Idempotent, as a config migration must be: a config already in the new shape is left alone. */
	private migrate(stored: Nullable<ConfigObject>) {
		if (stored === undefined) {
			return
		}
		NotificationsSDK.MigrateChannelRow(stored)
		MenuSDK.RenameStoredRow(stored, "Notify on minimap", "Minimap alert")

		// the rows stood on the page itself before it took a display and an alerts tab
		const display = () => ensureSubtree(stored, "Display")
		const alerts = () => ensureSubtree(stored, "Alerts")
		moveRow(stored, "State", display)
		moveRow(stored, "Format time", display)
		moveRow(stored, "Size in world", display)
		moveRow(stored, "Notification type", alerts)
		moveRow(stored, "Spawn alert", alerts)
		moveRow(stored, "Attack alert", alerts)
		moveRow(stored, "Minimap alert", alerts)
		moveRow(stored, "Before spawn", () =>
			ensureSubtree(alerts(), "Spawn alert settings")
		)
		moveRow(stored, "Anti-spam", () =>
			ensureSubtree(alerts(), "Attack alert settings")
		)
	}
}
