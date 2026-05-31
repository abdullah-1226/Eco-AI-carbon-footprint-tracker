const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// On web, swap native-only modules for browser-compatible stubs
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName === 'react-native-maps') {
      return { filePath: path.resolve(__dirname, 'src/mocks/react-native-maps.js'), type: 'sourceFile' };
    }
    if (moduleName === 'react-native-webview') {
      return { filePath: path.resolve(__dirname, 'src/mocks/react-native-webview.js'), type: 'sourceFile' };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
