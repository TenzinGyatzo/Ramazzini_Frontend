import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import { normalizeCurpInput, useCurpInputUppercase } from './useCurpInputUppercase';

describe('useCurpInputUppercase', () => {
  it('normalizeCurpInput convierte a mayúsculas', () => {
    expect(normalizeCurpInput('coge941130')).toBe('COGE941130');
    expect(normalizeCurpInput(null)).toBe('');
  });

  it('useCurpInputUppercase normaliza el ref sin cambiar longitud', async () => {
    const curpRef = ref('coge');
    useCurpInputUppercase(curpRef);
    curpRef.value = 'abcd1234';
    await nextTick();
    expect(curpRef.value).toBe('ABCD1234');
  });
});
