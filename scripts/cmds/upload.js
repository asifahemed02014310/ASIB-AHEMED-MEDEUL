module.exports = {
	config: {
		name: "upload",
    aliases: ['ul','upl'],
		version: "1.0",
		author: "nur",
		countDown: 3,
		role: 0,
		shortDescription: {
			en: "Upload video to Google Drive"
		},
		description: {
			en: "Reply to a video message with this command to upload it to Google Drive"
		},
		category: "owner",
		guide: {
			en: "Reply to a video message and type: upload"
		}
	},

	langs: {
		en: {
			uploading: "Uploading...",
			error: "Parlm na re🙂!",
			success: "Uploaded",
			notAllowed: "This command is for the bot owner only."
		}
	},
	onStart: async function ({ api, args, message, event, threadsData, usersData, dashBoardData, globalData, threadModel, userModel, dashBoardModel, globalModel, role, commandName, getLang }) {
		const fs = require("fs-extra");
		const path = require("path");
		const { google } = require("googleapis");
		const axios = require("axios");

		// Load config.json to check owner IDs
		const configPath = path.resolve(__dirname, "..", "..", "config.json");
		let config;
		try {
			config = require(configPath);
		} catch (error) {
			console.error("Could not load config.json:", error.message);
			return message.reply("Error loading configuration file.");
		}

		// Check if user is the owner
		const senderId = event.senderID || "";
		const isOwner = Array.isArray(config.ownerBot) 
			? config.ownerBot.includes(senderId)
			: config.ownerBot === senderId;

		if (!isOwner) {
			return message.reply(getLang("notAllowed") || "only bot owner can upload");
		}

		if (!event.messageReply) {
			return message.reply("Aita video be😾..?");
		}

		const attachments = event.messageReply.attachments;
		if (!attachments || attachments.length === 0) {
			return message.reply("Aita video be😾..?");
		}

		const videoAttachment = attachments.find(attachment => attachment.type === "video");
		if (!videoAttachment) {
			return message.reply("Aita video be😾..?");
		}

		message.reply(getLang("uploading"));

		try {
			const tempDir = path.join(__dirname, "tmp");
			if (!fs.existsSync(tempDir)) {
				fs.mkdirSync(tempDir, { recursive: true });
			}

			const videoUrl = videoAttachment.url;
			const randomFileName = `${Date.now()}_${Math.floor(Math.random() * 10000)}.mp4`;
			const videoPath = path.join(tempDir, randomFileName);

			const response = await axios({
				method: "GET",
				url: videoUrl,
				responseType: "stream"
			});

			const writer = fs.createWriteStream(videoPath);
			response.data.pipe(writer);

			await new Promise((resolve, reject) => {
				writer.on("finish", resolve);
				writer.on("error", reject);
			});

			// Path to drivekey.json in the root 
			const keyPath = path.resolve(__dirname, "..", "..", "drivekey.json");

			if (!fs.existsSync(keyPath)) {
				return message.reply("Drive key file not found. Please check the path: " + keyPath);
			}

			const auth = new google.auth.GoogleAuth({
				keyFile: keyPath,
				scopes: ["https://www.googleapis.com/auth/drive"]
			});

			const drive = google.drive({ version: "v3", auth });

			// Upload to Google Drive
			const fileMetadata = {
				name: `video_${Date.now()}.mp4`,
				parents: ["131rtTOFc4sggJAdxAwdEPpuneV52x0Sb"] //drive folder id 
			};

			const media = {
				mimeType: "video/mp4",
				body: fs.createReadStream(videoPath)
			};

			const uploadedFile = await drive.files.create({
				resource: fileMetadata,
				media: media,
				fields: "id, webViewLink"
			});

			// Get the file link
			const fileId = uploadedFile.data.id;
			const fileLink = uploadedFile.data.webViewLink;

			fs.unlinkSync(videoPath);

			message.reply(`${getLang("success")}\n\nLink: ${fileLink}`);

		} catch (error) {
			console.error("Error uploading video:", error);
			message.reply(getLang("error"));
			console.error("Detailed error:", error.message);
			if (error.response) {
				console.error("Error response:", error.response.data);
			}
		}
	}
};
