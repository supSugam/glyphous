import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { SignalMethods, registerClass } from '../common/gjs.js';

const CharacterButtonSignals = {
	selected: { param_types: [GObject.TYPE_STRING] },
	activated: { param_types: [GObject.TYPE_STRING] },
} as const;

@registerClass({ Signals: CharacterButtonSignals })
export class CharacterButton extends St.Button {
	declare emit: SignalMethods<this, typeof CharacterButtonSignals>['emit'];

	private readonly _label: St.Label;
	private _currentCharacter: string;

	constructor(character: string, accessibleName?: string) {
		super({
			style_class: 'character-button',
			can_focus: true,
			track_hover: true,
			x_align: Clutter.ActorAlign.CENTER,
			y_align: Clutter.ActorAlign.CENTER,
			accessible_name: accessibleName ?? character,
		});

		this._currentCharacter = character;
		this._label = new St.Label({
			style_class: 'character-char',
			text: character,
			x_align: Clutter.ActorAlign.CENTER,
			y_align: Clutter.ActorAlign.CENTER,
		});
		this.set_child(this._label);

		this.connect('clicked', () => {
			const event = Clutter.get_current_event();
			if (event?.has_shift_modifier()) {
				this.emit('selected', this._currentCharacter);
			} else {
				this.emit('activated', this._currentCharacter);
			}
		});
	}

	get character(): string {
		return this._currentCharacter;
	}

	updateCharacter(newCharacter: string): void {
		if (this._currentCharacter === newCharacter) return;
		this._currentCharacter = newCharacter;
		this._label.text = newCharacter;
	}

	override vfunc_key_press_event(event: Clutter.Event): boolean {
		const symbol = event.get_key_symbol();
		if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_KP_Enter) {
			if (event.has_shift_modifier()) {
				this.emit('selected', this._currentCharacter);
			} else {
				this.emit('activated', this._currentCharacter);
			}
			return Clutter.EVENT_STOP;
		}
		return super.vfunc_key_press_event(event);
	}
}
