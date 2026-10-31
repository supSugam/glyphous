import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Graphene from 'gi://Graphene';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';

import * as IBusManager from 'resource:///org/gnome/shell/misc/ibusManager.js';
import * as BoxPointer from 'resource:///org/gnome/shell/ui/boxpointer.js';
import * as Layout from 'resource:///org/gnome/shell/ui/layout.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { EasingParamsWithProperties } from '@girs/gnome-shell/extensions/global';

import type CopyousExtension from '../../extension.js';
import { CharactersView } from '../characters/charactersView.js';
import { ItemType } from '../common/constants.js';
import { registerClass } from '../common/gjs.js';
import { Icon, loadIcon } from '../common/icons.js';
import { OpenClipboardDialogBehavior } from '../common/settings.js';
import { ClipboardEntry } from '../database/database.js';
import { EmojiView } from '../emoji/emojiView.js';
import { VERSION } from '../misc/compatibility.js';
import { Shortcut } from '../misc/shortcuts.js';
import { ClipboardScrollView } from './clipboardScrollView.js';
import { ClipboardItemMenu } from './components/clipboardItemMenu.js';
import { DialogDragHandle } from './components/dialogDragHandle.js';
import { DialogTab, DialogTabBar } from './components/dialogTabs.js';
import { IncognitoButton } from './components/incognitoButton.js';
import { ConfirmClearHistoryDialog } from './indicator.js';
import { CharacterItem } from './items/characterItem.js';
import { CodeItem } from './items/codeItem.js';
import { ColorItem } from './items/colorItem.js';
import { FileItem } from './items/fileItem.js';
import { FilesItem } from './items/filesItem.js';
import { ImageItem } from './items/imageItem.js';
import { LinkItem } from './items/linkItem.js';
import { TextItem } from './items/textItem.js';
import { CollapsibleHeaderLayout, FitConstraint } from './layout.js';
import { SearchEntry, SearchQuery } from './searchEntry.js';

const ANIMATION_TIME = 150;

@registerClass({
	Properties: {
		'header-visible': GObject.ParamSpec.boolean('header-visible', null, null, GObject.ParamFlags.READABLE, true),
	},
	Signals: {
		'open-settings': {},
		'clear-history': {},
	},
})
class ClipboardDialogHeader extends St.Widget {
	private readonly _headerLayout: CollapsibleHeaderLayout;
	private readonly _contentBox: St.BoxLayout;
	private readonly _titleBox: St.BoxLayout;
	private readonly _titleLabel: St.Label;
	private readonly _clearButton: St.Button;

	public readonly searchEntry: SearchEntry;

	private _headerVisible: boolean = true;

	constructor(private ext: CopyousExtension) {
		super({
			style_class: 'dialog-header',
			clip_to_allocation: true,
			x_expand: true,
		});

		this._headerLayout = new CollapsibleHeaderLayout();
		this.layout_manager = this._headerLayout;

		this._contentBox = new St.BoxLayout({
			vertical: true,
			style_class: 'dialog-header-box',
			x_expand: true,
		});
		this.add_child(this._contentBox);

		// Title & Clear Row
		this._titleBox = new St.BoxLayout({
			style_class: 'dialog-title-box',
			orientation: Clutter.Orientation.HORIZONTAL,
			x_expand: true,
		});
		this._titleLabel = new St.Label({
			text: _('Clipboard'),
			style_class: 'dialog-title-label',
			y_align: Clutter.ActorAlign.CENTER,
		});
		this._titleBox.add_child(this._titleLabel);
		this._titleBox.add_child(new St.Widget({ x_expand: true }));

		this._clearButton = new St.Button({
			style_class: 'dialog-clear-button',
			label: _('Clear all'),
			can_focus: true,
			y_align: Clutter.ActorAlign.CENTER,
		});
		this._clearButton.connect('clicked', () => this.emit('clear-history'));
		this._titleBox.add_child(this._clearButton);
		this._contentBox.add_child(this._titleBox);

		// Search Entry Row (reused seamlessly across all tabs)
		this.searchEntry = new SearchEntry(ext);
		this.searchEntry.clutter_text.connect('key-focus-in', () => this.updateHeader(true));
		this._contentBox.add_child(this.searchEntry);

		// Bind properties
		this.ext.settings.connectObject(
			'changed::auto-hide-search',
			() => this.updateHeader(!this.ext.settings.get_boolean('auto-hide-search'), false),
			this,
		);

		this.updateHeader(!this.ext.settings.get_boolean('auto-hide-search'), false);
	}

	setTab(tab: DialogTab): void {
		this.searchEntry.setTab(tab);
		if (tab === DialogTab.Clipboard) {
			this._titleLabel.text = _('Clipboard');
			this._clearButton.visible = true;
		} else if (tab === DialogTab.Emoji) {
			this._titleLabel.text = _('Emoji');
			this._clearButton.visible = false;
		} else if (tab === DialogTab.Characters) {
			this._titleLabel.text = _('Characters');
			this._clearButton.visible = false;
		}
	}

	override destroy() {
		this.ext.settings.disconnectObject(this);
		super.destroy();
	}

	get headerVisible() {
		return this._headerVisible;
	}

	set showButtons(show: boolean) {
		this._clearButton.visible = show;
	}

