import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { SignalMethods, registerClass } from '../common/gjs.js';
import { SKIN_TONE_SWATCHES, SkinTone } from './emojiTypes.js';

const SkinToneSignals = {
	'tone-changed': {
		param_types: [GObject.TYPE_INT],
	},
	'toggle-popup': {},
} as const;

@registerClass({
	Signals: SkinToneSignals,
})
export class EmojiSkinToneSelector extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof SkinToneSignals>['emit'];

	private _currentTone: SkinTone = SkinTone.Default;
	private readonly _toggleButton: St.Button;
	private readonly _swatchLabel: St.Label;

	constructor() {
		super({
			orientation: Clutter.Orientation.HORIZONTAL,
			style_class: 'emoji-tone-selector',
			y_align: Clutter.ActorAlign.CENTER,
		});

		this._swatchLabel = new St.Label({
			text: SKIN_TONE_SWATCHES[SkinTone.Default],
			style_class: 'emoji-tone-swatch-label',
		});

		this._toggleButton = new St.Button({
			style_class: 'emoji-tone-button',
			can_focus: true,
			track_hover: true,
			accessible_name: _('Skin Tone'),
			child: this._swatchLabel,
		});
		this._toggleButton.connect('clicked', () => this.emit('toggle-popup'));
		this.add_child(this._toggleButton);
	}

	get tone(): SkinTone {
		return this._currentTone;
	}

	selectTone(tone: SkinTone): void {
		if (this._currentTone === tone) return;
		this._currentTone = tone;
		this._swatchLabel.text = SKIN_TONE_SWATCHES[tone];
		this.emit('tone-changed', tone);
	}
}
