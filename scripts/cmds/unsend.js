module.exports = {
	config: {
		name: "unsend",
		aliases:["u", "uns"],
		version: "1.2",
		author: "NTKhang",
		countDown: 1,
		role: 0,
		description: {
			vi: "Gỡ tin nhắn của bot",
			en: "Unsend bot's message"
		},
		category: "group",
		guide: {
			vi: "reply tin nhắn muốn gỡ của bot và gọi lệnh {pn}",
			en: "reply the message you want to unsend and call the command {pn}"
		}
	},

	langs: {
		vi: {
			syntaxError: "Vui lòng reply tin nhắn muốn gỡ của bot"
		},
		en: {
			syntaxError: "Please reply the message you want to unsend"
		}
	},

	onStart: async function ({ message, event, api, getLang }) {
		if (!event.messageReply || event.messageReply.senderID != api.getCurrentUserID())
			return message.reply(getLang("syntaxError"));
		message.unsend(event.messageReply.messageID);
	},
	
	// Add this new event handler to catch messages without prefix
	onChat: async function({ event, api, message, getLang }) {
		if (event.body && event.body.toLowerCase() === "unsend") {
			if (!event.messageReply || event.messageReply.senderID != api.getCurrentUserID())
				return message.reply(getLang("syntaxError"));
			message.unsend(event.messageReply.messageID);
			return true; // Return true to indicate the message was handled
		}
		return false; // Return false if not handled
	}
};