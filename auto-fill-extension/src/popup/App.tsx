import React, { useState } from 'react';
import { ModeToggle, type Mode } from './components/ModeToggle';
import { FileUploader } from './components/FileUploader';
import { MappingPreview } from './components/MappingPreview';
import { StatusBadge, type Status } from './components/StatusBadge';
import type { MappedData } from '../lib/types';

interface AppState {
  mode: Mode;
  mappedData: MappedData | null;
  status: Status;
  statusMessage: string;
}

const INITIAL: AppState = {
  mode: 'dummy',
  mappedData: null,
  status: 'idle',
  statusMessage: '',
};

export function App(): React.JSX.Element {
  const [state, setState] = useState<AppState>(INITIAL);

  function setMode(mode: Mode): void {
    setState((s) => ({ ...s, mode, status: 'idle', statusMessage: '' }));
  }

  function setMapped(mappedData: MappedData): void {
    const count = Object.keys(mappedData).length;
    setState((s) => ({
      ...s,
      mappedData,
      status: count > 0 ? 'idle' : 'error',
      statusMessage: count > 0 ? '' : 'No fields matched the uploaded file.',
    }));
  }

  function setError(message: string): void {
    setState((s) => ({ ...s, status: 'error', statusMessage: message }));
  }

  async function fillDummy(): Promise<void> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) {
      setError('No active tab.');
      return;
    }
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/filler.js'],
      });
      setState((s) => ({ ...s, status: 'success', statusMessage: 'Form filled!' }));
    } catch {
      setError('Could not fill form.');
    }
  }

  async function fillFromFile(): Promise<void> {
    if (state.mappedData === null || Object.keys(state.mappedData).length === 0) {
      setError('Upload a file with matching fields first.');
      return;
    }
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'fill-playwright',
        data: state.mappedData,
      });
      if (response?.ok === true) {
        setState((s) => ({ ...s, status: 'success', statusMessage: 'Sent to Playwright!' }));
      } else {
        setError('Playwright companion did not respond. Is it running on :3333?');
      }
    } catch {
      setError('Could not reach the Playwright companion.');
    }
  }

  function handleFill(): void {
    if (state.mode === 'dummy') void fillDummy();
    else void fillFromFile();
  }

  return (
    <main className="app">
      <h1 className="app-title">Auto Fill Form</h1>

      <ModeToggle mode={state.mode} onChange={setMode} />

      {state.mode === 'file' && (
        <FileUploader onMapped={setMapped} onError={setError} />
      )}

      {state.mappedData !== null && <MappingPreview mappedData={state.mappedData} />}

      <button type="button" className="fill-btn" onClick={handleFill}>
        Fill Form
      </button>

      <StatusBadge status={state.status} message={state.statusMessage} />
    </main>
  );
}
