import { Paths } from "./paths"

/** The Visual page the objects on the map share; every script of the group builds it by this name. */
const GroupName = "Map objects"

function configObject(value: unknown): Nullable<MenuSDK.ConfigObject> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as MenuSDK.ConfigObject)
		: undefined
}

/**
 * Carries a page saved straight under Visual into the group. Idempotent, as a config migration
 * must be: a config already holding the page in the group keeps it, and the old key goes either way.
 */
function moveIntoGroup(visual: Nullable<MenuSDK.ConfigObject>, name: string): void {
	const saved = visual?.[name]
	if (visual === undefined || saved === undefined) {
		return
	}
	const group = configObject(visual[GroupName]) ?? {}
	if (group[name] === undefined) {
		group[name] = saved
	}
	visual[GroupName] = group
	delete visual[name]
}

/**
 * This script's page as a tab of the Map objects group under Visual. The page used to stand on
 * Visual itself: what it saved there is carried over both in a config applied later and in the one
 * already applied when the script starts. Tabs of a lower priority stand further left, ties go by name.
 */
export function AddMapObjectsPage(
	name: string,
	iconPath: string,
	tooltip: string,
	priority = 0
): Menu.Node {
	const visual = Menu.AddEntry("Visual")
	moveIntoGroup(visual.entry.stored, name)
	MenuSDK.AddConfigMigration(raw => moveIntoGroup(configObject(raw.Visual), name))

	const group = visual.AddNode(
		GroupName,
		`${Paths.Icons}/map.svg`,
		"Timers of the objects on the map"
	)
	group.TabbedChildren = true

	// a group another script built first took its copy of the saved rows before this page moved in
	const saved = configObject(visual.entry.stored?.[GroupName])?.[name]
	if (saved !== undefined && group.entry.stored?.[name] === undefined) {
		group.entry.stored = { ...group.entry.stored, [name]: saved }
	}
	return group.AddNode(name, iconPath, tooltip, -1, priority)
}
