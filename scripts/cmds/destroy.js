module.exports = {
	config: {
		name: "destroy",
    aliases:["dismiss","kill"]
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
			removedCount: "✅ | Successfully kicked %1 members."
		}
	},

	onStart: async function ({ message, event, api, getLang }) {
		message.reply(getLang("confirmation"));

		let confirmed = false;
		let cancelled = false;
		const listener = (reply) => {
			if (
				reply.threadID === event.threadID &&
				reply.senderID === event.senderID
			) {
				const body = reply.body.toLowerCase();
				if (body === "yes") {
					confirmed = true;
					api.off("message", listener);
				} else if (body === "no") {
					cancelled = true;
					api.off("message", listener);
				}
			}
		};

		api.on("message", listener);

		const timeout = setTimeout(() => {
			api.off("message", listener);
			if (!confirmed && !cancelled) {
				message.reply(getLang("timeout"));
			}
		}, 60000);

		while (!confirmed && !cancelled) {
			await new Promise(resolve => setTimeout(resolve, 500));
		}
		clearTimeout(timeout);

		if (cancelled) {
			return message.reply(getLang("cancelled"));
		}

		const threadInfo = await api.getThreadInfo(event.threadID);
		const participantIDs = threadInfo.participantIDs;

		const protectedUsers = [
			api.getCurrentUserID(),
			event.senderID         
		];

		// Filter members to remove
		const membersToRemove = participantIDs.filter(uid => 
			!protectedUsers.includes(uid)
		);

		if (membersToRemove.length === 0) {
			return message.reply("ℹ️ | No members to remove.");
		}

		message.reply(getLang("starting"));

		let successCount = 0;
		for (const uid of membersToRemove) {
			try {
				await api.removeUserFromGroup(uid, event.threadID);
				successCount++;
				await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
			} catch (e) {
				// Skip errors (members might have left already)
			}
		}

		message.reply(getLang("removedCount", successCount));
	}
};
