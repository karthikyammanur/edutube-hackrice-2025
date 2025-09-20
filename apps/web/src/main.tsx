import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import Landing from './Landing';
import Upload from './Upload';

const container = document.getElementById('root');
if (!container) {
	throw new Error('Root element not found');
}
const root = createRoot(container);

function AppRouter(): JSX.Element {
	const [hash, setHash] = React.useState<string>(window.location.hash);

	React.useEffect(() => {
		const handler = (): void => setHash(window.location.hash);
		window.addEventListener('hashchange', handler);
		return () => window.removeEventListener('hashchange', handler);
	}, []);

	if (hash === '#upload') {
		return <Upload />;
	}
	return <Landing />;
}

root.render(
	<React.StrictMode>
		<AppRouter />
	</React.StrictMode>
);