	updateHeader(show: boolean, animate: boolean = true) {
		if (this.searchEntry.text.length > 0) show = true;

		this._headerLayout.enableCollapse = this.ext.settings.get_boolean('auto-hide-search');

		this._headerVisible = !this._headerVisible || show;
		this.notify('header-visible');

		const value = Number(show);
		if (animate) {
			this.ease_property('@layout.expansion', value, {
				mode: Clutter.AnimationMode.EASE_OUT_QUAD,
				duration: 200,
			});
		} else {
			this._headerLayout.expansion = value;
		}
	}

	override vfunc_navigate_focus(from: Clutter.Actor | null, direction: St.DirectionType): boolean {
		const res = super.vfunc_navigate_focus(from, direction);
		if (
			direction === St.DirectionType.UP ||
			direction === St.DirectionType.LEFT ||
			direction === St.DirectionType.RIGHT
		) {
			this.updateHeader(true);
		} else {
			this.updateHeader(res);
		}

		return res;
	}

	override vfunc_map() {
		super.vfunc_map();

		this.updateHeader(!this.ext.settings.get_boolean('auto-hide-search'), false);
	}
}

@registerClass({
	Signals: {
		'open-settings': {},
		'clear-history': {},
	},
})
class ClipboardDialogFooter extends St.BoxLayout {
	constructor(ext: CopyousExtension) {
		super({
			style_class: 'dialog-footer',
			y_align: Clutter.ActorAlign.END,
			x_expand: true,
			y_expand: true,
		});

		const settingsButton = new St.Button({
			style_class: 'dialog-footer-icon-button',
			child: new St.Icon({ gicon: loadIcon(ext, Icon.Settings) }),
			can_focus: true,
			x_align: Clutter.ActorAlign.START,
		});
		settingsButton.connect('clicked', () => this.emit('open-settings'));
		this.add_child(settingsButton);

		this.add_child(
			new IncognitoButton(ext, {
				style_class: 'dialog-footer-icon-button',
				x_align: Clutter.ActorAlign.START,
			}),
		);

		const clearButton = new St.Button({
			style_class: 'dialog-footer-button',
			label: _('Clear'),
			can_focus: true,
			x_align: Clutter.ActorAlign.END,
			x_expand: true,
		});
		clearButton.connect('clicked', () => this.emit('clear-history'));
		this.add_child(clearButton);
	}
}

@registerClass({
	Properties: {
		opened: GObject.ParamSpec.boolean('opened', null, null, GObject.ParamFlags.READABLE, false),
	},
	Signals: {
		'copy': { param_types: [GObject.TYPE_JSOBJECT] },
		'paste': { param_types: [GObject.TYPE_JSOBJECT] },
		'clear-history': { param_types: [GObject.TYPE_INT] },
	},
})
export class ClipboardDialog extends St.Widget {
	private _grab: Clutter.Grab | null = null;
	private _targetWindow: Meta.Window | null = null;
	private _open: boolean = false;
	private _closing: boolean = false;
	private _updateCursor: boolean = true;
	private _nextCursor: [number, number] | null = null;
	private _cursor: [number, number] | null = null;

	private _orientation: Clutter.Orientation = Clutter.Orientation.HORIZONTAL;

	private readonly _ibusManager: IBusManager.IBusManager;

	private readonly _monitorConstraint: Layout.MonitorConstraint;
	private readonly _fitConstraint: FitConstraint;
	private readonly _widthConstraint: Clutter.BindConstraint;

	private readonly _dialog: St.BoxLayout;
	private readonly _dragHandle: DialogDragHandle;
	private readonly _tabBar: DialogTabBar;
	private readonly _header: ClipboardDialogHeader;
	private readonly _scrollView: ClipboardScrollView;
	private readonly _footer: ClipboardDialogFooter;
	private readonly _clipboardItemMenu: ClipboardItemMenu;
	private readonly _emojiView: EmojiView;
	private readonly _charactersView: CharactersView;
	private _clipboardWidth: number = 0;
	private _isDragging: boolean = false;
	private _dragGrabOffset: [number, number] = [0, 0];
	private _pendingDragPosition: [number, number] | null = null;
	private _dragLaterId: number = 0;

