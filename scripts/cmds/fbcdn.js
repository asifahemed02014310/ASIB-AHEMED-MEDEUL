module.exports = {
	config: {
		name: "fbcdn",
		aliases :["link","l",""],
		version: "1.1", 
		author: "NUR",
		countDown: 5,
		role: 0,
		shortDescription: {
			en: "Extract direct download link from media messages"
		},
		description: {
			en: "Extract Facebook CDN direct download links from replied media messages (voice, image, or video). Reply to a media message with this command to get the download link."
		},
		category: "Tools",
		guide: {
			en: "Reply to a voice message, image, or video with '{pn}link' to get the direct download link"
		}
	},

	langs: {
		en: {
			noReply: "❌ Please reply to a media message (voice, image, or video) to extract the download link.",
			noMedia: "❌ The replied message doesn't contain any media attachments.",
			unsupportedMedia: "❌ Unsupported media type. This command only works with voice messages, images, and videos.",
			linkExtracted: "🔗 Direct download link:\n\n%1",
			processingError: "❌ An error occurred while processing the media. Please try again."
		}
	},

	onStart: async function ({ api, args, message, event, threadsData, usersData, dashBoardData, globalData, threadModel, userModel, dashBoardModel, globalModel, role, commandName, getLang }) {
		try {
			if (!event.messageReply) {
				return message.reply(getLang("noReply"));
			}
			const repliedMessage = event.messageReply;
			if (!repliedMessage.attachments || repliedMessage.attachments.length === 0) {
				return message.reply(getLang("noMedia"));
			}
			const mediaAttachments = repliedMessage.attachments.filter(attachment => 
				attachment.type === "photo" || 
				attachment.type === "video" || 
				attachment.type === "audio"
			);

			if (mediaAttachments.length === 0) {
				return message.reply(getLang("unsupportedMedia"));
			}
			const downloadLinks = [];
			
			for (const attachment of mediaAttachments) {
				let downloadUrl = "";
				
				switch (attachment.type) {
					case "photo":
						if (attachment.largePreviewUrl) {
							downloadUrl = attachment.largePreviewUrl;
						} else if (attachment.previewUrl) {
							downloadUrl = attachment.previewUrl;
						} else if (attachment.url) {
							downloadUrl = attachment.url;
						}
						break;
						
					case "video":
						if (attachment.url) {
							downloadUrl = attachment.url;
						}
						break;
						
					case "audio":
						if (attachment.url) {
							downloadUrl = attachment.url;
						}
						break;
				}

				if (downloadUrl) {
					const separator = downloadUrl.includes('?') ? '&' : '?';
					const finalUrl = `${downloadUrl}${separator}dl=1`;
					const mediaType = attachment.type === "audio" ? "🎵 Voice/Audio" : 
									 attachment.type === "photo" ? "🖼️ Image" : "🎥 Video";
					
					downloadLinks.push(`${mediaType}: ${finalUrl}`);
				}
			}

			if (downloadLinks.length === 0) {
				return message.reply(getLang("processingError"));
			}
			const responseMessage = downloadLinks.join('\n\n');
			message.reply(getLang("linkExtracted", responseMessage));

		} catch (error) {
			console.error("Error in link command:", error);
			message.reply(getLang("processingError"));
		}
	}
};
