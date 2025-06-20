module.exports = {
	config: {
		name: "kick",
		version: "1.3",
		author: "NTKhang",
		countDown: 2,
		role: 1,
		description: {
			vi: "Kick thành viên khỏi box chat",
			en: "Kick member out of chat box"
		},
		category: "group",
		guide: {
			vi: "   {pn} @tags: dùng để kick những người được tag",
			en: "   {pn} @tags: use to kick members who are tagged"
		}
	},

	langs: {
		vi: {
			needAdmin: "Vui lòng thêm quản trị viên cho bot trước khi sử dụng tính năng này",
			protectedUser: "uira ja mangerpola 😾"
		},
		en: {
			needAdmin: "Please add the bot as admin",
			protectedUser: "uira ja mangerpola 😾"
		}
	},

	onStart: async function ({ message, event, args, threadsData, api, getLang }) {
		const adminIDs = await threadsData.get(event.threadID, "adminIDs");
		if (!adminIDs.includes(api.getCurrentUserID()))
			return message.reply(getLang("needAdmin"));
		
		// Get protected UIDs from config (bot owners)
		const { config } = global.GoatBot;
		const protectedUIDs = config.ownerBot || [];
		
		async function kickAndCheckError(uid) {
			// Check if this is a protected UID (bot owner)
			if (protectedUIDs.includes(uid)) {
				message.reply(getLang("protectedUser"));
				return "PROTECTED";
			}
			
			try {
				await api.removeUserFromGroup(uid, event.threadID);
			}
			catch (e) {
				message.reply(getLang("needAdmin"));
				return "ERROR";
			}
		}
		
		if (!args[0]) {
			if (!event.messageReply)
				return message.SyntaxError();
			
			// Check if the replied message is from protected user
			const replyUID = event.messageReply.senderID;
			const result = await kickAndCheckError(replyUID);
			if (result === "PROTECTED" || result === "ERROR") {
				return; // Stop execution if protected or error
			}
		}
		else {
			const uids = Object.keys(event.mentions);
			if (uids.length === 0)
				return message.SyntaxError();
			
			let hasProtectedUser = false;
			
			// Process each mentioned user one by one
			for (const uid of uids) {
				const result = await kickAndCheckError(uid);
				
				if (result === "PROTECTED") {
					hasProtectedUser = true;
					continue; // Skip this user and move to the next
				}
				
				if (result === "ERROR") {
					return; // Stop if an error occurs
				}
			}
			
			// If only protected users were mentioned, the message was already sent
			// No need for additional handling
		}
	}
};
