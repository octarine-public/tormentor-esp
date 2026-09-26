/** The key the canvas and the surface under it share, which is what makes them the same one. */
const key = "tormentor-esp"
const layer = MenuSDK.EPanelLayer.World

export const canvas = new MenuSDK.Canvas(key, layer)
/**
 * The surface the canvas draws on, for what the canvas has no call of its own for: the card the
 * menu's own panels wear, which {@link MenuSDK.HudCard.Frame} only draws onto an active surface.
 */
export const surface = MenuSDK.HudSurfaceOf(key, layer)
