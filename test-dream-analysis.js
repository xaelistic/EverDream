#!/usr/bin/env node
/**
 * Dream Analysis System Health Check
 * 
 * This script verifies that all components are properly configured.
 * Run with: node test-dream-analysis.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 EverDream Analysis System - Health Check\n');
console.log('=' .repeat(50));

let issues = [];
let warnings = [];
let successes = [];

// Check 1: Environment file
console.log('\n1️⃣  Checking environment configuration...');
const envPath = path.join(__dirname, 'ed.app.new', '.env');
const envExamplePath = path.join(__dirname, 'ed.app.new', '.env.example');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasSupabaseUrl = envContent.includes('VITE_SUPABASE_URL=');
  const hasSupabaseKey = envContent.includes('VITE_SUPABASE_ANON_KEY=');
  
  if (hasSupabaseUrl && hasSupabaseKey) {
    // Check if they're placeholders
    const hasPlaceholder = envContent.includes('YOUR_PROJECT') || envContent.includes('xxx');
    if (hasPlaceholder) {
      warnings.push('⚠️  .env file exists but contains placeholder values');
      console.log('   ⚠️  .env found but needs real Supabase credentials');
    } else {
      successes.push('✅ Environment file configured');
      console.log('   ✅ .env file configured with Supabase credentials');
    }
  } else {
    issues.push('❌ .env file missing required Supabase variables');
    console.log('   ❌ .env missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }
} else if (fs.existsSync(envExamplePath)) {
  warnings.push('⚠️  No .env file found (only .env.example)');
  console.log('   ⚠️  .env not found - copy .env.example to .env and configure');
} else {
  issues.push('❌ No environment file found');
  console.log('   ❌ No .env or .env.example found');
}

// Check 2: Edge function files
console.log('\n2️⃣  Checking edge functions...');
const edgeFunctions = [
  'analyze-dream/index.ts',
  'transcribe-audio/index.ts',
  'generate-image/index.ts'
];

edgeFunctions.forEach(func => {
  const funcPath = path.join(__dirname, 'ed.app.new', 'supabase', 'functions', func);
  if (fs.existsSync(funcPath)) {
    console.log(`   ✅ ${func} exists`);
    successes.push(`✅ Edge function: ${func}`);
  } else {
    issues.push(`❌ Missing edge function: ${func}`);
    console.log(`   ❌ ${func} NOT FOUND`);
  }
});

// Check 3: Client-side analyzer
console.log('\n3️⃣  Checking client-side modules...');
const clientModules = [
  'src/lib/dream-analyzer.ts',
  'src/lib/api/ai-provider.ts',
  'src/lib/dreamPipeline.ts',
  'src/utils/dreamAnalysis.ts'
];

clientModules.forEach(mod => {
  const modPath = path.join(__dirname, 'ed.app.new', mod);
  if (fs.existsSync(modPath)) {
    console.log(`   ✅ ${mod} exists`);
    successes.push(`✅ Client module: ${mod}`);
  } else {
    issues.push(`❌ Missing client module: ${mod}`);
    console.log(`   ❌ ${mod} NOT FOUND`);
  }
});

// Check 4: Wearable integration
console.log('\n4️⃣  Checking wearable integration...');
const wearablesPath = path.join(__dirname, 'ed.app.new', 'src', 'lib', 'wearables.ts');
if (fs.existsSync(wearablesPath)) {
  const content = fs.readFileSync(wearablesPath, 'utf8');
  const hasOura = content.includes('oura');
  const hasFitbit = content.includes('fitbit');
  const hasGarmin = content.includes('garmin');
  
  if (hasOura || hasFitbit || hasGarmin) {
    console.log('   ✅ Wearable integration present');
    successes.push('✅ Wearable data support configured');
  } else {
    warnings.push('⚠️  Wearable file exists but may lack provider support');
    console.log('   ⚠️  Wearable integration may be incomplete');
  }
} else {
  warnings.push('⚠️  No wearable integration found');
  console.log('   ⚠️  wearables.ts not found');
}

// Check 5: Facial emotion detection
console.log('\n5️⃣  Checking facial emotion detection...');
const faceDetectorPath = path.join(__dirname, 'ed.app.new', 'src', 'components', 'face');
if (fs.existsSync(faceDetectorPath)) {
  const files = fs.readdirSync(faceDetectorPath);
  const hasDetector = files.some(f => f.toLowerCase().includes('emotion') || f.toLowerCase().includes('facial'));
  if (hasDetector) {
    console.log('   ✅ Facial emotion detector present');
    successes.push('✅ Facial analysis available');
  } else {
    warnings.push('⚠️  Face directory exists but no emotion detector found');
    console.log('   ⚠️  No facial emotion detector found');
  }
} else {
  warnings.push('⚠️  No facial emotion detection module found');
  console.log('   ⚠️  Face component directory not found');
}

// Check 6: Package.json scripts
console.log('\n6️⃣  Checking package configuration...');
const packagePath = path.join(__dirname, 'ed.app.new', 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const hasSupabase = pkg.dependencies?.['@supabase/supabase-js'] || pkg.devDependencies?.['@supabase/supabase-js'];
  const hasDevScript = pkg.scripts?.dev;
  
  if (hasSupabase) {
    console.log('   ✅ Supabase client installed');
    successes.push('✅ Supabase JS client present');
  } else {
    issues.push('❌ Supabase client not in dependencies');
    console.log('   ❌ @supabase/supabase-js not found in package.json');
  }
  
  if (hasDevScript) {
    console.log('   ✅ Dev script available');
  }
} else {
  issues.push('❌ package.json not found');
  console.log('   ❌ package.json NOT FOUND');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY\n');

console.log(`✅ Successes: ${successes.length}`);
console.log(`⚠️  Warnings: ${warnings.length}`);
console.log(`❌ Issues: ${issues.length}\n`);

if (issues.length > 0) {
  console.log('🔴 CRITICAL ISSUES:');
  issues.forEach(issue => console.log(`   ${issue}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('🟡 WARNINGS:');
  warnings.forEach(warning => console.log(`   ${warning}`));
  console.log('');
}

// Recommendations
console.log('💡 RECOMMENDED NEXT STEPS:\n');

if (!fs.existsSync(envPath) || issues.some(i => i.includes('.env'))) {
  console.log('1️⃣  SET UP ENVIRONMENT:');
  console.log('   cd ed.app.new');
  console.log('   cp .env.example .env');
  console.log('   Edit .env with your Supabase credentials\n');
}

if (issues.some(i => i.includes('edge function'))) {
  console.log('2️⃣  DEPLOY EDGE FUNCTIONS:');
  console.log('   npx supabase login');
  console.log('   npx supabase link --project-ref YOUR_REF');
  console.log('   npx supabase functions deploy analyze-dream --no-verify-jwt\n');
}

if (issues.length === 0 && warnings.length <= 2) {
  console.log('✅ Your system looks ready!\n');
  console.log('NEXT: Test the analysis with:');
  console.log('   npm run dev');
  console.log('   Then navigate to Dreams → Add New Dream\n');
}

console.log('📖 For complete setup instructions, see:');
console.log('   /workspace/DREAM_ANALYSIS_SETUP.md\n');

// Exit code
process.exit(issues.length > 0 ? 1 : 0);
