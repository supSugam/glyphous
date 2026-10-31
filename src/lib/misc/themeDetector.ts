import Cogl from 'gi://Cogl';
import Gio from 'gi://Gio';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export interface ThemeColors {
	accentColor: string;
	accentForegroundColor: string;
	backgroundColor: string;
	foregroundColor: string;
	cardBackgroundColor: string;
	searchBackgroundColor: string;
}

const GNOME_ACCENT_COLORS: Record<string, string> = {
	blue: 'rgb(53,132,228)',
	teal: 'rgb(33,144,164)',
	green: 'rgb(58,148,74)',
	yellow: 'rgb(200,136,0)',
	orange: 'rgb(237,91,0)',
	red: 'rgb(230,45,66)',
	pink: 'rgb(213,97,153)',
	purple: 'rgb(145,65,172)',
	slate: 'rgb(111,131,150)',
};

function formatColor(color: Cogl.Color): string {
	if (color.alpha === 255) return `rgb(${color.red},${color.green},${color.blue})`;
	return `rgba(${color.red},${color.green},${color.blue},${(color.alpha / 255).toFixed(2)})`;
}

function getDesktopAccentColor(): string | null {
	try {
		const settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
		const accent = settings.get_string('accent-color');
		if (accent && GNOME_ACCENT_COLORS[accent]) return GNOME_ACCENT_COLORS[accent];
		if (accent?.startsWith('#')) return accent;
	} catch {
		// Schema or key may not exist on older GNOME versions
	}
	return null;
}

function detectAccentColors(): [string, string] {
	// Priority 1: Read -st-accent-color directly from the active shell theme's root node.
	// This is defined by themes like MeowterialYou-dark in their `stage {}` block and is
	// always more accurate than the GSettings accent-color key, which Ubuntu hardcodes to
	// 'orange' even when a custom theme is active.
	const context = St.ThemeContext.get_for_stage(global.stage);
	const rootNode = context.get_root_node();

	if (rootNode) {
		const [hasStageAccent, stageAccent] = rootNode.lookup_color('-st-accent-color', false);
		const [hasStageAccentFg, stageAccentFg] = rootNode.lookup_color('-st-accent-fg-color', false);

		if (hasStageAccent && stageAccent.alpha > 0) {
			const accent = formatColor(stageAccent);
			const accentForeground =
				hasStageAccentFg && stageAccentFg.alpha > 0 ? formatColor(stageAccentFg) : 'rgb(255,255,255)';
			return [accent, accentForeground];
		}
	}

	// Priority 2: Read checked background from a quick-toggle widget, which reflects the
	// shell theme's :checked accent. toggle_mode must be true for checked: true to apply
	// the :checked pseudo-class in the theme node.
	const toggleButton = new St.Button({
		style_class: 'quick-toggle',
		toggle_mode: true,
		checked: true,
		visible: false,
	});
	Main.uiGroup.add_child(toggleButton);
	const toggleNode = toggleButton.get_theme_node();
	const toggleBackground = toggleNode.get_background_color();
	const toggleForeground = toggleNode.get_foreground_color();
	toggleButton.destroy();

	if (toggleBackground.alpha > 0) {
		const accent = formatColor(toggleBackground);
		const accentForeground = toggleForeground.alpha > 0 ? formatColor(toggleForeground) : 'rgb(255,255,255)';
		return [accent, accentForeground];
	}

	// Priority 3: GNOME's native accent color API (GNOME 45+).
	const [systemAccent, systemAccentFg] = context.get_accent_color ? context.get_accent_color() : [null, null];
	if (systemAccent) {
		return [formatColor(systemAccent), systemAccentFg ? formatColor(systemAccentFg) : 'rgb(255,255,255)'];
	}

	// Priority 4: GSettings accent-color key. Only used as a last resort because Ubuntu
	// keeps this set to 'orange' even when a custom shell theme is active.
	const desktopAccent = getDesktopAccentColor();
	if (desktopAccent) return [desktopAccent, 'rgb(255,255,255)'];

	return ['rgb(53,132,228)', 'rgb(255,255,255)'];
}

function getWidgetNode(style_class: string): St.ThemeNode | null {
	const widget = new St.Widget({ style_class, visible: false });
	Main.uiGroup.add_child(widget);
	const node = widget.get_theme_node();
	widget.destroy();
	return node;
}

function detectDialogColors(isLight: boolean): [string, string] {
	const node = getWidgetNode('modal-dialog');
	const bg = node?.get_background_color();
	const fg = node?.get_foreground_color();
	const defBg = isLight ? 'rgb(250,250,251)' : 'rgb(54,54,58)';
	const defFg = isLight ? 'rgb(34,34,38)' : 'rgb(255,255,255)';
	return [bg && bg.alpha > 0 ? formatColor(bg) : defBg, fg && fg.alpha > 0 ? formatColor(fg) : defFg];
}

function detectCardBackgroundColor(isLight: boolean): string {
	for (const cls of ['popup-menu-content', 'card']) {
		const bg = getWidgetNode(cls)?.get_background_color();
		if (bg && bg.alpha > 0) return formatColor(bg);
	}
	return isLight ? 'rgb(255,255,255)' : 'rgb(71,71,76)';
}

export function detectThemeColors(isLight: boolean): ThemeColors {
	const [accentColor, accentForegroundColor] = detectAccentColors();
	const [backgroundColor, foregroundColor] = detectDialogColors(isLight);
	const cardBackgroundColor = detectCardBackgroundColor(isLight);

	return {
		accentColor,
		accentForegroundColor,
		backgroundColor,
		foregroundColor,
		cardBackgroundColor,
		searchBackgroundColor: cardBackgroundColor,
	};
}
