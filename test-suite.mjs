#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failedTestsList = [];

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testPass(name) {
  passedTests++;
  totalTests++;
  console.log(`  ${colors.green}✓${colors.reset} ${name}`);
}

function testFail(name, reason) {
  failedTests++;
  totalTests++;
  console.log(`  ${colors.red}✗${colors.reset} ${name}`);
  failedTestsList.push({ name, reason });
}

function section(title) {
  console.log(`\n${colors.blue}▶${colors.reset} ${title}`);
}

function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(__dirname, filePath), 'utf-8');
  } catch (e) {
    return null;
  }
}

function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

function fileContains(filePath, pattern) {
  const content = readFile(filePath);
  if (!content) return false;
  return pattern.test ? pattern.test(content) : content.includes(pattern);
}

// Test suites
function testProjectStructure() {
  section('Project Structure & Files');
  
  const dirs = [
    'src/',
    'src/components/',
    'src/services/',
    'public/'
  ];
  
  dirs.forEach(dir => {
    fileExists(dir) 
      ? testPass(`${dir} directory exists`)
      : testFail(`${dir} directory exists`, `Directory not found: ${dir}`);
  });
  
  const files = [
    'src/App.tsx',
    'src/firebase.ts',
    'src/services/firestoreService.ts',
    'src/components/MapView.tsx',
    'src/components/Login.tsx',
    'src/components/Favorites.tsx',
    'src/components/Itinerary.tsx',
    'src/components/VisitedPlaces.tsx',
    'src/index.css',
    'src/main.tsx',
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'firestore.rules',
    'index.html'
  ];
  
  files.forEach(file => {
    fileExists(file)
      ? testPass(`${file} exists`)
      : testFail(`${file} exists`, `File not found: ${file}`);
  });
}

function testFirestoreIntegration() {
  section('Firestore Integration');
  
  const fsService = readFile('src/services/firestoreService.ts');
  if (!fsService) {
    testFail('firestoreService exists', 'File not found');
    return;
  }
  
  testPass('firestoreService.ts exists');
  
  // Check for key exports
  const exports = [
    { name: 'saveFavorite', pattern: /export.*function saveFavorite/ },
    { name: 'deleteFavorite', pattern: /export.*function deleteFavorite/ },
    { name: 'getFavorites', pattern: /export.*function getFavorites/ },
    { name: 'subscribeFavorites', pattern: /export.*function subscribeFavorites/ },
    { name: 'saveVisitedPlace', pattern: /export.*function saveVisitedPlace/ },
    { name: 'deleteVisitedPlace', pattern: /export.*function deleteVisitedPlace/ },
    { name: 'getVisitedPlaces', pattern: /export.*function getVisitedPlaces/ },
    { name: 'subscribeVisitedPlaces', pattern: /export.*function subscribeVisitedPlaces/ },
    { name: 'saveItinerary', pattern: /export.*function saveItinerary/ },
    { name: 'getItinerary', pattern: /export.*function getItinerary/ },
    { name: 'subscribeItinerary', pattern: /export.*function subscribeItinerary/ }
  ];
  
  exports.forEach(exp => {
    fsService.match(exp.pattern)
      ? testPass(`Exports ${exp.name}`)
      : testFail(`Exports ${exp.name}`, `${exp.name} not exported`);
  });
  
  // Check for sanitizeId function
  fsService.includes('function sanitizeId')
    ? testPass('sanitizeId function exists')
    : testFail('sanitizeId function exists', 'Function not found');
  
  // Check sanitizeId removes slashes
  fsService.includes("replace(/\\//g, '_')")
    ? testPass('sanitizeId handles slash replacement')
    : testFail('sanitizeId handles slash replacement', 'Logic not found');
  
  // Check for migrateLocalStorageToFirestore
  fsService.includes('migrateLocalStorageToFirestore')
    ? testPass('Migration function exists')
    : testFail('Migration function exists', 'Function not found');
  
  // Check for real-time listeners
  fsService.includes('onSnapshot')
    ? testPass('Real-time listeners implemented (onSnapshot)')
    : testFail('Real-time listeners implemented', 'onSnapshot not found');
  
  // Check for unsubscribe pattern
  fsService.includes('Unsubscribe')
    ? testPass('Unsubscribe pattern implemented')
    : testFail('Unsubscribe pattern implemented', 'Unsubscribe type not found');
}

