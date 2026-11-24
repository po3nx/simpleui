import aksesibilitas from '../content/aksesibilitas.md?raw';
import contoh from '../content/contoh.md?raw';
import instalasi from '../content/instalasi.md?raw';
import pengantar from '../content/pengantar.md?raw';
import tema from '../content/tema.md?raw';

export interface DocPage {
  readonly slug: string;
  readonly title: string;
  readonly markdown: string;
}

export interface NavSection {
  readonly title: string;
  readonly pages: readonly DocPage[];
}

/** Struktur navigasi situs; satu sumber untuk sidebar dan router. */
export const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: 'Mulai',
    pages: [
      { slug: 'pengantar', title: 'Pengantar', markdown: pengantar },
      { slug: 'instalasi', title: 'Instalasi', markdown: instalasi },
    ],
  },
  {
    title: 'Panduan',
    pages: [
      { slug: 'tema', title: 'Tema & Token', markdown: tema },
      { slug: 'aksesibilitas', title: 'Aksesibilitas', markdown: aksesibilitas },
      { slug: 'contoh', title: 'Contoh', markdown: contoh },
    ],
  },
];

/** Seluruh halaman dalam urutan navigasi. */
export function allPages(): DocPage[] {
  return NAV_SECTIONS.flatMap((section) => [...section.pages]);
}
