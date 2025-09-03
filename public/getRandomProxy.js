const ProxyLists = require("proxy-lists");
const ProxyChecker = require("proxy-checker");
const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeProxies() {
  try {
    const { data } = await axios.get("https://free-proxy-list.net/");
    const $ = cheerio.load(data);
    const proxies = [];

    $("#proxylisttable tbody tr").each((i, el) => {
      const tds = $(el).find("td");
      const ip = $(tds[0]).text();
      const port = $(tds[1]).text();
      const https = $(tds[6]).text();
      proxies.push(`http${https === "yes" ? "s" : ""}://${ip}:${port}`);
    });

    return proxies;
  } catch (err) {
    console.error("Error scraping proxies:", err);
    return [];
  }
}

async function validateProxy(proxyUrl) {
  try {
    return await ProxyChecker.check(proxyUrl);
  } catch {
    return false;
  }
}

async function getWorkingProxyFromScrape() {
  const proxies = await scrapeProxies();

  for (const proxy of proxies) {
    const isWorking = await validateProxy(proxy);
    if (isWorking) {
      console.log("Working proxy from scrape:", proxy);
      return proxy;
    }
  }
  return null;
}

function getWorkingProxyFromStream() {
  return new Promise((resolve) => {
    const proxiesStream = ProxyLists.getProxies({ protocol: "http" });

    proxiesStream.on("data", async (proxies) => {
      for (const proxy of proxies) {
        const proxyUrl = `http://${proxy.ipAddress}:${proxy.port}`;
        const isWorking = await validateProxy(proxyUrl);
        if (isWorking) {
          console.log("Working proxy from stream:", proxyUrl);
          proxiesStream.pause();
          resolve(proxyUrl);
          break;
        }
      }
    });

    proxiesStream.on("error", (err) => {
      console.error("ProxyLists stream error:", err);
      resolve(null);
    });

    proxiesStream.on("end", () => {
      resolve(null);
    });
  });
}

async function getRandomProxy() {
  // First try scraped proxies
  const proxyFromScrape = await getWorkingProxyFromScrape();
  if (proxyFromScrape) return proxyFromScrape;

  // Otherwise try proxy-lists stream
  const proxyFromStream = await getWorkingProxyFromStream();
  if (proxyFromStream) return proxyFromStream;

  // No proxy found
  return null;
}

module.exports = {
  getRandomProxy,
};
