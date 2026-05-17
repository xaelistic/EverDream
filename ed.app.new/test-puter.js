// Test Puter SDK
import Puter from 'puter-sdk';

async function testPuterAPI() {
  try {
    console.log('Testing Puter SDK...');

    const puter = new Puter();

    const prompt = 'A glowing moonlit garden with floating lanterns, soft music in the air, and a river of stars.';

    console.log('Generating image with prompt:', prompt);

    // Try the txt2img method with options object
    const image = await puter.ai.txt2img({ prompt });

    console.log('✅ Image generated successfully!');
    console.log('Image result:', image);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testPuterAPI();