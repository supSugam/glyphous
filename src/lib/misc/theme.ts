import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import CopyousExtension from '../../extension.js';
import { enumParamSpec, registerClass } from '../common/gjs.js';
import { ColorScheme, CustomColorScheme, Theme, ThemeSettings } from '../common/settings.js';
import { buildDynamicThemeStylesheet } from './themeBuilder.js';

@registerClass({
	Properties: {
		'color-scheme': enumParamSpec(
			'color-scheme',
			GObject.ParamFlags.READABLE,
			CustomColorScheme,
			CustomColorScheme.Dark,
		),
	},
})
export class ThemeManager extends GObject.Object {
	private readonly _resource: Gio.Resource;
	private readonly _themeSettings: ThemeSettings;
	private readonly _settings: St.Settings;
	private readonly _interfaceSettings: Gio.Settings | null = null;
	private readonly _settingsIds: number[];
	private readonly _interfaceAccentChangedId: number = -1;
	private readonly _themeChangedId: number;

	private _stylesheet: Gio.File | null = null;
	private _colorScheme: CustomColorScheme = CustomColorScheme.Dark;
	private _isUpdatingTheme = false;

	constructor(private ext: CopyousExtension) {
		super();

		this._resource = Gio.resource_load(`${this.ext.path}/theme.gresource`);
		Gio.resources_register(this._resource);

		this._themeSettings = this.ext.settings.get_child('theme');
		this._themeSettings.connectObject('changed', this.updateTheme.bind(this), this);

		this._settings = St.Settings.get();

		const onTheme = () => {
			if (!this._isUpdatingTheme) this.updateTheme().catch(() => {});
		};

		this._settingsIds = ['notify::high-contrast', 'notify::color-scheme', 'notify::accent-color'].map((signal) =>
			this._settings.connect(signal, onTheme),
		);

		try {
			this._interfaceSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
			this._interfaceAccentChangedId = this._interfaceSettings.connect('changed::accent-color', onTheme);
		} catch {
			this._interfaceSettings = null;
		}

		this._themeChangedId = this.themeContext.connect('changed', onTheme);

		this.updateTheme().catch(() => {});
	}

	private get themeContext(): St.ThemeContext {
		return St.ThemeContext.get_for_stage(global.stage);
	}

	private get theme(): St.Theme {
		return this.themeContext.get_theme();
	}

	get colorScheme(): CustomColorScheme {
		return this._colorScheme;
	}

	private set colorScheme(scheme: CustomColorScheme) {
		if (scheme === this._colorScheme) return;
		this._colorScheme = scheme;
		this.notify('color-scheme');
	}

	destroy() {
		if (this._stylesheet) this.theme.unload_stylesheet(this._stylesheet);
		this._stylesheet = null;
		Gio.resources_unregister(this._resource);
		this._themeSettings.disconnectObject(this);
		this._settingsIds.forEach((id) => this._settings.disconnect(id));
		if (this._interfaceSettings && this._interfaceAccentChangedId >= 0) {
			this._interfaceSettings.disconnect(this._interfaceAccentChangedId);
		}
		this.themeContext.disconnect(this._themeChangedId);
	}

	private resolveColorScheme(theme: Theme): CustomColorScheme | 'high-contrast' {
		if (theme === Theme.Custom) return this._themeSettings.get_enum('custom-color-scheme');
		const colorScheme = this._themeSettings.get_enum('color-scheme');
		if (colorScheme === ColorScheme.System) {
			if (this._settings.high_contrast) return 'high-contrast';
			return Main.getStyleVariant() === 'light' ? CustomColorScheme.Light : CustomColorScheme.Dark;
		}
		return (colorScheme - 1) as CustomColorScheme;
	}

	private loadStylesheet(stylesheet: Gio.File, force = false) {
		if (!force && this._stylesheet?.equal(stylesheet)) return;
		if (this._stylesheet) this.theme.unload_stylesheet(this._stylesheet);
		this.theme.load_stylesheet(stylesheet);
		this._stylesheet = stylesheet;
	}

	private async updateTheme() {
		if (this._isUpdatingTheme) return;
		this._isUpdatingTheme = true;

		try {
			const theme = this._themeSettings.get_enum('theme');
			const scheme = this.resolveColorScheme(theme);
			if (scheme !== 'high-contrast') this.colorScheme = scheme;

			if (scheme === 'high-contrast') {
				const themeName = theme === Theme.Yaru ? 'yaru' : 'default';
				const uri = `resource:///org/gnome/shell/extensions/glyphous/css/stylesheet-${themeName}-high-contrast.css`;
				this.loadStylesheet(Gio.File.new_for_uri(uri));
				return;
			}

			const variant = scheme === CustomColorScheme.Light ? 'light' : 'dark';

			if (theme === Theme.Yaru) {
				const uri = `resource:///org/gnome/shell/extensions/glyphous/css/stylesheet-yaru-${variant}.css`;
				this.loadStylesheet(Gio.File.new_for_uri(uri));
				return;
			}

			const stylesheet = await buildDynamicThemeStylesheet(
				this.ext,
				this._themeSettings,
				variant,
				theme === Theme.Custom,
			);
			this.loadStylesheet(stylesheet, true);
		} catch (error) {
			this.ext.logger.error(error);
		} finally {
			this._isUpdatingTheme = false;
		}
	}
}