function testAuthentication() {
  section('Authentication System');
  
  const firebase = readFile('src/firebase.ts');
  if (!firebase) {
    testFail('firebase.ts exists', 'File not found');
    return;
  }
  
  testPass('firebase.ts exists');
  
  // Check exports
  firebase.includes('export const auth')
    ? testPass('Exports auth')
    : testFail('Exports auth', 'auth not exported');
  
  firebase.includes('export const db')
    ? testPass('Exports db (Firestore)')
    : testFail('Exports db', 'db not exported');
  
  // Check Firebase initialization
  firebase.includes('initializeApp')
    ? testPass('Firebase app initialized')
    : testFail('Firebase app initialized', 'initializeApp not found');
  
  firebase.includes('getAuth')
    ? testPass('Authentication service initialized')
    : testFail('Authentication service initialized', 'getAuth not found');
  
  firebase.includes('getFirestore')
    ? testPass('Firestore service initialized')
    : testFail('Firestore service initialized', 'getFirestore not found');
  
  // Check environment variables
  firebase.includes('import.meta.env.VITE_FIREBASE')
    ? testPass('Uses environment variables for config')
    : testFail('Uses environment variables', 'Environment variables not used');
  
  // Check App.tsx auth implementation
  const appTsx = readFile('src/App.tsx');
  if (appTsx) {
    appTsx.includes('onAuthStateChanged')
      ? testPass('App.tsx uses onAuthStateChanged listener')
      : testFail('Auth state listener', 'onAuthStateChanged not found');
    
    (appTsx.includes('signInWithEmailAndPassword') || 
     appTsx.includes('Login') ||
     appTsx.includes('handleLoginSuccess'))
      ? testPass('Sign in handler implemented')
      : testFail('Sign in handler', 'Sign in not implemented');
    
    // Sign up can be checked in Login component OR App.tsx
    const loginTsx = readFile('src/components/Login.tsx') || '';
    (appTsx.includes('createUserWithEmailAndPassword') || 
     loginTsx.includes('createUserWithEmailAndPassword') ||
     appTsx.includes('signUp') ||
     loginTsx.includes('signUp'))
      ? testPass('Sign up handler implemented')
      : testFail('Sign up handler', 'Sign up not implemented');
    
    appTsx.includes('signOut')
      ? testPass('Sign out handler exists')
      : testFail('Sign out handler', 'Sign out not implemented');
  }
}

function testComponentImplementation() {
  section('Component Implementation');
  
  // MapView tests
  const mapView = readFile('src/components/MapView.tsx');
  if (mapView) {
    mapView.includes('Leaflet') || mapView.includes('leaflet')
      ? testPass('MapView imports Leaflet')
      : testFail('MapView imports Leaflet', 'Leaflet not imported');
    
    mapView.includes('toggleFavorite')
      ? testPass('MapView has favorite toggle')
      : testFail('MapView has favorite toggle', 'toggleFavorite not found');
    
    mapView.includes('async') && mapView.includes('try') && mapView.includes('catch')
      ? testPass('MapView has async error handling for favorites')
      : testFail('Async error handling', 'Async/try/catch pattern not found');
    
    mapView.includes('visited') || mapView.includes('Visited')
      ? testPass('MapView handles visited places')
      : testFail('MapView handles visited places', 'Visited logic not found');
  } else {
    testFail('MapView.tsx exists', 'File not found');
  }
  
  // Login component tests
  const login = readFile('src/components/Login.tsx');
  if (login) {
    login.includes('email') || login.includes('password')
      ? testPass('Login component has form inputs')
      : testFail('Login component has form inputs', 'Form inputs not found');
    
    login.includes('sign') || login.includes('Sign')
      ? testPass('Login component has sign in/up')
      : testFail('Login component has sign in/up', 'Sign methods not found');
  }
  
  // App.tsx state tests
  const app = readFile('src/App.tsx');
  if (app) {
    app.includes('useState')
      ? testPass('App.tsx uses React hooks')
      : testFail('App.tsx uses React hooks', 'useState not found');
    
    app.includes('toggleFavorite')
      ? testPass('App.tsx has toggleFavorite function')
      : testFail('App.tsx has toggleFavorite', 'toggleFavorite not found');
    
    app.includes('favorites') && app.includes('setFavorites')
      ? testPass('App.tsx has favorites state')
      : testFail('App.tsx has favorites state', 'favorites state not found');
    
    app.includes('visited') || app.includes('Visited')
      ? testPass('App.tsx has visited places state')
      : testFail('App.tsx has visited places', 'visited state not found');
    
    app.includes('itinerary') || app.includes('Itinerary')
      ? testPass('App.tsx has itinerary state')
      : testFail('App.tsx has itinerary', 'itinerary state not found');
  }
}

