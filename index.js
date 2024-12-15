const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/download', (req, res) => {
    const { url, format } = req.body;

    if (!url || !url.startsWith('http')) {
        return res.status(400).send('Invalid YouTube URL');
    }

    // Extract video title first using yt-dlp
    const getTitleProcess = spawn('yt-dlp', ['--get-title', url]);

    let videoTitle = '';
    getTitleProcess.stdout.on('data', data => {
        videoTitle += data.toString().trim();
    });

    getTitleProcess.stderr.on('data', data => {
        console.error('Error getting title:', data.toString());
    });

    getTitleProcess.on('close', code => {
        if (code !== 0) {
            return res.status(500).send('Failed to get video title');
        }

        // Sanitize the title to prevent invalid filenames
        const sanitizedTitle = videoTitle.replace(/[^a-zA-Z0-9 _-]/g, '_');
        const outputFilename = format === 'audio' ? `${sanitizedTitle}.mp3` : `${sanitizedTitle}.mp4`;

        const ytDlpArgs = [
            ...(format === 'audio' ? ['-x', '--audio-format', 'mp3'] : []),
            '-f', 'mp4',
            url
        ];

        const ytDlpProcess = spawn('yt-dlp', ytDlpArgs);

        res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
        res.setHeader('Content-Type', 'application/octet-stream');

        // Pipe the video/audio content directly to the response
        ytDlpProcess.stdout.pipe(res);

        ytDlpProcess.stderr.on('data', data => {
            console.error('Error:', data.toString());
        });

        ytDlpProcess.on('close', code => {
            if (code !== 0) {
                console.error('Download process completed with errors.');
            }
        });
    });
});

app.listen(PORT, () => console.log(`App running on http://localhost:${PORT}`));