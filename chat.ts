import fs from "fs";
import chalk from "chalk";

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
    const fromUser = message.from_id;
    if (!fromUser) return;

    if (!userStats[fromUser]) {
      userStats[fromUser] = {
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

    userStats[fromUser].messages++;
    if (message.from) userNames[fromUser] = message.from;

    if (message.photo) userStats[fromUser].media.photos++;
    if (message.media_type === "video_message") {
      userStats[fromUser].media.videoMessages++;
    }
    if (message.media_type === "video_file") {
      userStats[fromUser].media.videoFiles++;
    }
    if (message.media_type === "voice_message")
      userStats[fromUser].media.voice++;
    if (message.media_type === "sticker") userStats[fromUser].media.stickers++;

    const date = new Date(parseInt(message.date_unixtime) * 1000);
    const dayOfWeek = date.toLocaleString("en-US", { weekday: "long" });
    const hour = date.getHours();

    if (!timeStats[dayOfWeek]) {
      timeStats[dayOfWeek] = {};
    }
    if (!timeStats[dayOfWeek][hour]) {
      timeStats[dayOfWeek][hour] = 0;
    }
    timeStats[dayOfWeek][hour]++;
  });

  return { userStats, userNames, timeStats };
}

function calculatePercentages(
  userStats: Record<string, UserStats>,
  totalMessages: number
) {
  const percentages: Record<string, any> = {};

  for (const [user, stats] of Object.entries(userStats)) {
    percentages[user] = {
      total: ((stats.messages / totalMessages) * 100).toFixed(2) + "%",
      media: {
        photos: {
          userPercentage:
            ((stats.media.photos / stats.messages) * 100).toFixed(2) + "%",
          totalPercentage:
            ((stats.media.photos / totalMessages) * 100).toFixed(2) + "%",
        },
        videoMessages: {
          userPercentage:
            ((stats.media.videoMessages / stats.messages) * 100).toFixed(2) +
            "%",
          totalPercentage:
            ((stats.media.videoMessages / totalMessages) * 100).toFixed(2) +
            "%",
        },
        videoFiles: {
          userPercentage:
            ((stats.media.videoFiles / stats.messages) * 100).toFixed(2) + "%",
          totalPercentage:
            ((stats.media.videoFiles / totalMessages) * 100).toFixed(2) + "%",
        },
        voice: {
          userPercentage:
            ((stats.media.voice / stats.messages) * 100).toFixed(2) + "%",
          totalPercentage:
            ((stats.media.voice / totalMessages) * 100).toFixed(2) + "%",
        },
        stickers: {
          userPercentage:
            ((stats.media.stickers / stats.messages) * 100).toFixed(2) + "%",
          totalPercentage:
            ((stats.media.stickers / totalMessages) * 100).toFixed(2) + "%",
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

  const totalDays = Object.keys(timeStats[peakDay]).length;
  const averageMessages = (maxMessages / totalDays).toFixed(2);

  return { peakDay, peakHour, maxMessages, averageMessages };
}

function loadJson(filePath: string): ChatData {
  const rawData = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(rawData);
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00 - ${(hour + 1)
    .toString()
    .padStart(2, "0")}:00`;
}

function main() {
  const filePath = "result.json";
  const jsonData = loadJson(filePath);
  const { userStats, userNames, timeStats } = analyzeChat(jsonData);
  const totalMessages = jsonData.messages.length;
  const userPercentages = calculatePercentages(userStats, totalMessages);
  const { peakDay, peakHour, maxMessages, averageMessages } =
    findPeakTime(timeStats);

  console.log(chalk.bold.underline(`Total Messages: ${totalMessages}`));

  console.log(chalk.bold.underline("\nUser Statistics:"));
  for (const [user, stats] of Object.entries(userStats)) {
    const username = userNames[user] || "Unknown";
    console.log(chalk.bold(`User: ${user} (${username})`));
    console.log(
      chalk.green(
        `Total Messages: ${stats.messages} (${userPercentages[user].total})`
      )
    );
    console.log(chalk.blue("Media:"));
    console.log(
      chalk.cyan(
        `  Photos: ${stats.media.photos} (${userPercentages[user].media.photos.userPercentage} of user, ${userPercentages[user].media.photos.totalPercentage} of total)`
      )
    );
    console.log(
      chalk.cyan(
        `  Video Messages: ${stats.media.videoMessages} (${userPercentages[user].media.videoMessages.userPercentage} of user, ${userPercentages[user].media.videoMessages.totalPercentage} of total)`
      )
    );
    console.log(
      chalk.cyan(
        `  Video Files: ${stats.media.videoFiles} (${userPercentages[user].media.videoFiles.userPercentage} of user, ${userPercentages[user].media.videoFiles.totalPercentage} of total)`
      )
    );
    console.log(
      chalk.cyan(
        `  Voice Messages: ${stats.media.voice} (${userPercentages[user].media.voice.userPercentage} of user, ${userPercentages[user].media.voice.totalPercentage} of total)`
      )
    );
    console.log(
      chalk.cyan(
        `  Stickers: ${stats.media.stickers} (${userPercentages[user].media.stickers.userPercentage} of user, ${userPercentages[user].media.stickers.totalPercentage} of total)`
      )
    );
    console.log(chalk.gray("-----------------------------"));
  }

  console.log(chalk.bold.underline("\nPeak Time for Messages:"));
  console.log(chalk.yellow(`Day: ${peakDay}`));
  console.log(chalk.yellow(`Time: ${formatHour(peakHour)}`));
  console.log(chalk.yellow(`Total Messages: ${maxMessages}`));
  console.log(chalk.yellow(`Average Messages: ${averageMessages}`));
}

main();