	constructor(private ext: CopyousExtension) {
		super({
			layout_manager: new Clutter.BinLayout(),
			x_align: Clutter.ActorAlign.FILL,
			y_align: Clutter.ActorAlign.FILL,
			x_expand: true,
			y_expand: true,
			visible: false,
			reactive: true,
		});

		this._monitorConstraint = new Layout.MonitorConstraint({ workArea: true });
		this.add_constraint(this._monitorConstraint);

		Main.layoutManager.modalDialogGroup.add_child(this);

		// Dialog
		this._dialog = new St.BoxLayout({
			orientation: Clutter.Orientation.VERTICAL,
			style_class: 'modal-dialog clipboard-dialog horizontal',
			x_align: Clutter.ActorAlign.FILL,
			y_align: Clutter.ActorAlign.CENTER,
			x_expand: true,
			y_expand: true,
		});
		this.add_child(this._dialog);

		this._fitConstraint = new FitConstraint(this, false);
		this._dialog.add_constraint(this._fitConstraint);

		global.focus_manager.add_group(this._dialog);

		// Drag handle
		this._dragHandle = new DialogDragHandle(ext);
		this._dialog.add_child(this._dragHandle);
		this._dragHandle.connect('drag-start', (_handle: unknown, x: unknown, y: unknown) => {
			if (typeof x === 'number' && typeof y === 'number') {
				this._onDragStart(x, y);
			}
		});
		this._dragHandle.connect('reset-position', () => this.resetPosition());

		// Tab bar
		this._tabBar = new DialogTabBar(ext);
		this._dialog.add_child(this._tabBar);
		this._tabBar.connect('open-settings', this.openSettings.bind(this));
		this._tabBar.connect('tab-selected', (_actor, tab: string) => {
			this.onTabSelected(tab as DialogTab);
		});

		// Header
		this._header = new ClipboardDialogHeader(ext);
		this._dialog.add_child(this._header);

		this._header.connect('open-settings', this.openSettings.bind(this));
		this._header.connect('clear-history', this.confirmClearHistory.bind(this));
		this._header.searchEntry.connect('search', (_, query: SearchQuery) => {
			if (this._tabBar.selectedTab === DialogTab.Emoji) {
				this._emojiView.search(query.query);
			} else if (this._tabBar.selectedTab === DialogTab.Characters) {
				this._charactersView.search(query.query);
			} else {
				this._scrollView.search(query);
			}
		});
		this._header.searchEntry.connect('activate', () => {
			if (this._tabBar.selectedTab === DialogTab.Emoji) {
				this._emojiView.activateFirst();
			} else if (this._tabBar.selectedTab === DialogTab.Characters) {
				this._charactersView.activateFirst();
			} else {
				this._scrollView.activateFirst();
			}
		});

		this._header.connect('notify::header-visible', () => {
			if (this._header.headerVisible) {
				this._dialog.add_style_class_name('show-header');
			} else {
				this._dialog.remove_style_class_name('show-header');
			}
		});

		// Scrollbox
		this._scrollView = new ClipboardScrollView(ext);
		this._dialog.add_child(this._scrollView);
		this._scrollView.connect('notify::width', () => {
			if (this._scrollView.width > 0) {
				this._clipboardWidth = Math.round(this._scrollView.width);
				if (this._orientation === Clutter.Orientation.VERTICAL) {
					this._emojiView.setViewWidth(this._clipboardWidth);
					this._charactersView.setViewWidth(this._clipboardWidth);
				}
			}
		});

		// Emoji View
		this._emojiView = new EmojiView(ext);
		this._dialog.add_child(this._emojiView);
		this._emojiView.connect('emoji-selected', (_actor, emoji: string) => this._onEmojiSelected(emoji));
		this._emojiView.connect('emoji-activated', (_actor, emoji: string) => this._onEmojiActivated(emoji));
		this._emojiView.visible = false;

		// Characters View
		this._charactersView = new CharactersView(ext);
		this._dialog.add_child(this._charactersView);
		this._charactersView.connect('character-selected', (_actor, char: string) => this._onCharacterSelected(char));
		this._charactersView.connect('character-activated', (_actor, char: string) => this._onCharacterActivated(char));
		this._charactersView.visible = false;

		this._widthConstraint = new Clutter.BindConstraint({
			coordinate: Clutter.BindCoordinate.WIDTH,
			source: this._scrollView,
			enabled: false,
		});
		this._header.add_constraint(this._widthConstraint);

		// Footer
		this._footer = new ClipboardDialogFooter(ext);
		this._dialog.add_child(this._footer);
		this._footer.connect('open-settings', this.openSettings.bind(this));
		this._footer.connect('clear-history', this.confirmClearHistory.bind(this));

		// Clipboard item menu
		this._clipboardItemMenu = new ClipboardItemMenu(ext);
		const clipboardItemMenuManager = new PopupMenu.PopupMenuManager(this);
		clipboardItemMenuManager.addMenu(this._clipboardItemMenu, 0);

		this._clipboardItemMenu.connectObject(
			'activate',
			() => this.close(),
			'copy',
			(_: unknown, s: string) => ext.clipboardManager?.copyText(s),
			'paste',
			(_: unknown, s: string) => ext.clipboardManager?.pasteText(s),
			this,
		);

		// Cursor position
		(Main.inputMethod as Clutter.InputMethod).connectObject(
			'cursor-location-changed',
			this.updateCursor.bind(this),
			this,
		);

		this._ibusManager = IBusManager.getIBusManager();
		this._ibusManager.connectObject(
			'focus-in',
			() => {
				// Update cursor after focus in since a focus out can trigger between cursor-location-changed and focus-in
				if (!this._updateCursor) return;
				this._cursor = this._nextCursor;
				this._nextCursor = null;
			},
			'focus-out',
			() => (this._cursor = null),
			this,
		);

		// Bind properties
		// prettier-ignore
		this.ext.settings.connectObject(
			'changed::show-at-pointer', this.updatePosition.bind(this),
			'changed::remember-dragged-position', this.updatePosition.bind(this),
			'changed::clipboard-orientation', this.updatePosition.bind(this),
			'changed::clipboard-position-horizontal', this.updatePosition.bind(this),
			'changed::clipboard-position-vertical', this.updatePosition.bind(this),
			'changed::clipboard-size', this.updatePosition.bind(this),
			'changed::item-width', this.updatePosition.bind(this),
			'changed::clipboard-margin-top', this.updateMargins.bind(this),
			'changed::clipboard-margin-bottom', this.updateMargins.bind(this),
			'changed::clipboard-margin-left', this.updateMargins.bind(this),
			'changed::clipboard-margin-right', this.updateMargins.bind(this),
			this);

		this.updatePosition();
		this.updateMargins();

		// Update initial search for when exclude-pinned or exclude-tagged is enabled
		this._scrollView.search(this._header.searchEntry.searchQuery);

		this.onTabSelected(this._tabBar.selectedTab);
	}

