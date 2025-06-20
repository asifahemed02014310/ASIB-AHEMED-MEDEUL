module.exports = {
	config: {
		name: "medicine", 
		aliases:["med","osud"],
		version: "1.1", 
		author: "Hamim",
		countDown: 5, 
		role: 0,
		shortDescription: {
			en: "Search for medicine information"
		}, 
		description: {
			en: "Get detailed information about medicines including name, form, strength, manufacturer, and price"
		}, 
		category: "utility",
		guide: {
			en: "{pn} <medicine_name>\nExample: {pn} napa\n{pn} paracetamol"
		} 
	},

	langs: {
		en: {
			noMedicineName: "⚠️ Please provide a medicine name to search for.",
			searching: "🔍 Searching for medicine information...",
			notFound: "❌ No medicine found with that name. Please check the spelling and try again.",
			error: "❌ An error occurred while fetching medicine information. Please try again later.",
			medicineInfo: "💊 *Medicine Information*\n\n" +
						 "📋 *Name:* %1\n" +
						 "💊 *Form:* %2\n" +
						 "⚡ *trength:* %3\n" +
						 "🏭 *Manufacturer:* %4\n" +
						 "💰 *Price:* %5\n" +
						 "🎯 *Match Score:* %6%"
		}
	},

	onStart: async function ({ api, args, message, event, getLang }) {
		const axios = require('axios');
		
		try {
			if (!args[0]) {
				return message.reply(getLang("noMedicineName"));
			}
			const medicineName = args.join(" ").trim();
			const searchMessage = await message.reply(getLang("searching"));

			const response = await axios.get(`https://alit-apis.onrender.com/api/med?name=${encodeURIComponent(medicineName)}`);
			
			const data = response.data;
			if (data.error || !data.found || !data.result) {
				return api.editMessage(getLang("notFound"), searchMessage.messageID);
			}

			const medicine = data.result;
			

			const matchScore = Math.round(medicine.matched_score * 100);

			api.editMessage(getLang("medicineInfo", 
				medicine.name,
				medicine.form,
				medicine.strength,
				medicine.manufacturer,
				medicine.unit,
				matchScore
			), searchMessage.messageID);

		} catch (error) {
			console.error("Medicine command error:", error);
			console.error("Error details:", error.message);
			if (error.response) {
				console.error("Response status:", error.response.status);
				console.error("Response data:", error.response.data);
			}
			
			if (searchMessage && searchMessage.messageID) {
				api.editMessage(getLang("error"), searchMessage.messageID);
			} else {
				message.reply(getLang("error"));
			}
		}
	}
};
