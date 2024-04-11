const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { PuppeteerScreenRecorder } = require("puppeteer-screen-recorder");

const Config = {
  followNewTab: true,
  fps: 25,
  ffmpeg_Path: null,
  videoFrame: {
    width: 1280,
    height: 720,
  },
  videoCrf: 18,
  videoCodec: "libx264",
  videoPreset: "ultrafast",
  videoBitrate: 1000,
  autopad: {
    color: "black" | "#35A5FF",
  },
  aspectRatio: "16:9",
};

puppeteer.use(StealthPlugin());

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized"],
  });
  const page = await browser.newPage();

  await page.goto("https://www.youtube.com/");

  // await page.setViewport({
  //   width: 1920,
  //   height: 1080,
  //   deviceScaleFactor: 1,
  // });

  await page.locator("#dialog > #content").scroll({
    scrollTop: 200,
  });
  const rejectAllButton = await page.waitForSelector(
    'xpath///span[contains(text(), "Reject all")]'
  );
  if (rejectAllButton) {
    await rejectAllButton.click();
  } else {
    console.log("No element with text 'Reject all' found.");
  }
  await new Promise((r) => setTimeout(r, 1000));

  // Typing in search bar
  await page.waitForSelector("#search-input #search");
  await page.locator("#search-input #search").fill("Cute cats");

  await new Promise((r) => setTimeout(r, 1000));

  // Submitting search form
  await page.keyboard.press("Enter");
  await new Promise((r) => setTimeout(r, 1000));

  // Clicking on the first video
  await page.waitForSelector("#video-title > yt-formatted-string");
  await page.click("#video-title > yt-formatted-string");

  await new Promise((r) => setTimeout(r, 1000));

  // Going fullscreen mode
  await page.keyboard.press("f");

  const recorder = new PuppeteerScreenRecorder(page, Config);
  let skipCount = 0;
  let recordingComplete = false;
  const RECORDING_TIME = 3 * 60 * 1000;
  let skippedAd = false;

  const waitForAdSkip = async () => {
    while (!recordingComplete) {
      try {
        let timeout;
        if (skippedAd) timeout = 1000;
        else timeout = 0;

        // Check if there are ads playing
        const adOverlay = await page.waitForSelector(".ytp-ad-text", { timeout: timeout });

        if (adOverlay) {
          console.log("There is an ad, trying to skip...");
          // Click on the Skip Ad button
          page.mouse.click(1490, 750);
          skippedAd = true;
        }
      } catch (err) {
        skippedAd = false;
        //There are no more ads -> exit the loop
        console.log("No more ads");

        skipCount++;
        // After skipping the first set of ads, start the recording
        if (skipCount === 1) {
          console.log("Skipped first set of ads");
          console.log("Starting recording...");
          await recorder.start("./screen_recording.mp4");

          // After the given recording time, stop the recording and exit the browser
          setTimeout(async () => {
            await recorder.stop();
            console.log("Stopped recording");

            await browser.close();
            recordingComplete = true;
          }, RECORDING_TIME);
        }
        // break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  };

  await waitForAdSkip();
}

run();