	override destroy() {
		if (this._dragLaterId) {
			global.compositor.get_laters().remove(this._dragLaterId);
			this._dragLaterId = 0;
		}
		(Main.inputMethod as Clutter.InputMethod).disconnectObject(this);
		this._ibusManager.disconnectObject(this);
		this.ext.settings.disconnectObject(this);

		super.destroy();
	}

	get opened(): boolean {
		return this._open;
	}

	private set opened(value: boolean) {
		this._open = value;
		this.notify('opened');
	}

	public toggle() {
		if (!this.opened) this.open();
		else this.close();
	}

	public openTab(tab: DialogTab) {
		const enableEmoji = this.ext.settings.get_boolean('enable-emoji-tab');
		const enableCharacters = this.ext.settings.get_boolean('enable-characters-tab');

		let targetTab = tab;
		if (tab === DialogTab.Emoji && !enableEmoji) targetTab = DialogTab.Clipboard;
		if (tab === DialogTab.Characters && !enableCharacters) targetTab = DialogTab.Clipboard;

		if (!this.opened) {
			this.open(targetTab);
		} else {
			this._tabBar.selectTab(targetTab);
		}
	}

	public open(initialTab: DialogTab = DialogTab.Clipboard) {
		if (this.opened || this._closing) return;

		this._targetWindow = global.display.focus_window;
		this._updateCursor = false;
		this._nextCursor = this._cursor;

		const grab = Main.pushModal(this, { actionMode: Shell.ActionMode.SYSTEM_MODAL }) as Clutter.Grab;
		// GNOME 50 (Mutter 18) removed get_seat_state()/GrabState in favor of is_revoked()
		const grabFailed =
			VERSION >= 50
				? (grab as Clutter.Grab & { is_revoked(): boolean }).is_revoked()
				: (grab as Clutter.Grab & { get_seat_state(): number }).get_seat_state() !== 1; // Clutter.GrabState.ALL
		if (grabFailed) {
			Main.popModal(grab);
			return;
		}

		this._grab = grab;
		this._monitorConstraint.index = global.display.get_current_monitor();
		Main.layoutManager.emit('system-modal-opened');

		this._dialog.opacity = 0;
		this.show();
		this._tabBar.selectTab(initialTab, false);
		this._tabBar.updateIndicatorPosition(false);

		const horizontal = this._orientation === Clutter.Orientation.HORIZONTAL;
		if (horizontal && this._dialog.y_align === Clutter.ActorAlign.START) {
			this._dialog.translation_y = -6;
			this._dialog.set_pivot_point(0.5, 0);
		} else if (horizontal && this._dialog.y_align === Clutter.ActorAlign.END) {
			this._dialog.translation_y = 6;
			this._dialog.set_pivot_point(0.5, 1);
		} else if (!horizontal && this._dialog.x_align === Clutter.ActorAlign.START) {
			this._dialog.translation_x = -6;
			this._dialog.set_pivot_point(0, 0.5);
		} else if (!horizontal && this._dialog.x_align === Clutter.ActorAlign.END) {
			this._dialog.translation_x = 6;
			this._dialog.set_pivot_point(1, 0.5);
		} else {
			this._dialog.translation_y = -6;
			this._dialog.set_pivot_point(0.5, 0);
		}

		let mode = Clutter.AnimationMode.LINEAR;
		if (VERSION >= 49) {
			// Gnome 49 and above uses different animation
			mode = Clutter.AnimationMode.EASE_OUT_QUAD;
			this._dialog.scale_x = 0.96;
			this._dialog.scale_y = 0.96;
		}

		this.opened = true;
		global.compositor.disable_unredirect();

		this._dialog.ease({
			opacity: 255,
			translationX: 0,
			translationY: 0,
			scaleX: 1,
			scaleY: 1,
			duration: ANIMATION_TIME,
			mode,
		});
	}

	public close() {
		if (!this.opened) return;

		if (this._isDragging) {
			this._finishDrag();
		}
		this._emojiView?.clearChain();
		this._charactersView?.clearChain();

		this._closing = true;
		this.opened = false;
		this._updateCursor = true;
		this._clipboardItemMenu.close();

		let mode = Clutter.AnimationMode.LINEAR;
		let easeArgs: Partial<EasingParamsWithProperties> = {};
		if (VERSION >= 49) {
			// Gnome 49 and above uses different animation
			mode = Clutter.AnimationMode.EASE_OUT_QUAD;
			easeArgs = {
				scaleX: 0.96,
				scaleY: 0.96,
			};

			const horizontal = this._orientation === Clutter.Orientation.HORIZONTAL;
			if (horizontal && this._dialog.y_align === Clutter.ActorAlign.START) {
				easeArgs.translationY = -6;
				this._dialog.set_pivot_point(0.5, 0);
			} else if (horizontal && this._dialog.y_align === Clutter.ActorAlign.END) {
				easeArgs.translationY = 6;
				this._dialog.set_pivot_point(0.5, 1);
			} else if (!horizontal && this._dialog.x_align === Clutter.ActorAlign.START) {
				easeArgs.translationX = -6;
				this._dialog.set_pivot_point(0, 0.5);
			} else if (!horizontal && this._dialog.x_align === Clutter.ActorAlign.END) {
				easeArgs.translationX = 6;
				this._dialog.set_pivot_point(1, 0.5);
			} else {
				easeArgs.translationY = -6;
				this._dialog.set_pivot_point(0.5, 0);
			}
		}

		this._dialog.ease({
			opacity: 0,
			...easeArgs,
			duration: ANIMATION_TIME,
			mode,
			onComplete: () => {
				if (this._grab) {
					Main.popModal(this._grab);
					this._grab = null;
				}
				this._targetWindow = null;
				this._closing = false;
				this.hide();
				global.compositor.enable_unredirect();
			},
		});
	}

