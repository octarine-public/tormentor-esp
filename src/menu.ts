import { Menu } from "github.com/octarine-public/wrapper/index"

export class MenuManager {
	public readonly State: Menu.Toggle
	public readonly IconSize: Menu.Slider
	public readonly ModeImage: Menu.Dropdown

	private readonly tree = Menu.AddEntry("Visual")
	private readonly node = this.tree.AddNode("Tormentor ESP")

	constructor() {
		this.node.SortNodes = false
		this.State = this.node.AddToggle("State", true)
		this.IconSize = this.node.AddSlider("Icon size", 0, 0, 50)
		this.ModeImage = this.tree.AddDropdown("Mode images", ["Circle", "Square"])
	}
}
