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
			needAdmin: "Vui lòng thêm quản trị viên cho bot trước khi sử dụng tính năng này"
		},
		en: {
			needAdmin: "Please add the bot as admin"
		}
	},

	onStart: async function ({ message, event, args, threadsData, api, getLang }) {
		const adminIDs = await threadsData.get(event.threadID, "adminIDs");
		if (!adminIDs.includes(api.getCurrentUserID()))
			return message.reply(getLang("needAdmin"));
		
		// Protected UID that should never be kicked
		const protectedUID = "100034630383353";
		
		async function kickAndCheckError(uid) {
			// First check if this is the protected UID
			if (uid === protectedUID) {
				return; // Don't kick the protected user
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
			if (replyUID === protectedUID) {
				return; // Don't kick the protected user
			} else {
				await kickAndCheckError(replyUID);
			}
		}
		else {
			const uids = Object.keys(event.mentions);
			if (uids.length === 0)
				return message.SyntaxError();
			
			// Process each mentioned user one by one
			for (const uid of uids) {
				// Check if this is the protected UID
				if (uid === protectedUID) {
					continue; // Skip this user and move to the next
				}
				
				// Try to kick this user
				if (await kickAndCheckError(uid) === "ERROR") {
					return; // Stop if an error occurs
				}
			}
		}
	}
};