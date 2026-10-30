import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import CopyousExtension from '../../../extension.js';
import { SignalMethods, registerClass } from '../../common/gjs.js';
import { Icon, loadIcon } from '../../common/icons.js';
import { DialogTab, TAB_DEFINITIONS } from './dialogTabsTypes.js';
import { DialogTabsUtilityBox } from './dialogTabsUtilityBox.js';
import { IndicatorTrack } from './indicatorTrack.js';

export { DialogTab };

const DialogTabBarSignals = {
	'tab-selected': {
		param_types: [GObject.TYPE_STRING],
	},
	'open-settings': {},
} as const;

@registerClass({
	Signals: DialogTabBarSignals,
})
export class DialogTabBar extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof DialogTabBarSignals>['emit'];

	private readonly _buttonsBox: St.BoxLayout;
	private readonly _indicatorTrack: IndicatorTrack;
	private readonly _utilityBox: DialogTabsUtilityBox;
	private readonly _tabButtons: Map<DialogTab, St.Button> = new Map();

	private _selectedTab: DialogTab = DialogTab.Clipboard;

	constructor(private readonly _ext: CopyousExtension) {
		super({
			style_class: 'win-tab-bar',
			orientation: Clutter.Orientation.HORIZONTAL,
			x_expand: true,
		});

		const tabsTrack = new St.BoxLayout({
			vertical: true,
			style_class: 'win-tabs-track',
		});
		this.add_child(tabsTrack);

		this._buttonsBox = new St.BoxLayout({ style_class: 'win-tabs-buttons' });
		tabsTrack.add_child(this._buttonsBox);

		this._indicatorTrack = new IndicatorTrack();
		tabsTrack.add_child(this._indicatorTrack);

		for (const { tab, icon } of TAB_DEFINITIONS) this._createTabButton(tab, icon);

		this.add_child(new St.Widget({ x_expand: true }));

		this._utilityBox = new DialogTabsUtilityBox(this._ext);
		this._utilityBox.connect('open-settings', () => this.emit('open-settings'));
		this.add_child(this._utilityBox);

		this._buttonsBox.connect('notify::allocation', () => this.updateIndicatorPosition(false));
		this.selectTab(DialogTab.Clipboard, false);

		this._ext.settings.connectObject(
			'changed::enable-emoji-tab',
			() => this.updateTabsVisibility(),
			'changed::enable-characters-tab',
			() => this.updateTabsVisibility(),
			this,
		);
		this.updateTabsVisibility();
	}

	override destroy(): void {
		this._ext.settings.disconnectObject(this);
		super.destroy();
	}

	updateTabsVisibility(): void {
		const enableEmoji = this._ext.settings.get_boolean('enable-emoji-tab');
		const enableCharacters = this._ext.settings.get_boolean('enable-characters-tab');

		this._tabButtons.get(DialogTab.Emoji)?.set({ visible: enableEmoji });
		this._tabButtons.get(DialogTab.Characters)?.set({ visible: enableCharacters });
		this.visible = enableEmoji || enableCharacters;

		if (!enableEmoji && this._selectedTab === DialogTab.Emoji) {
			this.selectTab(DialogTab.Clipboard);
		} else if (!enableCharacters && this._selectedTab === DialogTab.Characters) {
			this.selectTab(DialogTab.Clipboard);
		} else {
			this.updateIndicatorPosition(false);
		}
	}

	override vfunc_map(): void {
		super.vfunc_map();
		this.updateIndicatorPosition(false);
	}

	get selectedTab(): DialogTab {
		return this._selectedTab;
	}

	selectTab(tab: DialogTab, animate: boolean = true): void {
		this._selectedTab = tab;
		this._utilityBox.updateActiveTab(tab);

		for (const [dialogTab, button] of this._tabButtons) {
			const isSelected = dialogTab === tab;
			button.checked = isSelected;
			if (isSelected) {
				button.add_style_class_name('active');
			} else {
				button.remove_style_class_name('active');
			}
		}

		this.updateIndicatorPosition(animate);
		this.emit('tab-selected', tab);
	}

	updateIndicatorPosition(animate: boolean = false): void {
		const button = this._tabButtons.get(this._selectedTab);
		if (button) this._indicatorTrack.updatePosition(button.get_allocation_box(), animate);
	}

	private _createTabButton(tab: DialogTab, iconName: Icon): void {
		const button = new St.Button({
			style_class: 'win-tab-button',
			can_focus: true,
			child: new St.Icon({ gicon: loadIcon(this._ext, iconName) }),
		});

		button.connect('clicked', () => this.selectTab(tab));
		this._tabButtons.set(tab, button);
		this._buttonsBox.add_child(button);
	}
}
