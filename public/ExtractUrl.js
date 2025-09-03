const puppeteer = require("puppeteer");
const fs = require("fs");

const scrapeYouTubeVideoSrc = async (videoUrl) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto(videoUrl, { waitUntil: "networkidle2" });

  // Optional: Save full HTML after render
  const html = await page.content();
  fs.writeFileSync("youtube-page.html", html);

  // Wait for the video to load
  try {
    await page.waitForSelector(".video-stream.html5-main-video", {
      timeout: 15000,
    });

    // Get the video src attribute
    const videoSrc = await page.$eval(
      ".video-stream.html5-main-video",
      (el) => el.src
    );

    console.log("Video src:", videoSrc);

    await browser.close();
    return videoSrc;
  } catch (error) {
    console.error("Video element not found or failed to load:", error);
    await browser.close();
    return null;
  }
};

// 🔁 Replace with a real video URL

module.exports = {
  scrapeYouTubeVideoSrc: scrapeYouTubeVideoSrc,
};
