"""Stroke order for the letter reference screen, in Noto Naskh Arabic font units (y-up).

Letters are put together from the glyphs the font builds them from, so strokes are given once per
glyph: BODIES for the letter bodies, MARKS for anything else drawn on them, in the mark glyph's
own coordinates. Dots need nothing here; each gets a short diagonal pull, top row first, each row
right to left. A stroke is a dict:
  clip   index, in the glyph's own contour order, of the outer contour it inks (0 for every body
         so far); the holes of any loops inside it are kept clear
  path   guide for the pen, M/L/C only, in stroke order and direction; build.py centres it in the
         contour, so it only needs to be roughly right
  width  pen width; wide enough to fill the contour, which clips the overflow
  label  optional (x, y) for its number badge, else placed just before the start

Connected forms start on the joining stroke from the right, as they're written in a word.
"""
import re

# Every letter the screen shows, and those that only join on the right (isolated and final only)
LETTERS = "ابتجخدرزسشغفقكلمنوىيپچژڭگھۆۇۈۋېە"
RIGHT_JOINING = "ادرزژوۆۇۈۋە"
# Vowels, which on their own are written after a hamza seat (ئا); their isolated forms show that
VOWELS = "اەوۇۆۈېى"


def retrace(d):
    """Carries on from the start of M/L/C path `d` along it, then comes back the same way: for a
    pen that runs up a tooth and back down it."""
    segments, current = [], None
    for cmd, args in re.findall(r"([MLC])([^MLC]*)", d):
        nums = [float(n) for n in re.findall(r"-?[\d.]+", args)]
        pairs = list(zip(nums[0::2], nums[1::2]))
        step = 3 if cmd == "C" else 1
        for i in range(0, len(pairs), step):
            if cmd != "M" or i:
                segments.append((current, pairs[i:i + step]))
            current = pairs[i + step - 1]
    back = ""
    for start, pts in reversed(segments):
        if len(pts) == 3:
            back += "C{:g} {:g} {:g} {:g} {:g} {:g}".format(*pts[1], *pts[0], *start)
        else:
            back += "L{:g} {:g}".format(*start)
    return re.sub(r"^M[^MLC]*", "", d) + back


