import Gio from 'gi://Gio';
import St from 'gi://St';

import CopyousExtension from '../../../extension.js';
import { registerClass } from '../../common/gjs.js';
import { Icon, loadIcon } from '../../common/icons.js';

@registerClass()
export class IncognitoButton extends St.Button {
	private readonly _incognitoIcon: Gio.Icon;
	private readonly _incognitoDisabledIcon: Gio.Icon;
	private readonly _icon: St.Icon;

	constructor(
		private readonly _ext: CopyousExtension,
		properties?: Partial<St.Button.ConstructorProps>,
	) {
		super({ ...properties, toggle_mode: true, can_focus: true });

		this._incognitoIcon = loadIcon(_ext, Icon.Incognito);
		this._incognitoDisabledIcon = loadIcon(_ext, Icon.IncognitoDisabled);

		this._icon = new St.Icon({ gicon: this._incognitoDisabledIcon });
		this.child = this._icon;

		this._ext.settings.connectObject('changed::incognito', this.update.bind(this), this);
		this.connect('notify::checked', () => {
			this._ext.settings.set_boolean('incognito', this.checked);
			this.update();
		});
		this.update();
	}

	override destroy() {
		this._ext.settings.disconnectObject(this);
		super.destroy();
	}

	private update() {
		const isIncognito = this._ext.settings.get_boolean('incognito');
		this.checked = isIncognito;
		this._icon.gicon = isIncognito ? this._incognitoIcon : this._incognitoDisabledIcon;
	}
}