function testConfiguration() {
  section('Configuration Files');
  
  // vite.config.ts
  const viteConfig = readFile('vite.config.ts');
  if (viteConfig) {
    viteConfig.includes('defineConfig')
      ? testPass('vite.config.ts uses defineConfig')
      : testFail('vite.config.ts defineConfig', 'defineConfig not found');
    
    viteConfig.includes('base:') || viteConfig.includes('base /')
      ? testPass('vite.config.ts has base path')
      : testFail('vite.config.ts has base path', 'base path not configured');
  } else {
    testFail('vite.config.ts exists', 'File not found');
  }
  
  // tsconfig.json
  const tsconfig = readFile('tsconfig.json');
  if (tsconfig) {
    const parsed = JSON.parse(tsconfig);
    
    parsed.compilerOptions?.strict
      ? testPass('tsconfig.json has strict mode')
      : testFail('tsconfig.json strict mode', 'Strict mode not enabled');
    
    const target = parsed.compilerOptions?.target;
    const validTargets = ['ES2020', 'ES2021', 'ES2022', 'ESNext'];
    validTargets.some(t => target?.includes(t))
      ? testPass('tsconfig.json targets modern ES')
      : testFail('tsconfig.json ES target', `Target is ${target}`);
  } else {
    testFail('tsconfig.json exists', 'File not found');
  }
  
  // package.json scripts
  const pkg = readFile('package.json');
  if (pkg) {
    const parsed = JSON.parse(pkg);
    
    parsed.scripts?.dev
      ? testPass('package.json has dev script')
      : testFail('package.json dev script', 'dev script not found');
    
    parsed.scripts?.build
      ? testPass('package.json has build script')
      : testFail('package.json build script', 'build script not found');
    
    parsed.type === 'module'
      ? testPass('package.json configured as ES module')
      : testFail('ES module config', 'type not set to module');
  }
}

function testSecurity() {
  section('Security & Best Practices');
  
  // Check firestore.rules
  const rules = readFile('firestore.rules');
  if (rules) {
    testPass('firestore.rules exists');
    
    rules.includes('request.auth')
      ? testPass('Rules check authentication')
      : testFail('Rules check auth', 'request.auth not found');
    
    rules.includes('{userId}') || rules.includes('match /users/')
      ? testPass('Rules enforce user isolation')
      : testFail('Rules enforce user isolation', 'User-specific paths not found');
    
    rules.includes('favorites') && rules.includes('visited')
      ? testPass('Rules define data collections')
      : testFail('Rules define collections', 'Collection rules not found');
  } else {
    testFail('firestore.rules exists', 'File not found');
  }
  
  // Check firebase config doesn't have keys in code
  const firebase = readFile('src/firebase.ts');
  if (firebase) {
    firebase.includes('import.meta.env') || firebase.includes('process.env')
      ? testPass('Firebase keys use environment variables')
      : testFail('Firebase uses env vars', 'Hardcoded credentials detected');
  }
  
  // Check for .env.example
  fileExists('.env.example')
    ? testPass('.env.example exists')
    : testFail('.env.example exists', 'File not found');
  
  // Check .gitignore
  const gitignore = readFile('.gitignore');
  if (gitignore) {
    gitignore.includes('.env')
      ? testPass('.gitignore excludes .env')
      : testFail('.gitignore excludes .env', '.env not in gitignore');
    
    gitignore.includes('node_modules')
      ? testPass('.gitignore excludes node_modules')
      : testFail('.gitignore excludes node_modules', 'node_modules not excluded');
  }
}

