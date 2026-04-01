import { downloadBlob, formatTimestamp, slugify } from '@/lib/utils';
import type { CampaignSession, GeneratedImageAsset } from '@/types/campaign';

function buildImageFilename(asset: GeneratedImageAsset) {
  return `${slugify(asset.title || asset.recipeId)}-${asset.seed}.png`;
}

export function createCampaignMarkdown(session: CampaignSession) {
  const { plan, images, voiceover } = session;

  const sections = [
    `# ${plan.brief.productName} Campaign Kit`,
    '',
    `Generated: ${formatTimestamp(plan.createdAt)}`,
    `Text model: ${plan.modelMetadata.textModel}`,
    `Image model: ${plan.modelMetadata.imageModel}`,
    '',
    '## Brief',
    `- Description: ${plan.brief.description}`,
    `- Audience: ${plan.brief.audience}`,
    `- Platform goal: ${plan.brief.platform}`,
    `- Tone: ${plan.brief.tone}`,
    `- Visual style: ${plan.brief.visualStyle}`,
    `- Brand colors: ${plan.brief.brandColors || 'Not specified'}`,
    `- Offer / CTA: ${plan.brief.offer || 'Not specified'}`,
    `- Language: ${plan.brief.language}`,
    `- Notes: ${plan.brief.notes || 'None'}`,
    '',
    '## Concept Summary',
    plan.conceptSummary,
    '',
    '## Audience Insight',
    plan.audienceInsight,
    '',
    '## Campaign Angles',
    ...plan.campaignAngles.map((item) => `- ${item}`),
    '',
    '## Headlines',
    ...plan.headlines.map((item) => `- ${item}`),
    '',
    '## Captions',
    ...plan.captions.map((item, index) => `${index + 1}. ${item}`),
    '',
    '## CTAs',
    ...plan.ctas.map((item) => `- ${item}`),
    '',
    '## Image Prompt Recipes',
    ...plan.imagePrompts.flatMap((prompt, index) => [
      `### Prompt ${index + 1}: ${prompt.title}`,
      '',
      `- Aspect ratio: ${prompt.aspectRatioSuggestion}`,
      `- Art direction: ${prompt.artDirectionNotes || 'Use the main prompt only'}`,
      '',
      prompt.prompt,
      '',
    ]),
  ];

  if (plan.voiceoverScript) {
    sections.push('## Voiceover Script', plan.voiceoverScript, '');
  }

  if (images.length > 0) {
    sections.push(
      '## Generated Visuals',
      ...images.flatMap((asset) => [
        `- ${asset.title} (${asset.aspectRatio}, seed ${asset.seed})`,
        `  ${asset.url}`,
      ]),
      '',
    );
  }

  if (voiceover?.audioDataUrl) {
    sections.push('## Voiceover Audio', `Generated voice: ${voiceover.voice}`, '');
  }

  sections.push(
    '## Attribution',
    'Built with pollinations.ai - https://pollinations.ai',
  );

  return sections.join('\n');
}

export function createCampaignJson(session: CampaignSession) {
  return JSON.stringify(session, null, 2);
}

export function getExportBaseName(session: CampaignSession) {
  return `${slugify(session.plan.brief.productName)}-campaign-kit`;
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
) {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

export async function downloadImageAsset(asset: GeneratedImageAsset) {
  const response = await fetch(asset.url);

  if (!response.ok) {
    throw new Error('The generated image could not be downloaded.');
  }

  const blob = await response.blob();
  downloadBlob(blob, buildImageFilename(asset));
}

function dataUrlToBlob(dataUrl: string) {
  const [metadata, encoded] = dataUrl.split(',');

  if (!metadata || !encoded) {
    throw new Error('Invalid audio data URL.');
  }

  const mimeMatch = metadata.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] || 'application/octet-stream';
  const byteCharacters = atob(encoded);
  const byteNumbers = new Uint8Array(byteCharacters.length);

  for (let index = 0; index < byteCharacters.length; index += 1) {
    byteNumbers[index] = byteCharacters.charCodeAt(index);
  }

  return new Blob([byteNumbers], { type: mimeType });
}

export async function buildCampaignZip(session: CampaignSession) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const exportBase = getExportBaseName(session);

  zip.file(`${exportBase}.md`, createCampaignMarkdown(session));
  zip.file(`${exportBase}.json`, createCampaignJson(session));

  for (const asset of session.images) {
    try {
      const response = await fetch(asset.url);

      if (!response.ok) {
        continue;
      }

      const blob = await response.blob();
      zip.file(`images/${buildImageFilename(asset)}`, blob);
    } catch {
      // Skip broken image downloads and still export the rest of the bundle.
    }
  }

  if (session.voiceover?.audioDataUrl) {
    zip.file(
      `audio/${exportBase}-voiceover.${session.voiceover.format}`,
      dataUrlToBlob(session.voiceover.audioDataUrl),
    );
  }

  return zip.generateAsync({ type: 'blob' });
}
