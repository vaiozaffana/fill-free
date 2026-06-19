import React from 'react';
import type { MappedData } from '../../lib/types';

interface MappingPreviewProps {
  mappedData: MappedData;
}

export function MappingPreview({ mappedData }: MappingPreviewProps): React.JSX.Element {
  const entries = Object.entries(mappedData);

  if (entries.length === 0) {
    return <p className="mapping-empty">No fields matched the uploaded file.</p>;
  }

  // Scroll when more than 8 rows (≈ 8 × row height).
  const scrollable = entries.length > 8;

  return (
    <div className={scrollable ? 'mapping-wrap scroll' : 'mapping-wrap'}>
      <table className="mapping-table">
        <thead>
          <tr>
            <th>Form Field</th>
            <th>Value from File</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([field, value]) => (
            <tr key={field}>
              <td>{field}</td>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
