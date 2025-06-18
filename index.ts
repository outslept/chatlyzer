import { readFileSync } from "node:fs";
import { bold, underline, green, blue, cyan, gray, yellow } from "picocolors";

interface Message {
  from_id?: string;
  from?: string;
  photo?: string;
  media_type?: string;
  date_unixtime: string;
}

interface UserStats {
  messages: number;
  media: {
    photos: number;
    videoMessages: number;
    videoFiles: number;
    voice: number;
    stickers: number;
  };
}

interface TimeStats {
  [day: string]: {
    [hour: number]: number;
  };
}

interface ChatData {
  messages: Message[];
}

function analyzeChat(jsonData: ChatData) {
  const userStats: Record<string, UserStats> = {};
  const userNames: Record<string, string> = {};
  const timeStats: TimeStats = {};

  jsonData.messages.forEach((message) => {
    if (!message.from_id) return;

    if (!userStats[message.from_id]) {
      userStats[message.from_id] = {
        messages: 0,
        media: {
          photos: 0,
          videoMessages: 0,
          videoFiles: 0,
          voice: 0,
          stickers: 0,
        },
      };
    }

    userStats[message.from_id].messages++;
    if (message.from) userNames[message.from_id] = message.from;

    if (message.photo) userStats[message.from_id].media.photos++;
    if (message.media_type === "video_message") userStats[message.from_id].media.videoMessages++;
    if (message.media_type === "video_file") userStats[message.from_id].media.videoFiles++;
    if (message.media_type === "voice_message") userStats[message.from_id].media.voice++;
    if (message.media_type === "sticker") userStats[message.from_id].media.stickers++;

    const date = new Date(parseInt(message.date_unixtime) * 1000);
    const dayOfWeek = date.toLocaleString("en-US", { weekday: "long" });
    const hour = date.getHours();

    if (!timeStats[dayOfWeek]) timeStats[dayOfWeek] = {};
    timeStats[dayOfWeek][hour] = (timeStats[dayOfWeek][hour] || 0) + 1;
  });

  return { userStats, userNames, timeStats };
}

function calculatePercentages(userStats: Record<string, UserStats>, totalMessages: number) {
  const percentages: Record<string, any> = {};

  for (const [user, stats] of Object.entries(userStats)) {
    percentages[user] = {
      total: ((stats.messages / totalMessages) * 100).toFixed(2) + "%",
      media: {
        photos: {
          userPercentage: ((stats.media.photos / stats.messages) * 100).toFixed(2) + "%",
          totalPercentage: ((stats.media.photos / totalMessages) * 100).toFixed(2) + "%",
        },
        videoMessages: {
          userPercentage: ((stats.media.videoMessages / stats.messages) * 100).toFixed(2) + "%",
          totalPercentage: ((stats.media.videoMessages / totalMessages) * 100).toFixed(2) + "%",
        },
        videoFiles: {
          userPercentage: ((stats.media.videoFiles / stats.messages) * 100).toFixed(2) + "%",
          totalPercentage: ((stats.media.videoFiles / totalMessages) * 100).toFixed(2) + "%",
        },
        voice: {
          userPercentage: ((stats.media.voice / stats.messages) * 100).toFixed(2) + "%",
          totalPercentage: ((stats.media.voice / totalMessages) * 100).toFixed(2) + "%",
        },
        stickers: {
          userPercentage: ((stats.media.stickers / stats.messages) * 100).toFixed(2) + "%",
          totalPercentage: ((stats.media.stickers / totalMessages) * 100).toFixed(2) + "%",
        },
      },
    };
  }

  return percentages;
}

function findPeakTime(timeStats: TimeStats) {
  let peakDay = "";
  let peakHour = -1;
  let maxMessages = 0;

  for (const [day, hours] of Object.entries(timeStats)) {
    for (const [hour, count] of Object.entries(hours)) {
      if (count > maxMessages) {
        maxMessages = count;
        peakDay = day;
        peakHour = parseInt(hour);
      }
    }
  }

  return { peakDay, peakHour, maxMessages };
}

function main() {
  const jsonData: ChatData = JSON.parse(readFileSync("result.json", "utf-8"));
  const { userStats, userNames, timeStats } = analyzeChat(jsonData);
  const totalMessages = jsonData.messages.length;
  const userPercentages = calculatePercentages(userStats, totalMessages);
  const { peakDay, peakHour, maxMessages } = findPeakTime(timeStats);

  console.log(bold(underline(`Total Messages: ${totalMessages}`)));

  console.log(bold(underline("\nUser Statistics:")));
  for (const [user, stats] of Object.entries(userStats)) {
    const username = userNames[user] || "Unknown";
    console.log(bold(`User: ${user} (${username})`));
    console.log(green(`Total Messages: ${stats.messages} (${userPercentages[user].total})`));
    console.log(blue("Media:"));
    console.log(cyan(`  Photos: ${stats.media.photos} (${userPercentages[user].media.photos.userPercentage} of user, ${userPercentages[user].media.photos.totalPercentage} of total)`));
    console.log(cyan(`  Video Messages: ${stats.media.videoMessages} (${userPercentages[user].media.videoMessages.userPercentage} of user, ${userPercentages[user].media.videoMessages.totalPercentage} of total)`));
    console.log(cyan(`  Video Files: ${stats.media.videoFiles} (${userPercentages[user].media.videoFiles.userPercentage} of user, ${userPercentages[user].media.videoFiles.totalPercentage} of total)`));
    console.log(cyan(`  Voice Messages: ${stats.media.voice} (${userPercentages[user].media.voice.userPercentage} of user, ${userPercentages[user].media.voice.totalPercentage} of total)`));
    console.log(cyan(`  Stickers: ${stats.media.stickers} (${userPercentages[user].media.stickers.userPercentage} of user, ${userPercentages[user].media.stickers.totalPercentage} of total)`));
    console.log(gray("-----------------------------"));
  }

  console.log(bold(underline("\nPeak Time for Messages:")));
  console.log(yellow(`Day: ${peakDay}`));
  console.log(yellow(`Time: ${peakHour.toString().padStart(2, "0")}:00 - ${(peakHour + 1).toString().padStart(2, "0")}:00`));
  console.log(yellow(`Total Messages: ${maxMessages}`));
}

main();
