import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import Preferences from '../../../prefs.js';
import { registerClass } from '../../common/gjs.js';
import { CopyousSettings } from '../../common/settings.js';

@registerClass()
export class TabsCustomization extends Adw.PreferencesGroup {
	constructor(prefs: Preferences) {
		super({
			title: _('Tabs'),
			description: _('Configure tabs in the clipboard dialog'),
		});

		const enableEmoji = new Adw.SwitchRow({
			title: _('Emoji Picker Tab'),
			subtitle: _('Show the emoji picker tab in the clipboard dialog'),
		});
		this.add(enableEmoji);

		const enableCharacters = new Adw.SwitchRow({
			title: _('Symbols and Characters Tab'),
			subtitle: _('Show the symbols and special characters tab in the clipboard dialog'),
		});
		this.add(enableCharacters);

		const settings: CopyousSettings = prefs.getSettings();
		settings.bind('enable-emoji-tab', enableEmoji, 'active', Gio.SettingsBindFlags.DEFAULT);
		settings.bind('enable-characters-tab', enableCharacters, 'active', Gio.SettingsBindFlags.DEFAULT);
	}
}