	public addEntry(entry: ClipboardEntry): void {
		let item;
		try {
			item = (() => {
				switch (entry.type) {
					case ItemType.Text:
						return new TextItem(this.ext, entry);
					case ItemType.Code:
						return new CodeItem(this.ext, entry);
					case ItemType.Image:
						return new ImageItem(this.ext, entry);
					case ItemType.File:
						return new FileItem(this.ext, entry);
					case ItemType.Files:
						return new FilesItem(this.ext, entry);
					case ItemType.Link:
						return new LinkItem(this.ext, entry);
					case ItemType.Character:
						return new CharacterItem(this.ext, entry);
					case ItemType.Color:
						return new ColorItem(this.ext, entry);
					default:
						return null;
				}
			})();

			if (!item) {
				this.ext.logger.error('Unknown item type', entry);
				return;
			}
		} catch (e) {
			this.ext.logger.error(e);
			return;
		}

		// Connect edit
		item.connectObject('edit', () => this._clipboardItemMenu.edit(entry), this);

		// Connect item menu
		item.connectObject(
			'open-menu',
			(_: unknown, x: number, y: number, w: number, h: number) => {
				// Connect the menu signal to update the hover state of the item and remove the signal when the menu is closed
				const signalId = this._clipboardItemMenu.connect('open-state-changed', (_menu, state: boolean) => {
					item.sync_hover();
					if (!state) this._clipboardItemMenu.disconnect(signalId);
					return true;
				});

				this._clipboardItemMenu.arrowAlignment = w === 0 && h === 0 ? 0 : 0.5;

				// Slightly offset the menu to allow immediately clicking and closing the menu
				if (w === 0 && h === 0) {
					x++;
					y++;
				}

				Main.layoutManager.setDummyCursorGeometry(x, y, w, h);
				this._clipboardItemMenu.entry = entry;
				this._clipboardItemMenu.open(BoxPointer.PopupAnimation.SLIDE);
			},
			this,
		);

		// Connect activation
		item.connectObject(
			'activate',
			() => {
				const swap = this.ext.settings.get_boolean('swap-copy-shortcut');
				this.emit(swap ? 'copy' : 'paste', entry);
				this.close();
			},
			'activate-shift',
			() => {
				const swap = this.ext.settings.get_boolean('swap-copy-shortcut');
				this.emit(swap ? 'paste' : 'copy', entry);
				this.close();
			},
			'activate-ctrl',
			() => {
				if (this._clipboardItemMenu.activateDefaultAction(entry)) this.close();
			},
			'activate-action',
			(_: unknown, id: string) => {
				if (this._clipboardItemMenu.activateAction(entry, id)) this.close();
			},
			this,
		);

		this._scrollView.addItem(item);
	}

	public dialogShortcut() {
		const behavior = this.ext.settings.get_enum('open-clipboard-dialog-behavior');
		if (behavior === OpenClipboardDialogBehavior.Toggle) {
			this.toggle();
		} else if (behavior === OpenClipboardDialogBehavior.OpenOrSelectNext) {
			if (!this.opened) this.open();
			else this._scrollView.selectNextItem();
		}
	}

	public clearEntries() {
		this._scrollView.clearItems();
	}

	private onTabSelected(tab: DialogTab) {
		this._emojiView?.clearChain();
		this._charactersView?.clearChain();
		this._header.setTab(tab);
		if (this.mapped) {
			this._header.searchEntry.grab_key_focus();
		}

		if (this._scrollView && this._emojiView && this._charactersView) {
			const isVertical = this._orientation === Clutter.Orientation.VERTICAL;
			let targetWidth: number;
			if (isVertical) {
				if (this._clipboardWidth > 0) {
					targetWidth = this._clipboardWidth;
				} else {
					const [, prefWidth] = this._scrollView.get_preferred_width(-1);
					const itemWidth = this.ext.settings.get_int('item-width');
					targetWidth = prefWidth > 0 ? prefWidth : itemWidth + 30;
				}
			} else {
				targetWidth = this.ext.settings.get_int('clipboard-size');
			}

			if (tab === DialogTab.Clipboard) {
				this._scrollView.visible = true;
				this._emojiView.visible = false;
				this._charactersView.visible = false;
				this._widthConstraint.source = this._scrollView;
			} else if (tab === DialogTab.Emoji) {
				this._emojiView.setViewWidth(targetWidth);
				this._scrollView.visible = false;
				this._charactersView.visible = false;
				this._emojiView.visible = true;
				this._widthConstraint.source = this._emojiView;
			} else if (tab === DialogTab.Characters) {
				this._charactersView.setViewWidth(targetWidth);
				this._scrollView.visible = false;
				this._emojiView.visible = false;
				this._charactersView.visible = true;
				this._widthConstraint.source = this._charactersView;
			} else {
				this._scrollView.visible = false;
				this._emojiView.visible = false;
				this._charactersView.visible = false;
			}
		}
	}

