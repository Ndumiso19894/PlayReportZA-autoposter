export default {
  async fetch(request, env, ctx) {
    const result = await runAutoposter(env);
    return new Response(JSON.stringify(result, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  },

  async scheduled(event, env, ctx) {
    await runAutoposter(env);
  }
};


async function runAutoposter(env) {
  const apiKey = env.API_FOOTBALL_KEY;
  const fbToken = env.FB_PAGE_TOKEN;
  const pageId = env.FB_PAGE_ID;

  if (!apiKey || !fbToken || !pageId) {
    return { error: "Missing environment variables." };
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const url = `https://v3.football.api-sports.io/fixtures?date=${today}`;

    const apiResponse = await fetch(url, {
      headers: { "x-apisports-key": apiKey }
    });

    const apiData = await apiResponse.json();

    let message = "";

    if (!apiData.response || apiData.response.length === 0) {
      message = "No fixtures for today.";
    } else {
      const match = apiData.response[0];
      message =
        `⚽ Today's Match\n` +
        `${match.teams.home.name} vs ${match.teams.away.name}\n` +
        `League: ${match.league.name}\n` +
        `Kickoff: ${match.fixture.date}`;
    }

    // POST to Facebook
    const fbUrl = `https://graph.facebook.com/${pageId}/feed?message=${encodeURIComponent(message)}&access_token=${fbToken}`;

    const fbResponse = await fetch(fbUrl, { method: "POST" });
    const fbData = await fbResponse.json();

    return {
      status: "Success",
      posted_message: message,
      facebook_result: fbData
    };

  } catch (err) {
    return {
      status: "Error",
      error: err.toString()
    };
  }
}