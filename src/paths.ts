/** Root the loader mounts this package at: a spelled-out repository path does not resolve. */
const base = __OCT_PACKAGE_ROOT__
const files = `${base}/scripts_files`

export const Paths = {
	Base: base,
	Files: files,
	Icons: `${files}/menu/icons`
} as const
