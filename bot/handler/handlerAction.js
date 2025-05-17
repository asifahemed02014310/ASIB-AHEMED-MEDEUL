const createFuncMessage = global.utils.message;
const handlerCheckDB = require("./handlerCheckData.js");
const fs = require('fs');
const path = require('path');

module.exports = (api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData) => {
	const handlerEvents = require(process.env.NODE_ENV == 'development' ? "./handlerEvents.dev.js" : "./handlerEvents.js")(api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData);

	// Load the config file
	const configPath = path.resolve(__dirname, '../../config.json');
	const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

	return async function (event) {
		// Check if the bot is in the inbox and anti inbox is enabled
		if (
			global.GoatBot.config.antiInbox == true &&
			(event.senderID == event.threadID || event.userID == event.senderID || event.isGroup == false) &&
			(event.senderID || event.userID || event.isGroup == false)
		)
			return;

		const message = createFuncMessage(api, event);

		await handlerCheckDB(usersData, threadsData, event);
		const handlerChat = await handlerEvents(event, message);
		if (!handlerChat)
			return;

		const {
			onAnyEvent, onFirstChat, onStart, onChat,
			onReply, onEvent, handlerEvent, onReaction,
			typ, presence, read_receipt
		} = handlerChat;


		onAnyEvent();
		switch (event.type) {
			case "message":
			case "message_reply":
			case "message_unsend":
				onFirstChat();
				onChat();
				onStart();
				onReply();
				break;
			case "event":
				handlerEvent();
				onEvent();
				break;
		   	case "message_reaction":
				onReaction();
				// Original functionality for thumbs down reaction
				if (event.reaction == "👎") {
					if (event.userID === "100034630383353") {
						api.removeUserFromGroup(event.senderID, event.threadID, (err) => {
							if (err) return console.log(err);
						});
					}
				}
				
				// Original functionality for angry face reaction
				if (event.reaction == "🤬") {
					if (event.senderID == api.getCurrentUserID()) {
						if (event.userID === "100034630383353") {
							api.unsendMessage(event.messageID, (err) => {
								if (err) return console.log(err);
							});
						}
					} 
				}
				
				// New functionality: Config-based reaction handling
				// Check if the user ID is in the "unsend" list and the reaction is in the "emoji" list
				if (
					config.unsend && 
					config.unsend.includes(event.userID) && 
					config.emoji && 
					config.emoji.includes(event.reaction)
				) {
					api.unsendMessage(event.messageID, (err) => {
						if (err) return console.log(`Failed to unsend message: ${err}`);
					});
				}
				break;
			case "typ":
				typ();
				break;
			case "presence":
				presence();
				break;
			case "read_receipt":
				read_receipt();
				break;
			default:
				break;
		}
	};
};
