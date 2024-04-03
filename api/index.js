import { createServer } from "http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import fetch from "node-fetch";
import fs from "fs/promises";

const httpServer = createServer();
const io = new SocketIOServer(httpServer);
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

const apiUrl = "https://fdnd-agency.directus.app/items";

// File to store liked items
const likesFile = path.join(__dirname, 'liked-items.json');


// Function to save liked items to file
async function saveLikes() {
  try {
    await fs.writeFile(likesFile, JSON.stringify(likes));
  } catch (error) {
    console.error("Error saving liked items:", error);
  }
}

function dataConverter(request) {
  console.log("Data successfully converted: ", request.data)
  return request.data;
}

// Ignore favicon.ico request
app.get('/favicon.ico', (req, res) => {
  res.status(204);
});

// Load liked items from file on server startup
async function loadLikes() {
  try {
    const data = await fs.readFile(likesFile);
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or error reading, return empty array
    return [];
  }
}

let likes = [];
loadLikes().then(data => {
  likes = data;
  console.log('Liked items:', likes);
});

// Render the homepage with playlists and liked items
app.get('/', async (request, response) => {
  try {
    const API = `${apiUrl}/tm_playlist`;

    // Fetch all playlists
    const allPlaylistsResponse = await fetch(API);
    const allPlaylists = await allPlaylistsResponse.json();

    // use loadLikes()
    const likedPlaylistIds = likes;

    

    response.render('index', {
      playlist: allPlaylists.data,
      liked: [],
    });

  } catch (error) {
    console.error(error);
    response.status(500).send("Internal Server Error");
  }
});





// Render playlists
app.get('/playlists', async (request, response) => {
  try {
    const API =  `${apiUrl}/tm_playlist`;
    const [data] = await Promise.all([
      fetch(API).then(res => res.json()),
    ]);
    const dataFinal = dataConverter(data);
    response.render('playlists', {
      playlist: dataFinal,
    });
  } catch (error) {
    console.error(error);
    response.status(500).send("Internal Server Error");
  }
});

// Render playlist based on slug
app.get('/:slug', async (request, response) => {
  try {
    const API = `${apiUrl}/tm_playlist?filter={"slug":"${request.params.slug}"}&fields=title,description,slug,stories.tm_story_id.title,stories.tm_story_id.summary,stories.tm_story_id.image,stories.tm_story_id.slug,language_id.language,language_id.flag.id`;
    const [data] = await Promise.all([
      fetch(API).then(res => res.json()),
    ]);
    const dataFinal = dataConverter(data);
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

// Render story based on playlist and story slug
app.get('/:playlistSlug/:storySlug', async (request, response) => {
  try {
    const API = `${apiUrl}/tm_story?filter={"slug":"${request.params.storySlug}"}&fields=title,description,slug,image,video,playlist.tm_playlist_id.title,playlist.tm_playlist_id.slug, playlist.tm_playlist_id.description,`;
    const [data] = await Promise.all([
      fetch(API).then(res => res.json()),
    ]);
    const dataFinal = dataConverter(data);
    response.render('story', {
      story: dataFinal[0],
    });
  } catch (error) {
    console.error(error);
    response.status(500).send("Internal Server Error");
  }
});

// Like endpoint to store liked item IDs
app.post('/like', async (req, res) => {
  try {
      const { itemId } = req.body;
      console.log(req.body);
      console.log('Item liked:', itemId);
      // Store liked item ID
      likes.push(itemId);
      console.log('Liked items:', likes);
      // Save liked items to file
      await saveLikes();

      res.status(200).json({ message: 'Item liked successfully' });
  } catch (error) {
      console.error('Error occurred:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

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

// Handle server error
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

// Export the app
module.exports = app;