	private _canPaste(): boolean {
		const window = this._targetWindow ?? global.display.focus_window;
		if (!window) return false;
		try {
			const type = window.get_window_type();
			return type !== Meta.WindowType.DESKTOP && type !== Meta.WindowType.DOCK;
		} catch {
			return false;
		}
	}

	private _onEmojiSelected(emoji: string) {
		this.ext.clipboardManager?.copyText(emoji);
	}

	private _onEmojiActivated(emoji: string) {
		if (this._canPaste()) {
			this.ext.clipboardManager?.pasteTextTransient(emoji);
		} else {
			this.ext.clipboardManager?.copyText(emoji);
		}
		this.close();
	}

	private _onCharacterSelected(character: string) {
		this.ext.clipboardManager?.copyText(character);
	}

	private _onCharacterActivated(character: string) {
		if (this._canPaste()) {
			this.ext.clipboardManager?.pasteTextTransient(character);
		} else {
			this.ext.clipboardManager?.copyText(character);
		}
		this.close();
	}

	private openSettings() {
		this.ext.openPreferences();
		this.close();
	}

	private confirmClearHistory() {
		const dialog = new ConfirmClearHistoryDialog();
		dialog.connect('clear-history', (_dialog, history) => this.emit('clear-history', history));
		dialog.open();
	}

	private updatePosition() {
		const rememberDragged = this.ext.settings.get_boolean('remember-dragged-position');
		const draggedX = this.ext.settings.get_int('dragged-position-x');
		const draggedY = this.ext.settings.get_int('dragged-position-y');
		const hasSavedDrag = rememberDragged && draggedX >= 0 && draggedY >= 0;

		const showAtPointer = this.ext.settings.get_boolean('show-at-pointer');
		this._orientation = this.ext.settings.get_enum('clipboard-orientation');
		const positionVertical = this.ext.settings.get_enum('clipboard-position-vertical');
		const positionHorizontal = this.ext.settings.get_enum('clipboard-position-horizontal');
		const size = this.ext.settings.get_int('clipboard-size');

		this._scrollView.orientation = this._orientation;
		this._widthConstraint.enabled = this._orientation === Clutter.Orientation.VERTICAL;
		this._fitConstraint.enabled = showAtPointer || hasSavedDrag;

		if (showAtPointer || hasSavedDrag) {
			this._dialog.x_align = Clutter.ActorAlign.CENTER;
			this._dialog.y_align = Clutter.ActorAlign.CENTER;
		} else {
			this._dialog.x_align = (positionHorizontal + 1) % 4;
			this._dialog.y_align = (positionVertical + 1) % 4;
		}

		if (this._orientation === Clutter.Orientation.HORIZONTAL) {
			this._dialog.add_style_class_name('horizontal');
			this._dialog.remove_style_class_name('vertical');

			this._dialog.width = size;
			this._dialog.height = -1;
			this._emojiView?.setViewWidth(size);
			this._charactersView?.setViewWidth(size);
		} else {
			this._dialog.remove_style_class_name('horizontal');
			this._dialog.add_style_class_name('vertical');

			this._dialog.width = -1;
			this._dialog.height = size;
			const itemWidth = this.ext.settings.get_int('item-width');
			const targetWidth = this._clipboardWidth > 0 ? this._clipboardWidth : itemWidth + 30;
			this._emojiView?.setViewWidth(targetWidth);
			this._charactersView?.setViewWidth(targetWidth);
		}

		// Header / Footer
		this._header.showButtons = true;
		this._footer.visible = false;
	}

	private updateMargins() {
		const top = this.ext.settings.get_int('clipboard-margin-top');
		const right = this.ext.settings.get_int('clipboard-margin-right');
		const bottom = this.ext.settings.get_int('clipboard-margin-bottom');
		const left = this.ext.settings.get_int('clipboard-margin-left');

		this._dialog.set_style(`margin: ${top}px ${right}px ${bottom}px ${left}px;`);
	}

	private updateCursor(_source: Clutter.InputMethod, rect: Graphene.Rect) {
		if (isNaN(rect.get_x()) || isNaN(rect.get_y()) || !this._updateCursor) return;

		const p = rect.get_bottom_right();
		this._nextCursor = [p.x + 4, p.y + 4];
		this._cursor = [p.x + 4, p.y + 4];
	}

	private updateFitConstraint() {
		const rememberDragged = this.ext.settings.get_boolean('remember-dragged-position');
		const draggedX = this.ext.settings.get_int('dragged-position-x');
		const draggedY = this.ext.settings.get_int('dragged-position-y');

		const [sw, sh] = this.allocation.get_size();
		const box = this._dialog.get_allocation_box();
		const dialogWidth = box.get_width() > 0 ? box.get_width() : this._dialog.width > 0 ? this._dialog.width : 400;
		const dialogHeight =
			box.get_height() > 0 ? box.get_height() : this._dialog.height > 0 ? this._dialog.height : 600;
		const maxX = Math.max(0, sw - dialogWidth);
		const maxY = Math.max(0, sh - dialogHeight);

		if (rememberDragged && draggedX >= 0 && draggedY >= 0) {
			this._fitConstraint.enabled = true;
			this._fitConstraint.setPosition(
				Math.max(0, Math.min(draggedX, maxX)),
				Math.max(0, Math.min(draggedY, maxY)),
			);
			return;
		}

		// Update fit constraint position to current pointer position
		const showAtPointer = this.ext.settings.get_boolean('show-at-pointer');
		if (!showAtPointer) {
			this._fitConstraint.enabled = false;
			return;
		}

		const showAtCursor = this.ext.settings.get_boolean('show-at-cursor');
		const [x, y] = (showAtCursor ? this._cursor : null) ?? global.get_pointer();

		const ws = global.workspace_manager.get_active_workspace();
		const rect = ws.get_work_area_for_monitor(this._monitorConstraint.index);

		const node = this._dialog.get_theme_node();

		this._fitConstraint.enabled = true;
		this._fitConstraint.setPosition(
			Math.max(0, Math.min(x - rect.x - node.get_margin(St.Side.LEFT) + 1, maxX)),
			Math.max(0, Math.min(y - rect.y - node.get_margin(St.Side.TOP) + 1, maxY)),
		);
	}

