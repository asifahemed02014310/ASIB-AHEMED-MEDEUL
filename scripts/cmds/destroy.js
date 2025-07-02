module.exports = {
	config: {
		name: "destroy",
		aliases: ["dismiss", "kill"],
		version: "1.0",
		author: "Hamim",
		countDown: 5,
		role: 2,
		description: {
			en: "🚫 Kick all members from chat group"
		},
		category: "group",
		guide: {
			en: "{pn}"
		}
	},

	langs: {
		en: {
			confirmation: "⚠️ | Are you really want to kick ALL members from this group?\n\nReply \"yes\" to confirm or \"no\" to cancel.",
			cancelled: "✅ | Operation cancelled.",
			timeout: "⏱️ | Confirmation timed out.",
			starting: "⏳ | Starting removal...",
			removedCount: "✅ | Successfully kicked %1 members.",
			needAdmin: "Please add the bot as admin before using this feature",
			errorOccurred: "❌ | An error occurred: %1",
			noMembers: "ℹ️ | No members to remove.",
			protectedUser: "Some users are protected and cannot be removed"
		}
	},

	onStart: async function ({ message, event, api, getLang, threadsData }) {
		try {
			// Check if bot is admin using the same method as kick command
			const adminIDs = await threadsData.get(event.threadID, "adminIDs");
			if (!adminIDs.includes(api.getCurrentUserID())) {
				return message.reply(getLang("needAdmin"));
			}

			// Send confirmation and set up reply listener
			message.reply(getLang("confirmation"), (err, info) => {
				if (!err) {
					global.GoatBot.onReply.set(info.messageID, {
						commandName: this.config.name,
						messageID: info.messageID,
						author: event.senderID,
						threadID: event.threadID
					});
				}
			});

		} catch (error) {
			console.error("Error in destroy command:", error);
			message.reply(getLang("errorOccurred", error.message || "Unknown error"));
		}
	},

	onReply: async function ({ message, event, api, Reply, getLang, threadsData }) {
		// Check if the reply is from the original command user
		if (Reply.author !== event.senderID) return;

		const userReply = event.body.toLowerCase().trim();

		if (userReply === "no") {
			return message.reply(getLang("cancelled"));
		}

		if (userReply !== "yes") {
			return; // Ignore other replies
		}

		try {
			// User confirmed, proceed with removal
			const threadInfo = await api.getThreadInfo(event.threadID);
			const botID = api.getCurrentUserID();
			
			// Get protected UIDs from config (bot owners) - same as kick command
			const { config } = global.GoatBot;
			const protectedUIDs = config.ownerBot || [];
			
			// Get thread admin IDs
			const adminIDs = await threadsData.get(event.threadID, "adminIDs");
			
			const participantIDs = threadInfo.participantIDs || [];

			// Protected users (bot, command sender, thread admins, and bot owners)
			const protectedUsers = [
				botID,
				event.senderID,
				...adminIDs, // Thread admins
				...protectedUIDs // Bot owners
			];

			// Filter members to remove
			const membersToRemove = participantIDs.filter(uid => 
				!protectedUsers.includes(uid)
			);

			if (membersToRemove.length === 0) {
				return message.reply(getLang("noMembers"));
			}

			await message.reply(getLang("starting"));

			let successCount = 0;
			let protectedCount = 0;
			
			// Function to kick user (same logic as kick command)
			async function kickAndCheckError(uid) {
				// Check if this is a protected UID (bot owner)
				if (protectedUIDs.includes(uid)) {
					protectedCount++;
					return "PROTECTED";
				}
				
				try {
					await api.removeUserFromGroup(uid, event.threadID);
					return "SUCCESS";
				}
				catch (e) {
					console.log(`Failed to remove user ${uid}:`, e.message);
					return "ERROR";
				}
			}
			
			// Remove members one by one with delay
			for (const uid of membersToRemove) {
				const result = await kickAndCheckError(uid);
				
				if (result === "SUCCESS") {
					successCount++;
				}
				
				// Add delay
				await new Promise(resolve => setTimeout(resolve, 1000));
			}

			let responseMessage = getLang("removedCount", successCount);
			if (protectedCount > 0) {
				responseMessage += `\n${getLang("protectedUser")}`;
			}

			message.reply(responseMessage);

		} catch (error) {
			console.error("Error in destroy command onReply:", error);
			message.reply(getLang("errorOccurred", error.message || "Unknown error"));
		}
	}
};
