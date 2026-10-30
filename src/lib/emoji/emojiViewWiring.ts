import St from 'gi://St';

import { EmojiBottomBar } from './emojiBottomBar.js';
import { EmojiScrollSpy } from './emojiScrollSpy.js';
import { EmojiSectionsContainer } from './emojiSectionsContainer.js';
import { EmojiTonePopup } from './emojiTonePopup.js';
import { EmojiCategory } from './emojiTypes.js';
import { RecentEmojisStore } from './recentEmojisStore.js';

export function setupEmojiBottomBar(
	scrollView: St.ScrollView,
	tonePopup: EmojiTonePopup,
	bottomBar: EmojiBottomBar,
	sectionsContainer: EmojiSectionsContainer,
	recentStore: RecentEmojisStore,
	onRecentCleared?: () => void,
	onToneChanged?: (tone: number) => void,
): EmojiScrollSpy {
	tonePopup.connect('tone-selected', (_actor, tone: number) => bottomBar.selectTone(tone));

	const scrollSpy = new EmojiScrollSpy(scrollView, sectionsContainer.sections, bottomBar.categoryBar);
	scrollView.vadjustment.connect('notify::value', () => {
		if (sectionsContainer.visible) scrollSpy.onScroll();
	});

	bottomBar.setRecentVisible(recentStore.hasRecents);
	bottomBar.connect('category-selected', (_actor, cat: string) => {
		tonePopup.close();
		sectionsContainer.ensureCategoryMounted(cat as EmojiCategory, bottomBar.tone);
		scrollSpy.scrollToCategory(cat as EmojiCategory);
	});
	bottomBar.connect('toggle-popup', () => tonePopup.toggle());
	bottomBar.connect('tone-changed', (_actor, tone: number) => {
		sectionsContainer.updateSkinTone(tone);
		onToneChanged?.(tone);
	});

	sectionsContainer.connect('clear-recents', () => {
		recentStore.clear();
		onRecentCleared?.();
	});

	return scrollSpy;
}
