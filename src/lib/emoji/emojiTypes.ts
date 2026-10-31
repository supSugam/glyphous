export enum EmojiCategory {
	Recent = 'recent',
	Smileys = 'smileys',
	People = 'people',
	Animals = 'animals',
	Food = 'food',
	Travel = 'travel',
	Activities = 'activities',
	Objects = 'objects',
	Symbols = 'symbols',
	Flags = 'flags',
}

export enum SkinTone {
	Default = 0,
	Light = 1,
	MediumLight = 2,
	Medium = 3,
	MediumDark = 4,
	Dark = 5,
}

export interface EmojiRecord {
	e: string;
	n: string;
	c: EmojiCategory;
	k: string[];
	s: (string | null)[] | null;
}

export interface CategoryDefinition {
	id: EmojiCategory;
	label: string;
	icon: string;
}

export const CATEGORY_DEFINITIONS: readonly CategoryDefinition[] = [
	{ id: EmojiCategory.Recent, label: _('Recent'), icon: 'emoji-recent-symbolic' },
	{ id: EmojiCategory.Smileys, label: _('Smileys & Emotion'), icon: 'emoji-people-symbolic' },
	{ id: EmojiCategory.People, label: _('People & Body'), icon: 'emoji-body-symbolic' },
	{ id: EmojiCategory.Animals, label: _('Animals & Nature'), icon: 'emoji-nature-symbolic' },
	{ id: EmojiCategory.Food, label: _('Food & Drink'), icon: 'emoji-food-symbolic' },
	{ id: EmojiCategory.Travel, label: _('Travel & Places'), icon: 'emoji-travel-symbolic' },
	{ id: EmojiCategory.Activities, label: _('Activities'), icon: 'emoji-activities-symbolic' },
	{ id: EmojiCategory.Objects, label: _('Objects'), icon: 'emoji-objects-symbolic' },
	{ id: EmojiCategory.Symbols, label: _('Symbols'), icon: 'emoji-symbols-symbolic' },
	{ id: EmojiCategory.Flags, label: _('Flags'), icon: 'emoji-flags-symbolic' },
] as const;

export const SKIN_TONE_SWATCHES = ['🟡', '🏻', '🏼', '🏽', '🏾', '🏿'] as const;

export const DEFAULT_EMOJI_COLUMNS = 9;

export interface GridMetrics {
	columns: number;
	spacing: number;
}

export function calculateEmojiColumns(containerWidth: number): number {
	const metrics = calculateEmojiGridMetrics(containerWidth);
	return metrics.columns;
}

export function calculateEmojiGridMetrics(containerWidth: number): GridMetrics {
	const availableWidth = Math.max(200, containerWidth - 30);
	const buttonSize = 36;
	const minSpacing = 3;
	const columns = Math.max(6, Math.floor((availableWidth + minSpacing) / (buttonSize + minSpacing)));
	const totalButtonWidth = columns * buttonSize;
	const spacing = Math.max(minSpacing, Math.floor((availableWidth - totalButtonWidth) / Math.max(1, columns - 1)));
	return { columns, spacing };
}

export function resolveEmoji(record: EmojiRecord, tone: SkinTone): string {
	if (tone === SkinTone.Default || !record.s) return record.e;
	return record.s[tone - 1] ?? record.e;
}

const EMOJI_PATTERN = /^[\p{Extended_Pictographic}\uFE0F\u200D\p{Emoji_Modifier}\p{Regional_Indicator}]+$/u;

export function isEmoji(text: string): boolean {
	const trimmed = text.trim();
	if (!trimmed) return false;
	if (trimmed.length === 1 && trimmed.charCodeAt(0) <= 0x00ff) return false;
	return EMOJI_PATTERN.test(trimmed);
}
