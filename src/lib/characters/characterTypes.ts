import { Icon } from '../common/icons.js';

export enum CharacterCategory {
	Recent = 'recent',
	Punctuation = 'punctuation',
	Arrows = 'arrows',
	Currency = 'currency',
	Math = 'math',
	Fractions = 'fractions',
	Shapes = 'shapes',
	Latin = 'latin',
	Greek = 'greek',
}

export interface CharacterRecord {
	ch: string;
	n: string;
	c: CharacterCategory;
	k: string[];
}

export interface CharacterCategoryDefinition {
	id: CharacterCategory;
	label: string;
	icon: Icon;
}

export const CHARACTER_CATEGORY_DEFINITIONS: readonly CharacterCategoryDefinition[] = [
	{ id: CharacterCategory.Recent, label: _('Recent'), icon: Icon.Recent },
	{ id: CharacterCategory.Punctuation, label: _('Punctuation'), icon: Icon.CategoryPunctuation },
	{ id: CharacterCategory.Arrows, label: _('Arrows'), icon: Icon.CategoryArrow },
	{ id: CharacterCategory.Currency, label: _('Currency'), icon: Icon.CategoryCurrency },
	{ id: CharacterCategory.Math, label: _('Math'), icon: Icon.CategoryMath },
	{ id: CharacterCategory.Fractions, label: _('Fractions & Numbers'), icon: Icon.CategoryFraction },
	{ id: CharacterCategory.Shapes, label: _('Shapes & Bullets'), icon: Icon.CategoryBullet },
	{ id: CharacterCategory.Latin, label: _('Latin & Accents'), icon: Icon.CategoryLatin },
	{ id: CharacterCategory.Greek, label: _('Greek & Technical'), icon: Icon.CategoryGreek },
] as const;

export const DEFAULT_CHARACTER_COLUMNS = 9;

export interface GridMetrics {
	columns: number;
	spacing: number;
}

export function calculateGridMetrics(containerWidth: number): GridMetrics {
	const availableWidth = Math.max(200, containerWidth - 30);
	const buttonSize = 36;
	const minSpacing = 3;
	const columns = Math.max(6, Math.floor((availableWidth + minSpacing) / (buttonSize + minSpacing)));
	const totalButtonWidth = columns * buttonSize;
	const spacing = Math.max(minSpacing, Math.floor((availableWidth - totalButtonWidth) / Math.max(1, columns - 1)));
	return { columns, spacing };
}
