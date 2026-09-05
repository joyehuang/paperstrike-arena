import type { Arena } from './arena';
type Registry = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function registerGameTools(arena: Arena, registry?: Registry) {
  if (!registry) return () => {};
  const lifecycle = new AbortController();
  const definitions = [
    {
      name: 'read_match_state',
      title: '读取当前对战状态',
      description:
        'Read the current Paperstrike match phase, scores, health, selected weapon and ammunition.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => arena.getSnapshot(),
    },
    {
      name: 'equip_weapon',
      title: '装备武器',
      description:
        'Equip one of the four weapons in the current match. Cancels any ongoing reload. Weapon slots are 1 pistol, 2 shotgun, 3 sniper, 4 rifle.',
      inputSchema: {
        type: 'object',
        properties: { slot: { type: 'integer', minimum: 1, maximum: 4 } },
        required: ['slot'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input: unknown) => {
        if (
          !input ||
          typeof input !== 'object' ||
          !('slot' in input) ||
          !Number.isInteger(input.slot) ||
          Number(input.slot) < 1 ||
          Number(input.slot) > 4
        )
          throw new Error('slot must be an integer from 1 to 4');
        arena.selectWeapon(Number(input.slot) - 1);
        return arena.getSnapshot();
      },
    },
  ];
  for (const definition of definitions)
    try {
      void Promise.resolve(
        registry.registerTool(definition, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {
      /* Optional browser capability; gameplay is independent. */
    }
  return () => lifecycle.abort();
}
export function browserGameTools(arena: Arena) {
  return registerGameTools(
    arena,
    (document as Document & { modelContext?: Registry }).modelContext,
  );
}
