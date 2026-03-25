/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

import notifee, { EventType } from '@notifee/react-native';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('[Notifee] Background event received:', type, detail);
});

AppRegistry.registerComponent(appName, () => App);
