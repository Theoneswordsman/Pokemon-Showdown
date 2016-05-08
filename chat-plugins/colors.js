/* Custom color plugin
 * by jd and panpawn
 */

var filepath = 'config/customcolors.json';
var customColors = {};
var fs = require('fs');
var request = require('request');

function load () {
	fs.readFile(filepath, 'utf8', function (err, file) {
		if (err) return;
		customColors = JSON.parse(file);
	});
}
load();

function updateColor() {
	fs.writeFileSync(filepath, JSON.stringify(customColors));

	var newCss = '/* COLORS START */\n';

	for (var name in customColors) {
		newCss += generateCSS(name, customColors[name]);
	}
	newCss += '/* COLORS END */\n';

	var file = fs.readFileSync('config/custom.css', 'utf8').split('\n');
	if (~file.indexOf('/* COLORS START */')) file.splice(file.indexOf('/* COLORS START */'), (file.indexOf('/* COLORS END */') - file.indexOf('/* COLORS START */')) + 1);
	fs.writeFileSync('config/custom.css', file.join('\n') + newCss);
	request('http://play.pokemonshowdown.com/customcss.php?server=gold&invalidate', function callback(error, res, body) {
		if (error) return console.log('updateColor error: ' + error);
	});
}
Gold.updateColor = updateColor;

function generateCSS(name, color) {
	var css = '';
	var rooms = [];
	name = toId(name);
	for (var room in Rooms.rooms) {
		if (Rooms.rooms[room].id === 'global' || Rooms.rooms[room].type !== 'chat' || Rooms.rooms[room].isPersonal) continue;
		rooms.push('#' + Rooms.rooms[room].id + '-userlist-user-' + name + ' strong em');
		rooms.push('#' + Rooms.rooms[room].id + '-userlist-user-' + name + ' strong');
		rooms.push('#' + Rooms.rooms[room].id + '-userlist-user-' + name + ' span');
	}
	css = rooms.join(', ');
	css += '{\ncolor: ' + color + ' !important;\n}\n';
	css += '.chat.chatmessage-' + name + ' strong {\n';
	css += 'color: ' + color + ' !important;\n}\n';
	return css;
}

exports.commands = {
	customcolour: 'customcolor',
	customcolor: function (target, room, user) {
		if (!this.can('pban')) return false;
		target = target.split(',');
		for (var u in target) target[u] = target[u].trim();
		if (!target[1]) return this.parse('/help customcolor');
		if (toId(target[0]).length > 19) return this.errorReply("Usernames are not this long...");
		if (target[1] === 'delete') {
			if (!customColors[toId(target[0])]) return this.errorReply('/customcolor - ' + target[0] + ' does not have a custom color.');
			delete customColors[toId(target[0])];
			updateColor();
			this.sendReply("You removed " + target[0] + "'s custom color.");
			Rooms('staff').add(user.name + " removed " + target[0] + "'s custom color.").update();
			this.privateModCommand("(" + target[0] + "'s custom color was removed by " + user.name + ".)");
			if (Users(target[0]) && Users(target[0]).connected) Users(target[0]).popup(user.name + " removed your custom color.");
			return;
		}

		this.sendReply("|raw|You have given <b><font color=" + target[1] + ">" + Tools.escapeHTML(target[0]) + "</font></b> a custom color.");
		Rooms('staff').add('|raw|' + Tools.escapeHTML(target[0]) + " has recieved a <b><font color=" + target[1] + ">custom color</fon></b> from " + Tools.escapeHTML(user.name) + ".").update();
		this.privateModCommand("(" + target[0] + " has recieved custom color: '" + target[1] + "' from " + user.name + ".)");
		customColors[toId(target[0])] = target[1];
		updateColor();
	},
	customcolorhelp: ["Commands Include:",
				"/customcolor [user], [hex] - Gives [user] a custom color of [hex]",
				"/customcolor [user], delete - Deletes a user's custom color"],

	colorpreview: function (target, room, user) {
		if (!this.runBroadcast()) return;
		target = target.split(',');
		for (var u in target) target[u] = target[u].trim();
		if (!target[1]) return this.parse('/help colorpreview');
		return this.sendReplyBox('<b><font size="3" color="' +  target[1] + '">' + Tools.escapeHTML(target[0]) + '</font></b>');
	},
	colorpreviewhelp: ["Usage: /colorpreview [user], [color] - Previews what that username looks like with [color] as the color."],
};



/* Pokemon Showdown hashColor function
 * This gives the color of a username
 * based on the userid.
*/

var MD5 = require('MD5');
var colorCache = {};

