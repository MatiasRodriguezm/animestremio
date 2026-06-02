const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const API_URL = "https://animeapi-production-f3dc.up.railway.app";
const API_KEY = "dev-anime1v-key";

const manifest = {
    id: "org.matias.anime1v",
    version: "1.0.0",
    name: "Anime1V",
    description: "Anime1V para Stremio",
    resources: ["catalog", "meta", "stream"],
    types: ["series"],
    catalogs: [
        {
            type: "series",
            id: "anime1v",
            name: "Anime1V"
        }
    ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async ({ extra }) => {

    const search = extra?.search || "onepiece";

    const { data } = await axios.get(
        `${API_URL}/api/v1/anime/search`,
        {
            params: {
                q: search,
                apiKey: API_KEY
            }
        }
    );

    return {
        metas: data.data.results.map(anime => ({
            id: encodeURIComponent(anime.url),
            type: "series",
            name: anime.title,
            poster: anime.image
        }))
    };
});

builder.defineMetaHandler(async ({ id }) => {

    const animeUrl = decodeURIComponent(id);

    const { data } = await axios.get(
        `${API_URL}/api/v1/anime/info`,
        {
            params: {
                url: animeUrl,
                apiKey: API_KEY
            }
        }
    );

    const anime = data.data;

    return {
        meta: {
          id,
          type: "series",
          name: anime.title,
          poster: anime.image,
          description: anime.description,
      
          videos: anime.episodes.map(ep => ({
            id: encodeURIComponent(ep.url),
            title: ep.title,
            season: 1,
            episode: ep.number
          }))
        }
      };
});

const isDirectStream = (url) => {
    return (
        url.includes(".m3u8") ||
        url.match(/\.mp4(\?|$)/)
    );
};

builder.defineStreamHandler(async ({ id }) => {

    const episodeUrl = decodeURIComponent(id);

    const { data } = await axios.get(
        `${API_URL}/api/v1/anime/episode`,
        {
            params: {
                url: episodeUrl,
                apiKey: API_KEY
            }
        }
    );

    const streams = [];

    const allServers = [
        ...(data.data.servers.sub || []),
        ...(data.data.servers.dub || [])
    ];

    for (const server of allServers) {

        if (server.server.toLowerCase().includes("streamtape")) {
            continue;
        }
    
        if (isDirectStream(server.url)) {
            streams.push({
                title: server.server,
                url: server.url
            });
        }
    }

    return { streams };
});

serveHTTP(builder.getInterface(), {
    port: process.env.PORT || 7000
});