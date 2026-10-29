const layer = MenuSDK.EPanelLayer.World

/**
 * The surface the chip in the world is drawn on: the card the menu's own panels wear, which
 * {@link MenuSDK.HudCard.Frame} only draws onto an active surface.
 */
export const surface = MenuSDK.HudSurfaceOf("tormentor-esp", layer)
/**
 * The waves of a hit on the minimap. They are drawn in the Draw2D pass and held between its runs,
 * while the chip in the world is drawn every frame, so the two cannot share a surface.
 */
export const minimapCanvas = new MenuSDK.Canvas("tormentor-esp-minimap", layer)
