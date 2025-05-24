const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

module.exports = {
	config: {
		name: "uploadvoice",
                aliases: ["uv","upv"],
		version: "1.1",
		author: "Nur",
		countDown: 5,
		role: 0,
		shortDescription: {
			en: "Upload replied voice to Catbox"
		},
		description: {
			en: "Reply to a voice message to upload it to your Catbox account"
		},
		category: "tools",
		guide: {
			en: "Reply to a voice message and use: {pn}"
		}
	},

	langs: {
		en: {
			noReply: "Please reply to a voice message.",
			uploading: "Uploading your voice message...",
			uploaded: "✅ Uploaded successfully:\n%1",
			error: "Upload failed: %1"
		}
	},

	onStart: async function ({ api, event, message, getLang }) {
		try {
			if (
				!event.messageReply ||
				!event.messageReply.attachments[0] ||
				event.messageReply.attachments[0].type !== "audio"
			) {
				return message.reply(getLang("noReply"));
			}

			const audioUrl = event.messageReply.attachments[0].url;
			const tempPath = path.join(__dirname, "temp_voice.mp3");

			message.reply(getLang("uploading"));

			// Download voice clip
			const response = await axios.get(audioUrl, { responseType: "stream" });
			const writer = fs.createWriteStream(tempPath);
			response.data.pipe(writer);
			await new Promise(resolve => writer.on("finish", resolve));

		
			const form = new FormData();
			form.append("reqtype", "fileupload");
			form.append("userhash", "9f09cd44af9d1d8b2197adf9f");
			form.append("fileToUpload", fs.createReadStream(tempPath));

			const upload = await axios.post("https://catbox.moe/user/api.php", form, {
				headers: form.getHeaders()
			});

			fs.unlinkSync(tempPath); 
			message.reply(getLang("uploaded", upload.data));
		} catch (err) {
			console.error(err);
			message.reply(getLang("error", err.message));
		}
	}
};
