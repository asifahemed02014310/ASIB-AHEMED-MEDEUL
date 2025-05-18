module.exports = {
	config: {
		name: "permit",
		version: "1.0",
		author: "NUR",
		countDown: 5,
		role: 2,
		shortDescription: {
			en: "Manage thread permissions"
		},
		description: {
			en: "Control which threads the bot can interact with"
		},
		category: "admin",
		guide: {
			en: "permit on: Enable permit mode (disables bot globally except for allowed threads)\n" +
				"permit off: Disable permit mode (bot works normally)\n" +
				"permit add <threadID>: Add a thread to the allowed list\n" +
				"permit delete <threadID>: Remove a thread from the allowed list\n" +
				"permit silent add <threadID>: Add a thread to the silent list (no reply at all)\n" +
				"permit silent delete <threadID>: Remove a thread from the silent list\n" +
				"permit list: Display lists of permitted and silent threads"
		}
	},

	langs: {
		en: {
			permitEnabled: "Permit mode has been enabled. Bot will only respond in permitted threads.",
			permitDisabled: "Permit mode has been disabled. Bot will respond in all threads.",
			invalidCommand: "Invalid command. Use 'permit on', 'permit off', 'permit add <threadID>', 'permit delete <threadID>', 'permit silent add <threadID>', 'permit silent delete <threadID>', or 'permit list'.",
			threadAdded: "Thread ID %1 has been added to permitted list.",
			threadRemoved: "Thread ID %1 has been removed from permitted list.",
			threadNotFound: "Thread ID %1 was not found in the permitted list.",
			threadAlreadyAdded: "Thread ID %1 is already in the permitted list.",
			silentThreadAdded: "Thread ID %1 has been added to silent list.",
			silentThreadRemoved: "Thread ID %1 has been removed from silent list.",
			silentThreadNotFound: "Thread ID %1 was not found in the silent list.",
			silentThreadAlreadyAdded: "Thread ID %1 is already in the silent list.",
			noPermission: "You don't have permission to use this command.",
			listHeader: "📋 List of permitted threads:",
			listEmpty: "There are no threads in the permitted list.",
			silentListHeader: "🔇 List of silent threads:",
			silentListEmpty: "There are no threads in the silent list.",
			replyToDelete: "Reply with 'del [number]' to remove a thread from the list.",
			deletedFromList: "Deleted thread #%1 from permitted list.",
			deletedFromSilentList: "Deleted thread #%1 from silent list.",
			invalidNumber: "Invalid number. Please enter a valid thread number.",
			noThreadList: "No thread list found to delete from.",
			permittedStatus: "Permit mode: %1"
		}
	},

	onStart: async function ({ api, args, message, event, globalData, globalModel, getLang, role }) {
		// Check if user has permission (role 2 - bot owner)
		if (role !== 2) {
			return message.reply(getLang("noPermission"));
		}

		// Get global data
		const permitData = await globalData.get("permitThread") || { enable: false, PermitIDs: [], silentIDs: [] };
		const command = args[0]?.toLowerCase();
		
		// Handle commands
		switch (command) {
			case "on":
				permitData.enable = true;
				await globalData.set("permitThread", permitData);
				return message.reply(getLang("permitEnabled"));
				
			case "off":
				permitData.enable = false;
				await globalData.set("permitThread", permitData);
				return message.reply(getLang("permitDisabled"));
				
			case "add":
				if (!args[1]) {
					return message.reply(getLang("invalidCommand"));
				}
				
				const threadIdToAdd = args[1];
				
				if (permitData.PermitIDs.includes(threadIdToAdd)) {
					return message.reply(getLang("threadAlreadyAdded", threadIdToAdd));
				}
				
				permitData.PermitIDs.push(threadIdToAdd);
				await globalData.set("permitThread", permitData);
				return message.reply(getLang("threadAdded", threadIdToAdd));
				
			case "delete":
				if (!args[1]) {
					return message.reply(getLang("invalidCommand"));
				}
				
				const threadIdToRemove = args[1];
				const threadIndex = permitData.PermitIDs.indexOf(threadIdToRemove);
				
				if (threadIndex === -1) {
					return message.reply(getLang("threadNotFound", threadIdToRemove));
				}
				
				permitData.PermitIDs.splice(threadIndex, 1);
				await globalData.set("permitThread", permitData);
				return message.reply(getLang("threadRemoved", threadIdToRemove));
				
			case "silent":
				const silentCommand = args[1]?.toLowerCase();
				const silentThreadId = args[2];
				
				if (!silentCommand || !silentThreadId || (silentCommand !== "add" && silentCommand !== "delete")) {
					return message.reply(getLang("invalidCommand"));
				}
				
				if (silentCommand === "add") {
					if (permitData.silentIDs.includes(silentThreadId)) {
						return message.reply(getLang("silentThreadAlreadyAdded", silentThreadId));
					}
					
					permitData.silentIDs.push(silentThreadId);
					await globalData.set("permitThread", permitData);
					return message.reply(getLang("silentThreadAdded", silentThreadId));
				} else {
					const silentThreadIndex = permitData.silentIDs.indexOf(silentThreadId);
					
					if (silentThreadIndex === -1) {
						return message.reply(getLang("silentThreadNotFound", silentThreadId));
					}
					
					permitData.silentIDs.splice(silentThreadIndex, 1);
					await globalData.set("permitThread", permitData);
					return message.reply(getLang("silentThreadRemoved", silentThreadId));
				}
				
			default:
				return message.reply(getLang("invalidCommand"));
		}
	}
};
