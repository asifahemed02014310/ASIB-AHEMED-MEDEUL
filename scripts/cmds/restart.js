const fs = require("fs-extra");

module.exports = {
	config: {
		name: "restart",
		version: "1.1",
		author: "NTKhang",
		countDown: 5,
		role: 2,
		description: {
			vi: "Khởi động lại bot",
			en: "Restart bot"
		},
		category: "Owner",
		guide: {
			vi: "   {pn}: Khởi động lại bot",
			en: "   {pn}: Restart bot"
		}
	},

	langs: {
		vi: {
			restartting: "🔄 | Đang khởi động lại bot..."
		},
		en: {
			restartting: "𝗗𝗮𝗿𝗮𝗼 𝗵𝗮𝘁 𝗺𝘂𝗸𝗵 𝗱𝗵𝘂𝘆𝗲 𝗮𝘀𝗶 🤧."
		}
	},

	onLoad: function ({ api }) {
		const pathFile = `${__dirname}/tmp/restart.txt`;
		if (fs.existsSync(pathFile)) {
			const [tid, time] = fs.readFileSync(pathFile, "utf-8").split(" ");
			api.sendMessage(` 𝗖𝗵𝗼𝗹𝗲 𝗮𝘀𝗰𝗶 𝗯𝘂𝗷𝗵𝗰𝗼. 🤭\n𝗠𝗮𝘁𝗿𝗼 ${(Date.now() - time) / 1000}s 𝗲 𝗵𝗲𝗵𝗲🫣`, tid);
			fs.unlinkSync(pathFile);
		}
	},

	onStart: async function ({ message, event, getLang }) {
		const pathFile = `${__dirname}/tmp/restart.txt`;
		fs.writeFileSync(pathFile, `${event.threadID} ${Date.now()}`);
		await message.reply(getLang("restartting"));
		process.exit(2);
	}
};