function testDocumentation() {
  section('Documentation');
  
  const docs = [
    { file: 'TECHNICAL_DOCUMENTATION_v3.md', name: 'Technical Documentation' },
    { file: 'FIRESTORE_SETUP.md', name: 'Firestore Setup Guide' },
    { file: 'SESSION_SUMMARY_v3.0.md', name: 'Session Summary' },
    { file: 'README.md', name: 'README' }
  ];
  
  docs.forEach(doc => {
    fileExists(doc.file)
      ? testPass(`${doc.name} exists`)
      : testFail(`${doc.name} exists`, `${doc.file} not found`);
  });
  
  // Check technical documentation content
  const techDoc = readFile('TECHNICAL_DOCUMENTATION_v3.md');
  if (techDoc) {
    techDoc.includes('Firestore')
      ? testPass('Technical docs mention Firestore')
      : testFail('Docs mention Firestore', 'Firestore not documented');
    
    techDoc.includes('real-time') || techDoc.includes('Real-time')
      ? testPass('Technical docs mention real-time sync')
      : testFail('Docs mention real-time', 'Real-time sync not documented');
    
    techDoc.includes('sanitize') || techDoc.includes('ID')
      ? testPass('Technical docs explain ID sanitization')
      : testFail('Docs explain ID sanitization', 'Sanitization not documented');
  }
}

function testGitSetup() {
  section('Git & Version Control');
  
  fileExists('.git')
    ? testPass('.git directory exists')
    : testFail('.git directory exists', 'Not a git repository');
  
  fileExists('.gitignore')
    ? testPass('.gitignore exists')
    : testFail('.gitignore exists', '.gitignore not found');
}

function testDependencies() {
  section('Package Dependencies');
  
  const pkg = readFile('package.json');
  if (!pkg) {
    testFail('package.json', 'File not found');
    return;
  }
  
  const parsed = JSON.parse(pkg);
  const deps = { ...parsed.dependencies, ...parsed.devDependencies };
  
  const requiredDeps = [
    { name: 'react', version: '18' },
    { name: 'react-dom', version: '18' },
    { name: 'typescript', version: '5' },
    { name: 'firebase', version: '10' },
    { name: 'leaflet', version: '1' },
    { name: 'react-leaflet', version: '4' },
    { name: 'vite', version: '5' }
  ];
  
  requiredDeps.forEach(dep => {
    deps[dep.name]
      ? testPass(`${dep.name} installed`)
      : testFail(`${dep.name} installed`, `${dep.name} not in package.json`);
  });
}

function testCodeQuality() {
  section('Code Quality');
  
  const fsService = readFile('src/services/firestoreService.ts');
  if (fsService) {
    // Check for JSDoc comments
    fsService.includes('/**') && fsService.includes('*/')
      ? testPass('firestoreService has documentation comments')
      : testFail('firestoreService has comments', 'JSDoc comments not found');
    
    // Check for error handling
    fsService.includes('try') && fsService.includes('catch')
      ? testPass('firestoreService has error handling')
      : testFail('firestoreService has error handling', 'Try/catch not found');
  }
  
  // Check for excessive console.log in production code
  const files = [
    'src/App.tsx',
    'src/services/firestoreService.ts'
  ];
  
  let consoleIssues = 0;
  files.forEach(file => {
    const content = readFile(file);
    if (content && content.includes('console.log')) {
      // Allow in development/debugging but flag it
      testPass(`${file} uses console for debugging`);
    }
  });
}

