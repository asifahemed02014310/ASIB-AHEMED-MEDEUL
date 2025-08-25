const { GoatWrapper } = require('fca-liane-utils');

module.exports = {
	config: {
		name: "owner",
		author: "ᴀꜱɪʙ 𝓐Һ𝙚𝑚𝙚𝑑 𝕄𝔼𝔻𝔼𝕌𝕃",
		role: 0,
		shortDescription: "Show owner's info",
		longDescription: "Displays the basic details of the bot owner without socials or birthday.",
		category: "𝗢𝗪𝗡𝗘𝗥 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗢𝗡",
		guide: "{pn}"
	},

	onStart: async function ({ api, event }) {
		try {
			const info = {
				name: 'ᴀꜱɪʙ 𝓐Һ𝙚𝑚𝙚𝑑 𝕄𝔼𝔻𝔼𝕌𝕃',
				age: '𝟭𝟵+',
				religion: '𝗜𝘀𝗹𝗮𝗺'
			};

			const response = `
╔═════════════════════╗
   🔥 𝗢𝗪𝗡𝗘𝗥 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗢𝗡
╚═════════════════════╝

❖ 👤 𝗡𝗔𝗠𝗘       ➪ ${info.name}
❖ 🎂 𝗔𝗚𝗘        ➪ ${info.age}
❖ ☪️ 𝗥𝗘𝗟𝗜𝗚𝗜𝗢𝗡  ➪ ${info.religion}

━━━━━━━━━━━━━━━
💌 𝗧𝗵𝗮𝗻𝗸 𝘆𝗼𝘂 𝗳𝗼𝗿 𝘂𝘀𝗶𝗻𝗴 𝘁𝗵𝗲 𝗯𝗼𝘁!
`;

			await api.sendMessage({ body: response }, event.threadID, event.messageID);
			api.setMessageReaction('💖', event.messageID, () => {}, true);
		} catch (error) {
			console.error('Error in owner command:', error);
			return api.sendMessage('❌ Something went wrong while fetching owner info.', event.threadID);
		}
	}
};

const wrapper = new GoatWrapper(module.exports);
wrapper.applyNoPrefix({ allowPrefix: true });
