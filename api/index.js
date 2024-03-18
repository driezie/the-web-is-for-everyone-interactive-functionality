/*
  Dit is de server van de applicatie.
  Hier worden alle routes gedefinieerd en
  wordt de server opgestart.
*/

import { createServer } from "http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import fetch from "node-fetch";

const httpServer = createServer();
const io = new SocketIOServer(httpServer);
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

const apiUrl = "https://fdnd-agency.directus.app/items";

/* 
  Hier worden de arrays die uit direcus komen 
  geconverteerd. Hij haalt hierbij de .data 
  weg uit de array en geeft de data terug.
*/
function dataConverter(request) {
  console.log("Data succesvol geconverteerd: ", request.data)
  return request.data;
}

/*
  Door deze functie krijgt de favicon.ico een 
  "No content" error. Dit is goed omdat deze 
  issue bij mij soms opeens in de slug staat.
*/

app.get('/favicon.ico', (req, res) => {
  res.status(204);
});

// Lessons page
app.get('/', async (request, response) => {
  try {
    const [playlistData, storiesData] = await Promise.all([
      fetch(apiUrl + '/tm_playlist').then(res => res.json()),
      fetch(apiUrl + '/tm_story').then(res => res.json()),
    ]);

    // Haalt de .data uit de 2 arrays
    const dataFinalPlaylist = dataConverter(playlistData)
    const dataFinalStories = dataConverter(storiesData)


    response.render('index', {
      // Nog mee bezig, wil eerst zonder data de layout mooi maken
      // playlist: dataFinalPlaylist,
      // stories: dataFinalStories,
    });

  } catch (error) {
    console.error(error);
    response.status(500).send("Internal Server Error");
  }
});

// Lijst met Playlists
app.get('/playlists', async (request, response) => {
  try {
    const API =  `${apiUrl}/tm_playlist`;
    console.log("Api link aangemaakt: " ,API);

    const [data] = await Promise.all([
      fetch(API).then(res => res.json()),
    ]);

    // Haalt de .data uit de array
    const dataFinal = dataConverter(data)

    response.render('playlists', {
      playlist: dataFinal,
    });

  } catch (error) {
    console.error(error);
    response.status(500).send("Internal Server Error");
  }
});

// Lijst met stories uit de gekozen playlist
app.get('/:slug', async (request, response) => {
  try {
    const API = `${apiUrl}/tm_playlist?filter={"slug":"${request.params.slug}"}&fields=title,description,slug,stories.tm_story_id.title,stories.tm_story_id.summary,stories.tm_story_id.image,stories.tm_story_id.slug,language_id.language,language_id.flag.id`;
    console.log("Api link aangemaakt: " ,API);

    const [data] = await Promise.all([
      fetch(API).then(res => res.json()),
    ]);

    // Haalt de .data uit de array
    const dataFinal = dataConverter(data)

    // Laad de playlist pagina met de data
    response.render('playlist', {
      playlist: dataFinal[0],
      stories: dataFinal[0].stories || [],
      language: dataFinal[0].language_id || [],
    });
  } catch (error) {
    console.error(error);
    response.status(500).send("Internal Server Error");
  }

});

// Stories pagina waarin alle storie informatie staat
app.get('/:playlistSlug/:storySlug', async (request, response) => {
  try {
    const API = `${apiUrl}/tm_story?filter={"slug":"${request.params.storySlug}"}&fields=title,description,slug,image,video,playlist.tm_playlist_id.title,playlist.tm_playlist_id.slug, playlist.tm_playlist_id.description,`;
    console.log("Api link aangemaakt: " ,API);

    const [data] = await Promise.all([
      fetch(API).then(res => res.json()),
    ]);

    // Haalt de .data uit de array
    const dataFinal = dataConverter(data)

    // Laad de story pagina met de data
    response.render('story', {
      story: dataFinal[0],
    });
  } catch (error) {
    console.error(error);
    response.status(500).send("Internal Server Error");
  }
});

/* 
  Hier niet aanzitten. Dit zorgt er allemaal 
  voor dat de server kan werken met Vercel issues
*/

const port = process.env.PORT || 8080;

httpServer.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

/*
  Checkt of er een error is, als er een error 
  EADDRINUSE is probeert hij een andere port
*/
httpServer.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    const address = httpServer.address();
    if (address !== null && typeof address !== "string") {
      const currentPort = address.port;
      const newPort = currentPort + 1;
      console.error(`Address ${currentPort} already in use, retrying on port ${newPort} in a few seconds...`);
      setTimeout(() => {
        httpServer.listen(newPort);
      }, 1000);
    } else {
      console.error(`Unable to retrieve server.`);
    }
  }
});

// Exporteer de app
module.exports = app;