// hashColor function
function hashColor(name) {
	name = toId(name);
	if (customColors[name]) return customColors[name];
	if (mainCustomColors[name]) name = mainCustomColors[name];
	if (colorCache[name]) return colorCache[name];
	var hash = MD5(name);
	var H = parseInt(hash.substr(4, 4), 16) % 360; // 0 to 360
	var S = parseInt(hash.substr(0, 4), 16) % 50 + 40; // 40 to 89
	var L = Math.floor(parseInt(hash.substr(8, 4), 16) % 20 + 30); // 30 to 49
	var C = (100 - Math.abs(2 * L - 100)) * S / 100 / 100;
	var X = C * (1 - Math.abs((H / 60) % 2 - 1));
	var m = L / 100 - C / 2;

	var R1, G1, B1;
	switch (Math.floor(H / 60)) {
		case 1: R1 = X; G1 = C; B1 = 0; break;
		case 2: R1 = 0; G1 = C; B1 = X; break;
		case 3: R1 = 0; G1 = X; B1 = C; break;
		case 4: R1 = X; G1 = 0; B1 = C; break;
		case 5: R1 = C; G1 = 0; B1 = X; break;
		case 0: default: R1 = C; G1 = X; B1 = 0; break;
	}
	var lum = (R1 + m) * 0.2126 + (G1 + m) * 0.7152 + (B1 + m) * 0.0722; // 0.05 (dark blue) to 0.93 (yellow)
	var HLmod = (lum - 0.5) * -100; // -43 (yellow) to 45 (dark blue)
	if (HLmod > 12) HLmod -= 12;
	else if (HLmod < -10) HLmod = (HLmod + 10) * 2 / 3;
	else HLmod = 0;

	L += HLmod;
	var Smod = 10 - Math.abs(50 - L);
	if (HLmod > 15) Smod += (HLmod - 15) / 2;
	S -= Smod;

	var rgb = hslToRgb(H, S, L);
	colorCache[name] = "#" + rgbToHex(rgb.r, rgb.g, rgb.b);
	return colorCache[name];
}
exports.hashColor = hashColor;
Gold.hashColor = hashColor;


