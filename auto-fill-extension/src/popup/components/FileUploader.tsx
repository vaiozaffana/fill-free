import React, { useRef, useState } from 'react';
import { parseFile, UnsupportedFileError } from '../../lib/parser';
import { mapFields } from '../../lib/mapper';
import type { MappedData } from '../../lib/types';
import { getActiveTabFields } from '../formFields';

interface FileUploaderProps {
  onMapped: (data: MappedData) => void;
  onError: (message: string) => void;
}

export function FileUploader({ onMapped, onError }: FileUploaderProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
      const parsed = await parseFile(file);
      const firstRow = parsed.rows[0];
      if (firstRow === undefined) {
        onError('The file contains no data rows.');
        return;
      }
      const fields = await getActiveTabFields();
      const mapped = mapFields(fields, firstRow);
      onMapped(mapped);
    } catch (err) {
      if (err instanceof UnsupportedFileError) {
        onError(err.message);
      } else {
        onError('Could not read the file.');
      }
    }
  }

  return (
    <div className="file-uploader">
      <input
        ref={inputRef}
        type="file"
        accept=".json,.csv,.xlsx"
        onChange={(e) => void handleChange(e)}
      />
      {fileName !== '' && <span className="file-name">{fileName}</span>}
    </div>
  );
}