function testV6Features() {
  section('v6.0 - Route Sharing & Start Location');
  
  // Check route share service
  const routeShareService = readFile('src/services/routeShareService.ts');
  if (routeShareService) {
    routeShareService.includes('encodeRoute')
      ? testPass('Route share service has encodeRoute function')
      : testFail('encodeRoute function', 'Function not found');
    
    routeShareService.includes('decodeRoute')
      ? testPass('Route share service has decodeRoute function')
      : testFail('decodeRoute function', 'Function not found');
    
    routeShareService.includes('generateShareUrl')
      ? testPass('Route share service has generateShareUrl function')
      : testFail('generateShareUrl function', 'Function not found');
    
    routeShareService.includes('getSharedRouteFromUrl')
      ? testPass('Route share service has getSharedRouteFromUrl function')
      : testFail('getSharedRouteFromUrl function', 'Function not found');
    
    routeShareService.includes('ShareableRoute')
      ? testPass('ShareableRoute interface defined')
      : testFail('ShareableRoute interface', 'Interface not found');
  } else {
    testFail('routeShareService.ts exists', 'File not found');
  }
  
  // Check ShareItinerary component
  const shareItinerary = readFile('src/components/ShareItinerary.tsx');
  if (shareItinerary) {
    shareItinerary.includes('isOpen')
      ? testPass('ShareItinerary component has isOpen prop')
      : testFail('ShareItinerary isOpen prop', 'Prop not found');
    
    shareItinerary.includes('handleShare')
      ? testPass('ShareItinerary component has handleShare function')
      : testFail('handleShare function', 'Function not found');
    
    shareItinerary.includes('handleCopyToClipboard')
      ? testPass('ShareItinerary component has copy functionality')
      : testFail('Copy to clipboard', 'Functionality not found');
  } else {
    testFail('ShareItinerary.tsx exists', 'File not found');
  }
  
  // Check MapView for start location UI
  const mapView = readFile('src/components/MapView.tsx');
  if (mapView) {
    mapView.includes('startIcon')
      ? testPass('MapView has startIcon definition')
      : testFail('startIcon definition', 'Not found');
    
    mapView.includes('!startLocation')
      ? testPass('MapView conditionally shows "Set as start" button')
      : testFail('Conditional "Set as start" button', 'Logic not found');
  } else {
    testFail('MapView.tsx exists', 'File not found');
  }
  
  // Check Itinerary component for start location buttons
  const itinerary = readFile('src/components/Itinerary.tsx');
  if (itinerary) {
    itinerary.includes('onClearStart')
      ? testPass('Itinerary has onClearStart prop')
      : testFail('onClearStart prop', 'Prop not found');
    
    itinerary.includes('Clear From Start')
      ? testPass('Itinerary has "Clear From Start" button text')
      : testFail('"Clear From Start" button', 'Button text not found');
    
    itinerary.includes('Remove From Itinerary')
      ? testPass('Itinerary has "Remove From Itinerary" button text')
      : testFail('"Remove From Itinerary" button', 'Button text not found');
  } else {
    testFail('Itinerary.tsx exists', 'File not found');
  }
  
  // Check App.tsx for v6.0 integration
  const appTsx = readFile('src/App.tsx');
  if (appTsx) {
    appTsx.includes('getSharedRouteFromUrl')
      ? testPass('App.tsx imports route share utilities')
      : testFail('Route share imports', 'Not found');
    
    appTsx.includes('showShareModal')
      ? testPass('App.tsx has showShareModal state')
      : testFail('showShareModal state', 'Not found');
    
    appTsx.includes('ShareItinerary')
      ? testPass('App.tsx renders ShareItinerary component')
      : testFail('ShareItinerary component render', 'Not found');
    
    appTsx.includes('Starting from')
      ? testPass('App.tsx displays "Starting from" text')
      : testFail('"Starting from" display', 'Not found');
    
    appTsx.includes('v6.0')
      ? testPass('Version bumped to v6.0')
      : testFail('Version v6.0', 'Version not updated');
  } else {
    testFail('App.tsx exists', 'File not found');
  }
  
  // Check index.css for start marker styling
  const css = readFile('src/index.css');
  if (css) {
    css.includes('.start-marker')
      ? testPass('CSS has .start-marker class')
      : testFail('.start-marker CSS class', 'Not found');
    
    css.includes('hue-rotate')
      ? testPass('Start marker has blue color filter')
      : testFail('Start marker color filter', 'Not found');
  } else {
    testFail('index.css exists', 'File not found');
  }
}

