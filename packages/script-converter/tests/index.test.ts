import { describe, expect, it } from 'vite-plus/test';

import { convert, convertArabic, type TargetScript } from '../src/index.ts';

const SCRIPTS = ['Arabic', 'Latin', 'Cyrillic'] as const satisfies readonly TargetScript[];

/** Examples from https://www.elipbe.com/ */
const ELIPBE_EXAMPLES: Record<TargetScript, string>[] = [
  {
    Arabic:
      'ھەممە ئادەم تۇغۇلۇشىدىنلا ئەركىن، ئىززەت-ھۆرمەت ۋە ھوقۇقتا بابباراۋەر بولۇپ تۇغۇلغان. ئۇلار ئەقىلگە ۋە ۋىجدانغا ئىگە ھەمدە بىر-بىرىگە قېرىنداشلىق مۇناسىۋىتىگە خاس روھ بىلەن مۇئامىلە قىلىشى كېرەك.',
    Latin: `Hemme adem tughulushidinla erkin, izzet-hörmet we hoquqta babbarawer bolup tughulghan. Ular eqilge we wijdan'gha ige hemde bir-birige qérindashliq munasiwitige xas roh bilen muamile qilishi kérek.`,
    Cyrillic:
      'Һәммә адәм туғулушидинла әркин, иззәт-һөрмәт вә һоқуқта баббаравәр болуп туғулған. Улар әқилгә вә виҗданға игә һәмдә бир-биригә қериндашлиқ мунасивитигә хас роһ билән муамилә қилиши керәк.',
  },
  {
    Arabic:
      'ئا، ب، چ، د، ئە، ئې، ف، گ، غ، ھ، ئى، ج، ك، ل، م، ن، ڭ، ئو، ئۆ، پ، ق، ر، س، ش، ت، ئۇ، ئۈ، ۋ، خ، ي، ز',
    Latin:
      'A, b, ch, d, e, é, f, g, gh, h, i, j, k, l, m, n, ng, o, ö, p, q, r, s, sh, t, u, ü, w, x, y, z',
    Cyrillic:
      'А, б, ч, д, ә, е, ф, г, ғ, һ, и, җ, к, л, м, н, ң, о, ө, п, қ, р, с, ш, т, у, ү, в, х, й, з',
  },
  {
    Arabic: 'سالام ئالەيكۇم!',
    Latin: 'Salam aleykum!',
    Cyrillic: 'Салам аләйкум!',
  },
  {
    Arabic: 'راھىلە داۋۇت ئۇيغۇر مەدەنىيەت ئارخىۋى',
    Latin: 'Rahile dawut uyghur medeniyet arxiwi',
    Cyrillic: 'Раһилә давут уйғур мәдәнийәт архиви',
  },
];

const DIRECTIONS = SCRIPTS.flatMap((from) => SCRIPTS.map((to) => ({ from, to })));

describe('convert', () => {
  describe.each(ELIPBE_EXAMPLES)('example %#', (example) => {
    it.each(DIRECTIONS)('$from → $to', ({ from, to }) => {
      expect(convert(example[from], from, to)).toBe(example[to]);
    });
  });
});

describe('convertArabic', () => {
  describe.each(ELIPBE_EXAMPLES)('example %#', (example) => {
    it.each(SCRIPTS)('to %s', (to) => {
      expect(convertArabic(example.Arabic, to)).toBe(example[to]);
    });
  });
});
