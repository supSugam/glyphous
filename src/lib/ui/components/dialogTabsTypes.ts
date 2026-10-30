import { Icon } from '../../common/icons.js';

export enum DialogTab {
	Clipboard = 'clipboard',
	Emoji = 'emoji',
	Characters = 'characters',
}

export const TAB_DEFINITIONS = [
	{ tab: DialogTab.Clipboard, icon: Icon.Clipboard },
	{ tab: DialogTab.Emoji, icon: Icon.Emoji },
	{ tab: DialogTab.Characters, icon: Icon.Character },
] as const;