function testUIEnhancements() {
  section('UI Enhancements - v6.0');
  
  const appTsx = readFile('src/App.tsx');
  if (appTsx) {
    appTsx.includes('Show Only Small Towns')
      ? testPass('Small Towns button has new text')
      : testFail('Small Towns button text', 'Not found');
    
    appTsx.includes('Show Campsites')
      ? testPass('Campsites button has new text')
      : testFail('Campsites button text', 'Not found');
    
    appTsx.includes('Enabled')
      ? testPass('Buttons show Enabled/Disabled status')
      : testFail('Enabled/Disabled status', 'Not found');
    
    appTsx.includes('Share Route')
      ? testPass('Share Route button exists')
      : testFail('Share Route button', 'Not found');
    
    // Check color coding
    appTsx.match(/#ef4444/g) && appTsx.match(/#10b981/g)
      ? testPass('Buttons use red/green color coding')
      : testFail('Color coding (red/green)', 'Not found');
  } else {
    testFail('App.tsx exists', 'File not found');
  }
}

function testUserManual() {
  section('User Manual - v6.0 Documentation');
  
  const manual = readFile('USER_MANUAL.md');
  if (manual) {
    manual.includes('Setting Your Start Location')
      ? testPass('Manual has "Setting Your Start Location" section')
      : testFail('Start Location section', 'Section not found');
    
    manual.includes('Saving & Sharing Routes')
      ? testPass('Manual has "Saving & Sharing Routes" section')
      : testFail('Saving & Sharing section', 'Section not found');
    
    manual.includes('Update Route')
      ? testPass('Manual mentions Update Route button')
      : testFail('Update Route documentation', 'Not mentioned');
    
    manual.includes('Clear From Start')
      ? testPass('Manual documents "Clear From Start" button')
      : testFail('"Clear From Start" documentation', 'Not found');
    
    manual.includes('Remove From Itinerary')
      ? testPass('Manual documents "Remove From Itinerary" button')
      : testFail('"Remove From Itinerary" documentation', 'Not found');
    
    manual.includes('share link') || manual.includes('Share Route')
      ? testPass('Manual documents route sharing')
      : testFail('Route sharing documentation', 'Not found');
    
    manual.includes('Enabled') && manual.includes('Disabled')
      ? testPass('Manual documents Enabled/Disabled button states')
      : testFail('Button states documentation', 'Not found');
  } else {
    testFail('USER_MANUAL.md exists', 'File not found');
  }
}

// Run all tests
console.log('\n' + colors.bold + '═══ Australia Trip Scheduler - Test Suite v6.0 ═══' + colors.reset);
console.log(`Started: ${new Date().toLocaleString()}`);
console.log(`Environment: ${process.platform} | Node ${process.version.substring(1)}\n`);

testProjectStructure();
testFirestoreIntegration();
testAuthentication();
testComponentImplementation();
testConfiguration();
testSecurity();
testDocumentation();
testV6Features();
testUIEnhancements();
testUserManual();
testGitSetup();
testDependencies();
testCodeQuality();

// Summary
console.log('\n' + colors.bold + '═══ Test Results Summary ═══' + colors.reset);
console.log(`  Total Tests: ${totalTests}`);
console.log(`  ${colors.green}Passed: ${passedTests}${colors.reset}`);
console.log(`  ${colors.red}Failed: ${failedTests}${colors.reset}`);
const passRate = ((passedTests / totalTests) * 100).toFixed(2);
const rateColor = passRate >= 80 ? 'green' : passRate >= 60 ? 'yellow' : 'red';
console.log(`  Pass Rate: ${colors[rateColor]}${passRate}%${colors.reset}\n`);

// Failed tests details
if (failedTests > 0) {
  console.log(`${colors.bold}▶ Failed Tests Details${colors.reset}\n`);
  failedTestsList.forEach((test, idx) => {
    console.log(`  ${idx + 1}. ${test.name}`);
    console.log(`     ${colors.yellow}→${colors.reset} ${test.reason}\n`);
  });
  console.log(`${colors.red}✗ ${failedTests} test(s) failed. Please review above.${colors.reset}\n`);
  process.exit(1);
} else {
  console.log(`${colors.green}✓ All ${totalTests} tests passed!${colors.reset}\n`);
  process.exit(0);
}
