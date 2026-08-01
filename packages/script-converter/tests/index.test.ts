import { describe, expect, it } from 'vite-plus/test';

import { convertArabic } from '../src/index.ts';

// Examples from https://www.elipbe.com/
const elipbeExamples: [string, string, string][] = [
  [
    'ھەممە ئادەم تۇغۇلۇشىدىنلا ئەركىن، ئىززەت-ھۆرمەت ۋە ھوقۇقتا بابباراۋەر بولۇپ تۇغۇلغان. ئۇلار ئەقىلگە ۋە ۋىجدانغا ئىگە ھەمدە بىر-بىرىگە قېرىنداشلىق مۇناسىۋىتىگە خاس روھ بىلەن مۇئامىلە قىلىشى كېرەك.',
    `Hemme adem tughulushidinla erkin, izzet-hörmet we hoquqta babbarawer bolup tughulghan. Ular eqilge we wijdan'gha ige hemde bir-birige qérindashliq munasiwitige xas roh bilen muamile qilishi kérek.`,
    'Һәммә адәм туғулушидинла әркин, иззәт-һөрмәт вә һоқуқта баббаравәр болуп туғулған. Улар әқилгә вә виҗданға игә һәмдә бир-биригә қериндашлиқ мунасивитигә хас роһ билән муамилә қилиши керәк.',
  ],
  [
    'ئا، ب، چ، د، ئە، ئې، ف، گ، غ، ھ، ئى، ج، ك، ل، م، ن، ڭ، ئو، ئۆ، پ، ق، ر، س، ش، ت، ئۇ، ئۈ، ۋ، خ، ي، ز',
    'A, b, ch, d, e, é, f, g, gh, h, i, j, k, l, m, n, ng, o, ö, p, q, r, s, sh, t, u, ü, w, x, y, z',
    'А, б, ч, д, ә, е, ф, г, ғ, һ, и, җ, к, л, м, н, ң, о, ө, п, қ, р, с, ш, т, у, ү, в, х, й, з',
  ],
  ['سالام ئالەيكۇم!', 'Salam aleykum!', 'Салам аләйкум!'],
];

describe('arabicToLatin', () => {
  it('matches elipbe examples', () => {
    for (const [input, expectedULY, _expectedUCS] of elipbeExamples) {
      expect(convertArabic(input, 'Latin')).toBe(expectedULY);
    }
  });
});

describe('arabicToCyrillic', () => {
  it('matches elipbe examples', () => {
    for (const [input, _expectedULY, expectedUCS] of elipbeExamples) {
      expect(convertArabic(input, 'Cyrillic')).toBe(expectedUCS);
    }
  });
});

describe('convertArabic', () => {
  it('dose nothing for Arabic', () => {
    for (const [input, _expectedULY, _expectedUCS] of elipbeExamples) {
      expect(convertArabic(input, 'Arabic')).toBe(input);
    }
  });
});
