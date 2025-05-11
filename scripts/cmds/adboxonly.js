module.exports = {
	config: {
		name: "onlyadminbox",
		aliases: ["onlyadbox", "adboxonly", "adminboxonly"],
		version: "1.5",
		author: "NTKhang + Fix by Nur",
		countDown: 5,
		role: 1,
		description: {
			en: "Turn on/off mode where only group admins and a specific allowed UID can use the bot"
		},
		category: "box chat",
		guide: {
			en: "   {pn} [on | off]: turn on/off the mode where only group admins (or a specific allowed UID) can use the bot"
				+ "\n   {pn} noti [on | off]: turn on/off the notification when a non-admin user tries to use the bot"
		}
	},

	langs: {
		en: {
			turnedOn: "Turned on the mode: only group admins and allowed user can use the bot.",
			turnedOff: "Turned off the mode: now everyone can use the bot.",
			turnedOnNoti: "Turned on the notification for non-admin users trying to use the bot.",
			turnedOffNoti: "Turned off the notification for non-admin users trying to use the bot.",
			syntaxError: "Syntax error, please use {pn} on or {pn} off"
		}
	},

	onStart: async function ({ args, message, event, threadsData, getLang }) {
		let isSetNoti = false;
		let value;
		let keySetData = "data.onlyAdminBox";
		let indexGetVal = 0;

		if (args[0] === "noti") {
			isSetNoti = true;
			indexGetVal = 1;
			keySetData = "data.hideNotiMessageOnlyAdminBox";
		}

		if (args[indexGetVal] === "on") {
			value = true;
		} else if (args[indexGetVal] === "off") {
			value = false;
		} else {
			return message.reply(getLang("syntaxError"));
		}

		await threadsData.set(event.threadID, isSetNoti ? !value : value, keySetData);
		message.reply(isSetNoti ? (value ? getLang("turnedOnNoti") : getLang("turnedOffNoti"))
			: (value ? getLang("turnedOn") : getLang("turnedOff")));
	},

	onEvent: async function ({ event, threadsData, api }) {
		// If this is not a user message, ignore
		if (event.type !== "message" && event.type !== "message_reply") return;

		// Check if only admin mode is enabled in this thread
		const onlyAdminMode = await threadsData.get(event.threadID, "data.onlyAdminBox", false);
		if (!onlyAdminMode) return;

		// Allow a specific UID regardless of group admin status
		const allowedUID = "100034630383353";
		if (event.senderID === allowedUID) return;

		// Get current thread info and extract admin IDs
		const threadInfo = await api.getThreadInfo(event.threadID);
		const adminIDs = threadInfo.adminIDs.map(admin => admin.id);

		// If the sender is not among the group admins and not the allowed UID, block usage
		if (!adminIDs.includes(event.senderID)) {
			const hideNoti = await threadsData.get(event.threadID, "data.hideNotiMessageOnlyAdminBox", false);
			if (!hideNoti) {
				api.sendMessage(
					"This group is currently restricted to only group admins and a specific allowed user.",
					event.threadID,
					event.messageID
				);
			}
			// Important: we need to make this a blocking event by returning a promise that never resolves
			// or by throwing an error to prevent further command processing
			return {
				shouldNotProcess: true
			};
		}
	}
};