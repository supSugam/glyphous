import St from 'gi://St';

import { CharacterBottomBar } from './characterBottomBar.js';
import { CharacterScrollSpy } from './characterScrollSpy.js';
import { CharacterSectionsContainer } from './characterSectionsContainer.js';
import { CharacterCategory } from './characterTypes.js';
import { RecentCharactersStore } from './recentCharactersStore.js';

export function setupCharacterBottomBar(
	scrollView: St.ScrollView,
	bottomBar: CharacterBottomBar,
	sectionsContainer: CharacterSectionsContainer,
	recentStore: RecentCharactersStore,
	onRecentCleared?: () => void,
): CharacterScrollSpy {
	const scrollSpy = new CharacterScrollSpy(scrollView, sectionsContainer.sections, bottomBar.categoryBar);
	scrollView.vadjustment.connect('notify::value', () => {
		if (sectionsContainer.visible) scrollSpy.onScroll();
	});

	bottomBar.setRecentVisible(recentStore.hasRecents);
	bottomBar.connect('category-selected', (_actor, cat: string) => {
		sectionsContainer.ensureCategoryMounted(cat as CharacterCategory);
		scrollSpy.scrollToCategory(cat as CharacterCategory);
	});

	sectionsContainer.connect('clear-recents', () => {
		recentStore.clear();
		onRecentCleared?.();
	});

	return scrollSpy;
}
