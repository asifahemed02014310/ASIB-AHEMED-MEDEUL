module.exports = {
	config: {
		name: "upload",
		aliases: ['ul','upl'],
		version: "3.0",
		author: "nur (upgraded)",
		countDown: 3,
		role: 0,
		shortDescription: {
			en: "Upload and manage videos on Google Drive"
		},
		description: {
			en: "Upload videos to Google Drive and access uploaded videos with various commands"
		},
		category: "owner",
		guide: {
			en: `
Reply to a video message and type: upload
Other commands:
- upload all | upload link | upload -l : Shows links of all uploaded videos
- upload video | upload v : Sends all uploaded videos one by one
- upload n | upload num : Returns the total number of uploaded videos
- upload v {num} : Sends the specified number of videos (e.g., upload v 3)
- upload delete | upload -d | upload -del : Delete videos from Drive:
  • Reply to a video that was sent from Drive and use this command to delete it
  • upload delete [link/filename] : Delete by link or filename
  • upload delete [item1], [item2], ... : Delete multiple videos at once`
		}
	},

	langs: {
		en: {
			uploading: "Uploading...",
			error: "Parlm na re🙂!",
			success: "Uploaded",
			notAllowed: "This command is for the bot owner only.",
			processingLinks: "Darao babu dicci",
			linkError: "Ora khub kharap link deyna🙂",
			totalVideos: "Total number of uploaded videos: %1",
			noVideos: "No videos found on Drive",
			sendingVideo: "Sending video %1 of %2",
			invalidNumber: "Please provide a valid number",
			videoLimit: "Number of videos requested (%1) exceeds the total available (%2). Sending all available videos.",
			deleting: "Deleting video...",
			deleteSuccess: "Deleted this video from drive",
			deleteError: "Failed to delete video: %1",
			deleteMultipleStart: "Attempting to delete %1 items from Drive",
			deleteMultipleResult: "Delete operation complete:\n%1",
			noVideoFound: "No matching video found to delete",
			missingDeleteParam: "Please specify what to delete or reply to a video message"
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
			return message.reply(getLang("notAllowed"));
		}
		
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
		const folderId = "131rtTOFc4sggJAdxAwdEPpuneV52x0Sb"; // Drive folder ID

		// Helper function to extract file ID from Google Drive link
		const extractFileId = (link) => {
			// Match pattern for Google Drive file links
			const fileIdRegex = /\/d\/([a-zA-Z0-9_-]+)/;
			const match = link.match(fileIdRegex);
			return match ? match[1] : null;
		};

		// Helper function to get file by name or ID
		const getFileByNameOrId = async (nameOrId) => {
			try {
				// Try to find by ID first (if it looks like an ID)
				if (nameOrId.length > 20 && /^[a-zA-Z0-9_-]+$/.test(nameOrId)) {
					try {
						const response = await drive.files.get({
							fileId: nameOrId,
							fields: "id, name"
						});
						return response.data;
					} catch (error) {
						// If not found by ID, continue to search by name
						console.log("Not found by ID, trying name search");
					}
				}
				
				// Try to find by name
				const response = await drive.files.list({
					q: `'${folderId}' in parents and name = '${nameOrId}' and trashed = false`,
					fields: "files(id, name)"
				});
				
				if (response.data.files.length > 0) {
					return response.data.files[0];
				}
				
				return null;
			} catch (error) {
				console.error("Error in getFileByNameOrId:", error);
				return null;
			}
		};

		// Function to delete a file by its ID
		const deleteFile = async (fileId) => {
			try {
				await drive.files.delete({
					fileId: fileId
				});
				return true;
			} catch (error) {
				console.error("Error deleting file:", error);
				return false;
			}
		};

		// DELETE FUNCTIONALITY
		if (args[0] === "delete" || args[0] === "-d" || args[0] === "-del") {
			// If there's a replied message with a video attachment that has metadata
			if (event.messageReply && event.messageReply.body) {
				// Try to find file name or link in the replied message
				const messageBody = event.messageReply.body;
				let fileId = null;
				
				// Check if the message contains a Drive link
				if (messageBody.includes("drive.google.com")) {
					fileId = extractFileId(messageBody);
				} 
				// Check if the message might contain a file name (like video_timestamp.mp4)
				else if (messageBody.includes("video_") && messageBody.includes(".mp4")) {
					const fileName = messageBody.trim().split('\n')[0]; // Get first line as filename
					const file = await getFileByNameOrId(fileName);
					if (file) {
						fileId = file.id;
					}
				}
				
				if (fileId) {
					message.reply(getLang("deleting"));
					const result = await deleteFile(fileId);
					if (result) {
						return message.reply(getLang("deleteSuccess"));
					} else {
						return message.reply(getLang("deleteError").replace("%1", "File not accessible or already deleted"));
					}
				}
			}
			
			// If no valid replied message, check for parameters
			if (args.length < 2) {
				return message.reply(getLang("missingDeleteParam"));
			}
			
			// Get everything after the "delete" command
			const deleteTarget = args.slice(1).join(" ");
			
			// Check if multiple items to delete (comma separated)
			if (deleteTarget.includes(",")) {
				const items = deleteTarget.split(",").map(item => item.trim());
				message.reply(getLang("deleteMultipleStart").replace("%1", items.length));
				
				let results = [];
				for (const item of items) {
					let fileId = null;
					
					// Check if item is a Drive link
					if (item.includes("drive.google.com")) {
						fileId = extractFileId(item);
					}
					
					// If not a link, try to find by name
					if (!fileId) {
						const file = await getFileByNameOrId(item);
						if (file) {
							fileId = file.id;
						}
					}
					
					if (fileId) {
						const result = await deleteFile(fileId);
						results.push(`${item}: ${result ? "✅ Deleted" : "❌ Failed"}`);
					} else {
						results.push(`${item}: ❌ Not found`);
					}
				}
				
				return message.reply(getLang("deleteMultipleResult").replace("%1", results.join("\n")));
			} 
			// Single item to delete
			else {
				message.reply(getLang("deleting"));
				let fileId = null;
				
				// Check if target is a Drive link
				if (deleteTarget.includes("drive.google.com")) {
					fileId = extractFileId(deleteTarget);
				}
				
				// If not a link, try to find by name
				if (!fileId) {
					const file = await getFileByNameOrId(deleteTarget);
					if (file) {
						fileId = file.id;
					}
				}
				
				if (fileId) {
					const result = await deleteFile(fileId);
					if (result) {
						return message.reply(getLang("deleteSuccess"));
					} else {
						return message.reply(getLang("deleteError").replace("%1", "File not accessible or already deleted"));
					}
				} else {
					return message.reply(getLang("noVideoFound"));
				}
			}
		}

		// Command to list all video links
		if (args[0] === "all" || args[0] === "link" || args[0] === "-l") {
			message.reply(getLang("processingLinks"));
			
			try {
				const res = await drive.files.list({
					q: `'${folderId}' in parents and trashed = false and mimeType contains 'video/'`,
					fields: "files(id, name, webViewLink, createdTime)",
					orderBy: "createdTime desc"
				});
				
				const files = res.data.files;
				
				if (files.length === 0) {
					return message.reply(getLang("noVideos"));
				}
				
				let linksList = `📹 Found ${files.length} videos on Drive:\n\n`;
				
				files.forEach((file, index) => {
					const date = new Date(file.createdTime).toLocaleDateString();
					linksList += `${index + 1}. [${date}] ${file.name}\n${file.webViewLink}\n\n`;
				});
				
				message.reply(linksList);
			} catch (error) {
				console.error("Error getting file links:", error);
				message.reply(getLang("linkError"));
			}
			return;
		}
		
		// Command to get total number of videos
		if (args[0] === "n" || args[0] === "num") {
			try {
				const res = await drive.files.list({
					q: `'${folderId}' in parents and trashed = false and mimeType contains 'video/'`,
					fields: "files(id)"
				});
				
				message.reply(getLang("totalVideos").replace("%1", res.data.files.length));
			} catch (error) {
				console.error("Error counting videos:", error);
				message.reply(getLang("error"));
			}
			return;
		}
		
		// Command to send videos
		if (args[0] === "video" || args[0] === "v") {
			try {
				const res = await drive.files.list({
					q: `'${folderId}' in parents and trashed = false and mimeType contains 'video/'`,
					fields: "files(id, name)",
					orderBy: "createdTime desc"
				});
				
				const files = res.data.files;
				
				if (files.length === 0) {
					return message.reply(getLang("noVideos"));
				}
				
				let limit = files.length;
				
				// If a number is provided, use it as the limit
				if (args[1]) {
					const requestedLimit = parseInt(args[1]);
					if (isNaN(requestedLimit) || requestedLimit <= 0) {
						return message.reply(getLang("invalidNumber"));
					}
					
					if (requestedLimit > files.length) {
						message.reply(getLang("videoLimit").replace("%1", requestedLimit).replace("%2", files.length));
					} else {
						limit = requestedLimit;
					}
				}
				
				// Send videos one by one
				for (let i = 0; i < limit; i++) {
					const file = files[i];
					message.reply(getLang("sendingVideo").replace("%1", i + 1).replace("%2", limit));
					
					const tempDir = path.join(__dirname, "tmp");
					if (!fs.existsSync(tempDir)) {
						fs.mkdirSync(tempDir, { recursive: true });
					}
					
					const videoPath = path.join(tempDir, `${file.name}`);
					
					const dest = fs.createWriteStream(videoPath);
					let progress = 0;
					
					const response = await drive.files.get(
						{ fileId: file.id, alt: 'media' },
						{ responseType: 'stream' }
					);
					
					await new Promise((resolve, reject) => {
						response.data
							.on('end', () => {
								resolve();
							})
							.on('error', err => {
								reject(err);
							})
							.pipe(dest);
					});
					
					// Send the video
					await message.reply({ 
						body: `${file.name}`,
						attachment: fs.createReadStream(videoPath)
					});
					
					// Clean up
					fs.unlinkSync(videoPath);
					
					// Add a small delay between videos
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
			} catch (error) {
				console.error("Error sending videos:", error);
				message.reply(getLang("error"));
			}
			return;
		}
		
		// Original upload functionality
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

			// Upload to Google Drive
			const fileMetadata = {
				name: `video_${Date.now()}.mp4`,
				parents: [folderId]
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
