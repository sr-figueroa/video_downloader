const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
app.use(express.static(path.join(__dirname, 'public')));

const downloadsDir = path.join(__dirname, 'downloads');
fs.ensureDirSync(downloadsDir);

app.post('/api/download', async (req, res) => {
	const { url, platform, format = 'mp4' } = req.body;

	if (!url) {
		return res.status(400).json({ error: 'URL requerida' });
	}

	const supportedPlatforms = ['youtube', 'tiktok', 'twitter'];
	if (!supportedPlatforms.includes(platform)) {
		return res.status(400).json({ error: 'Plataforma no compatible' });
	}

	try {
		const parsedUrl = new URL(url);
		const hostname = parsedUrl.hostname.toLowerCase();
		const platformHosts = {
			youtube: ['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be'],
			tiktok: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'],
			twitter: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com']
		};
		if (!platformHosts[platform].includes(hostname)) {
			return res.status(400).json({ error: 'El enlace no corresponde a la plataforma seleccionada' });
		}
	} catch {
		return res.status(400).json({ error: 'Enlace no válido' });
	}

	const id = uuidv4();
	const outputPath = path.join(downloadsDir, id);

	try {
		let args;
		const extractorArgs = ['--js-runtimes', 'node', '--remote-components', 'ejs:github'];
		if (platform === 'tiktok') {
			extractorArgs.push('--impersonate', 'chrome');
		}

		if (format === 'mp3') {
			args = [...extractorArgs, '-x', '--audio-format', 'mp3', '--audio-quality', '0', url, '-o', `${outputPath}.%(ext)s`];
		} else {
			args = [...extractorArgs, '-f', 'bv*[ext=mp4][vcodec^=avc1][height<=1080]+ba[ext=m4a]/b[ext=mp4]/b', '--merge-output-format', 'mp4', url, '-o', `${outputPath}.%(ext)s`];
		}

		console.log('Descargando...', platform, url);

		await new Promise((resolve, reject) => {
			execFile('./yt-dlp', args, { timeout: 120000 }, (error, stdout, stderr) => {
				if (error) {
					console.error('Error:', stderr || error);
					error.downloadDetails = stderr.trim();
					reject(error);
					return;
				}

				console.log('Completado:', stdout);
				resolve();
			});
		});

		const files = await fs.readdir(downloadsDir);
		const downloadedFile = files.find(file => file.startsWith(id));

		if (!downloadedFile) {
			throw new Error('Archivo no encontrado');
		}

		const downloadUrl = `${req.protocol}://${req.get('host')}/downloads/${downloadedFile}`;
		res.json({ success: true, downloadUrl, filename: downloadedFile });
	} catch (error) {
		res.status(500).json({
			success: false,
			error: 'Error al descargar',
			details: error.downloadDetails || error.message
		});
	}
});

app.listen(PORT, () => {
	console.log(`Servidor en http://localhost:${PORT}`);
});
