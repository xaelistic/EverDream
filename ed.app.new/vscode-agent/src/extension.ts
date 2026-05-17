import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import {
  createMetadata,
  createPlaceholderImage,
  DreamMetadata,
  extractDreamQuote,
  formatFolderName,
  generateVariants,
  remixNarrative,
  stylizeNarrative,
  suggestPremiumText
} from './pipeline';

const FREE_TIER_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const FREE_TIER_ASSET_LIMIT = 1;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('everdream.enrich', async () => {
      await handleEnrichCommand(context);
    }),
    vscode.commands.registerCommand('everdream.generateAsset', async () => {
      await handleGenerateAssetCommand(context);
    }),
    vscode.commands.registerCommand('everdream.remixStyle', async () => {
      await handleRemixStyleCommand(context);
    }),
    vscode.commands.registerCommand('everdream.mintPrep', async () => {
      await handleMintPrepCommand(context);
    })
  );
}

async function handleEnrichCommand(context: vscode.ExtensionContext) {
  const dreamText = await collectDreamText(context);
  if (!dreamText) {
    return;
  }

  const tone = await chooseTone();
  if (!tone) {
    return;
  }

  const style = await chooseStyle();
  if (!style) {
    return;
  }

  const variants = generateVariants(dreamText, tone, style);
  const chosen = await chooseVariant(variants);
  if (!chosen) {
    return;
  }

  const final = await confirmOrRefine(chosen);
  if (!final) {
    return;
  }

  await openNarrativeDocument(final, tone, style);
}

async function handleGenerateAssetCommand(context: vscode.ExtensionContext) {
  const assetAllowed = await checkFreeTierLimit(context);
  if (!assetAllowed) {
    const upgrade = await vscode.window.showInformationMessage(
      suggestPremiumText(3),
      'Learn about Premium',
      'Continue in Demo Mode'
    );
    if (upgrade === 'Learn about Premium') {
      await vscode.env.openExternal(vscode.Uri.parse('https://example.com/everdream-premium'));
      return;
    }
  }

  const dreamText = await collectDreamText(context);
  if (!dreamText) {
    return;
  }

  const tone = await chooseTone();
  if (!tone) {
    return;
  }

  const style = await chooseStyle();
  if (!style) {
    return;
  }

  const variants = generateVariants(dreamText, tone, style);
  const chosen = await chooseVariant(variants);
  if (!chosen) {
    return;
  }

  const final = await confirmOrRefine(chosen);
  if (!final) {
    return;
  }

  const title = await askForTitle(dreamText);
  if (!title) {
    return;
  }

  const folderName = formatFolderName(title, new Date());
  const outputRoot = getDreamsRootFolder();
  const folderPath = path.join(outputRoot, folderName);
  await fs.mkdir(folderPath, { recursive: true });

  const narrativePath = path.join(folderPath, 'narrative.md');
  await fs.writeFile(narrativePath, final, 'utf8');

  const quote = extractDreamQuote(final);
  await createPlaceholderImage(folderPath);

  const metadata = await createMetadata({
    title,
    sourceText: dreamText,
    style,
    tone,
    assetFolder: folderPath,
    quote
  });

  if (assetAllowed) {
    await updateAssetUsage(context);
  }

  await vscode.window.showInformationMessage(`Dream asset saved to ${folderPath}`);
  await openDocumentAtPath(narrativePath);
  await openDocumentAtPath(metadata.metadataFile);
}

async function handleRemixStyleCommand(context: vscode.ExtensionContext) {
  const dreamRoot = getDreamsRootFolder();
  const entries = await listDreamFolders(dreamRoot);
  if (entries.length === 0) {
    vscode.window.showInformationMessage('No dream assets found in the dreams folder yet. Generate one first with EverDream: Generate Dream Asset.');
    return;
  }

  const choice = await vscode.window.showQuickPick(entries, {
    placeHolder: 'Select a dream asset folder to remix',
  });
  if (!choice) {
    return;
  }

  const selectedFolder = path.join(dreamRoot, choice);
  const narrativeFile = path.join(selectedFolder, 'narrative.md');
  const narrative = await fs.readFile(narrativeFile, 'utf8');
  const newStyle = await chooseStyle(true);
  if (!newStyle) {
    return;
  }

  const remixedText = remixNarrative(narrative, newStyle);
  await fs.writeFile(narrativeFile, remixedText, 'utf8');

  const metadataPath = path.join(selectedFolder, 'metadata.json');
  const metadataJson = JSON.parse(await fs.readFile(metadataPath, 'utf8')) as DreamMetadata;
  metadataJson.style = newStyle;
  metadataJson.provenance.layer3.note = `Remixed to ${newStyle} style; provenance preserved.`;
  await fs.writeFile(metadataPath, JSON.stringify(metadataJson, null, 2), 'utf8');

  vscode.window.showInformationMessage(`Remixed asset saved in ${selectedFolder}`);
  await openDocumentAtPath(narrativeFile);
}