// Mains custom username colors
// https://play.pokemonshowdown.com/js/config.js
var mainCustomColors = {
	'theimmortal': 'taco',
	'bmelts': 'testmelts',
	'zarel': 'aeo',
	'zarell': 'aeo',
	'greatsage': 'test454',
	// 'snowflakes': 'snowflake',
	'jumpluff': 'zacchaeus',
	'zacchaeus': 'jumpluff',
	'kraw': 'kraw1',
	'growlithe': 'steamroll',
	'snowflakes': 'endedinariot',
	'doomvendingmachine': 'theimmortal',
	'mikel': 'mikkel',
	'arcticblast': 'rsem',
	'mjb': 'thefourthchaser',
	'thefourthchaser': 'mjb',
	'tfc': 'mjb',
	'mikedecishere': 'mikedec3boobs',
	'heartsonfire': 'haatsuonfaiyaa',
	'royalty': 'wonder9',
	// 'osiris': 'yamraiha',
	'limi': 'azure2',
	'haunter': 'cathy',
	'ginganinja': 'piratesandninjas',
	'aurora': 'c6n6fek',
	'jdarden': 'danielcross',
	'solace': 'amorlan',
	'dcae': 'galvatron',
	'queenofrandoms': 'hahaqor',
	'jelandee': 'thejelandee',
	'diatom': 'dledledlewhooop',
	// 'waterbomb': 'wb0',
	'texascloverleaf': 'aggronsmash',
	'treecko': 'treecko56',
	'treecko37': 'treecko56',
	'violatic': 'violatic92',
	'exeggutor': 'ironmanatee',
	'ironmanatee': 'exeggutor',
	// 'shamethat': 'aaa10',
	'skylight': 'aerithass',
	// 'prem': 'premisapieceofshit',
	'goddessbriyella': 'jolteonxvii', // third color change
	'nekonay': 'catbot20',
	'coronis': 'kowonis',
	'vaxter': 'anvaxter',
	'mattl': 'mattl34',
	'shaymin': 'test33',
	// 'orphic': 'dmt6922',
	'kayo': 'endedinariot',
	'tgmd': 'greatmightydoom',
	'vacate': 'vacatetest',
	'bean': 'dragonbean',
	'yunan': 'osiris13',
	'politoed': 'brosb4hoohs',
	'scotteh': 'nsyncluvr67',
	'bumbadadabum': 'styrofoamboots',
	'yuihirasawa': 'weeabookiller',
	'monohearted': 'nighthearted',
	'prem': 'erinanakiri', // second color change
	'clefairy': 'fuckes',
	'morfent': 'aaaa',
	'crobat': 'supergaycrobat4',
	'beowulf': '298789z7z',
	'flippy': 'flippo',
	'raoulsteve247': 'raoulbuildingpc',
	'thedeceiver': 'colourtest011',
	'darnell': 'ggggggg',
	'shamethat': 'qpwkfklkjpskllj', // second color change
	'aipom': 'wdsddsdadas',
	'alter': 'spakling',
	'biggie': 'aoedoedad',
	'osiris': 'osiris12', // second color change
	'azumarill': 'azumarill69',
	'redew': 'redeww',
	'sapphire': 'masquerains',
	'calyxium': 'calyxium142',
	'kiracookie': 'kracookie',
	'blitzamirin': 'hikaruhitachii',
	'skitty': 'shckieei',
	'sweep': 'jgjjfgdfg', // second color change
	'panpawn': 'crowt',
	'val': 'pleasegivemecolorr',
	'valentine': 'pleasegivemecolorr',
	'briayan': 'haxorusxi',
	'xzern': 'mintycolors',
	'shgeldz': 'cactusl00ver',
	'abra': 'lunchawaits',
	'maomiraen': 'aaaaaa',
	'trickster': 'sunako',
	'articuno': 'bluekitteh177',
	// 'antemortem': 'abc11092345678',
	'scene': 'aspire',
	'barton': 'hollywood15',
	// 'psych': 'epicwome',
	'zodiax': 'coldeann',
	'ninetynine': 'blackkkk',
	'kasumi': 'scooter4000',
	'xylen': 'bloodyrevengebr',
	'aelita': 'y34co3',
	'fx': 'cm48ubpq',
	'horyzhnz': 'superguy69',
	'quarkz': 'quarkz345',
	'fleurdyleurse': 'calvaryfishes',
	'trinitrotoluene': '4qpr7pc5mb',
	'rekeri': 'qgadlu6g',
	'austin': 'jkjkjkjkjkgdl',
	'jinofthegale': 'cainvelasquez',
	'waterbomb': 'naninan',
	'starbloom': 'taigaaisaka',
	'macle': 'flogged',
	'ashiemore': 'poncp',
	'charles': 'charlescarmichael',
	'sigilyph': 'ek6',
	'spy': 'spydreigon',
	'kinguu': 'dodmen',
	'dodmen': 'kinguu',
	'halite': 'cjilkposqknolssss',
	'magnemite': 'dsfsdffs',
	'ace': 'sigilyph143',
	'leftiez': 'xxxxnbbhiojll',
	'grim': 'grimoiregod',
	'strength': '0v0tqpnu',
	'advantage': 'nsyncluvr67',
	'quote': 'quotecs',
	'snow': 'q21yzqgh',
	'omegaxis': 'omegaxis14',
	'paradise': 'rnxvzwpwtz',
	'sailorcosmos': 'goldmedalpas',
	'dontlose': 'dhcli22h',
	'tatsumaki': 'developmentary',
	'starry': 'starryblanket',
	'cathy': '' //{color: '#ff5cb6'}
};

function hslToRgb(h, s, l) {
	var r, g, b, m, c, x;
	if (!isFinite(h)) h = 0;
	if (!isFinite(s)) s = 0;
	if (!isFinite(l)) l = 0;
	h /= 60;
	if (h < 0) h = 6 - (-h % 6);
	h %= 6;
	s = Math.max(0, Math.min(1, s / 100));
	l = Math.max(0, Math.min(1, l / 100));
	c = (1 - Math.abs((2 * l) - 1)) * s;
	x = c * (1 - Math.abs((h % 2) - 1));
	if (h < 1) {
		r = c;
		g = x;
		b = 0;
	} else if (h < 2) {
		r = x;
		g = c;
		b = 0;
	} else if (h < 3) {
		r = 0;
		g = c;
		b = x;
	} else if (h < 4) {
		r = 0;
		g = x;
		b = c;
	} else if (h < 5) {
		r = x;
		g = 0;
		b = c;
	} else {
		r = c;
		g = 0;
		b = x;
	}
	m = l - c / 2;
	r = Math.round((r + m) * 255);
	g = Math.round((g + m) * 255);
	b = Math.round((b + m) * 255);
	return {
		r: r,
		g: g,
		b: b,
	};
}

function rgbToHex(R, G, B) {
	return toHex(R) + toHex(G) + toHex(B);
}

function toHex(N) {
	if (N == null) return "00";
	N = parseInt(N);
	if (N == 0 || isNaN(N)) return "00";
	N = Math.max(0, N);
	N = Math.min(N, 255);
	N = Math.round(N);
	return "0123456789ABCDEF".charAt((N - N % 16) / 16) + "0123456789ABCDEF".charAt(N % 16);
}
