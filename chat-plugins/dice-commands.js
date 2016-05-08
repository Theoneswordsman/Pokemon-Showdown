/* Dice commands chat-plugin
 * by jd
*/
var tax = 0.10; // 10%

function handleWinnings (bet) {
	return bet - Math.round(bet * tax);
}

exports.commands = {
	gambledicehelp: function(target, room, user) {
		if (!this.runBroadcast()) return;
		this.sendReplyBox(
			'Dice game commands: <br />' +
			'/startdice <bet> - Starts a game.<br />' +
			'/joindice - Joins the game.<br />' +
			'/enddice - Forcibly ends the game.'
		);
	},
	dicestart: 'startdice',
	startdice: function(target, room, user) {
	 	if (!this.canTalk()) return this.errorReply("You can not start dice games while unable to speak.");
	 	if (room.id !== 'gamechamber' && !user.can('pban')) return this.sendReply("Dice games should only be started in \"Game Chamber\".");
	 	//if (!user.can('broadcast',null,room)) return this.errorReply('/startdice - Access denied.');
	 	if (!target) return this.errorReply('Usage: /startdice <bet>');
	 	if (isNaN(Number(target))) return this.errorReply('/startdice - <bet> must be a number greater than 0');
	 	target = Math.round(Number(target));
	 	if (target < 1) return this.errorReply('/startdice - You can not bet less than one buck.');
	 	if (target > 5000) return this.errorReply('/startdice - You can\'t bet more than 5,000 bucks.');

	 	Economy.readMoney(user.userid, (userMoney) => {
	 		if (!room.dice) room.dice = {};
	 		if (!room.dice.status) room.dice.status = 0;
	 		if (room.dice.status > 0) return this.errorReply('/startdice - There is already a game started in here!');
	 		room.dice.status = 1;
	 		room.dice.bet = target;
	 		room.dice.startTime = Date.now();
	 		room.addRaw('<div class="infobox"><h2><center><font color="' + Gold.hashColor(user.name) + '">' + Tools.escapeHTML(user.name) + '</font> <font color=#24678d>has started a dice game for </font><font color=red>' + target +
	 			' </font><font color=#24678d> buck' + Gold.pluralFormat(target) + '.</font><br /> <button name="send" value="/joindice">Click to join.</button></center></h2></div>');
	 		room.update();
	 	});
	},

	joindice: function(target, room, user) {
		if (!this.canTalk()) return this.errorReply("You may not join dice games while unable to speak.");
	 	if (!room.dice) return this.errorReply('There is no dice game in it\'s signup phase in this room.');
	 	if (room.dice.status !== 1) return this.errorReply('There is no dice game in it\'s signup phase in this room.');

	 	room.dice.status = 2;
	 	Economy.readMoney(user.userid, (userMoney) => {
	 		if (userMoney < room.dice.bet) {
	 			this.errorReply('You don\'t have enough bucks to join this game.');
	 			return room.dice.status = 1;
	 		}
	 		if (!room.dice.player1) {
	 			room.dice.player1 = user.userid;
	 			room.dice.status = 1;
	 			room.addRaw('<b><font color="' + Gold.hashColor(user.name) + '">' + Tools.escapeHTML(user.name) + '</font> has joined the dice game.</b>');
	 			return room.update();
	 		}
	 		if (room.dice.player1 === user.userid) return room.dice.status = 1;
	 		if (room.dice.player1 !== user.userid) {
	 			room.dice.player2 = user.userid;
	 			if (!Users(room.dice.player1) || !Users(room.dice.player1).userid) {
	 				room.addRaw("<b>Player 1 seems to be missing... game ending.</b>");
	 				delete room.dice.player1;
	 				delete room.dice.player2;
	 				delete room.dice.bet;
	 				delete room.dice.startTime;
	 				room.update();
	 				return false;
	 			}
	 			if (!Users(room.dice.player2) || !Users(room.dice.player2).userid) {
	 				room.addRaw("<b>Player 2 seems to be missing... game ending.</b>");
	 				delete room.dice.player1;
	 				delete room.dice.player2;
	 				delete room.dice.bet;
	 				delete room.dice.startTime;
	 				room.update();
	 				return false;
	 			}
	 			if (room.dice.player1 !== Users.get(room.dice.player1).userid) {
	 				room.addRaw('<b>Player 1 has changed names, game ending.</b>');
	 				room.dice.status = 0;
	 				delete room.dice.player1;
	 				delete room.dice.player2;
	 				delete room.dice.bet;
	 				delete room.dice.startTime;
	 				room.update();
	 				return false;
	 			}
	 			room.addRaw('<b><font color="' + Gold.hashColor(user.name) + '">' + Tools.escapeHTML(user.name) + '</font> has joined the dice game.</b>');
	 			room.update();
	 			var firstNumber = Math.floor(6 * Math.random()) + 1;
	 			var secondNumber = Math.floor(6 * Math.random()) + 1;
	 			var firstName = Users.get(room.dice.player1).name;
	 			var secondName = Users.get(room.dice.player2).name;
	 			Economy.readMoney(toId(firstName), function (firstMoney) {
		 			Economy.readMoney(toId(secondName), function(secondMoney) {
	 					if (firstMoney < room.dice.bet) {
							room.dice.status = 0;
	 						delete room.dice.player1;
	 						delete room.dice.player2;
	 						delete room.dice.bet;
	 						delete room.dice.startTime;
	 						room.addRaw('<b><font color="' + Gold.hashColor(firstName) + '">' + Tools.escapeHTML(firstName) + '</font> no longer has enough bucks to play, game ending.');
	 						return room.update();
	 					}
	 					if (secondMoney < room.dice.bet) {
							room.dice.status = 0;
	 						delete room.dice.player1;
	 						delete room.dice.player2;
	 						delete room.dice.bet;
	 						delete room.dice.startTime;
	 						room.addRaw('<b><font color="' + Gold.hashColor(secondName) + '">' + Tools.escapeHTML(secondName) + ' no longer has enough bucks to play, game ending.');
	 						return room.update();
	 					}
	 					var output = '<div class="infobox">Game has two players, starting now.<br />';
	 					output += 'Rolling the dice.<br />';
	 					output += Tools.escapeHTML(firstName) + ' has rolled a ' + firstNumber + '.<br />';
	 					output += Tools.escapeHTML(secondName) + ' has rolled a ' + secondNumber + '.<br />';
						while (firstNumber === secondNumber) {
							output += 'Tie... rolling again.<br />';
	 						firstNumber = Math.floor(6 * Math.random()) + 1;
	 						secondNumber = Math.floor(6 * Math.random()) + 1;
			 				output += Tools.escapeHTML(firstName) + ' has rolled a ' + firstNumber + '.<br />';
	 						output += Tools.escapeHTML(secondName) + ' has rolled a ' + secondNumber + '.<br />';
						}
						var betMoney = room.dice.bet;
	 					if (firstNumber > secondNumber) {
	 						output += '<b><font color="' + Gold.hashColor(firstName) + '">' + Tools.escapeHTML(firstName) + '</font></b> has won <font color=#24678d><b>' + handleWinnings(betMoney) + '</b></font> buck' + Gold.pluralFormat(betMoney) + '.<br />'
	 						output += 'Better luck next time, <font color="' + Gold.hashColor(secondName) + '">' + Tools.escapeHTML(secondName) + '</font>!';
	 						Economy.writeMoney(Users.get(firstName).userid, handleWinnings(betMoney), function() {
	 							Economy.writeMoney(Users.get(secondName).userid, -betMoney,function() {
	 								Economy.readMoney(Users.get(firstName).userid, function (firstMoney){
	 									Economy.readMoney(Users.get(secondName).userid, function (secondMoney) {
	 										//logDice(firstName + ' has won ' + betMoney + ' ' + ((betMoney === 1) ? " buck." : " bucks.") + ' from a dice game with ' + secondName + '. They now have ' + firstMoney);
	 										//logDice(secondName + ' has lost ' + betMoney + ' ' + ((betMoney === 1) ? " buck." : " bucks.") + ' from a dice game with ' + firstName + '. They now have ' + secondMoney);
	 									});
	 								});
	 							});
	 						});
	 						room.dice.status = 0;
	 						delete room.dice.player1;
	 						delete room.dice.player2;
	 						delete room.dice.bet;
	 						delete room.dice.startTime;
	 					}
	 					if (secondNumber > firstNumber) {
	 						output += '<b><font color="' + Gold.hashColor(secondName) + '">' + Tools.escapeHTML(secondName) + '</font></b> has won <font color=#24678d><b>' + handleWinnings(betMoney) + '</b></font> buck' + Gold.pluralFormat(betMoney) + '.<br />';
	 						output += 'Better luck next time <font color="' + Gold.hashColor(firstName) + '">' + Tools.escapeHTML(firstName) + '</font>!';
	 						Economy.writeMoney(Users.get(secondName).userid, handleWinnings(betMoney), function() {
	 							Economy.writeMoney(Users.get(firstName).userid, -betMoney,function() {
	 								Economy.readMoney(Users.get(firstName).userid, function(firstMoney){
		 								Economy.readMoney(Users.get(secondName).userid, function(secondMoney){
	 										//logDice(secondName + ' has won ' + betMoney + ' ' + ((betMoney === 1) ? " buck." : " bucks.") + ' from a dice game with ' + firstName + '. They now have ' + secondMoney);
	 										//logDice(firstName + ' has lost ' + betMoney + ' ' + ((betMoney === 1) ? " buck." : " bucks.") + ' from a dice game with ' + secondName + '. They now have ' + firstMoney);
		 								});
	 								});
	 							});
	 						});
	 						room.dice.status = 0;
	 						delete room.dice.player1;
	 						delete room.dice.player2;
	 						delete room.dice.bet;
	 						delete room.dice.startTime;
	 					}
	 					output += '</div>';
	 					room.addRaw(output);
	 					room.update();
	 				});
	 			});
	 		}
		});
	},
	enddice: function (target, room, user) {
		if (!this.canTalk()) return this.errorReply("You may not end dice games while unable to speak.");
		if (!room.dice) return this.errorReply('/enddice - There is no dice game in this room.');
		if (room.dice.status === 0) return this.errorReply('/enddice - There is no dice game in this room.');
		if ((Date.now() - room.dice.startTime) < 60000 && !user.can('broadcast', null, room)) return this.errorReply('Regular users may not end a dice game within the first minute of it starting.');
		room.dice = {};
		room.dice.status = 0;
		return this.add('|raw|<b><font color="' + Gold.hashColor(user.name) +'">' + Tools.escapeHTML(user.name) + '</font> ended the dice game.');
	},
};