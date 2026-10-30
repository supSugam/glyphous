import Cogl from 'gi://Cogl';
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

function formatColor(color: Cogl.Color): string {
	if (color.alpha === 255) {
		return `rgb(${color.red},${color.green},${color.blue})`;
	}
	const normalizedAlpha = (color.alpha / 255).toFixed(2);
	return `rgba(${color.red},${color.green},${color.blue},${normalizedAlpha})`;
}

function detectAccentColors(): [string, string] {
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

	const toggleButton = new St.Button({
		style_class: 'quick-toggle',
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

	const [systemAccent, systemAccentFg] = context.get_accent_color ? context.get_accent_color() : [null, null];
	const accent = systemAccent ? formatColor(systemAccent) : 'rgb(53,132,228)';
	const accentForeground = systemAccentFg ? formatColor(systemAccentFg) : 'rgb(255,255,255)';
	return [accent, accentForeground];
}

function detectDialogColors(isLight: boolean): [string, string] {
	const dialogWidget = new St.Widget({
		style_class: 'modal-dialog',
		visible: false,
	});
	Main.uiGroup.add_child(dialogWidget);
	const dialogNode = dialogWidget.get_theme_node();
	const dialogBackground = dialogNode?.get_background_color();
	const dialogForeground = dialogNode?.get_foreground_color();
	dialogWidget.destroy();

	const defaultBackground = isLight ? 'rgb(250,250,251)' : 'rgb(54,54,58)';
	const defaultForeground = isLight ? 'rgb(34,34,38)' : 'rgb(255,255,255)';

	const background =
		dialogBackground && dialogBackground.alpha > 0 ? formatColor(dialogBackground) : defaultBackground;
	const foreground =
		dialogForeground && dialogForeground.alpha > 0 ? formatColor(dialogForeground) : defaultForeground;

	return [background, foreground];
}

function detectCardBackgroundColor(isLight: boolean): string {
	const popupWidget = new St.Widget({
		style_class: 'popup-menu-content',
		visible: false,
	});
	Main.uiGroup.add_child(popupWidget);
	const popupNode = popupWidget.get_theme_node();
	const popupBackground = popupNode?.get_background_color();
	popupWidget.destroy();

	if (popupBackground && popupBackground.alpha > 0) {
		return formatColor(popupBackground);
	}

	const cardWidget = new St.Widget({
		style_class: 'card',
		visible: false,
	});
	Main.uiGroup.add_child(cardWidget);
	const cardNode = cardWidget.get_theme_node();
	const cardBackground = cardNode?.get_background_color();
	cardWidget.destroy();

	if (cardBackground && cardBackground.alpha > 0) {
		return formatColor(cardBackground);
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