BODIES = {
    # ا — one stroke, top to bottom
    "uni0627": [
        dict(clip=0, width=110, path="M125 648C124 480 128 260 134 20"),
    ],
    "uni0627.fina": [
        dict(clip=0, width=85,
             path="M262 40C215 40 165 45 145 80C132 110 132 200 128 300"
                  "C124 420 116 540 108 650"),
    ],
    # ب ت پ ن ى ي ې — down the tooth, then the body right to left
    "uni066E": [
        dict(clip=0, width=100,
             path="M682 392C655 330 668 260 690 180L695 105"
                  "C600 70 450 40 330 38C220 38 140 55 108 110C88 150 88 220 98 275"),
    ],
    "uni066E.init": [
        dict(clip=0, width=100,
             path="M172 360C148 300 160 240 178 170L182 85C130 60 60 42 -5 38"),
    ],
    "uni066E.medi": [
        dict(clip=0, width=100,
             path="M305 38C250 40 190 55 160 95L195 205L150 100C110 60 50 40 -5 38"),
    ],
    "uni066E.init.wide": [
        dict(clip=0, width=100,
             path="M248 360C228 300 240 250 260 190C270 150 262 110 240 75C190 50 100 40 -5 38"),
    ],
    "uni066E.medi.wide": [
        dict(clip=0, width=100,
             path="M375 40C320 42 270 55 235 95L285 205L230 100C180 55 100 42 -5 38"),
    ],
    "uni066E.fina": [
        dict(clip=0, width=100,
             path="M818 40C770 42 720 60 680 95L712 192L672 108"
                  "C580 70 440 40 330 38C220 38 140 55 108 110C88 150 88 220 98 275"),
    ],
    # د — down the back, then along the base
    "uni062F": [
        dict(clip=0, width=90,
             path="M258 378C250 310 290 250 322 190C345 150 350 120 335 88"
                  "C260 45 150 25 95 40C65 50 48 75 48 100"),
    ],
    "uni062F.fina": [
        dict(clip=0, width=90,
             path="M470 42C430 42 390 55 355 90"
                  + retrace("M355 90C335 150 300 230 280 300C270 340 262 360 262 380")
                  + "C260 45 150 25 95 40C65 50 48 75 48 100"),
    ],
    # ج چ خ — the head, back down into the bowl
    "uni062D": [
        dict(clip=0, width=110, label=(40, 360),
             path="M95 312C170 340 250 320 340 306C420 292 500 280 572 278"
                  "C500 255 380 240 300 205C220 170 150 110 125 20"
                  "C105 -60 110 -140 170 -190C230 -240 300 -248 380 -246"
                  "C470 -242 550 -220 612 -195"),
    ],
    "uni062D.init": [
        dict(clip=0, width=120,
             path="M85 228C90 285 140 312 200 305C260 298 330 262 440 190"
                  "C490 165 540 155 585 152C520 150 460 145 400 125"
                  "C320 95 200 55 -5 38"),
    ],
    "uni062D.medi": [
        dict(clip=0, width=110,
             path="M680 38C590 40 520 55 480 90C460 115 450 145 440 175"
                  "C330 262 260 298 200 305C140 312 90 285 85 228"),
        dict(clip=0, width=110,
             path="M585 158C530 155 470 150 420 135C330 100 200 55 -5 38"),
    ],
    "uni062D.fina": [
        dict(clip=0, width=110,
             path="M680 40C600 40 520 50 480 90C450 125 440 170 440 215"
                  "C400 250 320 275 250 295C190 312 130 310 88 262"),
        dict(clip=0, width=110,
             path="M578 230C530 228 470 225 420 212C330 190 240 140 190 70"
                  "C150 10 140 -80 170 -150C210 -220 300 -245 390 -240"
                  "C460 -235 520 -220 570 -198"),
    ],
    # ر ز ژ — down and round into the tail
    "uni0631": [
        dict(clip=0, width=90,
             path="M215 320C215 270 235 220 255 180C275 140 290 100 288 50"
                  "C285 0 265 -50 240 -80C200 -125 150 -155 90 -162C50 -165 20 -155 -12 -135"),
    ],
    "uni0631.fina": [
        dict(clip=0, width=90,
             path="M400 38C360 40 320 50 292 75"
                  + retrace("M292 75C290 120 275 150 255 180C235 220 215 270 215 320")
                  + "C288 20 268 -45 240 -80C200 -125 150 -155 90 -162"
                    "C50 -165 20 -155 -12 -135"),
    ],
    # س ش — down the first tooth, up and down each of the others, then round the bowl
    "uni0633": [
        dict(clip=0, width=90,
             path="M905 320C890 260 900 210 915 160C925 120 925 80 910 45"
                  "C860 45 780 55 725 95L755 238L718 100C680 50 600 40 540 45"
                  "C520 50 505 70 500 100L478 212L495 100C505 60 515 20 512 -20"
                  "C505 -90 460 -140 400 -175C340 -205 280 -222 220 -222"
                  "C160 -218 115 -180 100 -120C88 -60 95 0 112 50"),
    ],
    "uni0633.init": [
        dict(clip=0, width=90,
             path="M555 320C540 270 548 220 562 170C575 120 580 80 560 45"
                  "C500 40 420 50 355 90L412 240L345 100C300 55 240 45 195 55"
                  "C175 60 160 75 150 95L175 180L140 90C100 50 50 40 -5 38"),
    ],
    "uni0633.medi": [
        dict(clip=0, width=90,
             path="M678 38C620 40 560 50 515 90L570 245L505 100C470 55 400 45 345 90"
                  "L398 240L335 100C290 50 220 45 170 60C150 70 135 80 125 100"
                  "L160 180L120 95C90 55 50 40 -5 38"),
    ],
    "uni0633.fina": [
        dict(clip=0, width=90,
             path="M1030 38C980 40 920 50 875 90L937 245L870 100C830 45 750 45 700 90"
                  "L752 240L695 100C660 50 590 40 540 45"
                  "C520 50 505 70 500 100L478 212L495 100C505 60 515 20 512 -20"
                  "C505 -90 460 -140 400 -175C340 -205 280 -222 220 -222"
                  "C160 -218 115 -180 100 -120C88 -60 95 0 112 50"),
    ],
    # غ — the head, out to the right, then back down through it into the bowl
    "uni0639": [
        dict(clip=0, width=90,
             path="M355 373C330 405 290 430 236 430C180 428 130 400 108 340"
                  "C95 290 105 250 130 230C170 205 230 205 275 218C340 235 410 255 462 263"
                  "C400 240 300 190 249 157C210 130 175 60 160 -10C145 -80 150 -140 185 -178"
                  "C230 -220 290 -238 360 -238C440 -236 520 -220 621 -187"),
    ],
    "uni0639.init": [
        dict(clip=0, width=95,
             path="M354 284C320 320 270 330 225 329C160 326 110 300 95 250"
                  "C85 210 90 150 121 116C150 90 180 85 199 88C290 95 400 115 463 110"
                  "C400 90 320 65 212 52C150 45 80 38 -5 38"),
    ],
    "uni0639.medi": [
        dict(clip=0, width=90,
             path="M425 36C360 36 300 45 260 65C200 110 120 180 60 225"
                  "C40 240 45 290 90 320C140 345 190 340 250 330C310 315 345 270 344 226"
                  "C340 180 300 130 231 88C180 55 100 40 -5 38"),
    ],
    "uni0639.fina": [
        dict(clip=0, width=90,
             path="M488 38C420 38 360 45 320 70C250 110 170 170 100 218"
                  "C70 245 70 300 120 325C180 350 240 345 300 330C350 315 385 270 380 225"
                  "C370 170 320 130 265 97C200 55 150 10 130 -60C115 -130 130 -200 180 -240"
                  "C240 -275 330 -275 410 -255C460 -240 500 -220 535 -193"),
    ],
    # ف ق — round the head, then on into the body
    "uni06A1": [
        dict(clip=0, width=90,
             path="M755 200C700 205 600 210 562 216C520 250 505 300 512 330"
                  "C520 400 570 460 635 462C720 458 760 420 772 354"
                  "C780 300 785 230 765 160C740 110 620 60 520 48"
                  "C400 40 240 38 170 58C110 80 90 150 90 200C90 230 92 255 95 272"),
    ],
    "uni06A1.init": [
        dict(clip=0, width=90,
             path="M300 200C240 205 150 210 100 225C70 260 75 360 120 400"
                  "C160 430 240 430 290 395C330 360 340 300 330 230"
                  "C325 170 300 110 259 83C200 60 100 45 -5 35"),
    ],
    "uni06A1.medi": [
        dict(clip=0, width=90,
             path="M403 36C360 38 300 45 250 70C180 110 120 160 85 210"
                  "C70 260 90 320 150 345C210 360 280 330 310 270"
                  "C325 220 300 160 250 120C200 80 120 45 -5 36"),
    ],
    "uni06A1.fina": [
        dict(clip=0, width=90,
             path="M826 36C760 38 690 50 640 75C580 110 520 160 490 210"
                  "C470 260 500 330 560 360C620 385 700 360 740 300"
                  "C765 250 740 180 690 140C640 100 560 60 450 45"
                  "C330 30 200 35 140 60C100 80 90 150 92 200C92 230 94 250 96 268"),
    ],
    "uni066F": [
        dict(clip=0, width=95,
             path="M520 48C460 45 360 40 310 55C280 90 275 160 290 220"
                  "C310 280 360 316 415 316C480 316 530 290 555 230"
                  "C575 170 570 100 562 30C555 -50 530 -130 460 -184"
                  "C400 -225 330 -238 260 -232C200 -228 130 -190 100 -130"
                  "C85 -90 85 -20 95 40"),
    ],
    "uni066F.fina": [
        dict(clip=0, width=95,
             path="M629 36C590 36 550 40 510 45C460 45 370 40 310 55"
                  "C280 90 275 160 290 220C310 280 360 316 410 316"
                  "C470 316 520 290 545 230C565 170 565 100 555 30"
                  "C545 -50 520 -130 450 -184C390 -225 320 -240 250 -234"
                  "C190 -228 125 -190 97 -130C82 -90 83 -20 93 40"),
    ],
    # ك ڭ — down the upright, then along the base; گ adds its bar on top
    "kafDotlessar": [
        dict(clip=0, width=100,
             path="M445 640C440 520 450 330 460 150L458 80C400 55 250 45 25 38"),
    ],
    "kafDotlessar.fina": [
        dict(clip=0, width=100,
             path="M746 36C700 38 650 45 610 60"
                  + retrace("M610 60C612 200 608 400 600 620")
                  + "C500 50 350 40 250 40C160 42 110 70 100 120C95 160 97 190 97 213"),
    ],
    # the joined forms: the top stroke down to its corner, back down the slope, then the base
    "uni0643.init": [
        dict(clip=0, width=100,
             path="M378 640C300 600 180 545 60 495C20 470 15 430 30 410"
                  "C100 380 200 330 270 260C320 210 330 150 300 110C250 70 150 45 -5 38"),
    ],
    "uni0643.medi": [
        dict(clip=0, width=100, path="M474 36C420 38 360 45 310 70"),
        dict(clip=0, width=100,
             path="M410 640C330 600 200 545 70 495C25 470 20 430 35 410"
                  "C110 380 210 330 285 260C330 210 335 150 305 110C250 70 150 45 -5 38"),
    ],
    "uni06A9": [
        dict(clip=0, width=100,
             path="M678 625C600 590 480 540 360 480C310 450 305 400 330 385"
                  "C420 330 540 270 610 175C630 140 600 90 520 65"
                  "C430 40 300 35 200 45C130 60 100 100 96 140C94 165 95 180 96 195"),
    ],
    "uni06A9.fina": [
        dict(clip=0, width=100, path="M778 34C740 36 690 50 640 90"),
        dict(clip=0, width=100,
             path="M720 625C640 590 520 540 390 480C335 450 330 400 355 385"
                  "C450 330 570 270 630 175C645 145 620 95 540 65"
                  "C450 40 320 35 210 45C140 60 105 100 100 140C98 165 97 180 97 195"),
    ],
    # ل — down the upright, then round the bowl
    "uni0644": [
        dict(clip=0, width=90,
             path="M440 625C445 450 470 250 500 30C520 -60 480 -140 420 -190"
                  "C360 -235 280 -250 210 -235C140 -220 100 -170 92 -100C88 -50 92 0 102 38"),
    ],
    "uni0644.init": [
        dict(clip=0, width=90,
             path="M100 640C105 480 115 300 125 140C125 80 90 50 40 42C20 40 5 38 -5 38"),
    ],
    "uni0644.medi": [
        dict(clip=0, width=90,
             path="M258 36C220 38 180 45 145 70"
                  + retrace("M145 70C140 250 132 450 128 640")
                  + "C100 45 50 38 -5 36"),
    ],
    "uni0644.fina": [
        dict(clip=0, width=90,
             path="M600 36C570 38 540 45 512 60"
                  + retrace("M512 60C500 250 470 450 450 625")
                  + "C515 0 510 -40 490 -80C460 -140 380 -200 300 -235"
                    "C230 -255 160 -240 125 -190C95 -140 90 -50 106 38"),
    ],
    # م — the head, then the tail
    "uni0645": [
        dict(clip=0, width=90,
             path="M128 208C160 270 200 320 246 320C290 320 330 260 387 196"
                  "C415 170 435 155 448 150C380 120 300 100 230 92"
                  "C170 85 120 70 95 20C88 -60 100 -180 115 -275"),
    ],
    "uni0645.init": [
        dict(clip=0, width=90,
             path="M124 86C150 150 200 305 285 318C345 322 368 250 372 180"
                  "C372 120 365 70 335 40C280 30 200 35 140 50C90 65 40 40 -5 38"),
    ],
    "uni0645.medi": [
        dict(clip=0, width=90,
             path="M427 38C400 40 380 50 365 70C340 110 320 200 285 270"
                  "C270 300 255 322 237 325C200 330 150 290 115 240C90 200 72 160 72 125"
                  + retrace("M72 125C130 100 240 80 300 60C315 50 318 35 317 20")
                  + "C60 90 40 45 -5 38"),
    ],
    "uni0645.fina": [
        dict(clip=0, width=95,
             path="M547 38C520 40 500 50 485 65C460 110 440 200 405 260"
                  "C385 300 370 322 357 325C320 330 260 300 220 260C195 230 182 190 182 150"
                  "C185 110 220 90 262 82C320 72 380 65 430 50C432 30 432 15 432 5"),
        dict(clip=0, width=90,
             path="M212 228C180 215 140 200 112 185C90 150 80 110 85 60"
                  "C90 -50 105 -180 130 -280"),
    ],
    # ن — down into the bowl and up to its tip
    "uni06BA": [
        dict(clip=0, width=90,
             path="M470 195C475 130 500 70 505 0C505 -80 460 -150 380 -200"
                  "C320 -230 250 -235 190 -218C130 -195 100 -140 97 -80C95 -30 98 20 104 45"),
    ],
    "uni06BA.fina": [
        dict(clip=0, width=90,
             path="M604 39C570 45 540 70 518 95"
                  + retrace("M518 95C505 130 495 165 488 190")
                  + "C500 50 510 10 505 -20C495 -90 450 -160 380 -200"
                    "C320 -230 250 -235 190 -218C130 -195 100 -140 97 -80C95 -30 98 20 104 45"),
    ],
    # و ۆ ۇ ۈ ۋ — round the head, then down into the tail
    "uni0648": [
        dict(clip=0, width=85,
             path="M365 67C320 50 260 40 210 50C160 65 135 110 137 162"
                  "C140 230 180 300 263 308C330 312 370 260 384 190"
                  "C392 130 395 80 390 40C380 -40 330 -120 260 -160C200 -190 120 -180 48 -130"),
    ],
    "uni0648.fina": [
        dict(clip=0, width=85,
             path="M484 36C440 38 400 45 360 50C300 50 240 40 200 50"
                  "C150 65 125 110 125 162C128 230 175 300 265 312"
                  "C335 316 380 260 395 190C403 130 405 80 402 40"
                  "C390 -40 340 -120 270 -160C210 -190 120 -185 45 -135"),
    ],
    # ى ي ې — the head, then round the bowl
    "uni0649": [
        dict(clip=0, width=90,
             path="M562 252C545 290 520 312 480 305C420 290 370 230 345 170"
                  "C325 120 335 80 384 45C430 30 500 25 545 -10C570 -60 540 -120 480 -160"
                  "C400 -210 300 -235 220 -230C140 -220 100 -170 92 -100C88 -50 95 0 104 38"),
    ],
    "uni0649.fina": [
        dict(clip=0, width=90,
             path="M702 37C650 45 560 75 480 78C450 70 440 45 460 20"
                  "C510 -10 580 -40 630 -80C650 -120 620 -160 547 -180"
                  "C470 -210 350 -235 250 -232C160 -225 115 -180 105 -110"
                  "C100 -50 102 0 106 45"),
    ],
    # ھ — along the bottom, round the first eye, down, then up round the second
    "uni06BE": [
        dict(clip=0, width=95,
             path="M22 67C80 55 180 50 250 72C300 90 350 130 380 180"
                  "C395 230 390 280 360 310C320 345 250 345 205 290"
                  "C185 250 190 190 225 150C265 110 330 90 400 72C460 55 510 35 530 25"
                  "C565 60 570 140 555 200C530 280 470 350 400 390C360 410 320 420 295 425"
                  "C270 420 255 400 250 370"),
    ],
    "uni0647.init": [
        dict(clip=0, width=95,
             path="M-5 38C60 40 130 45 170 60C220 80 260 130 268 200"
                  "C270 260 240 310 190 325C140 335 90 300 75 240C65 190 90 150 135 120"
                  "C190 85 280 40 330 20C380 5 400 5 410 10C450 60 455 160 430 220"
                  "C400 290 330 370 250 400C215 415 185 420 170 420C155 415 148 395 147 372"),
    ],
    # the joined forms: the base line, then the eye above it and the one below
    "uni0647.medi": [
        dict(clip=0, width=80, path="M397 40C300 40 150 40 -5 40"),
        dict(clip=0, width=95,
             path="M232 90C280 130 305 200 300 260C295 320 285 370 262 410"
                  "C220 370 165 300 130 230C100 170 80 90 72 0C72 -80 100 -150 160 -180"
                  "C220 -205 300 -190 340 -150C365 -110 360 -60 332 -30"
                  "C300 -5 250 5 200 10"),
    ],
    "uni06BE.fina": [
        dict(clip=0, width=80, path="M500 40C400 40 250 40 150 42C100 44 60 50 20 58"),
        dict(clip=0, width=95,
             path="M332 90C380 130 405 200 400 260C395 320 385 370 362 410"
                  "C320 370 265 300 230 230C200 170 185 90 180 0C185 -80 215 -150 270 -180"
                  "C330 -205 410 -190 450 -150C475 -110 470 -60 440 -30"
                  "C410 -5 360 5 310 10"),
    ],
    # ە — from the top, round the loop
    "uni06D5": [
        dict(clip=0, width=90,
             path="M165 380C200 350 250 310 295 265C330 225 340 170 320 120"
                  "C295 60 250 25 190 25C130 25 90 60 85 130C85 190 110 240 180 305"),
    ],
    "uni0647.fina": [
        dict(clip=0, width=90,
             path="M467 38C420 40 370 55 330 85C320 180 318 300 318 405"
                  "C300 380 240 330 180 295C130 265 100 220 102 190"
                  "C120 140 180 110 240 95C270 85 290 80 300 78"),
    ],
}

