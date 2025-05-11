module.exports = {
	config: {
		name: "clearcache",
    aliases: ["clearc", "cc", "cache","tmp"],
		version: "1.0",
		author: "nur",
		countDown: 5,
		role: 1, // Admin role to prevent abuse
		shortDescription: {
			en: "Clear cache from tmp folder"
		},
		description: {
			en: "Clears all cached files from the tmp directory to free up memory and prevent the bot from hanging"
		},
		category: "system",
		guide: {
			en: "Use: {p}clearcache - Clears all temporary files"
		}
	},

	langs: {
		en: {
			clearing: "🧹 Clearing cache from tmp folder...",
			success: "✅ Successfully cleared cache!\n%1 files removed.\nTotal space freed: %2",
			noFiles: "📂 No files to clear in tmp folder.",
			error: "❌ Failed to clear cache: %1"
		}
	},

	onStart: async function ({ api, args, message, event, getLang }) {
		const fs = require("fs");
		const path = require("path");
		
		// Send initial message
		const responseMessage = await message.reply(getLang("clearing"));
		
		try {
			// Get the path to tmp folder (in the same directory as the command itself)
			const tmpDir = path.join(__dirname, "tmp");
			
			// Check if tmp directory exists
			if (!fs.existsSync(tmpDir)) {
				return message.reply(getLang("error", `tmp directory not found at ${tmpDir}`));
			}
			
			// Get all files in the tmp directory
			const files = fs.readdirSync(tmpDir);
			
			if (files.length === 0) {
				return message.reply(getLang("noFiles"));
			}
			
			let totalSize = 0;
			let deletedCount = 0;
			
			// Calculate size and delete each file
			for (const file of files) {
				try {
					const filePath = path.join(tmpDir, file);
					
					// Skip directories
					const stats = fs.statSync(filePath);
					if (stats.isDirectory()) continue;
					
					// Add to total size (Make sure to get the size before deleting)
					const fileSize = stats.size;
					totalSize += fileSize;
					
					// Log for debugging
					console.log(`File: ${file}, Size: ${fileSize} bytes`);
					
					// Delete the file
					fs.unlinkSync(filePath);
					deletedCount++;
				} catch (err) {
					console.error(`Failed to delete file ${file}: ${err.message}`);
				}
			}
			
			// Log total size for debugging
			console.log(`Total size calculated: ${totalSize} bytes`);
			
			// Format the size to be human-readable
			const formattedSize = formatBytes(totalSize);
			
			// Send success message
			return message.reply(getLang("success", deletedCount, formattedSize));
			
		} catch (error) {
			console.error(error);
			return message.reply(getLang("error", error.message));
		}
	}
};

// Helper function to format bytes into human-readable format
function formatBytes(bytes, decimals = 2) {
	if (!bytes || bytes === 0) return '0 Bytes';
	
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	
	// Ensure bytes is a number
	bytes = Number(bytes);
	if (isNaN(bytes)) return '0 Bytes';
	
	const i = Math.floor(Math.log(Math.max(1, bytes)) / Math.log(k));
	
	return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[Math.min(i, sizes.length - 1)];
}
