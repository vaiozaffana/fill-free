const fillBtn = document.getElementById('fill-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;

fillBtn.addEventListener('click', () => {
  void fillActiveTab();
});

async function fillActiveTab(): Promise<void> {
  statusEl.textContent = '';
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab?.id === undefined) {
    statusEl.textContent = 'Error: no active tab.';
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/content/filler.js'],
    });
    statusEl.textContent = 'Form filled!';
  } catch {
    statusEl.textContent = 'Error: could not fill form.';
  }
}
