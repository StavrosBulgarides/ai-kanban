import { describe, it, expect } from 'vitest';
import { resolveTemplate, buildWorkItemContext, buildIntegrationContext } from './prompts.js';

describe('resolveTemplate', () => {
  it('replaces known variables', () => {
    expect(resolveTemplate('Hello {{name}}!', { name: 'World' })).toBe('Hello World!');
  });

  it('replaces multiple variables', () => {
    const result = resolveTemplate('{{greeting}} {{name}}, welcome to {{place}}', {
      greeting: 'Hi',
      name: 'Alice',
      place: 'Wonderland',
    });
    expect(result).toBe('Hi Alice, welcome to Wonderland');
  });

  it('leaves unknown variables untouched', () => {
    expect(resolveTemplate('Hello {{unknown}}!', {})).toBe('Hello {{unknown}}!');
  });

  it('handles empty template', () => {
    expect(resolveTemplate('', { name: 'World' })).toBe('');
  });

  it('handles template with no variables', () => {
    expect(resolveTemplate('no variables here', { name: 'World' })).toBe('no variables here');
  });

  it('replaces same variable multiple times', () => {
    expect(resolveTemplate('{{x}} and {{x}}', { x: 'val' })).toBe('val and val');
  });
});

describe('buildWorkItemContext', () => {
  it('builds minimal context with just title', () => {
    const result = buildWorkItemContext({ title: 'Test Task', description: '' });
    expect(result).toContain('## Work Item: Test Task');
  });

  it('includes status when provided', () => {
    const result = buildWorkItemContext({
      title: 'Task',
      description: '',
      status_name: 'In Progress',
    });
    expect(result).toContain('Status: In Progress');
  });

  it('includes description when provided', () => {
    const result = buildWorkItemContext({
      title: 'Task',
      description: 'Do something important',
    });
    expect(result).toContain('Description:\nDo something important');
  });

  it('includes tags when provided', () => {
    const result = buildWorkItemContext({
      title: 'Task',
      description: '',
      tags: ['bug', 'urgent'],
    });
    expect(result).toContain('Tags: bug, urgent');
  });

  it('includes source folders', () => {
    const result = buildWorkItemContext({
      title: 'Task',
      description: '',
      source_folders: [{ name: 'src', path: '/app/src' }],
    });
    expect(result).toContain('## Input Source Folders');
    expect(result).toContain('/app/src');
  });

  it('includes output folders with restriction message', () => {
    const result = buildWorkItemContext({
      title: 'Task',
      description: '',
      output_folders: [{ name: 'out', path: '/app/output' }],
    });
    expect(result).toContain('## Output Location');
    expect(result).toContain('/app/output');
    expect(result).toContain('Do NOT write output files outside these directories.');
  });

  it('includes file references', () => {
    const result = buildWorkItemContext({
      title: 'Task',
      description: '',
      file_refs: [
        { path: '/file.txt', ref_type: 'input', label: 'input file' },
      ],
    });
    expect(result).toContain('[input] /file.txt (input file)');
  });

  it('omits label parenthetical when label is empty', () => {
    const result = buildWorkItemContext({
      title: 'Task',
      description: '',
      file_refs: [{ path: '/file.txt', ref_type: 'output', label: '' }],
    });
    expect(result).toContain('[output] /file.txt');
    expect(result).not.toContain('()');
  });

  it('skips empty arrays', () => {
    const result = buildWorkItemContext({
      title: 'Task',
      description: '',
      tags: [],
      source_folders: [],
      output_folders: [],
      file_refs: [],
    });
    expect(result).not.toContain('Tags');
    expect(result).not.toContain('Source');
    expect(result).not.toContain('Output');
    expect(result).not.toContain('File References');
  });
});

describe('buildIntegrationContext', () => {
  it('returns empty string for no items', () => {
    expect(buildIntegrationContext([])).toBe('');
  });

  it('renders string data directly', () => {
    const result = buildIntegrationContext([
      { source: 'Jira', data: 'Connection OK' },
    ]);
    expect(result).toContain('## Integration Data');
    expect(result).toContain('### From Jira:');
    expect(result).toContain('Connection OK');
  });

  it('renders object data with title, status, description, url', () => {
    const result = buildIntegrationContext([
      {
        source: 'GitHub',
        data: {
          title: 'Fix bug',
          status: 'open',
          description: 'A critical bug',
          url: 'https://github.com/issue/1',
        },
      },
    ]);
    expect(result).toContain('Title: Fix bug');
    expect(result).toContain('Status: open');
    expect(result).toContain('Description: A critical bug');
    expect(result).toContain('URL: https://github.com/issue/1');
  });

  it('handles multiple integration items', () => {
    const result = buildIntegrationContext([
      { source: 'A', data: 'data-a' },
      { source: 'B', data: 'data-b' },
    ]);
    expect(result).toContain('### From A:');
    expect(result).toContain('### From B:');
  });
});
