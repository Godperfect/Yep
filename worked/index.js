// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Render HTML Template
const renderHTML = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YouTube Downloader</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
        }
        .error {
            padding: 20px;
            background-color: #fdd;
            color: #900;
        }
        .btn {
            padding: 10px;
            background-color: #007BFF;
            color: white;
            text-decoration: none;
        }
        .btn:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    ${content}
</body>
</html>
`;

app.get("/", (req, res) => {
    const contentHTML = `
        <h1>Download YouTube Video & Audio</h1>
        <form method="POST" action="/download">
            <input type="url" name="url" placeholder="Enter YouTube URL" required>
            <select name="format">
                <option value="video">Video</option>
                <option value="audio">Audio</option>
            </select>
            <button type="submit" class="btn">Download</button>
        </form>
    `;
    res.send(renderHTML(contentHTML));
});

app.post('/download', (req, res) => {
    const { url, format } = req.body;

    if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
        const errorHTML = `
            <div class="error">
                <h1>Error</h1>
                <p>Invalid URL. Please provide a valid YouTube URL.</p>
                <a href="/" class="btn">Go Back</a>
            </div>
        `;
        return res.send(renderHTML(errorHTML));
    }

    const outputFile = format === "audio" ? "audio_output.mp3" : "video_output.mp4";

    // Use yt-dlp to handle downloading
    const ytDlp = spawn("yt-dlp", [
        ...(format === "audio" ? ['-x', '--audio-format', 'mp3'] : []),
        "--output", path.join(__dirname, outputFile),
        url
    ]);

    ytDlp.stdout.on("data", (data) => console.log(`yt-dlp stdout: ${data}`));
    ytDlp.stderr.on("data", (data) => console.error(`yt-dlp error: ${data}`));

    ytDlp.on("close", (code) => {
        if (code === 0) {
            res.download(path.join(__dirname, outputFile), outputFile, (err) => {
                if (err) console.error("Download error:", err.message);
            });
        } else {
            const errorHTML = `
                <div class="error">
                    <h1>Error</h1>
                    <p>Failed to process your request. Please try again.</p>
                    <a href="/" class="btn">Go Back</a>
                </div>
            `;
            res.send(renderHTML(errorHTML));
        }
    });
});

app.listen(PORT, () => console.log(`App running on http://localhost:${PORT}`));