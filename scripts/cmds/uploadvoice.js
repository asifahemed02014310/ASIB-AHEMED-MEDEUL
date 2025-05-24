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
			uploading: "Uploading",
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

			// Send initial uploading message
			const sentMessage = await message.reply(getLang("uploading") + ".");
			
			// Animation states
			const animations = [
				getLang("uploading") + ".",
				getLang("uploading") + "..",
				getLang("uploading") + "...",
				getLang("uploading") + "....",
				"Upload.",
				"Upload..",
				"Upload...",
				"Upload...."
			];
			
			let animationIndex = 0;
			
			// Start animation interval
			const animationInterval = setInterval(() => {
				animationIndex = (animationIndex + 1) % animations.length;
				api.editMessage(animations[animationIndex], sentMessage.messageID);
			}, 500); // Change every 500ms

			// Download voice clip
			const response = await axios.get(audioUrl, { responseType: "stream" });
			const writer = fs.createWriteStream(tempPath);
			response.data.pipe(writer);
			await new Promise(resolve => writer.on("finish", resolve));

			// Upload to Catbox
			const form = new FormData();
			form.append("reqtype", "fileupload");
			form.append("userhash", "9f09cd44af9d1d8b2197adf9f");
			form.append("fileToUpload", fs.createReadStream(tempPath));

			const upload = await axios.post("https://catbox.moe/user/api.php", form, {
				headers: form.getHeaders()
			});

			// Stop animation and update with final result
			clearInterval(animationInterval);
			fs.unlinkSync(tempPath);
			
			// Edit the message with the final result
			api.editMessage(getLang("uploaded", upload.data), sentMessage.messageID);
			
		} catch (err) {
			console.error(err);
			// If there's an error, try to edit the existing message or send a new one
			if (sentMessage && sentMessage.messageID) {
				api.editMessage(getLang("error", err.message), sentMessage.messageID);
			} else {
				message.reply(getLang("error", err.message));
			}
		}
	}
};
