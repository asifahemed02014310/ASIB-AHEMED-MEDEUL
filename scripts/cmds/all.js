 module.exports = {
	config: {
		name: "all",
		version: "1.2",
		author: "Nur",
		countDown: 5,
		role: 1,
		description: {		
			en: "Tag all members in your group chat"
		},
		category: "group",
		guide: {			
			en: "   {pn} [content | empty]"
		}
	},

	onStart: async function ({ message, event, args }) {
		const { participantIDs } = event;
		const mentions = [];
		let body = args.join(" ") || "@all";
		
		// Convert string to array of characters (handles emojis properly)
		const bodyChars = [...body];
		const lengthAllUser = participantIDs.length;
		const lastChar = bodyChars[bodyChars.length - 1]; // Get the last character
		
		// Extend body if needed by repeating the last character
		while (bodyChars.length < lengthAllUser) {
			bodyChars.push(lastChar);
		}
		
		// Rebuild the body string
		body = bodyChars.slice(0, lengthAllUser).join("");
		
		// Create mentions with correct indices
		let currentIndex = 0;
		for (let i = 0; i < participantIDs.length; i++) {
			const uid = participantIDs[i];
			const tagChar = bodyChars[i];
			
			mentions.push({
				tag: tagChar,
				id: uid,
				fromIndex: currentIndex
			});
			
			// Move to next character position
			currentIndex += tagChar.length;
		}
		
		message.reply({ body, mentions });
	}
};
