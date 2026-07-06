document.getElementById('btn')?.addEventListener('click', () => {
	const output = document.getElementById('output');
	if (output) {
		output.textContent = `Clicked at ${new Date().toLocaleTimeString()}`;
	}
});

// Storage test
try {
	localStorage.setItem('obsidian-browser-test', 'works');
	const val = localStorage.getItem('obsidian-browser-test');
	const el = document.getElementById('storage-output');
	if (el) el.textContent = `localStorage: ${val}`;
} catch (e) {
	const el = document.getElementById('storage-output');
	if (el) el.textContent = `localStorage unavailable: ${e}`;
}

console.log('Obsidian Browser test page loaded successfully');
