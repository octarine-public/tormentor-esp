import { Menu } from "github.com/octarine-public/wrapper/index"

export class MenuManager {
	public readonly State: Menu.Toggle
	public readonly IconSize: Menu.Slider
	public readonly ModeImage: Menu.Dropdown
	public readonly NotifyMinimap: Menu.Toggle

	private readonly basePath = "github.com/octarine-public/tormentor-esp/scripts_files/"
	private readonly icon = this.basePath + "icons/tormentor.svg"

	private readonly tree = Menu.AddEntry("Visual")
	private readonly node = this.tree.AddNode("Tormentor", this.icon)

	constructor() {
		this.node.SortNodes = false
		this.State = this.node.AddToggle("State", true)
		this.NotifyMinimap = this.node.AddToggle("Notify on minimap", true)

		this.IconSize = this.node.AddSlider("Icon size", 0, 0, 50)
		this.ModeImage = this.node.AddDropdown("Mode images", ["Circle", "Square"])
	}
}
