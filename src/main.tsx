import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/archivo/wdth.css';
import './styles.css';
import { App } from './app/App';
import { Gate } from './account/Gate';

const rootHost = document.getElementById('root')!;
const runtime = globalThis as typeof globalThis & { __godChessRoot?: ReturnType<typeof createRoot> };
const appRoot = runtime.__godChessRoot ?? createRoot(rootHost);
runtime.__godChessRoot = appRoot;
appRoot.render(<React.StrictMode><Gate><App /></Gate></React.StrictMode>);
