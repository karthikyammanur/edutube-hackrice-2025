import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './utils/themeInit';
import Landing from './Landing';
import Upload from './Upload';
import Flashcards from './Flashcards';
import Summary from './Summary';
import Quiz from './Quiz';
import { VideoProvider } from './hooks/use-video';
import { StudyMaterialsProvider } from './hooks/use-study-materials';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeToggle } from './components/ThemeToggle';
import { initializeTheme } from './utils/ThemeManager';

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

	// Parse hash to determine route
	const route = hash.split('?')[0] || '#';
	
	console.log('🛣️ [ROUTER-FRONTEND] Current route:', route, 'Hash:', hash);
	
	if (route === '#upload') {
		return <Upload />;
	}
	if (route === '#flashcards') {
		return <Flashcards />;
	}
	if (route === '#summary') {
		return <Summary />;
	}
	if (route === '#quiz') {
		return <Quiz />;
	}
	return <Landing />;
}

function App(): JSX.Element {
	// Initialize theme manager on app mount
	React.useEffect(() => {
		initializeTheme();
	}, []);

	return (
		<ErrorBoundary>
			<VideoProvider>
				<StudyMaterialsProvider>
					<ThemeToggle />
					<AppRouter />
				</StudyMaterialsProvider>
			</VideoProvider>
		</ErrorBoundary>
	);
}

root.render(<App />);


