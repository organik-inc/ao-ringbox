const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
// const play = require('audio-play');
// const load = require('audio-loader');
// const Speaker = require('speaker');
// const Speaker = require('audio-speaker/stream');
const fs = require('fs');

const { exec } = require('child_process');

var lastPointer = '';

var ao = {
    me: "KqDVFBdndQJ6WbvjACfgtENC4LDZkak5zfqF4bjBW0E"
}

var active = false;

const {
  result,
  results,
  message,
  spawn,
  monitor,
  unmonitor,
  dryrun,
} = require("@permaweb/aoconnect");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
  
const mp3FilePath = __dirname + '/RingBox-Audio.wav';

// Serve the HTML page for the web UX
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const getResults = async (pid)=>{
  // Emit socket event to notify the client
  if(!active){
    return false
  }
  let resultsOut = await results({
  process: pid,
  from : (lastPointer == '') ? '' : lastPointer,
  sort: "DESC",
  limit: 2,
});
  console.log('ao monitor:', resultsOut.length || false, lastPointer);
        let resultsArray = [];
        // console.log(JSON.stringify(resultsOut));
        Object.entries(resultsOut.edges).forEach(([key, value]) => {
            console.log(`${key}: ${value.node.Output.data}`);
            resultsArray[key] = value.node.Output.data;
        });

        let lastPointerAux = resultsOut.edges[0]?.cursor || lastPointer;
            console.log(lastPointerAux, lastPointer);

        return {lastPointerAux, resultsArray};

}

// Serve the HTML page for the remote UX
app.get('/remote', async (req, res) => {
  let resultsOut = await getResults(ao.me)
   if(resultsOut){
      io.emit('visit', 'Someone visited the /remote page.');
   }
  res.sendFile(__dirname + '/remote.html');
});

const ringMyBox = (mp3FilePath)=>{
  // Path to your MP3 file

// Use the aplay command to play the MP3 file
  return exec(`aplay ${mp3FilePath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      // res.status(500).send('Error occurred while playing the audio');
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    // res.send('Playback completed');
  });

}

// Endpoint to activate/deactivate monitoring
app.get('/activate', (req, res) => {
    active = !active; // Flip the active state
    res.send(`Monitoring is now ${active ? 'active' : 'inactive'}`);
});

app.get('/me/:process', (req, res) => {
    const newMe = req.params.process;
    ao.me = newMe;
    res.send(`ao.me parameter has been updated to: ${ao.me}`);
});

// Endpoint to play the MP3 sound
app.get('/play', (req, res) => {
  ringMyBox(mp3FilePath);
  res.send('Playback started');
  // Create a new Speaker instance
  // const speaker = new Speaker();

  // Create a readable stream from the MP3 file
  // const mp3Stream = fs.createReadStream(mp3FilePath);

  // Pipe the MP3 stream to the speaker
  // mp3Stream.pipe(speaker);
  // mp3Stream.pipe(Speaker());

  // Handle end of stream
  /*FilePat
   * mp3Stream.on('end', () => {
    console.log('Playback ended');
    res.send('Playback ended');
  });
  */
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected');
});


// Define monitorInterval globally
const monitorInterval = 1000; // 1 seconds in milliseconds

// Function to monitor AO Connect results periodically
const monitorAOS = async () => {
    try {
        let {resultsOut, lastPointerAux} = await getResults(ao.me);
        console.log(lastPointerAux === lastPointer, lastPointerAux, lastPointer);
        if (lastPointerAux != lastPointer) {
            lastPointer = lastPointerAux;
            // Pending
            //  Add allow/block lists.
            //  Check for the Message to start with:
            //  r!ng::
            //  Think of building a Lua Commuter.
            ringMyBox(mp3FilePath);
        }
    } catch (error) {
        console.error("Error occurred during monitoring:", error);
    } finally {
        // Schedule the next execution of monitorAOS after the specified interval
        setTimeout(monitorAOS, monitorInterval);
    }
};

// Start monitoring when the server is started
let port = 3000;
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    // Start monitoring AO Connect results
    monitorAOS();
});