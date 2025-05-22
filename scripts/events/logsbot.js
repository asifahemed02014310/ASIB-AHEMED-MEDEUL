const { getTime } = global.utils;

module.exports = {
	config: {
		name: "logsbot",
		isBot: true,
		version: "1.5",
		author: "NTKhang",
		envConfig: {
			allow: true
		},
		category: "events"
	},

	langs: {
		vi: {
			added: "💥Bot được thêm vào nhóm mới!\n     ➥Người thêm: %1\n     ➥ID: %2\n     ➥Nhóm: %3\n     ➥ID nhóm: %4\n     ➥Thời gian: %5",
			kicked: "❌Bot bị kick khỏi nhóm!\n     ➥Người kick: %1\n     ➥ID: %2\n     ➥Nhóm: %3\n     ➥ID nhóm: %4\n     ➥Thời gian: %5"
		},
		en: {
			added: "💥𝗕𝗼𝘁 𝗵𝗮𝘀 𝗯𝗲𝗲𝗻 𝗮𝗱𝗱𝗲𝗱 𝘁𝗼 𝗮 𝗻𝗲𝘄 𝗴𝗿𝗼𝘂𝗽..!\n     ➥𝗔𝗱𝗱𝗲𝗱 𝗯𝘆 : %1\n     ➥ 𝗜𝗗: %2\n     ➥𝗚𝗿𝗼𝘂𝗽 : %3\n     ➥𝗜𝗗 : %4\n     ➥𝗧𝗶𝗺𝗲 : %5",
			kicked: "❌𝗕𝗼𝘁 𝗵𝗮𝘀 𝗯𝗲𝗲𝗻 𝗞𝗶𝗰𝗸𝗲𝗱 𝗳𝗿𝗼𝗺 𝘁𝗵𝗲 𝗴𝗿𝗼𝘂𝗽..!\n     ➥𝗞𝗶𝗰𝗸𝗲𝗱 𝗯𝘆 : %1\n     ➥ 𝗜𝗗: %2\n     ➥𝗚𝗿𝗼𝘂𝗽 : %3\n     ➥𝗜𝗗 : %4\n     ➥𝗧𝗶𝗺𝗲 : %5"
		}
	},

	onStart: async ({ usersData, threadsData, event, api, getLang }) => {
		const { author, threadID } = event;
		
		// Check if this is a bot being added or removed event
		const isAddedEvent = event.logMessageType === "log:subscribe" && 
			event.logMessageData.addedParticipants.some(item => item.userFbId == api.getCurrentUserID());
		
		const isRemovedEvent = event.logMessageType === "log:unsubscribe" && 
			event.logMessageData.leftParticipantFbId == api.getCurrentUserID();
		
		// If neither case applies, exit early
		if (!isAddedEvent && !isRemovedEvent) return;
		
		// Don't process if the bot added/removed itself
		if (author == api.getCurrentUserID()) return;
		
		const { config } = global.GoatBot;
		let threadName, msg;
		
		// Get Bangladesh time in 12-hour format
		const bangladeshTime = new Date().toLocaleString("en-US", {
			timeZone: "Asia/Dhaka",
			year: "numeric",
			month: "2-digit", 
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: true
		});
		
		try {
			if (isAddedEvent) {
				threadName = (await api.getThreadInfo(threadID)).threadName;
				const authorName = await usersData.getName(author);
				msg = getLang("added", authorName, author, threadName, threadID, bangladeshTime);
			}
			else if (isRemovedEvent) {
				const threadData = await threadsData.get(threadID);
				threadName = threadData.threadName;
				const authorName = await usersData.getName(author);
				msg = getLang("kicked", authorName, author, threadName, threadID, bangladeshTime);
			}

			// Flag variables to track successful delivery
			let ownerSent = false;
			let groupSent = false;

			// Send message to owners (individually to each owner)
			if (config.ownerBot && config.ownerBot.length > 0) {
				for (const ownerID of config.ownerBot) {
					try {
						await api.sendMessage(msg, ownerID);
						ownerSent = true;
					} catch (err) {
						console.error(`Error sending message to owner ${ownerID}:`, err);
					}
				}
			}

			// Send message to specific group
			try {
				await api.sendMessage(msg, "8724817120954173");
				groupSent = true;
			} catch (err) {
				console.error("Error sending message to group 8724817120954173:", err);
			}

			// Fallback: If no message was sent to owners, try group as fallback
			if (!ownerSent && !groupSent) {
				try {
					await api.sendMessage(msg, "8724817120954173");
					console.log("Fallback: Group message sent successfully.");
					groupSent = true;
				} catch (err) {
					console.error("Fallback failed: Unable to send message to group as well.", err);
				}
			}
			
			// Or, if group message fails, try owners as fallback
			if (!groupSent && !ownerSent && config.ownerBot && config.ownerBot.length > 0) {
				for (const ownerID of config.ownerBot) {
					try {
						await api.sendMessage(msg, ownerID);
						console.log(`Fallback: Message sent to owner ${ownerID} successfully.`);
						ownerSent = true;
						break; // Exit after first successful send
					} catch (err) {
						console.error(`Fallback failed: Unable to send message to owner ${ownerID}.`, err);
					}
				}
			}

		} catch (err) {
			console.error("Error in logsbot:", err);
		}
	}
};