	private _onDragStart(pointerX: number, pointerY: number): void {
		this._isDragging = true;
		this._dragHandle.setDragging(true);
		global.stage.set_cursor_type(Clutter.CursorType.GRABBING);
		this._dialog.add_style_class_name('dragging');

		const box = this._dialog.get_allocation_box();
		const dialogX = box.x1;
		const dialogY = box.y1;

		this._dragGrabOffset = [pointerX - dialogX, pointerY - dialogY];
		this._fitConstraint.setPosition(dialogX, dialogY);
		this._fitConstraint.enabled = true;
	}

	private _processDragMotion(x: number, y: number): void {
		const rawTargetX = x - this._dragGrabOffset[0];
		const rawTargetY = y - this._dragGrabOffset[1];

		const [sw, sh] = this.allocation.get_size();
		const box = this._dialog.get_allocation_box();
		const dialogWidth = box.get_width();
		const dialogHeight = box.get_height();
		const maxX = Math.max(0, sw - dialogWidth);
		const maxY = Math.max(0, sh - dialogHeight);

		const targetX = Math.max(0, Math.min(rawTargetX, maxX));
		const targetY = Math.max(0, Math.min(rawTargetY, maxY));

		// Clamp grab offset when cursor moves beyond boundaries to prevent dead-zone desync
		if (rawTargetX < 0) this._dragGrabOffset[0] = x;
		else if (rawTargetX > maxX) this._dragGrabOffset[0] = x - maxX;

		if (rawTargetY < 0) this._dragGrabOffset[1] = y;
		else if (rawTargetY > maxY) this._dragGrabOffset[1] = y - maxY;

		this._pendingDragPosition = [targetX, targetY];
		if (!this._dragLaterId) {
			this._dragLaterId = global.compositor.get_laters().add(Meta.LaterType.BEFORE_REDRAW, () => {
				this._dragLaterId = 0;
				if (this._pendingDragPosition) {
					const [px, py] = this._pendingDragPosition;
					this._fitConstraint.setPosition(px, py);
				}
				return GLib.SOURCE_REMOVE;
			});
		}
	}

	private _finishDrag(): void {
		this._isDragging = false;
		this._dragHandle.setDragging(false);
		global.stage.set_cursor_type(Clutter.CursorType.INHERIT);
		this._dialog.remove_style_class_name('dragging');

		if (this._dragLaterId) {
			global.compositor.get_laters().remove(this._dragLaterId);
			this._dragLaterId = 0;
		}

		if (this._pendingDragPosition) {
			const [px, py] = this._pendingDragPosition;
			this._fitConstraint.setPosition(px, py);
			this._pendingDragPosition = null;
		}

		if (this.ext.settings.get_boolean('remember-dragged-position')) {
			this.ext.settings.set_int('dragged-position-x', Math.round(this._fitConstraint.x));
			this.ext.settings.set_int('dragged-position-y', Math.round(this._fitConstraint.y));
		}
	}

	public resetPosition() {
		this.ext.settings.set_int('dragged-position-x', -1);
		this.ext.settings.set_int('dragged-position-y', -1);
		this.updatePosition();
		this.updateFitConstraint();
	}

	private shouldTriggerSearch(keysym: number) {
		if (keysym === Clutter.KEY_Multi_key) return true;
		if (keysym === Clutter.KEY_BackSpace) return true;

		const unicode = Clutter.keysym_to_unicode(keysym);
		if (unicode === 0) return false;

		return String.fromCharCode(unicode).trim().length > 0;
	}

