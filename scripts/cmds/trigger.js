const DIG = require("discord-image-generation");
const fs = require("fs-extra");

module.exports = {
	config: {
		name: "trigger",
		version: "1.1",
		author: "Nur",
		countDown: 2,
		role: 0,
		shortDescription: "Trigger image",
		longDescription: "Trigger image",
		category: "funny",
		guide: {
			vi: "{pn} [@tag | để trống | uid]",
			en: "{pn} [@tag | leave empty for yourself | uid]"
		}
	},

	onStart: async function ({ event, message, args, usersData }) {
		let uid;

		// Check if a UID was provided as an argument
		if (args.length > 0 && /^\d+$/.test(args[0])) {
			uid = args[0];
		}
		// Check if the message is a reply
		else if (event.messageReply) {
			uid = event.messageReply.senderID;
		} 
		// Check if there's a mention
		else if (Object.keys(event.mentions).length > 0) {
			uid = Object.keys(event.mentions)[0];
		} 
		// Default to the sender's ID
		else {
			uid = event.senderID;
		}

		try {
			const avatarURL = await usersData.getAvatarUrl(uid);
			const img = await new DIG.Triggered().getImage(avatarURL);
			const pathSave = `${__dirname}/tmp/${uid}_Trigger.gif`;
			fs.writeFileSync(pathSave, Buffer.from(img));
			message.reply({
				attachment: fs.createReadStream(pathSave)
			}, () => fs.unlinkSync(pathSave));
		} catch (error) {
			console.error("Error generating triggered image:", error);
			message.reply("An error occurred while generating the triggered image.");
		}
	}
};