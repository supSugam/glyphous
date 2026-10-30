import Gio from 'gi://Gio';

import CopyousExtension from '../../extension.js';
import { getDataPath } from '../common/constants.js';
import { ThemeSettings } from '../common/settings.js';
import { detectThemeColors } from './themeDetector.js';

Gio._promisify(Gio.File.prototype, 'load_contents_async');
Gio._promisify(Gio.File.prototype, 'replace_contents_async');

export async function buildDynamicThemeStylesheet(
	extension: CopyousExtension,
	themeSettings: ThemeSettings,
	variant: 'dark' | 'light',
	isCustom: boolean,
): Promise<Gio.File> {
	const uri = `resource:///org/gnome/shell/extensions/glyphous/css/template-${variant}.css`;
	const template = Gio.File.new_for_uri(uri);
	const [contents] = await template.load_contents_async(null);
	const text = new TextDecoder().decode(contents);

	const detected = detectThemeColors(variant === 'light');
	const backgroundColor = (isCustom ? themeSettings.get_string('custom-bg-color') : '') || detected.backgroundColor;
	const foregroundColor = (isCustom ? themeSettings.get_string('custom-fg-color') : '') || detected.foregroundColor;
	const cardBackgroundColor =
		(isCustom ? themeSettings.get_string('custom-card-bg-color') : '') || detected.cardBackgroundColor;
	const searchBackgroundColor =
		(isCustom ? themeSettings.get_string('custom-search-bg-color') : '') || detected.searchBackgroundColor;

	const css = text
		.replaceAll('$bg_color', backgroundColor)
		.replaceAll('$fg_color', foregroundColor)
		.replaceAll('$card_bg_color', cardBackgroundColor)
		.replaceAll('$search_bg_color', searchBackgroundColor)
		.replaceAll('$accent_color', detected.accentColor)
		.replaceAll('$accent_fg_color', detected.accentForegroundColor)
		.replaceAll('-st-accent-color', detected.accentColor)
		.replaceAll('-st-accent-fg-color', detected.accentForegroundColor);

	const stylesheet = getDataPath(extension).get_child('active-theme.css');
	const parentDir = stylesheet.get_parent();
	if (parentDir && !parentDir.query_exists(null)) {
		parentDir.make_directory_with_parents(null);
	}
	await stylesheet.replace_contents_async(
		new TextEncoder().encode(css),
		null,
		false,
		Gio.FileCreateFlags.REPLACE_DESTINATION,
		null,
	);

	return stylesheet;
}