async function handleMintPrepCommand(context: vscode.ExtensionContext) {
  const dreamRoot = getDreamsRootFolder();
  const entries = await listDreamFolders(dreamRoot);
  if (entries.length === 0) {
    vscode.window.showInformationMessage('No dream assets available yet. Generate a dream asset first.');
    return;
  }

  const choice = await vscode.window.showQuickPick(entries, {
    placeHolder: 'Select a dream asset folder for mint preparation',
  });
  if (!choice) {
    return;
  }

  const selectedFolder = path.join(dreamRoot, choice);
  const metadataPath = path.join(selectedFolder, 'metadata.json');
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8')) as DreamMetadata;
  const mintPath = path.join(selectedFolder, 'mint-prep.json');

  const mintRecord = {
    ...metadata,
    mintReady: true,
    mintPrepTimestamp: new Date().toISOString(),
    provenance: {
      ...metadata.provenance,
      layer1: {
        ...metadata.provenance.layer1,
        notes: 'Layer 1 ready for biometric anchor when hardware becomes available.'
      },
      layer4: {
        ...metadata.provenance.layer4,
        shareable: true,
      }
    }
  };

  await fs.writeFile(mintPath, JSON.stringify(mintRecord, null, 2), 'utf8');
  vscode.window.showInformationMessage(`Mint preparation file created at ${mintPath}`);
  await openDocumentAtPath(mintPath);
}

async function collectDreamText(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const selection = editor.selection;
    const text = selection.isEmpty ? editor.document.getText().trim() : editor.document.getText(selection).trim();
    if (text.length > 0) {
      return text;
    }
  }

  const sample = await selectSampleDream(context);
  return sample;
}

async function selectSampleDream(context: vscode.ExtensionContext) {
  try {
    const samplePath = path.join(context.extensionPath, 'sample-dreams', 'dream-nuggets.json');
    const sampleUri = vscode.Uri.file(samplePath);
    const sampleText = await vscode.workspace.fs.readFile(sampleUri);
    const samples = JSON.parse(Buffer.from(sampleText).toString('utf8')) as Array<{ title: string; text: string; mood: string }>;
    const pick = await vscode.window.showQuickPick(samples.map((item) => ({ label: item.title, description: item.mood, detail: item.text })), {
      placeHolder: 'No active text found. Choose a sample dream nugget to enrich.',
      matchOnDetail: true
    });
    return pick?.detail;
  } catch (error) {
    return undefined;
  }
}

async function chooseTone() {
  return vscode.window.showQuickPick([
    'Dreamy',
    'Intense',
    'Calm',
    'Transformative',
    'Playful'
  ], {
    placeHolder: 'Choose the emotional tone for the narrative enrichment'
  });
}

async function chooseStyle(remix = false) {
  const style = await vscode.window.showQuickPick([
    'Surreal',
    'Realistic',
    'Cyberpunk',
    'Thai-inspired',
    'African visionary',
    'Mystical'
  ], {
    placeHolder: remix ? 'Choose a new artistic style for remixing' : 'Choose the artistic style for the dream asset'
  });
  if (style) {
    return style;
  }
  return undefined;
}

async function chooseVariant(variants: string[]) {
  const items = variants.map((text, index) => ({ label: `Variant ${index + 1}`, description: text.slice(0, 80) + (text.length > 80 ? '…' : ''), detail: text }));
  const pick = await vscode.window.showQuickPick(items, {
    placeHolder: 'Choose a narrative variant to continue refining',
    matchOnDetail: true
  });
  return pick?.detail;
}

async function confirmOrRefine(narrative: string) {
  const action = await vscode.window.showInformationMessage('Confirm this narrative or refine it manually?', 'Confirm', 'Refine');
  if (action === 'Confirm') {
    return narrative;
  }

  if (action === 'Refine') {
    const edited = await vscode.window.showInputBox({
      prompt: 'Edit the final narrative for your dream asset',
      value: narrative,
      ignoreFocusOut: true,
      validateInput: (value) => (value.trim().length === 0 ? 'Narrative cannot be empty.' : undefined)
    });
    return edited?.trim() || undefined;
  }

  return undefined;
}

async function askForTitle(sourceText: string) {
  const defaultTitle = sourceText
    .split(/\n|\.|\?|!/)
    .find((line) => line.trim().length > 20)?.trim() || 'EverDream Nugget';
  return vscode.window.showInputBox({
    prompt: 'Enter a title for the dream asset folder',
    value: defaultTitle,
    ignoreFocusOut: true,
    validateInput: (value) => (value?.trim().length ? undefined : 'Title cannot be empty.')
  });
}

async function openNarrativeDocument(content: string, tone: string, style: string) {
  const doc = await vscode.workspace.openTextDocument({ content: `# EverDream Narrative\n\n${content}` });
  await vscode.window.showTextDocument(doc, { preview: false });
}

function getDreamsRootFolder() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceFolder) {
    return path.join(workspaceFolder, 'dreams');
  }
  return path.join(process.cwd(), 'dreams');
}

async function updateAssetUsage(context: vscode.ExtensionContext) {
  const now = Date.now();
  await context.globalState.update('everdream.lastFreeAssetCreation', now);
}

async function checkFreeTierLimit(context: vscode.ExtensionContext) {
  const last = context.globalState.get<number>('everdream.lastFreeAssetCreation');
  if (!last) {
    return true;
  }

  return Date.now() - last > FREE_TIER_WINDOW_MS;
}

async function listDreamFolders(root: string) {
  try {
    const stat = await fs.stat(root);
    if (!stat.isDirectory()) {
      return [];
    }
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

async function openDocumentAtPath(filePath: string) {
  const uri = vscode.Uri.file(filePath);
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: false });
}
