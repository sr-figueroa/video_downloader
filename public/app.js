const API_BASE_URL = window.location.port === '';
let currentPlatform = 'youtube';

const tabs = document.querySelectorAll('.tab');
const urlInput = document.getElementById('videoUrl');
const downloadBtn = document.getElementById('downloadBtn');
const result = document.getElementById('result');
const formatInputs = document.querySelectorAll('input[name="format"]');

tabs.forEach(tab => {
	 tab.addEventListener('click', () => {
		tabs.forEach(item => item.classList.remove('active'));
		tab.classList.add('active');
		currentPlatform = tab.dataset.platform;
		urlInput.value = '';
		const placeholders = {
			youtube: 'https://youtube.com/watch?v=...',
			tiktok: 'https://tiktok.com/@user/video/...',
			twitter: 'https://x.com/user/status/...'
		};
		urlInput.placeholder = placeholders[currentPlatform];
		hideResult();
	});
});

formatInputs.forEach(input => {
	input.addEventListener('change', hideResult);
});

downloadBtn.addEventListener('click', async () => {
	const url = urlInput.value.trim();
	const selectedFormat = document.querySelector('input[name="format"]:checked');

	if (!url) {
		showError('Ingresa un enlace válido');
		return;
	}

	downloadBtn.disabled = true;
	downloadBtn.textContent = 'Descargando...';
	hideResult();

	try {
		const response = await fetch(`${API_BASE_URL}/api/download`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ url, platform: currentPlatform, format: selectedFormat.value })
		});
		const data = await response.json();

		if (!response.ok || !data.success) {
			throw new Error(data.details || data.error || 'Error desconocido');
		}

		showSuccess(data.downloadUrl, data.filename);
	} catch (error) {
		showError(error.message === 'Failed to fetch'
			? 'No se pudo conectar con el servidor. Ejecuta npm start.'
			: error.message);
		console.error(error);
	} finally {
		downloadBtn.disabled = false;
		downloadBtn.textContent = 'Descargar';
	}
});

function showSuccess(downloadUrl, filename) {
	result.className = 'result success';
	result.innerHTML = `<p>Descarga lista</p><a href="${downloadUrl}" download="${filename}">Descargar archivo</a>`;
}

function showError(message) {
	result.className = 'result error';
	result.textContent = message;
}

function hideResult() {
	result.className = 'result hidden';
	result.textContent = '';
}

urlInput.addEventListener('keydown', event => {
	if (event.key === 'Enter') {
		downloadBtn.click();
	}
});