# Marks drawn on a body, other than dots, in their own glyph's coordinates
MARKS = {
    # the small stroke inside ك ڭ
    "miniKehehar": [
        dict(clip=0, width=60,
             path="M118 366C95 390 45 380 30 350C20 320 60 305 105 296"
                  "C140 288 140 255 115 235C90 215 50 205 15 205"),
    ],
    # گ's extra bar
    "gafsarkashabovear": [
        dict(clip=0, width=90, path="M380 962C250 900 130 845 20 790"),
    ],
    # ۆ's v
    "uni065A": [
        dict(clip=0, width=55, path="M15 900C50 850 90 800 115 760C140 820 160 870 180 915"),
    ],
    # ۇ's damma
    "commaabovear": [
        dict(clip=0, width=80, path="M22 925C30 965 90 975 105 935C110 880 70 820 20 760"),
    ],
    # the hamza of ئ — round the head from its inner tip, right along under it to the end of the
    # bar, then back along the bar to its left corner
    "uni0654": [
        # badge beside the head: the default, below it, would sit on the seat's badge
        dict(clip=0, width=45, label=(215, 880),
             path="M104 866C116 892 104 918 76 921C42 922 15 894 11 862"
                  "C9 836 22 818 50 814L125 806L3 752"),
    ],
    # ۈ's small alif
    "uni0670": [
        dict(clip=0, width=50, path="M28 990C28 920 26 840 24 760"),
    ],
}
