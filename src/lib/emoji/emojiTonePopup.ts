import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { SignalMethods, registerClass } from '../common/gjs.js';
import { SKIN_TONE_SWATCHES } from './emojiTypes.js';

const TonePopupSignals = {
	'tone-selected': {
		param_types: [GObject.TYPE_INT],
	},
} as const;

@registerClass({
	Signals: TonePopupSignals,
})
export class EmojiTonePopup extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof TonePopupSignals>['emit'];

	constructor() {
		super({
			orientation: Clutter.Orientation.HORIZONTAL,
			style_class: 'emoji-tone-popup',
			visible: false,
			x_align: Clutter.ActorAlign.END,
			y_align: Clutter.ActorAlign.END,
		});

		SKIN_TONE_SWATCHES.forEach((swatch, index) => {
			const button = new St.Button({
				style_class: 'emoji-tone-option-button',
				can_focus: true,
				track_hover: true,
				child: new St.Label({
					text: swatch,
					style_class: 'emoji-tone-swatch-label',
				}),
			});

			button.connect('clicked', () => {
				this.emit('tone-selected', index);
				this.close();
			});

			this.add_child(button);
		});
	}

	get isOpen(): boolean {
		return this.visible;
	}

	open(): void {
		this.visible = true;
	}

	close(): void {
		this.visible = false;
	}

	toggle(): void {
		this.visible = !this.visible;
	}
}
