// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import TagManager from 'react-gtm-module';

import App from './app/app';

TagManager.initialize({
  gtmId: 'GTM-M49LZVZ'
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
