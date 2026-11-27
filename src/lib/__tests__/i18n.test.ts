import { en } from '../../i18n/en';
import { fr } from '../../i18n/fr';

describe('translations', () => {
  it('French and English have the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  it('French visible texts use typographic apostrophes', () => {
    for (const value of Object.values(fr)) expect(value).not.toContain("'");
  });
});
