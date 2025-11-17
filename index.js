
addEventListener('scheduled', event => {
  event.waitUntil(runAutoposter());
});

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  await runAutoposter();
  return new Response("PlayReportZA autoposter ran successfully.", { status: 200 });
}

async function runAutoposter() {
  try {
    const apiKey = API_FOOTBALL_KEY;
    const fbToken = FB_PAGE_TOKEN;
    const pageId = FB_PAGE_ID;

    if (!apiKey || !fbToken || !pageId) {
      console.log("Missing environment variables.");
      return;
    }

    const now = new Date();
    const saNow = new Date(now.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }));
    const dateStr = saNow.toISOString().slice(0, 10);

    const fixturesUrl = `https://v3.football.api-sports.io/fixtures?date=${dateStr}`;
    const res = await fetch(fixturesUrl, { headers: { "x-apisports-key": apiKey } });
    const data = await res.json();
    if (!data.response) return;

    const nowMs = saNow.getTime();
    const windowMs = 20 * 60 * 1000;

    for (const item of data.response) {
      const fixture = item.fixture;
      const status = fixture?.status?.short;
      const tsMs = fixture?.timestamp ? fixture.timestamp * 1000 : null;
      if (!tsMs) continue;

      const ageMs = Math.abs(nowMs - tsMs);
      if (ageMs > windowMs) continue;

      const home = item.teams?.home?.name || "Home";
      const away = item.teams?.away?.name || "Away";
      const hs = item.goals?.home ?? 0;
      const as = item.goals?.away ?? 0;

      let message = null;

      if (status === "FT") {
        message = `FULL-TIME RESULT:\n\n${home} ${hs} - ${as} ${away}\n\nMore updates on PlayReportZA.`;
      } else if (status === "HT") {
        message = `HALF-TIME RESULT:\n\n${home} ${hs} - ${as} ${away}\n\nStay updated with PlayReportZA.`;
      }

      if (!message) continue;

      const fbUrl = `https://graph.facebook.com/v21.0/${pageId}/feed`;
      await fetch(fbUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, access_token: fbToken })
      });
    }
  } catch (err) {
    console.error("Autoposter error:", err);
  }
}
