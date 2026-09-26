import { TormentorIcons } from "./icons"

/** The options the notification row lists, in the order it lists them. */
const channelNames = ["Game chat", "Side card", "Disable"]

/** The channel each option stands for, under the same index; "Disable" stands for none. */
const channelsOfOption: readonly Nullable<NotificationChannel>[] = [
	NotificationChannel.Chat,
	NotificationChannel.Side,
	undefined
]

export class MenuManager {
	public static Menu: MenuManager

	public readonly State: Menu.Toggle
	/** Where the alerts go: the game chat, a side card, or nowhere. */
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

	private readonly tree = Menu.AddEntry("Visual")
	private readonly node = this.tree.AddNode(
		"Tormentor",
		TormentorIcons.Tormentor,
		"Timer of the Tormentor,\nover its pit and on the minimap"
	)

	constructor() {
		this.node.SortNodes = false
		// the row renamed since the first release keeps its saved value
		this.migrate(this.node.entry.stored)
		MenuSDK.AddConfigMigration(raw =>
			this.migrate(MenuSDK.ConfigSubtreeOf(raw, this.node.entry))
		)

		// the script's own switch rides the top bar beside the breadcrumb and gates the page
		this.State = this.node.AddToggle("State", true)
		this.State.IconPath = TormentorIcons.State
		this.node.HeaderControl = this.State
		this.node.Gate = this.State

		this.Notification = this.node.AddDropdown(
			"Notification",
			[...channelNames],
			channelsOfOption.indexOf(NotificationChannel.Side),
			"Where the alerts go:\nthe game chat or a side card"
		)
		this.Notification.IconPath = TormentorIcons.Notification

		this.SpawnAlert = this.node.AddToggle(
			"Spawn alert",
			true,
			"Announces the Tormentor before it spawns\nand when it moves to the other side"
		)
		this.SpawnAlert.IconPath = TormentorIcons.SpawnAlert

		this.SpawnBefore = this.node.AddSlider(
			"Before spawn",
			20,
			3,
			120,
			0,
			"How long before the Tormentor spawns\nthe alert goes out, in seconds"
		)
		this.SpawnBefore.IconPath = TormentorIcons.SpawnBefore

		this.AttackAlert = this.node.AddToggle(
			"Attack alert",
			true,
			"Announces the moment someone starts\nhitting the Tormentor, and its death"
		)
		this.AttackAlert.IconPath = TormentorIcons.AttackAlert

		this.AntiSpam = this.node.AddSlider(
			"Anti-spam",
			30,
			0,
			120,
			0,
			"How long after an attack alert\nthe next one is held back, in seconds"
		)
		this.AntiSpam.IconPath = TormentorIcons.AntiSpam

		this.NotifyMinimap = this.node.AddToggle(
			"Minimap alert",
			true,
			"Also pings the minimap and plays\na sound with every alert"
		)
		this.NotifyMinimap.IconPath = TormentorIcons.Alert

		this.FormatTime = this.node.AddToggle(
			"Format time",
			true,
			"Show remaining\ntime as min:sec"
		)
		this.FormatTime.IconPath = TormentorIcons.FormatTime

		// the chip is drawn 1:1 at the middle of the range; the old 0-50 icon size does not carry over
		this.Size = this.node.AddSlider(
			"Size in world",
			4,
			0,
			8,
			0,
			"Size of the chip drawn over the pit"
		)
		this.Size.IconPath = TormentorIcons.Size

		// the slider of an alert that is off is nothing to set
		this.SpawnBefore.IsHidden = !this.SpawnAlert.value
		this.SpawnAlert.OnValue(call => {
			this.SpawnBefore.IsHidden = !call.value
		})
		this.AntiSpam.IsHidden = !this.AttackAlert.value
		this.AttackAlert.OnValue(call => {
			this.AntiSpam.IsHidden = !call.value
		})

		MenuManager.Menu = this
	}

	/** The channel the alerts are announced on, or nothing while the row is on "Disable". */
	public get Channel(): Nullable<NotificationChannel> {
		return channelsOfOption[this.Notification.SelectedID]
	}

	private migrate(stored: Nullable<MenuSDK.ConfigObject>) {
		MenuSDK.RenameStoredRow(stored, "Notify on minimap", "Minimap alert")
	}
}
