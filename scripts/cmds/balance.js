module.exports = {
	config: {
		name: "balance",
		aliases: ["bal"],
		version: "1.3",
		author: "NTKhang update by Hamim",
		countDown: 5,
		role: 0,
		description: {
			vi: "xem số tiền hiện có của bạn hoặc người được tag, hoặc gửi tiền cho người khác",
			en: "view your money or the money of the tagged person, or send money to others"
		},
		category: "economy",
		guide: {
			vi: "   {pn}: xem số tiền của bạn"
				+ "\n   {pn} <@tag>: xem số tiền của người được tag"
				+ "\n   {pn} send <số tiền> <@tag>: gửi tiền cho người được tag"
				+ "\n   {pn} send <@tag> <số tiền>: gửi tiền cho người được tag",
			en: "   {pn}: view your money"
				+ "\n   {pn} <@tag>: view the money of the tagged person"
				+ "\n   {pn} send <amount> <@tag>: send money to the tagged person"
				+ "\n   {pn} send <@tag> <amount>: send money to the tagged person"
		}
	},

	langs: {
		vi: {
			money: "Bạn đang có %1$",
			moneyOf: "%1 đang có %2$",
			notEnoughMoney: "Bạn không có đủ tiền để gửi %1$",
			invalidAmount: "Số tiền không hợp lệ. Vui lòng nhập một số dương.",
			noMention: "Vui lòng tag người bạn muốn gửi tiền.",
			cannotSendToSelf: "Bạn không thể gửi tiền cho chính mình.",
			sendSuccess: "Đã gửi %1$ cho %2 thành công!",
			receiveNotification: "Bạn đã nhận được %1$ từ %2!"
		},
		en: {
			money: "You have %1$",
			moneyOf: "%1 has %2$",
			notEnoughMoney: "You don't have enough money to send %1$",
			invalidAmount: "Invalid amount. Please enter a positive number.",
			noMention: "Please mention the person you want to send money to.",
			cannotSendToSelf: "You cannot send money to yourself.",
			sendSuccess: "Successfully sent %1$ to %2!",
			receiveNotification: "You received %1$ from %2!"
		}
	},

	onStart: async function ({ message, usersData, event, getLang, args }) {
		// Check if this is a send command
		if (args[0] && args[0].toLowerCase() === "send") {
			return await this.handleSendMoney({ message, usersData, event, getLang, args });
		}

		// Original balance checking functionality
		if (Object.keys(event.mentions).length > 0) {
			const uids = Object.keys(event.mentions);
			let msg = "";
			for (const uid of uids) {
				const userMoney = await usersData.get(uid, "money");
				msg += getLang("moneyOf", event.mentions[uid].replace("@", ""), userMoney) + '\n';
			}
			return message.reply(msg);
		}
		const userData = await usersData.get(event.senderID);
		message.reply(getLang("money", userData.money));
	},

	handleSendMoney: async function ({ message, usersData, event, getLang, args }) {
		const senderID = event.senderID;
		
		// Check if user mentioned someone
		if (Object.keys(event.mentions).length === 0) {
			return message.reply(getLang("noMention"));
		}

		const recipientUID = Object.keys(event.mentions)[0];
		const recipientName = event.mentions[recipientUID].replace("@", "");

		// Check if user is trying to send money to themselves
		if (recipientUID === senderID) {
			return message.reply(getLang("cannotSendToSelf"));
		}

		let amount;
		
		// Find the amount by checking all arguments for a valid number
		// This handles cases where names have spaces and letters like "@Fai Za a"
		for (let i = 1; i < args.length; i++) {
			// Check if the argument is purely numeric (not mixed with letters)
			if (/^\d+$/.test(args[i])) {
				const parsedAmount = parseInt(args[i]);
				if (parsedAmount > 0) {
					amount = parsedAmount;
					break;
				}
			}
		}

		// Validate amount
		if (!amount || amount <= 0) {
			return message.reply(getLang("invalidAmount"));
		}

		// Get sender's current money
		const senderData = await usersData.get(senderID);
		const senderMoney = senderData.money || 0;

		// Check if sender has enough money
		if (senderMoney < amount) {
			return message.reply(getLang("notEnoughMoney", amount));
		}

		// Get recipient's current money
		const recipientData = await usersData.get(recipientUID);
		const recipientMoney = recipientData.money || 0;

		// Transfer money
		await usersData.set(senderID, {
			money: senderMoney - amount
		});

		await usersData.set(recipientUID, {
			money: recipientMoney + amount
		});

		// Send success message
		message.reply(getLang("sendSuccess", amount, recipientName));

		// Optionally send notification to recipient (if your bot supports private messaging)
		// You can uncomment this if your framework supports sending private messages
		/*
		try {
			message.send(getLang("receiveNotification", amount, senderData.name || "Someone"), recipientUID);
		} catch (error) {
			// Handle error if private messaging fails
		}
		*/
	}
};
