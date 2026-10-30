import GObject from 'gi://GObject';
import St from 'gi://St';

import type CopyousExtension from '../../extension.js';
import { SignalMethods, registerClass } from '../common/gjs.js';
import { InputChain } from '../common/inputChain.js';
import { createViewScrollView, forwardSelection } from '../common/viewUtils.js';
import { EmojiBottomBar } from './emojiBottomBar.js';
import { EmojiDataManager } from './emojiData.js';
import { EmojiSearchResults } from './emojiSearchResults.js';
import { EmojiSectionsContainer } from './emojiSectionsContainer.js';
import { EmojiToast } from './emojiToast.js';
import { EmojiTonePopup } from './emojiTonePopup.js';
import { DEFAULT_EMOJI_COLUMNS, EmojiCategory, calculateEmojiGridMetrics } from './emojiTypes.js';
import { setupEmojiBottomBar } from './emojiViewWiring.js';
import { RecentEmojisStore } from './recentEmojisStore.js';

const Signals = {
	'emoji-selected': { param_types: [GObject.TYPE_STRING] },
	'emoji-activated': { param_types: [GObject.TYPE_STRING] },
} as const;

@registerClass({ Signals })
export class EmojiView extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof Signals>['emit'];

	private readonly _dataManager: EmojiDataManager;
	private readonly _recentStore: RecentEmojisStore;
	private readonly _scrollView: St.ScrollView;
	private readonly _sectionsContainer: EmojiSectionsContainer;
	private readonly _searchResults: EmojiSearchResults;
	private readonly _bottomBar: EmojiBottomBar;
	private readonly _tonePopup: EmojiTonePopup;
	private readonly _toast: EmojiToast;
	private readonly _chain: InputChain = new InputChain();
	private _columns: number = DEFAULT_EMOJI_COLUMNS;
	private _spacing: number = 3;
	private _targetWidth: number = 0;

	constructor(ext: CopyousExtension) {
		super({ vertical: true, style_class: 'emoji-view', x_expand: true, y_expand: true });

		this._dataManager = new EmojiDataManager(ext);
		this._recentStore = new RecentEmojisStore();

		const [scrollView, contentBox] = createViewScrollView('emoji-scroll-view', 'emoji-content-box');
		this._scrollView = scrollView;
		this.add_child(this._scrollView);

		this._searchResults = new EmojiSearchResults();
		this._sectionsContainer = new EmojiSectionsContainer(this._dataManager, this._recentStore.getRecentRecords());
		forwardSelection(
			[this._searchResults, this._sectionsContainer],
			(e) => this._onEmoji(e, false),
			(e) => this._onEmoji(e, true),
			'emoji-selected',
			'emoji-activated',
			contentBox,
		);

		this._toast = new EmojiToast();
		this.add_child(this._toast);

		this._tonePopup = new EmojiTonePopup();
		this.add_child(this._tonePopup);

		this._bottomBar = new EmojiBottomBar();
		this.add_child(this._bottomBar);

		const savedTone = ext.settings.get_int('emoji-default-skin-tone');
		if (savedTone > 0) this._bottomBar.selectTone(savedTone);

		setupEmojiBottomBar(
			this._scrollView,
			this._tonePopup,
			this._bottomBar,
			this._sectionsContainer,
			this._recentStore,
			() => this._updateRecentSection(),
			(tone) => ext.settings.set_int('emoji-default-skin-tone', tone),
		);

		this._sectionsContainer.mountInitial(this._bottomBar.tone, this._columns, this._spacing);
	}

	override vfunc_get_preferred_width(forHeight: number): [number, number] {
		return this._targetWidth > 0
			? [this._targetWidth, this._targetWidth]
			: super.vfunc_get_preferred_width(forHeight);
	}

	setViewWidth(width: number): void {
		if (width <= 0) return;
		this._targetWidth = width;
		this.width = width;
		const metrics = calculateEmojiGridMetrics(width);
		this._columns = metrics.columns;
		this._spacing = metrics.spacing;
		this._sectionsContainer.updateGridMetrics(this._columns, this._spacing, this._bottomBar.tone);
		this.queue_relayout();
	}

	clearChain(): void {
		this._chain.clear();
	}

	activateFirst(): boolean {
		const target = this._chain.hasChain ? '' : this._searchResults.getFirstEmoji();
		if (target === null) return false;
		this._onEmoji(target, true);
		return true;
	}

	search(query: string): void {
		this._tonePopup.close();
		const trimmed = query.trim();
		this._sectionsContainer.visible = !trimmed;
		if (!trimmed) return this._searchResults.clear();
		const results = this._dataManager.searchEmojis(query);
		this._searchResults.setResults(results, this._bottomBar.tone, this._columns, this._spacing);
	}

	override vfunc_map(): void {
		super.vfunc_map();
		this._chain.clear();
		this._updateRecentSection();
		this._sectionsContainer.ensureCategoryMounted(EmojiCategory.Smileys, this._bottomBar.tone);
	}

	private _updateRecentSection(): void {
		const recents = this._recentStore.getRecentRecords();
		this._bottomBar.setRecentVisible(recents.length > 0);
		this._sectionsContainer.updateRecentRecords(recents, this._bottomBar.tone, this._columns, this._spacing);
	}

	private _onEmoji(emoji: string, activate: boolean): void {
		if (emoji) {
			this._recentStore.recordEmojiUsage(emoji);
			this._updateRecentSection();
		}
		if (activate) {
			this._toast.hideImmediate();
			this.emit('emoji-activated', this._chain.consume(emoji));
		} else {
			this._toast.showEmoji(this._chain.append(emoji));
			this.emit('emoji-selected', this._chain.current);
		}
	}
}
