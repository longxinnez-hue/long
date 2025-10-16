
import { useState, useCallback } from 'react';

type CopyStatus = 'inactive' | 'copied' | 'error';

export const useCopyToClipboard = (): [CopyStatus, (text: string) => void] => {
    const [copyStatus, setCopyStatus] = useState<CopyStatus>('inactive');

    const copy = useCallback((text: string) => {
        navigator.clipboard.writeText(text).then(
            () => {
                setCopyStatus('copied');
                setTimeout(() => setCopyStatus('inactive'), 2000);
            },
            () => {
                setCopyStatus('error');
                setTimeout(() => setCopyStatus('inactive'), 2000);
            }
        );
    }, []);

    return [copyStatus, copy];
};
