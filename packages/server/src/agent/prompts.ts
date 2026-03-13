export function resolveTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

export function buildWorkItemContext(workItem: {
  title: string;
  description: string;
  status_name?: string;
  tags?: string[];
  file_refs?: Array<{ path: string; ref_type: string; label: string }>;
  source_folders?: Array<{ name: string; path: string }>;
  output_folders?: Array<{ name: string; path: string }>;
}): string {
  const parts: string[] = [
    `## Work Item: ${workItem.title}`,
  ];

  if (workItem.status_name) parts.push(`Status: ${workItem.status_name}`);
  if (workItem.description) parts.push(`\nDescription:\n${workItem.description}`);
  if (workItem.tags?.length) parts.push(`Tags: ${workItem.tags.join(', ')}`);

  if (workItem.source_folders?.length) {
    parts.push('\n## Input Source Folders');
    parts.push('You may read files from these directories:');
    for (const folder of workItem.source_folders) {
      parts.push(`- ${folder.path}`);
    }
  }

  if (workItem.output_folders?.length) {
    parts.push('\n## Output Location');
    parts.push('Save output files to this directory:');
    for (const folder of workItem.output_folders) {
      parts.push(`- ${folder.path}`);
    }
    parts.push('Do NOT write output files outside these directories.');
  }

  if (workItem.file_refs?.length) {
    parts.push('\nFile References:');
    for (const ref of workItem.file_refs) {
      parts.push(`- [${ref.ref_type}] ${ref.path}${ref.label ? ` (${ref.label})` : ''}`);
    }
  }

  return parts.join('\n');
}

export function buildIntegrationContext(items: Array<{ source: string; data: any }>): string {
  if (!items.length) return '';
  const parts = ['\n## Integration Data'];
  for (const item of items) {
    parts.push(`\n### From ${item.source}:`);
    if (typeof item.data === 'string') {
      parts.push(item.data);
    } else {
      parts.push(`Title: ${item.data.title}`);
      parts.push(`Status: ${item.data.status}`);
      if (item.data.description) parts.push(`Description: ${item.data.description}`);
      if (item.data.url) parts.push(`URL: ${item.data.url}`);
    }
  }
  return parts.join('\n');
}
