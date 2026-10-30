import Clutter from 'gi://Clutter';
import St from 'gi://St';

import CopyousExtension from '../../../extension.js';
import { SignalMethods, registerClass } from '../../common/gjs.js';
import { Icon, loadIcon } from '../../common/icons.js';
import { DialogTab } from './dialogTabsTypes.js';
import { IncognitoButton } from './incognitoButton.js';

const Signals = {
	'open-settings': {},
} as const;

@registerClass({ Signals })
export class DialogTabsUtilityBox extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof Signals>['emit'];

	private readonly _incognitoButton: IncognitoButton;

	constructor(ext: CopyousExtension) {
		super({ style_class: 'win-tabs-utility-box', y_align: Clutter.ActorAlign.CENTER });

		this._incognitoButton = new IncognitoButton(ext, { style_class: 'win-tab-utility-button' });
		this.add_child(this._incognitoButton);

		const settingsButton = new St.Button({
			style_class: 'win-tab-utility-button',
			child: new St.Icon({ gicon: loadIcon(ext, Icon.Settings) }),
			can_focus: true,
		});
		settingsButton.connect('clicked', () => this.emit('open-settings'));
		this.add_child(settingsButton);
	}

	updateActiveTab(tab: DialogTab): void {
		this._incognitoButton.visible = tab === DialogTab.Clipboard;
	}
}
