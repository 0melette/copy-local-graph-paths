import { Plugin, Notice, PluginSettingTab, App, Setting } from "obsidian";

interface CopyLocalGraphPathsSettings {
	basePath: string;
	outputFormat: "newline" | "semicolon";
	excludedFolders: string;
}

const DEFAULT_SETTINGS: CopyLocalGraphPathsSettings = {
	basePath: "",
	outputFormat: "newline",
	excludedFolders: "",
};

export default class CopyLocalGraphPathsPlugin extends Plugin {
	settings: CopyLocalGraphPathsSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "copy-local-graph-paths",
			name: "Copy local graph file paths",
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "K" }],
			callback: async () => {
				await this.copyLocalGraphPaths();
			},
		});

		this.addSettingTab(new CopyLocalGraphPathsSettingTab(this.app, this));
	}

	async copyLocalGraphPaths() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active file.");
			return;
		}

		if (!this.settings.basePath) {
			new Notice(
				"Base path is not set. Please set it in the plugin settings."
			);
			return;
		}

		const linkedFiles = new Set<string>();
		const metadataCache = this.app.metadataCache;
		const fileCache = metadataCache.getCache(activeFile.path);

		const excludedFolders = this.settings.excludedFolders
			? this.settings.excludedFolders
					.split(",")
					.map((f) => f.trim())
					.filter((f) => f.length > 0)
			: [];

		if (fileCache?.links) {
			for (const link of fileCache.links) {
				const resolvedPath = metadataCache.getFirstLinkpathDest(
					link.link,
					activeFile.path
				);

				if (resolvedPath) {
					const fullPath = `${this.settings.basePath}/${resolvedPath.path}`;

					if (
						excludedFolders.length > 0 &&
						excludedFolders.some((folder) =>
							fullPath.includes(folder)
						)
					) {
						continue;
					}

					linkedFiles.add(fullPath);
				}
			}
		}

		if (linkedFiles.size === 0) {
			new Notice("No linked files found.");
			return;
		}

		const pathsString = Array.from(linkedFiles).join(
			this.settings.outputFormat === "semicolon" ? ";" : "\n"
		);

		await navigator.clipboard.writeText(pathsString);
		new Notice("Copied local graph file paths to clipboard!");
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class CopyLocalGraphPathsSettingTab extends PluginSettingTab {
	plugin: CopyLocalGraphPathsPlugin;

	constructor(app: App, plugin: CopyLocalGraphPathsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Base Path")
			.setDesc("The base path that will be prepended to all file paths.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.basePath)
					.onChange(async (value) => {
						this.plugin.settings.basePath = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Output Format")
			.setDesc(
				"Choose how the file paths should be separated when copied."
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("newline", "Newline-separated")
					.addOption("semicolon", "Semicolon-separated")
					.setValue(this.plugin.settings.outputFormat)
					.onChange(async (value) => {
						this.plugin.settings.outputFormat = value as
							| "newline"
							| "semicolon";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Excluded Folders")
			.setDesc("Comma-separated list of folders to ignore.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.excludedFolders)
					.onChange(async (value) => {
						this.plugin.settings.excludedFolders = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
