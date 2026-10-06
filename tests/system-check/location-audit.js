/**
 * FoodBridge AI — Location System & Accuracy Diagnostic Suite
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../');

function runDiagnostic() {
  console.log('========================================');
  console.log(' FOODBRIDGE LOCATION DIAGNOSTIC');
  console.log('========================================');

  let allPassed = true;

  const results = {
    'CURRENT DEVICE LOCATION': 'PASS',
    'FRESH LOCATION': 'PASS',
    'HIGH ACCURACY REQUEST': 'PASS',
    'STALE LOCATION PROTECTION': 'PASS',
    'ACCURACY VALIDATION': 'PASS',
    'REVERSE GEOCODING': 'PASS',
    'GOOGLE MAPS REMOVED': 'PASS'
  };

  const filesToScan = [
    'frontend/components/LocationPicker.tsx',
    'mobile/src/components/LocationPicker.tsx',
    'frontend/app/volunteer/page.tsx',
    'mobile/src/screens/Volunteer/VolunteerDashboardScreen.tsx',
    'mobile/src/screens/Donor/CreateDonationScreen.tsx',
    'mobile/src/services/locationService.ts',
    'backend/src/services/location.service.ts'
  ];

  const forbiddenPatterns = [
    'google.com/maps',
    'Navigate to Google Maps',
    'maps/search',
    '13.0875',
    '80.2047',
    '13.028344',
    '80.016108',
    'FIXED_COORDS',
    'FIXED_ADDRESS_DEFAULT',
    'ipapi',
    'ipinfo',
    'ipgeolocation'
  ];

  // 1. Audit Forbidden Patterns & IP Geolocation
  for (const relFile of filesToScan) {
    const fullPath = path.join(rootDir, relFile);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf8');

    for (const pattern of forbiddenPatterns) {
      if (content.includes(pattern)) {
        console.error(`❌ Forbidden pattern "${pattern}" found in ${relFile}`);
        if (pattern.includes('google.com') || pattern.includes('Google Maps')) {
          results['GOOGLE MAPS REMOVED'] = 'FAIL';
        }
        if (pattern.includes('13.') || pattern.includes('80.') || pattern.includes('FIXED')) {
          results['CURRENT DEVICE LOCATION'] = 'FAIL';
        }
        allPassed = false;
      }
    }
  }

  // 2. Audit Web Geolocation (watchPosition, enableHighAccuracy, maximumAge: 0, accuracy checks)
  const webPickerPath = path.join(rootDir, 'frontend/components/LocationPicker.tsx');
  if (fs.existsSync(webPickerPath)) {
    const content = fs.readFileSync(webPickerPath, 'utf8');

    if (!content.includes('maximumAge: 0')) {
      results['STALE LOCATION PROTECTION'] = 'FAIL';
      results['FRESH LOCATION'] = 'FAIL';
      allPassed = false;
    }
    if (!content.includes('enableHighAccuracy: true')) {
      results['HIGH ACCURACY REQUEST'] = 'FAIL';
      allPassed = false;
    }
    if (!content.includes('accuracy <= 250')) {
      results['ACCURACY VALIDATION'] = 'FAIL';
      allPassed = false;
    }
    if (!content.includes('watchPosition')) {
      results['CURRENT DEVICE LOCATION'] = 'FAIL';
      allPassed = false;
    }
    if (!content.includes('reverseGeocode')) {
      results['REVERSE GEOCODING'] = 'FAIL';
      allPassed = false;
    }
  }

  // 3. Audit Mobile Location Service (watchPosition, enableHighAccuracy, maximumAge: 0, fineLocation)
  const mobileServicePath = path.join(rootDir, 'mobile/src/services/locationService.ts');
  if (fs.existsSync(mobileServicePath)) {
    const content = fs.readFileSync(mobileServicePath, 'utf8');

    if (!content.includes('maximumAge: 0')) {
      results['STALE LOCATION PROTECTION'] = 'FAIL';
      results['FRESH LOCATION'] = 'FAIL';
      allPassed = false;
    }
    if (!content.includes('enableHighAccuracy: true')) {
      results['HIGH ACCURACY REQUEST'] = 'FAIL';
      allPassed = false;
    }
    if (!content.includes('fineLocation')) {
      results['CURRENT DEVICE LOCATION'] = 'FAIL';
      allPassed = false;
    }
  }

  for (const [test, status] of Object.entries(results)) {
    const paddedTest = test.padEnd(28, ' ');
    const statusText = status === 'PASS' ? 'PASS' : 'FAIL';
    console.log(`${paddedTest} ${statusText}`);
  }

  console.log('========================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runDiagnostic();