	override vfunc_key_press_event(event: Clutter.Event): boolean {
		const key = event.get_key_symbol();

		// Close on escape
		if (key === Clutter.KEY_Escape) {
			this.close();
			return Clutter.EVENT_STOP;
		}

		// Select item: ctrl + 0..9
		const isNum = key >= Clutter.KEY_0 && key <= Clutter.KEY_9;
		if (event.has_control_modifier() && (isNum || (key >= Clutter.KEY_KP_0 && key <= Clutter.KEY_KP_9))) {
			const i = isNum ? key - Clutter.KEY_1 : key - Clutter.KEY_KP_1;
			if (this._scrollView.selectItem((i + 10) % 10)) {
				this._header.updateHeader(false);
			}

			return Clutter.EVENT_STOP;
		}

		// Search on ctrl+f
		if (event.has_control_modifier() && key === Clutter.KEY_f) {
			this._header.searchEntry.grab_key_focus();
			return Clutter.EVENT_STOP;
		}

		// Trigger search
		if (!event.has_control_modifier() && this.shouldTriggerSearch(key)) {
			this._header.searchEntry.clutter_text.grab_key_focus();
			return this._header.searchEntry.clutter_text.event(event, false);
		}

		// Toggle pinned search
		if (
			this.ext.shortcutsManager?.getShortcutForKeyBinding(key, event.get_state()) === Shortcut.TogglePinnedSearch
		) {
			this._header.searchEntry.pinned = !this._header.searchEntry.pinned;
			return Clutter.EVENT_STOP;
		}

		// Select tag: ctrl + shift + 0..9
		const code = event.get_key_code();
		if (event.has_control_modifier() && event.has_shift_modifier() && code >= 10 && code <= 19) {
			this._header.searchEntry.selectTag(code - 10);
			return Clutter.EVENT_STOP;
		}

		// Next tag: ctrl + `
		if (event.has_control_modifier() && key === Clutter.KEY_grave) {
			this._header.searchEntry.nextTag();
			return Clutter.EVENT_STOP;
		}

		// Previous tag: ctrl + shift + `
		if (event.has_control_modifier() && key === Clutter.KEY_asciitilde) {
			this._header.searchEntry.prevTag();
			return Clutter.EVENT_STOP;
		}

		// Next type: ctrl + tab
		if (event.has_control_modifier() && key === Clutter.KEY_Tab) {
			this._header.searchEntry.nextType();
			return Clutter.EVENT_STOP;
		}

		// Previous type: ctrl + shift + tab
		if (event.has_control_modifier() && key === Clutter.KEY_ISO_Left_Tab) {
			this._header.searchEntry.prevType();
			return Clutter.EVENT_STOP;
		}

		// Navigate
		if (global.focus_manager.navigate_from_event) {
			if (global.focus_manager.navigate_from_event(event)) return Clutter.EVENT_STOP;
		} else {
			let direction: St.DirectionType | undefined;
			switch (key) {
				case Clutter.KEY_Up:
				case Clutter.KEY_KP_Up:
					direction = St.DirectionType.UP;
					break;
				case Clutter.KEY_Down:
				case Clutter.KEY_KP_Down:
					direction = St.DirectionType.DOWN;
					break;
				case Clutter.KEY_Left:
				case Clutter.KEY_KP_Left:
					direction = St.DirectionType.LEFT;
					break;
				case Clutter.KEY_Right:
				case Clutter.KEY_KP_Right:
					direction = St.DirectionType.RIGHT;
					break;
				case Clutter.KEY_Tab:
				case Clutter.KEY_KP_Tab:
					direction = event.has_shift_modifier()
						? St.DirectionType.TAB_BACKWARD
						: St.DirectionType.TAB_FORWARD;
					break;
				case Clutter.KEY_ISO_Left_Tab:
					direction = St.DirectionType.TAB_BACKWARD;
					break;
			}

			if (
				direction !== undefined &&
				this._dialog.navigate_focus(global.stage.get_key_focus(), direction, false)
			) {
				return Clutter.EVENT_STOP;
			}
		}

		return super.vfunc_key_press_event(event);
	}

	override vfunc_motion_event(event: Clutter.Event): boolean {
		if (this._isDragging) {
			const [x, y] = event.get_coords();
			this._processDragMotion(x, y);
			return Clutter.EVENT_STOP;
		}
		return super.vfunc_motion_event(event);
	}

	override vfunc_button_release_event(event: Clutter.Event): boolean {
		if (this._isDragging) {
			this._finishDrag();
			return Clutter.EVENT_STOP;
		}
		return super.vfunc_button_release_event(event);
	}

	override vfunc_button_press_event(event: Clutter.Event): boolean {
		const [x, y] = event.get_coords();
		if (this._dialog.get_transformed_extents().contains_point(new Graphene.Point({ x, y }))) {
			return Clutter.EVENT_PROPAGATE;
		}

		this.close();
		return Clutter.EVENT_STOP;
	}

	override vfunc_touch_event(event: Clutter.Event): boolean {
		if (this._isDragging) {
			if (event.type() === Clutter.EventType.TOUCH_UPDATE) {
				const [x, y] = event.get_coords();
				this._processDragMotion(x, y);
				return Clutter.EVENT_STOP;
			}
			if (event.type() === Clutter.EventType.TOUCH_END || event.type() === Clutter.EventType.TOUCH_CANCEL) {
				this._finishDrag();
				return Clutter.EVENT_STOP;
			}
		}

		if (event.type() !== Clutter.EventType.TOUCH_BEGIN) return Clutter.EVENT_PROPAGATE;

		const [x, y] = event.get_coords();
		if (this._dialog.get_transformed_extents().contains_point(new Graphene.Point({ x, y }))) {
			return Clutter.EVENT_PROPAGATE;
		}

		this.close();
		return Clutter.EVENT_STOP;
	}

	override vfunc_map(): void {
		super.vfunc_map();

		// Update fit constraint
		this.updateFitConstraint();

		this._tabBar.updateIndicatorPosition(false);

		// Navigate to first item or focus search
		if (this._tabBar.selectedTab === DialogTab.Clipboard) {
			if (!this._scrollView.navigate_focus(null, St.DirectionType.DOWN, false)) {
				this._header.updateHeader(true, false);
				this._header.searchEntry.grab_key_focus();
			}
		} else {
			this._header.updateHeader(true, false);
			this._header.searchEntry.grab_key_focus();
		}
	}
}
