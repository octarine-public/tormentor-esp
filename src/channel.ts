/** The name of a notification row, the one Settings → Notifications gives its own. */
const ROW_NAME = "Notification type"

/** The options a notification row lists, in the order it lists them. */
const channelNames = ["As in settings", "Game chat", "Side card"]

/**
 * The channel each option stands for, under the same index: "As in settings" takes the one
 * picked under Settings → Notifications at the moment the notice goes out.
 */
const channelsOfOption: readonly (() => NotificationChannel)[] = [
	() => NotificationsSDK.DefaultChannel,
	() => NotificationChannel.Chat,
	() => NotificationChannel.Side
]

/**
 * Declares the notification row of a feature: where its notice goes, the game chat unless picked
 * otherwise. A feature with no switch of its own over the notice asks for the "Disable" option
 * and turns the notice off from here.
 * @example
 * this.NotificationType = CreateChannelSelect(this.node, true)
 */
export function CreateChannelSelect(
	node: Menu.Node,
	canDisable = false,
	tooltip = "Where to notify: as picked in Settings,\nthe game chat or a side card"
): Menu.Dropdown {
	const row = node.AddDropdown(
		ROW_NAME,
		canDisable ? [...channelNames, "Disable"] : [...channelNames],
		channelNames.indexOf("Game chat"),
		tooltip
	)
	row.IconPath = Menu.Icons.Type
	return row
}

/** The channel the row is left on, or nothing while it is on "Disable". */
export function ChannelOf(row: Menu.Dropdown): Nullable<NotificationChannel> {
	return channelsOfOption[row.SelectedID]?.()
}

/**
 * Carries a notification row saved under its old name, over the options "Game chat", "Side
 * card" and maybe "Disable", to {@link ROW_NAME}, whose list opens with "As in settings": the
 * saved index moves one down to stay on the option it was on. Idempotent: a config already
 * holding the new row keeps it, and the old key is dropped either way.
 */
export function MigrateChannelRow(
	node: Nullable<MenuSDK.ConfigObject>,
	from = "Notification"
): void {
	const saved = node?.[from]
	if (node === undefined || saved === undefined) {
		return
	}
	delete node[from]
	if (node[ROW_NAME] !== undefined) {
		return
	}
	if (typeof saved === "number") {
		node[ROW_NAME] = saved + 1
		return
	}
	const holder =
		typeof saved === "object" && saved !== null && !Array.isArray(saved)
			? (saved as MenuSDK.ConfigObject)
			: undefined
	if (holder !== undefined && typeof holder.v === "number") {
		// the hotkeys and logic rules hold the names of the options, and those stay
		node[ROW_NAME] = { ...holder, v: holder.v + 1 }
	}
}
