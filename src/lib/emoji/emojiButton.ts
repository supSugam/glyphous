import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { SignalMethods, registerClass } from '../common/gjs.js';

const EmojiButtonSignals = {
	selected: { param_types: [GObject.TYPE_STRING] },
	activated: { param_types: [GObject.TYPE_STRING] },
} as const;

@registerClass({ Signals: EmojiButtonSignals })
export class EmojiButton extends St.Button {
	declare emit: SignalMethods<this, typeof EmojiButtonSignals>['emit'];

	private readonly _label: St.Label;
	private _currentEmoji: string;

	constructor(emoji: string, accessibleName?: string) {
		super({
			style_class: 'emoji-button',
			can_focus: true,
			track_hover: true,
			x_align: Clutter.ActorAlign.CENTER,
			y_align: Clutter.ActorAlign.CENTER,
			accessible_name: accessibleName ?? emoji,
		});

		this._currentEmoji = emoji;
		this._label = new St.Label({
			style_class: 'emoji-char',
			text: emoji,
			x_align: Clutter.ActorAlign.CENTER,
			y_align: Clutter.ActorAlign.CENTER,
		});
		this.set_child(this._label);

		this.connect('clicked', () => {
			const event = Clutter.get_current_event();
			if (event?.has_shift_modifier()) {
				this.emit('selected', this._currentEmoji);
			} else {
				this.emit('activated', this._currentEmoji);
			}
		});
	}

	get emoji(): string {
		return this._currentEmoji;
	}

	updateEmoji(newEmoji: string): void {
		if (this._currentEmoji === newEmoji) return;
		this._currentEmoji = newEmoji;
		this._label.text = newEmoji;
	}

	override vfunc_key_press_event(event: Clutter.Event): boolean {
		const symbol = event.get_key_symbol();
		if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_KP_Enter) {
			if (event.has_shift_modifier()) {
				this.emit('selected', this._currentEmoji);
			} else {
				this.emit('activated', this._currentEmoji);
			}
			return Clutter.EVENT_STOP;
		}
		return super.vfunc_key_press_event(event);
	}
}
