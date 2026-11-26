/* Hyrule kit — music.js
 * Zero-dependency WebAudio synth: original looping tracks + SFX, all synthesized.
 * Classic script that is also valid as an ES module (no import/export, strict-safe).
 * Defines globalThis.HyruleMusic. Never makes a sound before a user gesture.
 * All melodies are original compositions for this kit.
 */
(function () {
  'use strict';
  var G = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : self);
  if (G.HyruleMusic && G.HyruleMusic.__kit) return;

  // ---------- pitch helpers ----------
  var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(p) {
    if (typeof p === 'number') return p;
    var m = /^([A-G])([#b]?)(-?\d)$/.exec(String(p).trim());
    if (!m) return NaN;
    return 12 * (+m[3] + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  var NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  function name(m) { return NAMES[m % 12] + (Math.floor(m / 12) - 1); }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var QUAL = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6],
    aug: [0, 4, 8], sus: [0, 5, 7], sus2: [0, 2, 7], '5': [0, 7], add9: [0, 4, 7, 14] };
  function parseChord(tok) {
    var m = /^([A-G])([#b]?)(.*)$/.exec(tok);
    if (!m || !QUAL[m[3]]) return null;
    return { pc: (PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12, iv: QUAL[m[3]], sym: tok };
  }
  // chord tones from `lo` upward (two octaves)
  function chordTones(ch, lo) {
    var base = lo + ((ch.pc - lo) % 12 + 12) % 12, out = [];
    for (var o = 0; o < 2; o++) for (var i = 0; i < ch.iv.length; i++) if (ch.iv[i] < 12) out.push(base + ch.iv[i] + 12 * o);
    return out;
  }
  // "G5:2 B5:2 r:4 C6" (durations in 16ths; duration carries over)
  function parseLine(s, d0) {
    var ev = [], t = 0, d = d0 || 4, bad = [];
    String(s || '').trim().split(/\s+/).forEach(function (tok) {
      if (!tok) return;
      var p = tok.split(':');
      if (p[1] !== undefined) d = +p[1];
      if (!(d > 0)) bad.push(tok);
      if (p[0] !== 'r') { var m = midi(p[0]); if (isNaN(m)) bad.push(tok); ev.push([t, m, d]); }
      t += d;
    });
    return { ev: ev, len: t, bad: bad };
  }

  // ---------- track data (original) ----------
  // Units: 1 = sixteenth note. meter = beats per bar (4 => 16 units, 3 => 12 units).
  // acc: accompaniment layers. mode arp|chord|bass; pat chars x=1 o=.6 .=rest (one bar, repeats).
  // dr lanes: k kick, t tom, T low tom, f frame drum, s shaker, h hat, b tambourine, c click.
  var TRACKS = {
    forest: {
      title: 'Forest Romp', mood: 'bouncy, playful (G mixolydian)', bpm: 138, meter: 4, lead: 'ocarina',
      ph: {
        a1: 'G5:2 B5:2 D6:3 B5:1 C6:2 B5:2 A5:4 C6:2 A5:2 F5:2 A5:2 G5:6 r:2',
        a2: 'E5:2 G5:2 C6:2 E6:2 D6:3 C6:1 B5:2 C6:2 D6:4 B5:2 G5:2 A5:8',
        a3: 'G5:2 B5:2 D6:3 B5:1 C6:2 B5:2 A5:4 F5:2 A5:2 C6:2 F6:2 E6:2 D6:2 C6:4',
        a4: 'C6:3 B5:1 A5:2 E5:2 A5:2 B5:2 C6:4 B5:2 A5:2 F#5:2 D5:2 A5:8',
        a5: 'E6:2 D6:2 C6:2 B5:2 A5:4 F#5:4 G5:4 B5:2 D6:2 G5:8',
        b1: 'E5:4 G5:4 C6:6 B5:2 A5:8 F5:4 G5:4',
        b2: 'G5:4 B5:4 E6:6 D6:2 C6:8 A5:4 B5:4',
        b3: 'C6:2 D6:2 E6:4 D6:2 C6:2 G5:4 A5:2 C6:2 F6:4 E6:2 D6:2 C6:4',
        b4: 'D6:4 C6:2 B5:2 A5:4 F#5:4 A5:12 r:4',
        c1: 'B4:16 A4:16 G4:16 B4:16', c2: 'B4:16 C5:16 C5:8 D5:8 B4:16'
      },
      sec: {
        A: { ch: 'G F C G G F Am D', m: 'a1 a2 a3 a4' },
        A2: { ch: 'G F C G G F C:8 D:8 G', m: 'a1 a2 a3 a5', cm: 'c1 c2', cv: 'strings' },
        B: { ch: 'C F Em Am C F D D', m: 'b1 b2 b3 b4', accAdd: [{ v: 'strings', lo: 57, pat: 'x...............', mode: 'chord', vel: 0.28 }] },
        A3: { ch: 'G F C G G F C:8 D:8 G', m: 'a1 a2 a3 a5', lead: 'flute', drAdd: { b: '....x.......x.o.' } }
      },
      form: 'A A2 B A3',
      acc: [
        { v: 'harp', lo: 55, pat: 'x.o.x.o.x.o.x.o.', seq: [0, 2, 4, 2, 1, 3, 5, 3], vel: 0.42 },
        { v: 'bass', lo: 40, pat: 'x.......o.......', seq: [0, 2], mode: 'bass', vel: 0.55 },
        { v: 'pad', lo: 59, pat: 'x...............', mode: 'chord', vel: 0.16 }
      ],
      dr: { k: 'x.......o.......', s: '..o...o...o...o.', b: '....o.......o...' }
    },
    field: {
      title: 'Open Field', mood: 'open, heroic, galloping (D major/mixolydian)', bpm: 112, meter: 4, lead: 'horn', gain: 1.2,
      ph: {
        a1: 'D4:6 A4:2 D5:8 E5:4 D5:2 C5:2 G4:8',
        a2: 'B4:6 C5:2 D5:4 G5:4 F#5:12 r:4',
        a3: 'F#5:6 E5:2 D5:4 B4:4 D5:6 B4:2 G4:4 D5:4',
        a4: 'E5:4 G5:4 F#5:4 E5:4 E5:8 C#5:4 A4:4',
        a5: 'G5:4 F#5:2 E5:2 C#5:4 E5:4 D5:16',
        b1: 'B5:4 A5:2 G5:2 D5:4 G5:4 A5:6 B5:2 C#6:8',
        b2: 'C#6:4 A5:2 F#5:2 A5:4 C#6:4 D6:8 B5:8',
        b3: 'B5:2 A5:2 G5:2 A5:2 B5:4 D6:4 E6:6 D6:2 C#6:4 A5:4',
        b4: 'D6:6 F6:2 D6:4 Bb5:4 C#6:4 E6:4 A5:8',
        c1: 'r:8 A5:8 G5:8 E5:8', c2: 'D5:8 G5:8 A5:16', c3: 'B5:8 A5:8 G5:8 B5:8', c4: 'B5:8 A5:8 F#5:16'
      },
      sec: {
        A: { ch: 'D C G D Bm G Em A', m: 'a1 a2 a3 a4' },
        A2: { ch: 'D C G D Bm G Em:8 A:8 D', m: 'a1 a2 a3 a5', cm: 'c1 c2 c3 c4', cv: 'flute' },
        B: { ch: 'G A F#m Bm G A Bb A', m: 'b1 b2 b3 b4', lead: 'ocarina', accAdd: [{ v: 'strings', lo: 62, pat: 'x...............', mode: 'chord', vel: 0.26 }] }
      },
      form: 'A A2 B A2',
      acc: [
        { v: 'stacc', lo: 50, pat: 'x.oox.oox.oox.oo', mode: 'chord', vel: 0.24 },
        { v: 'bass', lo: 38, pat: 'x.......x.......', seq: [0, 2], mode: 'bass', vel: 0.6 },
        { v: 'pad', lo: 57, pat: 'x...............', mode: 'chord', vel: 0.18 }
      ],
      dr: { k: 'x.......x.......', f: '....x.......x...', s: 'x.oox.oox.oox.oo' }
    },
    boss: {
      title: 'Guardian Clash', mood: 'driving, dramatic, heroic lift (E minor → G major)', bpm: 148, meter: 4, lead: 'strings', lv: 1, gain: 1.9,
      ph: {
        a1: 'E5:6 F#5:2 G5:4 B5:4 A5:4 G5:2 F#5:2 E5:8',
        a2: 'G5:6 A5:2 B5:4 C6:4 D6:4 C6:2 B5:2 A5:8',
        a3: 'E6:6 D6:2 B5:4 G5:4 A5:4 B5:2 G5:2 E5:8',
        a4: 'C6:4 B5:4 A5:4 G5:4 F#5:8 D#5:8',
        a5: 'C6:4 B5:4 A5:4 F#5:4 E5:12 r:4',
        b1: 'A4:4 C5:4 E5:4 A5:4 F#5:8 D#5:4 B4:4',
        b2: 'C5:4 E5:4 G5:4 C6:4 D6:6 C6:2 A5:4 F#5:4',
        b3: 'E5:4 A5:4 C6:4 E6:4 D#6:8 B5:4 F#5:4',
        b4: 'G5:4 C6:4 E6:4 G6:4 F#6:8 D6:4 A5:4',
        c1: 'B4:6 D5:2 G5:8 F#5:4 E5:2 D5:2 A4:8',
        c2: 'G4:4 B4:4 E5:6 F#5:2 G5:12 E5:4',
        c3: 'D5:6 G5:2 B5:8 A5:4 F#5:4 D5:8',
        c4: 'E5:4 G5:4 C6:4 B5:4 B5:8 F#5:4 D#5:4'
      },
      sec: {
        A: { ch: 'Em Em C D Em Em C B', m: 'a1 a2 a3 a4' },
        A2: { ch: 'Em Em C D Em Em C:8 B:8 Em', m: 'a1 a2 a3 a5', lead: 'horn', oct: -12, cm: 'a1 a2 a3 a5', cv: 'strings' },
        B: { ch: 'Am B C D Am B C D', m: 'b1 b2 b3 b4', drAdd: { h: 'x.x.x.x.x.x.x.x.' } },
        C: { ch: 'G D Em C G D C B', m: 'c1 c2 c3 c4', lead: 'horn', accAdd: [{ v: 'strings', lo: 62, pat: 'x.......x.......', mode: 'chord', vel: 0.22 }] }
      },
      form: 'A A2 B C',
      acc: [
        { v: 'stacc', lo: 50, pat: 'xoooxoooxoooxooo', seq: [0, 3, 0, 2, 0, 3, 1, 3], vel: 0.36 },
        { v: 'bass', lo: 40, pat: 'x...o...x...o.o.', seq: [0, 0, 0, 2, 0], mode: 'bass', vel: 0.38 },
        { v: 'choir', lo: 55, pat: 'x...............', mode: 'chord', vel: 0.15 }
      ],
      dr: { k: 'x.....o.o.......', T: '....o.......o...', t: '..............oo', s: '..o...o...o...o.', h: '....x.......x...' }
    },
    village: {
      title: 'Lantern Square Waltz', mood: 'cozy village waltz (F major, 3/4)', bpm: 120, meter: 3, lead: 'ocarina',
      ph: {
        a1: 'A5:6 G5:2 F5:2 G5:2 E5:4 C5:4 G5:4',
        a2: 'F5:6 A5:2 D6:4 D6:8 C6:2 Bb5:2',
        a3: 'A5:6 C6:2 A5:2 F5:2 G5:4 Bb5:4 D6:4',
        a4: 'C6:4 Bb5:4 G5:4 E5:8 r:4',
        a5: 'C6:4 E5:4 G5:4 F5:12',
        b1: 'D5:4 F5:4 Bb5:4 A5:8 F5:4',
        b2: 'G5:4 Bb5:4 D6:4 C6:8 E5:4',
        b3: 'F5:4 A5:4 D6:4 C#6:8 E5:4',
        b4: 'F5:4 D6:4 C6:2 Bb5:2 G5:12'
      },
      sec: {
        A: { ch: 'F C Dm Bb F Gm C C', m: 'a1 a2 a3 a4' },
        A2: { ch: 'F C Dm Bb F Gm C F', m: 'a1 a2 a3 a5', lead: 'flute' },
        B: { ch: 'Bb F Gm C Dm A Bb C', m: 'b1 b2 b3 b4', lead: 'fiddle', accAdd: [{ v: 'glock', lo: 72, pat: 'x...........', mode: 'arp', seq: [0, 1, 2, 1], vel: 0.22 }] },
        A3: { ch: 'F C Dm Bb F Gm C F', m: 'a1 a2 a3 a5', drAdd: { s: '..o...o...o.' } }
      },
      form: 'A A2 B A3',
      acc: [
        { v: 'bass', lo: 41, pat: 'x...........', seq: [0, 2], mode: 'bass', vel: 0.55 },
        { v: 'harp', lo: 57, pat: '....x...x...', mode: 'chord', vel: 0.3 },
        { v: 'pad', lo: 57, pat: 'x...........', mode: 'chord', vel: 0.12 }
      ],
      dr: { k: 'o...........', b: '....o...o...' }
    },
    ranch: {
      title: 'Meadow Fence Reel', mood: 'pastoral country, fiddle + ocarina (G major)', bpm: 104, meter: 4, lead: 'ocarina',
      ph: {
        a1: 'D5:2 E5:2 G5:4 G5:2 A5:2 B5:4 D6:4 B5:2 A5:2 G5:8',
        a2: 'E5:2 G5:2 C6:4 B5:2 A5:2 G5:4 B5:4 D5:4 G5:8',
        a3: 'D5:2 E5:2 G5:4 B5:2 C6:2 D6:4 E6:4 D6:2 B5:2 G5:8',
        a4: 'A5:2 B5:2 C#6:4 E6:2 C#6:2 A5:4 D6:8 r:4 A5:4',
        a5: 'C6:4 A5:4 F#5:4 A5:4 G5:16',
        b1: 'E5:4 G5:4 E5:2 D5:2 C5:4 D5:4 B4:4 G4:8',
        b2: 'A4:2 C5:2 E5:4 A5:4 G5:4 F#5:8 D5:8',
        b3: 'E5:4 G5:4 C6:6 B5:2 B5:4 A5:4 G5:8',
        b4: 'A5:4 C6:4 B5:2 A5:2 F#5:4 G5:12 r:4'
      },
      sec: {
        A: { ch: 'G G C G G Em A7 D', m: 'a1 a2 a3 a4' },
        B: { ch: 'C G Am D C G Am:8 D:8 G', m: 'b1 b2 b3 b4', lead: 'fiddle' },
        A2: { ch: 'G G C G G Em Am:8 D7:8 G', m: 'a1 a2 a3 a5', cm: 'b1 b2 b3 b4', cv: 'fiddle' }
      },
      form: 'A B A2',
      acc: [
        { v: 'bass', lo: 40, pat: 'x.......o.......', seq: [0, 2], mode: 'bass', vel: 0.55 },
        { v: 'harp', lo: 55, pat: '....x.......x...', mode: 'chord', vel: 0.32 },
        { v: 'pad', lo: 55, pat: 'x...............', mode: 'chord', vel: 0.12 }
      ],
      dr: { k: 'x.......x.......', s: 'x.ox.ox.x.ox.ox.', b: '....o.......o...' }
    },
    fire: {
      title: 'Ember Forge', mood: 'tense but warm, low drums (A minor)', bpm: 96, meter: 4, lead: 'strings', gain: 1.3,
      ph: {
        a1: 'A4:8 C5:4 B4:4 A4:4 E4:4 A4:8',
        a2: 'C5:8 D5:4 C5:4 B4:8 G4:8',
        a3: 'E5:8 F5:4 E5:4 C5:4 D5:4 E5:8',
        a4: 'F5:4 E5:4 D5:4 C5:4 B4:8 G#4:8',
        b1: 'A5:6 G5:2 F5:4 C5:4 D5:6 E5:2 G5:8',
        b2: 'B5:6 A5:2 G5:4 E5:4 A5:16',
        b3: 'C6:6 B5:2 A5:4 F5:4 G5:6 A5:2 B5:8',
        b4: 'G#5:8 B5:8 E5:16'
      },
      sec: {
        A: { ch: 'Am Am F G Am Am Dm E', m: 'a1 a2 a3 a4' },
        B: { ch: 'F G Em Am F G E E', m: 'b1 b2 b3 b4', lead: 'ocarina', drAdd: { b: '....o.......o...' } },
        A2: { ch: 'Am Am F G Am Am Dm E', m: 'a1 a2 a3 a4', lead: 'horn', cm: 'a1 a2 a3 a4', cv: 'flute', oct: 0 }
      },
      form: 'A B A2',
      acc: [
        { v: 'bass', lo: 33, pat: 'x..o..x.x..o..x.', seq: [0, 0, 1, 0, 0, 0, 1, 0], mode: 'bass', vel: 0.5 },
        { v: 'choir', lo: 52, pat: 'x...............', mode: 'chord', vel: 0.14 },
        { v: 'stacc', lo: 57, pat: '..x...x...x...x.', mode: 'chord', vel: 0.16 }
      ],
      dr: { T: 'x.....o...x.....', t: '......o.......oo', f: '....x.......x...', s: '..o...o...o...o.' }
    },
    water: {
      title: 'Still Lake Halls', mood: 'calm, flowing, mysterious (E dorian)', bpm: 80, meter: 4, lead: 'flute',
      ph: {
        a1: 'B4:8 E5:4 F#5:4 G5:6 F#5:2 E5:8',
        a2: 'D5:8 G5:4 A5:4 F#5:12 r:4',
        a3: 'G5:6 E5:2 C5:8 C#5:8 E5:4 A5:4',
        a4: 'B5:6 G5:2 E5:8 D#5:12 r:4',
        b1: 'E5:4 G5:4 C6:8 B5:6 A5:2 G5:8',
        b2: 'A5:4 C6:4 E6:8 D6:6 B5:2 G5:8',
        b3: 'E6:8 D6:4 C6:4 A5:8 F#5:8',
        b4: 'F#5:6 A5:2 B5:8 D#6:16'
      },
      sec: {
        A: { ch: 'Em A G D C A Em B', m: 'a1 a2 a3 a4' },
        B: { ch: 'C G Am Em C D B B', m: 'b1 b2 b3 b4', lead: 'ocarina', accAdd: [{ v: 'strings', lo: 59, pat: 'x...............', mode: 'chord', vel: 0.2 }] },
        A2: { ch: 'Em A G D C A Em B', m: 'a1 a2 a3 a4', lead: 'ocarina', accAdd: [{ v: 'bell', lo: 76, pat: 'x.......x.......', seq: [0, 2, 1, 2], vel: 0.18 }] }
      },
      form: 'A B A2',
      acc: [
        { v: 'harp', lo: 52, pat: 'xoooxoooxoooxooo', seq: [0, 1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 4, 3, 2, 1], vel: 0.3 },
        { v: 'pad', lo: 52, pat: 'x...............', mode: 'chord', vel: 0.18 },
        { v: 'bass', lo: 40, pat: 'x...............', mode: 'bass', vel: 0.45 }
      ],
      dr: { s: '........o.......', f: 'o...............' }
    },
    shadow: {
      title: 'Lantern in the Dark', mood: 'eerie but gentle music box (D minor, 3/4)', bpm: 84, meter: 3, lead: 'musicbox', gain: 1.4,
      ph: {
        a1: 'D6:4 A5:4 F5:4 E5:4 C#6:4 A5:4',
        a2: 'F5:4 D6:4 E6:4 F6:8 D6:4',
        a3: 'Bb5:4 G5:4 D6:4 A5:8 F5:4',
        a4: 'G#5:4 B5:4 D6:4 C#6:12',
        a5: 'Bb5:4 A5:4 C#6:4 D6:12',
        b1: 'F5:4 Bb5:4 D6:4 C6:8 A5:4',
        b2: 'Bb5:4 D6:4 G6:4 E6:8 C#6:4',
        b3: 'D6:4 C6:4 Bb5:4 C6:4 G5:4 E5:4',
        b4: 'A5:4 C#6:4 E6:4 C#6:8 r:4'
      },
      sec: {
        A: { ch: 'Dm A Dm Bb Gm Dm E A', m: 'a1 a2 a3 a4' },
        A2: { ch: 'Dm A Dm Bb Gm Dm Gm:6 A:6 Dm', m: 'a1 a2 a3 a5', cm: 'a1 a2 a3 a5', cv: 'flute', oct: 0 },
        B: { ch: 'Bb F Gm A Bb C A A', m: 'b1 b2 b3 b4', accAdd: [{ v: 'choir', lo: 55, pat: 'x...........', mode: 'chord', vel: 0.12 }] }
      },
      form: 'A A2 B',
      acc: [
        { v: 'pad', lo: 45, pat: 'x...........', mode: 'chord', vel: 0.22 },
        { v: 'bass', lo: 38, pat: 'x...........', mode: 'bass', vel: 0.4 },
        { v: 'musicbox', lo: 62, pat: '....x...x...', seq: [1, 2, 1, 2, 0, 2], vel: 0.22 }
      ],
      dr: { T: 'o...........', c: '........o...' }
    },
    spirit: {
      title: 'Sandstone Mirage', mood: 'desert-mystic (A phrygian dominant)', bpm: 100, meter: 4, lead: 'ocarina',
      ph: {
        a1: 'A4:4 C#5:4 E5:6 D5:2 F5:6 E5:2 D5:4 Bb4:4',
        a2: 'A4:4 D5:4 F5:4 A5:4 G5:4 F5:2 E5:2 C#5:8',
        a3: 'D5:4 G5:4 Bb5:6 A5:2 G5:4 F5:4 D5:8',
        a4: 'E5:4 F5:4 C#5:4 Bb4:4 A4:16',
        b1: 'D5:4 F5:4 A5:8 Bb5:6 A5:2 G5:8',
        b2: 'A5:4 C#6:4 E6:8 D6:8 F5:4 A5:4',
        b3: 'Bb5:4 D6:4 F6:6 E6:2 D6:8 Bb5:4 G5:4',
        b4: 'C#6:4 Bb5:4 A5:4 G5:4 A5:16'
      },
      sec: {
        A: { ch: 'A Bb Dm A Gm Bb A A', m: 'a1 a2 a3 a4' },
        B: { ch: 'Dm Gm A Dm Bb Gm A A', m: 'b1 b2 b3 b4', lead: 'flute', accAdd: [{ v: 'strings', lo: 57, pat: 'x...............', mode: 'chord', vel: 0.2 }] },
        A2: { ch: 'A Bb Dm A Gm Bb A A', m: 'a1 a2 a3 a4', lead: 'fiddle', oct: 12, drAdd: { s: 'x.o.x.o.x.o.x.o.' } }
      },
      form: 'A B A2',
      acc: [
        { v: 'harp', lo: 57, pat: 'x.o.o.x.o.o.x.o.', seq: [0, 2, 1, 3, 2, 4], vel: 0.32 },
        { v: 'bass', lo: 33, pat: 'x.....x.....x...', mode: 'bass', vel: 0.45 },
        { v: 'pad', lo: 45, pat: 'x...............', mode: 'chord', vel: 0.14 }
      ],
      dr: { f: 'x..o..o...x.o...', b: '....o.......o...', s: '..o...o...o...o.' }
    },
    victory: {
      title: 'Bright Return', mood: 'triumphant, gentle loop (C major)', bpm: 108, meter: 4, lead: 'horn', gain: 1.1,
      ph: {
        a1: 'G4:4 C5:4 E5:6 G5:2 A5:8 F5:4 C5:4',
        a2: 'D5:4 G5:4 B5:6 A5:2 G5:8 E5:8',
        a3: 'E5:4 A5:4 C6:6 B5:2 A5:4 F5:4 C6:8',
        a4: 'B5:6 A5:2 G5:4 D5:4 G5:12 r:4',
        a5: 'A5:4 C6:4 B5:4 D6:4 C6:16',
        b1: 'C6:6 A5:2 F5:8 E5:4 G5:4 C6:8',
        b2: 'D6:6 C6:2 A5:4 F5:4 G5:8 B5:4 D6:4',
        b3: 'C6:6 D6:2 A5:8 G5:6 E5:2 C5:8',
        b4: 'F5:4 A5:4 B5:4 D6:4 C6:12 r:4'
      },
      sec: {
        A: { ch: 'C F G C Am F G G', m: 'a1 a2 a3 a4', oct: -12, cm: 'a1 a2 a3 a4', cv: 'strings' },
        A2: { ch: 'C F G C Am F F:8 G:8 C', m: 'a1 a2 a3 a5', lead: 'ocarina' },
        B: { ch: 'F C Dm G F C Dm:8 G:8 C', m: 'b1 b2 b3 b4', lead: 'ocarina', accAdd: [{ v: 'strings', lo: 60, pat: 'x...............', mode: 'chord', vel: 0.22 }, { v: 'bell', lo: 79, pat: 'x...............', seq: [0], vel: 0.16 }] }
      },
      form: 'A A2 B',
      acc: [
        { v: 'harp', lo: 55, pat: 'x.o.x.o.x.o.x.o.', seq: [0, 1, 2, 3, 4, 3, 2, 1], vel: 0.34 },
        { v: 'bass', lo: 36, pat: 'x.......o.......', seq: [0, 2], mode: 'bass', vel: 0.5 },
        { v: 'pad', lo: 60, pat: 'x...............', mode: 'chord', vel: 0.14 }
      ],
      dr: { k: 'x.......x.......', b: '....o.......o...', s: '..o...o...o...o.' }
    }
  };

  // ---------- compile tracks to event lists ----------
  var compiled = {};
  function compile(id) {
    if (compiled[id]) return compiled[id];
    var tr = TRACKS[id], bu = tr.meter * 4, u = 60 / tr.bpm / 4, ev = [], t0 = 0, errs = [];
    tr.form.split(/\s+/).forEach(function (sid) {
      var s = tr.sec[sid];
      if (!s) { errs.push('missing section ' + sid); return; }
      // chords
      var chords = [], ct = 0;
      s.ch.trim().split(/\s+/).forEach(function (tok) {
        var p = tok.split(':'), d = p[1] ? +p[1] : bu, c = parseChord(p[0]);
        if (!c) errs.push(id + '/' + sid + ' bad chord ' + tok);
        chords.push({ t: ct, d: d, c: c }); ct += d;
      });
      var len = ct;
      if (len % bu) errs.push(id + '/' + sid + ' chords not whole bars');
      function chordAt(t) { for (var i = chords.length - 1; i >= 0; i--) if (chords[i].t <= t) return chords[i].c; return chords[0].c; }
      function line(ids, voice, vel, tag) {
        var txt = ids.split(/\s+/).map(function (k) { if (!tr.ph[k]) errs.push(id + ' missing phrase ' + k); return tr.ph[k] || ''; }).join(' ');
        var L = parseLine(txt);
        if (L.bad.length) errs.push(id + '/' + sid + ' bad tokens ' + L.bad.join(','));
        if (L.len !== len) errs.push(id + '/' + sid + ' ' + tag + ' length ' + L.len + ' != ' + len);
        L.ev.forEach(function (e) {
          var acc = (e[0] % bu === 0) ? 1 : (e[0] % 4 === 0 ? 0.9 : 0.8);
          ev.push([(t0 + e[0]) * u, voice, e[1] + (s.oct || 0), e[2] * u * 0.96, vel * acc]);
        });
      }
      line(s.m, s.lead || tr.lead, tr.lv || 0.8, 'melody');
      if (s.cm) line(s.cm, s.cv || 'flute', 0.45, 'counter');
      var layers = (s.acc || tr.acc).concat(s.accAdd || []);
      layers.forEach(function (L) {
        var pat = L.pat, hits = [], k = 0;
        for (var b = 0; b < len; b += pat.length) for (var i = 0; i < pat.length && b + i < len; i++) if (pat[i] !== '.') hits.push([b + i, pat[i] === 'x' ? 1 : 0.6]);
        hits.forEach(function (h, j) {
          var nt = j + 1 < hits.length ? hits[j + 1][0] : len, d = L.dur || (nt - h[0]);
          var c = chordAt(h[0]), tones = chordTones(c, L.lo), vel = (L.vel || 0.4) * h[1];
          if (L.mode === 'chord') {
            for (var q = 0; q < tones.length / 2; q++) ev.push([(t0 + h[0]) * u, L.v, tones[q], d * u * 0.95, vel]);
          } else {
            var seq = L.seq || [0], idx = seq[k++ % seq.length];
            if (L.mode === 'bass') { var r = chordTones(c, L.lo); idx = Math.min(idx, r.length - 1); ev.push([(t0 + h[0]) * u, L.v, r[idx], d * u * 0.9, vel]); }
            else ev.push([(t0 + h[0]) * u, L.v, tones[idx % tones.length], d * u, vel]);
          }
        });
      });
      var dr = {}, k2;
      var base = s.dr || tr.dr || {};
      for (k2 in base) dr[k2] = base[k2];
      if (s.drAdd) for (k2 in s.drAdd) dr[k2] = s.drAdd[k2];
      if (!s.noDrums) Object.keys(dr).forEach(function (lane) {
        var pat = dr[lane];
        for (var b = 0; b < len; b += pat.length) for (var i = 0; i < pat.length && b + i < len; i++) if (pat[i] !== '.')
          ev.push([(t0 + b + i) * u, 'drums', DRUMLANE[lane], 0.2, pat[i] === 'x' ? 0.8 : 0.5]);
      });
      t0 += len;
    });
    ev.sort(function (a, b) { return a[0] - b[0]; });
    compiled[id] = { id: id, ev: ev, len: t0 * u, bars: t0 / bu, errs: errs, gain: tr.gain || 1 };
    return compiled[id];
  }
  var DRUMLANE = { k: 'kick', t: 'tom', T: 'low', f: 'frame', s: 'shaker', h: 'hat', b: 'tamb', c: 'click' };
  var DRUMNUM = { 35: 'kick', 36: 'kick', 41: 'low', 43: 'low', 45: 'tom', 47: 'tom', 38: 'frame', 40: 'frame', 42: 'hat', 44: 'hat', 54: 'tamb', 69: 'shaker', 70: 'shaker', 37: 'click', 75: 'click' };

  // ---------- audio graph ----------
  var ctx = null, A = null, unlocked = false, pending = null, current = null, playbacks = [], timer = null, timerMs = 0, wasRunning = false;
  var LS = 'hyruleKit.audio';
  var st = { master: 0.8, music: 0.6, sfx: 0.9, muted: false };
  try { var sv = JSON.parse(G.localStorage.getItem(LS) || 'null'); if (sv) for (var kk in st) if (kk in sv) st[kk] = sv[kk]; } catch (e) { /* no storage */ }
  function save() { try { G.localStorage.setItem(LS, JSON.stringify(st)); } catch (e) { /* ignore */ } }
  function clamp(v) { v = +v; return v > 1 ? 1 : v > 0 ? v : 0; }

  function noiseBuf(c) {
    var n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0), s = 12345;
    for (var i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }
    return b;
  }
  function impulse(c, secs) {
    var sr = c.sampleRate, n = Math.floor(sr * secs), b = c.createBuffer(2, n, sr), s = 777;
    for (var ch = 0; ch < 2; ch++) {
      var d = b.getChannelData(ch), lp = 0;
      for (var i = 0; i < n; i++) {
        s = (s * 1103515245 + 12345 + ch) & 0x7fffffff;
        var w = s / 0x3fffffff - 1, tt = i / sr;
        lp += (w - lp) * (0.55 - 0.4 * tt / secs); // darker tail
        d[i] = (tt < 0.012 ? 0 : lp) * Math.pow(1 - tt / secs, 2.2) * Math.exp(-tt * 2.2);
      }
    }
    return b;
  }
  function build(c) {
    var g = { c: c, ks: {} };
    g.noise = noiseBuf(c);
    g.limiter = c.createDynamicsCompressor();
    g.limiter.threshold.value = -2; g.limiter.knee.value = 0; g.limiter.ratio.value = 20; g.limiter.attack.value = 0.002; g.limiter.release.value = 0.12;
    g.comp = c.createDynamicsCompressor();
    g.comp.threshold.value = -20; g.comp.knee.value = 14; g.comp.ratio.value = 3; g.comp.attack.value = 0.012; g.comp.release.value = 0.3;
    g.master = c.createGain(); g.master.gain.value = st.muted ? 0 : st.master;
    g.master.connect(g.comp); g.comp.connect(g.limiter); g.limiter.connect(c.destination);
    g.rev = c.createConvolver(); g.rev.buffer = impulse(c, 2.6);
    g.revOut = c.createGain(); g.revOut.gain.value = 0.9; g.rev.connect(g.revOut); g.revOut.connect(g.master);
    g.music = c.createGain(); g.music.gain.value = st.music * 0.4;
    g.duck = c.createGain(); g.music.connect(g.duck); g.duck.connect(g.master);
    g.mSend = c.createGain(); g.mSend.gain.value = 0.3; g.duck.connect(g.mSend); g.mSend.connect(g.rev);
    g.sfx = c.createGain(); g.sfx.gain.value = st.sfx; g.sfx.connect(g.master);
    g.sSend = c.createGain(); g.sSend.gain.value = 0.18; g.sfx.connect(g.sSend); g.sSend.connect(g.rev);
    return g;
  }

  // ---------- voices ----------
  // each returns {g: GainNode (output, already connected), srcs: [...], s: sustain level, r: release}
  function osc(c, type, f, t) { var o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); return o; }
  function gain(c, v) { var g = c.createGain(); g.gain.value = v; return g; }
  function vib(c, t, rate, depth, delay, targets) {
    var l = osc(c, 'sine', rate, t), lg = c.createGain();
    lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + delay); lg.gain.linearRampToValueAtTime(depth, t + delay + 0.35);
    l.connect(lg); targets.forEach(function (p) { lg.connect(p); });
    return l;
  }
  function breathy(g, out, m, t, vel, o) {
    var c = g.c, f = hz(m), v = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = Math.min(9000, f * o.lp); lp.connect(v); v.connect(out);
    var o1 = osc(c, 'sine', f, t), o2 = osc(c, 'triangle', f, t), o3 = osc(c, 'sine', f * 2, t);
    var g2 = gain(c, o.tri), g3 = gain(c, o.h2);
    o1.connect(lp); o2.connect(g2); g2.connect(lp); o3.connect(g3); g3.connect(lp);
    var l = vib(c, t, o.vr, f * o.vd, o.vdel, [o1.frequency, o2.frequency, o3.frequency]);
    var n = c.createBufferSource(); n.buffer = g.noise; n.loop = true;
    var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2.2; bp.Q.value = 1.2;
    var ng = c.createGain(); ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(o.chiff, t + 0.02); ng.gain.setTargetAtTime(o.br, t + 0.03, 0.05);
    n.connect(bp); bp.connect(ng); ng.connect(v);
    n.start(t, (m * 0.137) % 1.5); n.__st = true;
    var pk = vel * o.amp;
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(pk, t + o.a); v.gain.setTargetAtTime(pk * 0.85, t + o.a, 0.2);
    return { g: v, srcs: [o1, o2, o3, l, n], r: o.r };
  }
  function strings(g, out, m, t, vel, o) {
    var c = g.c, f = hz(m), v = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 0.6; lp.frequency.setValueAtTime(o.cut * (0.6 + 0.6 * vel), t);
    lp.connect(v); v.connect(out);
    var srcs = [], dets = o.det, fs = [];
    for (var i = 0; i < dets.length; i++) { var s = osc(c, o.wave || 'sawtooth', f, t); s.detune.setValueAtTime(dets[i], t); var sg = gain(c, 0.33); s.connect(sg); sg.connect(lp); srcs.push(s); fs.push(s.frequency); }
    if (o.vd) srcs.push(vib(c, t, o.vr || 5, f * o.vd, o.vdel || 0.25, fs));
    var pk = vel * o.amp;
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(pk, t + o.a);
    if (o.dec) v.gain.setTargetAtTime(pk * o.sus, t + o.a, o.dec);
    return { g: v, srcs: srcs, r: o.r };
  }
  function ksBuf(g, m) {
    if (g.ks[m]) return g.ks[m];
    var c = g.c, sr = c.sampleRate, f = hz(m), P = sr / f, N = Math.max(2, Math.round(P - 0.5));
    var T60 = Math.max(0.8, 3.2 - (m - 48) * 0.05), len = Math.floor(sr * Math.min(3.5, T60 * 0.9));
    var dec = Math.pow(0.001, 1 / (f * T60)), b = c.createBuffer(1, len, sr), d = b.getChannelData(0), buf = new Float32Array(N), s = m * 7919, lp = 0, i;
    for (i = 0; i < N; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; var w = s / 0x3fffffff - 1; lp += (w - lp) * 0.6; buf[i] = lp; }
    var idx = 0, pk = 0;
    for (i = 0; i < len; i++) { var cur = buf[idx], nx = buf[(idx + 1) % N]; buf[idx] = (cur + nx) * 0.5 * dec; d[i] = cur; if (Math.abs(cur) > pk) pk = Math.abs(cur); idx = (idx + 1) % N; }
    var fade = Math.floor(sr * 0.05);
    for (i = 0; i < len; i++) { d[i] /= (pk || 1); if (i > len - fade) d[i] *= (len - i) / fade; }
    g.ks[m] = { b: b, rate: (N + 0.5) / P };
    return g.ks[m];
  }
  function harp(g, out, m, t, vel) {
    var c = g.c, k = ksBuf(g, m), s = c.createBufferSource(), v = c.createGain(), lp = c.createBiquadFilter();
    s.buffer = k.b; s.playbackRate.value = k.rate; s.__st = true;
    lp.type = 'lowpass'; lp.frequency.value = 5200; s.connect(lp); lp.connect(v); v.connect(out);
    var b = osc(c, 'sine', hz(m), t), bg = c.createGain(); // body
    bg.gain.setValueAtTime(vel * 0.18, t); bg.gain.exponentialRampToValueAtTime(0.0005, t + 1.2); b.connect(bg); bg.connect(v);
    v.gain.setValueAtTime(vel * 0.42, t); s.start(t);
    return { g: v, srcs: [s, b], r: 0.25, perc: k.b.duration / k.rate };
  }
  function partials(g, out, m, t, vel, P) {
    var c = g.c, f = hz(m), v = c.createGain(); v.gain.value = vel; v.connect(out); var srcs = [], maxd = 0;
    for (var i = 0; i < P.length; i++) {
      var p = P[i]; if (f * p[0] > 16000) continue;
      var o = osc(c, 'sine', f * p[0], t), pg = c.createGain();
      pg.gain.setValueAtTime(0, t); pg.gain.linearRampToValueAtTime(p[1], t + 0.004); pg.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
      o.connect(pg); pg.connect(v); srcs.push(o); if (p[2] > maxd) maxd = p[2];
    }
    return { g: v, srcs: srcs, r: 0.3, perc: maxd };
  }
  function bass(g, out, m, t, vel) {
    var c = g.c, f = hz(m), v = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.connect(v); v.connect(out);
    var o1 = osc(c, 'sine', f, t), o2 = osc(c, 'triangle', f, t), g2 = gain(c, 0.5); o1.connect(lp); o2.connect(g2); g2.connect(lp);
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(vel * 0.5, t + 0.01); v.gain.setTargetAtTime(vel * 0.28, t + 0.02, 0.25);
    return { g: v, srcs: [o1, o2], r: 0.08 };
  }
  function choir(g, out, m, t, vel) {
    var c = g.c, f = hz(m), v = c.createGain(); v.connect(out); var srcs = [];
    [-7, 6].forEach(function (dt) {
      var o = osc(c, 'sawtooth', f, t); o.detune.value = dt; srcs.push(o);
      [[750, 1], [1150, 0.6], [2600, 0.15]].forEach(function (fm) { var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fm[0]; bp.Q.value = 6; var bg = gain(c, fm[1] * 0.5); o.connect(bp); bp.connect(bg); bg.connect(v); });
    });
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(vel * 0.5, t + 0.5);
    return { g: v, srcs: srcs, r: 0.9 };
  }
  function drum(g, out, kind, t, vel) {
    var c = g.c, v = c.createGain(); v.gain.value = vel; v.connect(out); var srcs = [], end = 0.3;
    function tone(f0, f1, dur, amp) { var o = osc(c, 'sine', f0, t), og = c.createGain(); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.4); og.gain.setValueAtTime(amp, t); og.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(og); og.connect(v); srcs.push(o); end = Math.max(end, dur); }
    function nz(type, f, q, dur, amp) { var n = c.createBufferSource(); n.buffer = g.noise; var fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; var ng = c.createGain(); ng.gain.setValueAtTime(amp, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + dur); n.connect(fl); fl.connect(ng); ng.connect(v); n.start(t, Math.random() * 1.5); n.__st = true; srcs.push(n); end = Math.max(end, dur); }
    switch (kind) {
      case 'kick': tone(110, 50, 0.32, 0.5); nz('lowpass', 900, 0.7, 0.03, 0.15); break;
      case 'tom': tone(190, 120, 0.32, 0.6); nz('bandpass', 500, 1, 0.08, 0.12); break;
      case 'low': tone(105, 72, 0.5, 0.5); nz('lowpass', 300, 0.7, 0.12, 0.2); break;
      case 'frame': tone(150, 95, 0.22, 0.45); nz('bandpass', 1100, 1.2, 0.09, 0.22); break;
      case 'shaker': nz('highpass', 5200, 0.7, 0.07, 0.16); break;
      case 'hat': nz('highpass', 8000, 0.7, 0.045, 0.12); break;
      case 'tamb': nz('bandpass', 7200, 2.5, 0.14, 0.2); nz('bandpass', 9800, 3, 0.09, 0.12); break;
      case 'click': tone(1300, 800, 0.04, 0.35); nz('bandpass', 2500, 2, 0.02, 0.15); break;
      default: tone(160, 100, 0.25, 0.4);
    }
    return { g: v, srcs: srcs, r: 0.05, perc: end };
  }
  var VOICES = {
    ocarina: function (g, o, m, t, v) { return breathy(g, o, m, t, v, { lp: 6, tri: 0.12, h2: 0.05, vr: 5.2, vd: 0.006, vdel: 0.28, chiff: 0.12, br: 0.035, amp: 0.42, a: 0.035, r: 0.11 }); },
    flute: function (g, o, m, t, v) { return breathy(g, o, m, t, v, { lp: 5, tri: 0.3, h2: 0.12, vr: 5.0, vd: 0.005, vdel: 0.2, chiff: 0.18, br: 0.07, amp: 0.36, a: 0.05, r: 0.14 }); },
    harp: harp,
    strings: function (g, o, m, t, v) { return strings(g, o, m, t, v, { det: [-9, 0, 8], cut: 3200, amp: 0.34, a: 0.09, r: 0.35, vd: 0.003, vr: 5.2 }); },
    stacc: function (g, o, m, t, v) { return strings(g, o, m, t, v, { det: [-6, 7], cut: 2000, amp: 0.36, a: 0.008, dec: 0.06, sus: 0.25, r: 0.07 }); },
    fiddle: function (g, o, m, t, v) { return strings(g, o, m, t, v, { det: [-4, 4], cut: 3400, amp: 0.26, a: 0.03, r: 0.12, vd: 0.006, vr: 6.2, vdel: 0.15 }); },
    horn: function (g, o, m, t, v) { return strings(g, o, m, t, v, { det: [-5, 5], cut: 1100, amp: 0.36, a: 0.07, r: 0.22, vd: 0.002, vr: 4.5 }); },
    pad: function (g, o, m, t, v) { return strings(g, o, m, t, v, { det: [-12, 0, 11], wave: 'triangle', cut: 1500, amp: 0.4, a: 0.6, r: 1.0 }); },
    choir: choir,
    bass: bass,
    bell: function (g, o, m, t, v) { return partials(g, o, m, t, v * 0.35, [[1, 1, 2.8], [2, 0.5, 1.6], [2.4, 0.35, 1.2], [3, 0.25, 0.9], [4.2, 0.15, 0.5]]); },
    glock: function (g, o, m, t, v) { return partials(g, o, m, t, v * 0.35, [[1, 1, 1.4], [2.76, 0.35, 0.5], [5.4, 0.15, 0.2]]); },
    musicbox: function (g, o, m, t, v) { return partials(g, o, m, t, v * 0.33, [[1, 1, 1.6], [3.9, 0.25, 0.35], [9.2, 0.08, 0.08]]); },
    drums: null
  };
  var VOICE_GAIN = { ocarina: 1, flute: 1, harp: 1, strings: 0.8, stacc: 0.7, fiddle: 0.8, horn: 0.8, pad: 0.7, choir: 0.6, bass: 0.7, bell: 1, glock: 1, musicbox: 1, drums: 0.42 };
  var RANGE = { ocarina: [60, 93], flute: [60, 96], harp: [36, 96], strings: [40, 96], stacc: [36, 84], fiddle: [55, 96], horn: [45, 84], pad: [36, 84], choir: [48, 79], bass: [24, 60], bell: [60, 100], glock: [67, 108], musicbox: [60, 100] };

  // start a voice; returns handle with off(t)
  function start(g, voice, pitch, t, vel, out) {
    var h, tt = Math.max(t, g.c.currentTime);
    vel = (vel == null ? 0.8 : vel) * (VOICE_GAIN[voice] || 1);
    if (voice === 'drums') {
      var kind = typeof pitch === 'string' && isNaN(midi(pitch)) ? pitch : (DRUMNUM[midi(pitch)] || 'tom');
      h = drum(g, out, kind, tt, vel);
    } else {
      var fn = VOICES[voice] || VOICES.ocarina, m = midi(pitch);
      if (isNaN(m)) return null;
      h = fn(g, out, m, tt, vel);
    }
    h.srcs.forEach(function (s) { s.start && !s.__st && s.start(tt); });
    var done = false;
    if (h.perc) h.srcs.forEach(function (s) { try { s.stop(tt + h.perc + 0.05); } catch (e) { /* noop */ } });
    var stopAt = tt + (h.perc || 0) + 0.2;
    h.srcs[0] && (h.srcs[0].onended = function () { try { h.g.disconnect(); } catch (e) { /* noop */ } });
    h.off = function (when) {
      if (done) return; done = true;
      var te = Math.max(when == null ? g.c.currentTime : when, g.c.currentTime), p = h.g.gain;
      if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(te); else { p.cancelScheduledValues(te); p.setValueAtTime(p.value, te); }
      p.setTargetAtTime(0, te, h.r / 3);
      var end = te + h.r * 2 + 0.05;
      if (!h.perc || end < stopAt) h.srcs.forEach(function (s) { try { s.stop(end); } catch (e) { /* noop */ } });
    };
    return h;
  }

  // ---------- playback / scheduler ----------
  function Playback(id, g, t0, fadeIn) {
    this.id = id; this.tr = compile(id); this.g = g; this.t0 = t0; this.i = 0; this.loop = 0; this.stopped = false;
    this.out = g.c.createGain(); this.out.connect(g.music);
    var tg = this.tr.gain;
    this.out.gain.setValueAtTime(fadeIn ? 0.0001 : tg, t0);
    if (fadeIn) this.out.gain.linearRampToValueAtTime(tg, t0 + fadeIn);
  }
  Playback.prototype.schedule = function (until) {
    var ev = this.tr.ev, len = this.tr.len, now = this.g.c.currentTime, n = 0;
    if (!ev.length || this.stopped) return;
    while (n++ < 4000) {
      var e = ev[this.i], t = this.t0 + this.loop * len + e[0];
      if (t >= until) break;
      if (t >= now - 0.03) { var h = start(this.g, e[1], e[2], t, e[4], this.out); if (h && !h.perc) h.off(t + e[3]); else if (h && e[1] !== 'drums' && h.perc > e[3] + 0.6) h.off(t + e[3] + 0.6); }
      if (++this.i >= ev.length) { this.i = 0; this.loop++; }
    }
  };
  Playback.prototype.fadeOut = function (f) {
    var self = this, c = this.g.c, t = c.currentTime, p = this.out.gain;
    this.stopped = true;
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); }
    p.linearRampToValueAtTime(0.0001, t + Math.max(0.02, f));
    setTimeout(function () { try { self.out.disconnect(); } catch (e) { /* noop */ } }, (f + 3) * 1000);
  };
  function horizon() { return (G.document && G.document.hidden) ? 1.0 : 0.12; }
  function tick() {
    if (!ctx) return;
    var until = ctx.currentTime + horizon();
    playbacks = playbacks.filter(function (p) { return !p.stopped; });
    playbacks.forEach(function (p) { p.schedule(until); });
    if (!playbacks.length) { clearInterval(timer); timer = null; timerMs = 0; }
  }
  function ensureTimer() {
    var hid = G.document && G.document.hidden, ms = hid ? 250 : 25;
    if (timer && timerMs === ms) return;
    if (timer) clearInterval(timer);
    timer = setInterval(tick, ms); timerMs = ms;
  }

  // ---------- public API ----------
  function unlock() {
    var AC = G.AudioContext || G.webkitAudioContext;
    if (!AC) return Promise.resolve(false);
    try { if (G.navigator && G.navigator.audioSession) G.navigator.audioSession.type = 'playback'; } catch (e) { /* noop */ }
    if (!ctx) { ctx = new AC({ latencyHint: 'interactive' }); A = build(ctx); }
    var p = ctx.state === 'running' ? Promise.resolve() : ctx.resume();
    return Promise.resolve(p).then(function () {
      if (!unlocked) { unlocked = true; if (pending) { var pr = pending; pending = null; play(pr.id, pr.opts); } }
      return true;
    }, function () { return false; });
  }
  function play(id, opts) {
    opts = opts || {};
    var fade = opts.fade == null ? 0.8 : opts.fade;
    if (!TRACKS[id]) return false;
    if (!unlocked || !ctx) { pending = { id: id, opts: opts }; return true; }
    if (current === id && playbacks.some(function (p) { return p.id === id && !p.stopped; })) return true;
    playbacks.forEach(function (p) { p.fadeOut(fade); });
    var pb = new Playback(id, A, ctx.currentTime + 0.06, fade);
    playbacks.push(pb); current = id; ensureTimer(); tick();
    return true;
  }
  function stop(fade) {
    pending = null; current = null;
    playbacks.forEach(function (p) { p.fadeOut(fade == null ? 0.6 : fade); });
  }
  function applyGains() {
    if (!A) return;
    var t = ctx.currentTime;
    A.master.gain.setTargetAtTime(st.muted ? 0 : st.master, t, 0.03);
    A.music.gain.setTargetAtTime(st.music * 0.4, t, 0.03);
    A.sfx.gain.setTargetAtTime(st.sfx, t, 0.03);
  }
  function duck(t, dur) {
    if (!A) return;
    var p = A.duck.gain;
    p.cancelScheduledValues(t); p.setTargetAtTime(0.3, t, 0.04); p.setTargetAtTime(1, t + dur, 0.35);
  }
  function N(voice, pitch, t, dur, vel) {
    var h = start(A, voice, pitch, t, vel, A.sfx);
    if (h && dur != null && (!h.perc || h.perc > dur + 0.8)) h.off(t + dur);
    return h;
  }
  var SFX = {
    tap: function (t) { N('drums', 'click', t, null, 0.5); N('glock', 'E6', t, 0.1, 0.18); },
    select: function (t) { N('harp', 'A5', t, 0.6, 0.5); N('glock', 'E6', t + 0.05, 0.3, 0.22); },
    back: function (t) { N('harp', 'E5', t, 0.4, 0.45); N('harp', 'B4', t + 0.08, 0.5, 0.4); },
    page: function (t) { var c = A.c, n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); n.buffer = A.noise; f.type = 'bandpass'; f.Q.value = 1.5; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(4200, t + 0.18); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); n.connect(f); f.connect(g); g.connect(A.sfx); n.start(t); n.stop(t + 0.3); },
    correct: function (t) { N('ocarina', 'E5', t, 0.11, 0.6); N('ocarina', 'A5', t + 0.12, 0.32, 0.62); N('glock', 'A6', t + 0.12, 0.6, 0.35); N('harp', 'C#5', t + 0.12, 0.8, 0.35); },
    wrong: function (t) { N('flute', 'D4', t, 0.2, 0.3); N('flute', 'B3', t + 0.24, 0.36, 0.25); },
    rupee: function (t) { N('glock', 'G6', t, 0.2, 0.55); N('glock', 'D7', t + 0.07, 0.4, 0.5); },
    heart: function (t) { N('bell', 'C6', t, 0.4, 0.45); N('bell', 'G6', t + 0.1, 0.6, 0.45); N('harp', 'E5', t + 0.1, 0.8, 0.3); },
    unlock: function (t) { N('drums', 'click', t, null, 0.7); N('drums', 'click', t + 0.06, null, 0.5); N('bell', 'D6', t + 0.14, 0.8, 0.5); N('bell', 'A6', t + 0.14, 0.8, 0.3); },
    chest: function (t) {
      duck(t, 2.8);
      for (var i = 0; i < 14; i++) N('drums', 'frame', t + i * 0.07, null, 0.2 + i * 0.035);
      ['D4', 'A4', 'D5'].forEach(function (p) { var h = N('strings', p, t, null, 0.15); h && h.off(t + 1.05); });
      N('strings', 'E5', t + 0.5, 0.55, 0.28);
      var g = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'];
      g.forEach(function (p, j) { N('harp', p, t + 1.05 + j * 0.035, 1.5, 0.5); });
      ['C5', 'E5', 'G5', 'C6'].forEach(function (p) { N('strings', p, t + 1.35, 1.0, 0.3); });
      N('bell', 'G6', t + 1.35, 1.5, 0.5); N('bell', 'C7', t + 1.4, 1.5, 0.35); N('drums', 'tamb', t + 1.35, null, 0.6);
    },
    item: function (t) {
      duck(t, 2.4);
      [['F4', 'A4', 'C5'], ['G4', 'B4', 'D5'], ['A4', 'C5', 'E5']].forEach(function (c, j) { c.forEach(function (p) { N('horn', p, t + j * 0.16, j < 2 ? 0.14 : 0.9, 0.3); }); });
      N('ocarina', 'E6', t + 0.32, 0.25, 0.6); N('ocarina', 'A6', t + 0.58, 0.8, 0.65);
      N('bell', 'A6', t + 0.58, 1.6, 0.45); N('harp', 'A3', t + 0.32, 1.6, 0.5); N('drums', 'tamb', t + 0.32, null, 0.5);
    },
    levelup: function (t) {
      duck(t, 2.8);
      ['G4', 'C5', 'E5', 'G5', 'C6'].forEach(function (p, j) { N('harp', p, t + j * 0.08, 1.4, 0.55); N('glock', p, t + j * 0.08, 0.3, 0.25); });
      ['C4', 'G4', 'E5'].forEach(function (p) { N('strings', p, t + 0.42, 1.2, 0.3); });
      N('horn', 'G5', t + 0.42, 0.5, 0.4); N('horn', 'C6', t + 0.95, 0.9, 0.42); N('bell', 'C7', t + 0.95, 1.5, 0.35);
      N('drums', 'low', t + 0.42, null, 0.5); N('drums', 'tamb', t + 0.95, null, 0.5);
    },
    secret: function (t) {
      duck(t, 2.2);
      ['E6', 'C6', 'A5', 'F5'].forEach(function (p, j) { N('musicbox', p, t + j * 0.09, 0.8, 0.5); });
      ['F5', 'A5', 'C6', 'E6', 'G6'].forEach(function (p, j) { N('glock', p, t + 0.5 + j * 0.07, 0.8, 0.4); });
      ['F4', 'A4', 'C5', 'E5'].forEach(function (p) { N('pad', p, t + 0.5, 1.2, 0.3); });
    }
  };
  function sfx(nm) {
    if (!ctx || !unlocked || !SFX[nm]) return false;
    if (ctx.state !== 'running') ctx.resume();
    SFX[nm](ctx.currentTime + 0.01);
    return true;
  }
  function note(voice, pitch, o) {
    o = o || {};
    if (!ctx || !unlocked) return null;
    var t = o.at != null ? o.at : ctx.currentTime + (o.when || 0);
    var h = start(A, voice, pitch, t, o.vel == null ? 0.8 : o.vel, o.bus === 'music' ? A.music : A.sfx);
    if (h) h.off(t + (o.dur == null ? 0.4 : o.dur));
    return h;
  }
  function noteOn(voice, pitch, vel) {
    if (!ctx || !unlocked) return null;
    if (ctx.state !== 'running') ctx.resume();
    var h = start(A, voice, pitch, ctx.currentTime, vel == null ? 0.8 : vel, A.sfx);
    return h ? { off: function () { h.off(); } } : null;
  }
  function render(id, o) {
    o = o || {};
    var OAC = G.OfflineAudioContext || G.webkitOfflineAudioContext, secs = o.seconds || (o.sfx ? 3.5 : TRACKS[id] ? compile(id).len + 2 : 1), sr = o.sampleRate || 44100;
    if (!OAC || !(TRACKS[id] || SFX[o.sfx])) return Promise.reject(new Error('no offline context / unknown track'));
    var c = new OAC(2, Math.ceil(secs * sr), sr), g = build(c);
    if (o.sfx) { var keep = A; A = g; try { SFX[o.sfx](0.05); } finally { A = keep; } }
    else new Playback(id, g, 0.05, 0).schedule(secs);
    return c.startRendering();
  }

  // auto-unlock on first gesture; re-resume on later gestures if interrupted (iOS)
  function onGesture() { if (!ctx || ctx.state !== 'running') { if (!(G.document && G.document.hidden)) unlock(); } }
  if (G.addEventListener) ['pointerdown', 'keydown', 'touchend'].forEach(function (e) { G.addEventListener(e, onGesture, { capture: true, passive: true }); });
  if (G.document && G.document.addEventListener) G.document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (G.document.hidden) { wasRunning = ctx.state === 'running'; if (wasRunning) ctx.suspend(); }
    else if (wasRunning) { ctx.resume(); }
    if (timer) ensureTimer();
  });

  var api = {
    __kit: true, version: '2.0',
    unlock: unlock, play: play, stop: stop,
    current: function () { return current || (pending && pending.id) || null; },
    sfx: sfx, note: note, noteOn: noteOn, render: render,
    setVolume: function (v) { st.master = clamp(v); applyGains(); save(); },
    setMusicVolume: function (v) { st.music = clamp(v); applyGains(); save(); },
    setSfxVolume: function (v) { st.sfx = clamp(v); applyGains(); save(); },
    getVolume: function () { return st.master; },
    getVolumes: function () { return { master: st.master, music: st.music, sfx: st.sfx, muted: st.muted }; },
    mute: function (b) { st.muted = b == null ? true : !!b; applyGains(); save(); return st.muted; },
    toggleMute: function () { return api.mute(!st.muted); },
    isMuted: function () { return st.muted; },
    isUnlocked: function () { return unlocked; },
    context: function () { return ctx; },
    trackInfo: function () { return Object.keys(TRACKS).map(function (id) { var c = compile(id), t = TRACKS[id]; return { id: id, title: t.title, mood: t.mood, bpm: t.bpm, meter: t.meter + '/4', bars: c.bars, seconds: Math.round(c.len * 10) / 10 }; }); },
    tracks: {}, sfxNames: Object.keys(SFX), voices: Object.keys(VOICES),
    _debug: { tick: function () { tick(); }, compile: compile, TRACKS: TRACKS, RANGE: RANGE, midi: midi, name: name }
  };
  Object.keys(TRACKS).forEach(function (id) { var c = compile(id), t = TRACKS[id]; api.tracks[id] = { title: t.title, bpm: t.bpm, mood: t.mood, bars: c.bars, seconds: Math.round(c.len * 10) / 10 }; });
  G.HyruleMusic = api;
})();

;
/* Hyrule kit — ocarina.js
 * Five-note ocarina (D4 F4 A4 B4 D5) with big tappable buttons, keyboard keys, and a staff
 * strip showing the notes played. Uses HyruleMusic when present, else a tiny built-in voice.
 * Classic script, also valid as an ES module. Defines globalThis.HyruleOcarina.
 * No song detection for any existing game songs; apps may register their OWN songs via setSongs().
 */
(function () {
  'use strict';
  var G = typeof globalThis !== 'undefined' ? globalThis : window;
  if (G.HyruleOcarina && G.HyruleOcarina.__kit) return;

  var NOTES = [
    { n: 'D4', icon: 'A', shape: 'a', keys: ['1', 'a', ' '], codes: ['Space'], label: 'A / 1' },
    { n: 'F4', icon: '\u25BC', shape: 'c', keys: ['2', 's'], codes: ['ArrowDown'], label: '\u2193 / 2' },
    { n: 'A4', icon: '\u25B6', shape: 'c', keys: ['3', 'd'], codes: ['ArrowRight'], label: '\u2192 / 3' },
    { n: 'B4', icon: '\u25C0', shape: 'c', keys: ['4', 'f'], codes: ['ArrowLeft'], label: '\u2190 / 4' },
    { n: 'D5', icon: '\u25B2', shape: 'c', keys: ['5', 'g'], codes: ['ArrowUp'], label: '\u2191 / 5' }
  ];
  var MIN_HOLD = 0.14; // seconds: quick taps still sound

  var CSS = '' +
    '.hk-ocarina{--o-f9:var(--hk-forest-900,#0f2a1d);--o-f7:var(--hk-forest-700,#1f4a2e);--o-f5:var(--hk-forest-500,#3f7a3a);--o-leaf:var(--hk-leaf-300,#9cc06a);' +
    '--o-g5:var(--hk-gold-500,#d4a73c);--o-g3:var(--hk-gold-300,#f0d58a);--o-p1:var(--hk-parchment-100,#f6ecd2);--o-p3:var(--hk-parchment-300,#e3cf9f);' +
    '--o-wood:var(--hk-wood-700,#5a3a22);--o-ink:var(--hk-ink-900,#1b1a17);--o-navi:var(--hk-navi-300,#a9e4ff);--o-ruby:var(--hk-ruby-500,#c0392b);' +
    'font-family:var(--hk-font-body,"Nunito",system-ui,sans-serif);color:var(--o-ink);box-sizing:border-box;width:100%;max-width:760px;margin:0 auto;' +
    'background:linear-gradient(180deg,var(--o-p1),var(--o-p3));border:3px solid var(--o-wood);border-radius:18px;padding:14px 14px 16px;' +
    'box-shadow:inset 0 0 0 2px var(--o-g5),0 6px 18px rgba(0,0,0,.28);user-select:none;-webkit-user-select:none;touch-action:manipulation}' +
    '.hk-ocarina *{box-sizing:border-box}' +
    '.hk-ocarina .hk-o-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}' +
    '.hk-ocarina .hk-o-title{font-family:var(--hk-font-title,"Cinzel",Georgia,serif);font-weight:700;font-size:20px;letter-spacing:.04em;color:var(--o-f7)}' +
    '.hk-ocarina .hk-o-clear{font:inherit;font-weight:700;font-size:15px;min-height:40px;padding:6px 16px;border-radius:999px;border:2px solid var(--o-wood);' +
    'background:var(--o-p1);color:var(--o-wood);cursor:pointer}' +
    '.hk-ocarina .hk-o-clear:focus-visible,.hk-ocarina .hk-o-btn:focus-visible{outline:3px solid var(--o-f5);outline-offset:2px}' +
    '.hk-ocarina .hk-o-staff{position:relative;height:118px;border-radius:12px;background:var(--o-p1);border:2px solid var(--o-wood);overflow:hidden;margin-bottom:12px}' +
    '.hk-ocarina .hk-o-line{position:absolute;left:10px;right:10px;height:2px;background:rgba(90,58,34,.55)}' +
    '.hk-ocarina .hk-o-notes{position:absolute;inset:0;display:flex;align-items:stretch;justify-content:flex-start;padding:0 14px;gap:0}' +
    '.hk-ocarina .hk-o-slot{position:relative;flex:0 0 calc((100% - 28px)/var(--o-max,8));height:100%;animation:hkOIn .18s ease-out}' +
    '.hk-ocarina .hk-o-note{position:absolute;left:50%;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
    'font-weight:800;font-size:15px;line-height:1;border:2px solid var(--o-ink)}' +
    '.hk-ocarina .hk-o-note.a{background:var(--o-navi);color:var(--o-f9)}' +
    '.hk-ocarina .hk-o-note.c{background:var(--o-g3);color:var(--o-wood)}' +
    '.hk-ocarina .hk-o-name{position:absolute;bottom:3px;left:0;right:0;text-align:center;font-size:12px;font-weight:700;color:var(--o-wood)}' +
    '.hk-ocarina .hk-o-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:15px;color:var(--o-wood);opacity:.75}' +
    '.hk-ocarina .hk-o-pad{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}' +
    '.hk-ocarina .hk-o-btn{font:inherit;position:relative;min-height:84px;border-radius:16px;border:3px solid var(--o-wood);cursor:pointer;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:4px;padding:6px 2px;background:linear-gradient(180deg,var(--o-f5),var(--o-f7));color:var(--o-p1);' +
    'box-shadow:0 4px 0 var(--o-wood);transition:transform .06s,box-shadow .06s,background .06s;touch-action:none}' +
    '.hk-ocarina .hk-o-btn .hk-o-ic{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;border:2px solid var(--o-ink)}' +
    '.hk-ocarina .hk-o-btn.a .hk-o-ic{background:var(--o-navi);color:var(--o-f9)}' +
    '.hk-ocarina .hk-o-btn.c .hk-o-ic{background:var(--o-g3);color:var(--o-wood)}' +
    '.hk-ocarina .hk-o-btn .hk-o-nn{font-family:var(--hk-font-title,"Cinzel",Georgia,serif);font-weight:700;font-size:16px}' +
    '.hk-ocarina .hk-o-btn .hk-o-key{font-size:12px;font-weight:700;opacity:.9;background:rgba(15,42,29,.45);border-radius:6px;padding:1px 6px}' +
    '.hk-ocarina .hk-o-btn.on{transform:translateY(3px);box-shadow:0 1px 0 var(--o-wood);background:linear-gradient(180deg,var(--o-leaf),var(--o-f5))}' +
    '.hk-ocarina .hk-o-match{margin-top:10px;min-height:22px;text-align:center;font-family:var(--hk-font-title,"Cinzel",Georgia,serif);font-weight:700;color:var(--o-f7)}' +
    '.hk-ocarina.hk-o-small .hk-o-btn{min-height:70px}.hk-ocarina.hk-o-small .hk-o-btn .hk-o-key{display:none}' +
    '@media (max-width:520px){.hk-ocarina{padding:10px}.hk-ocarina .hk-o-pad{gap:6px}.hk-ocarina .hk-o-btn{min-height:76px;border-radius:14px}' +
    '.hk-ocarina .hk-o-btn .hk-o-ic{width:34px;height:34px;font-size:17px}.hk-ocarina .hk-o-btn .hk-o-nn{font-size:14px}.hk-ocarina .hk-o-btn .hk-o-key{font-size:11px;padding:1px 4px}' +
    '.hk-ocarina .hk-o-staff{height:104px}.hk-ocarina .hk-o-note{width:26px;height:26px;margin:-13px 0 0 -13px;font-size:13px}}' +
    '@keyframes hkOIn{from{transform:translateX(14px);opacity:0}to{transform:none;opacity:1}}' +
    '@media (prefers-reduced-motion:reduce){.hk-ocarina .hk-o-slot{animation:none}}';

  function injectCSS() {
    if (!G.document || G.document.getElementById('hk-ocarina-css')) return;
    var s = G.document.createElement('style'); s.id = 'hk-ocarina-css'; s.textContent = CSS;
    (G.document.head || G.document.documentElement).appendChild(s);
  }

  // fallback tiny voice when HyruleMusic is absent
  var fctx = null;
  function fallbackOn(nm) {
    var AC = G.AudioContext || G.webkitAudioContext; if (!AC) return null;
    if (!fctx) fctx = new AC(); if (fctx.state !== 'running') fctx.resume();
    var P = { D4: 62, F4: 65, A4: 69, B4: 71, D5: 74 }, f = 440 * Math.pow(2, (P[nm] - 69) / 12), t = fctx.currentTime;
    var o = fctx.createOscillator(), g = fctx.createGain(), l = fctx.createOscillator(), lg = fctx.createGain();
    o.type = 'sine'; o.frequency.value = f; l.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + 0.5);
    l.connect(lg); lg.connect(o.frequency); o.connect(g); g.connect(fctx.destination);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.04);
    o.start(t); l.start(t);
    return { off: function () { var e = fctx.currentTime; g.gain.cancelScheduledValues(e); g.gain.setValueAtTime(g.gain.value, e); g.gain.setTargetAtTime(0, e, 0.04); o.stop(e + 0.3); l.stop(e + 0.3); } };
  }
  function soundOn(nm) {
    var M = G.HyruleMusic;
    if (M && M.noteOn) {
      if (!M.isUnlocked || !M.isUnlocked()) M.unlock();
      return M.noteOn('ocarina', nm, 0.85);
    }
    return fallbackOn(nm);
  }

  function mount(container, opts) {
    if (typeof container === 'string') container = G.document.querySelector(container);
    if (!container) throw new Error('HyruleOcarina.mount: container not found');
    opts = opts || {};
    var useKeys = opts.keys !== false, showStaff = opts.showStaff !== false, maxShown = opts.maxShown || 8;
    injectCSS();
    var doc = G.document, root = doc.createElement('div');
    root.className = 'hk-ocarina' + (opts.size === 'small' ? ' hk-o-small' : '');
    root.style.setProperty('--o-max', String(maxShown));
    root.setAttribute('role', 'group'); root.setAttribute('aria-label', 'Ocarina');
    root.innerHTML = '<div class="hk-o-head"><div class="hk-o-title">' + (opts.title || 'Ocarina') + '</div>' +
      '<button type="button" class="hk-o-clear">Clear</button></div>' +
      (showStaff ? '<div class="hk-o-staff" aria-live="polite"><div class="hk-o-notes"></div><div class="hk-o-empty">Play a note!</div></div>' : '') +
      '<div class="hk-o-pad"></div><div class="hk-o-match" aria-live="polite"></div>';
    container.appendChild(root);
    var staff = root.querySelector('.hk-o-staff'), notesEl = root.querySelector('.hk-o-notes'), emptyEl = root.querySelector('.hk-o-empty');
    var pad = root.querySelector('.hk-o-pad'), matchEl = root.querySelector('.hk-o-match');
    // 5 staff lines; note y positions (D4 lowest .. D5 highest) as % of staff height
    var Y = { D4: 78, F4: 64, A4: 50, B4: 36, D5: 22 };
    if (staff) [22, 36, 50, 64, 78].forEach(function (y) { var l = doc.createElement('div'); l.className = 'hk-o-line'; l.style.top = 'calc(' + y + '% - 1px)'; staff.insertBefore(l, notesEl); });

    var history = [], songs = [], active = {}, btns = {}, destroyed = false;
    NOTES.forEach(function (N) {
      var b = doc.createElement('button');
      b.type = 'button'; b.className = 'hk-o-btn ' + N.shape; b.setAttribute('aria-label', 'Note ' + N.n + ' (key ' + N.label + ')');
      b.innerHTML = '<span class="hk-o-ic">' + N.icon + '</span><span class="hk-o-nn">' + N.n.replace(/\d/, '') + '</span>' + (useKeys ? '<span class="hk-o-key">' + N.label + '</span>' : '');
      pad.appendChild(b); btns[N.n] = b;
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        try { b.setPointerCapture(e.pointerId); } catch (x) { /* noop */ }
        press(N.n, 'p' + e.pointerId);
      });
      var up = function (e) { release(N.n, 'p' + e.pointerId); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); press(N.n, 'kEnter'); } });
      b.addEventListener('keyup', function (e) { if (e.key === 'Enter') release(N.n, 'kEnter'); });
    });

    function press(nm, src) {
      if (destroyed) return;
      var a = active[nm];
      if (a) { a.srcs[src] = 1; return; }
      var srcs = {}; srcs[src] = 1;
      active[nm] = { h: soundOn(nm), t: Date.now(), srcs: srcs };
      btns[nm].classList.add('on');
      record(nm);
    }
    function release(nm, src) {
      var a = active[nm]; if (!a) return;
      if (src) { delete a.srcs[src]; if (Object.keys(a.srcs).length) return; }
      delete active[nm];
      btns[nm].classList.remove('on');
      var left = MIN_HOLD * 1000 - (Date.now() - a.t);
      if (a.h) { if (left > 0) setTimeout(function () { a.h.off(); }, left); else a.h.off(); }
    }
    function releaseAll() { Object.keys(active).forEach(function (nm) { release(nm, null); }); }
    function record(nm) {
      history.push(nm); if (history.length > 200) history.shift();
      if (opts.onNote) try { opts.onNote(nm); } catch (e) { /* app error */ }
      draw(true);
      checkSongs();
    }
    function draw(animateLast) {
      if (!notesEl) return;
      var shown = history.slice(-maxShown);
      notesEl.innerHTML = '';
      emptyEl.style.display = shown.length ? 'none' : '';
      shown.forEach(function (nm, i) {
        var N = NOTES.filter(function (x) { return x.n === nm; })[0], s = doc.createElement('div');
        s.className = 'hk-o-slot'; if (!(animateLast && i === shown.length - 1)) s.style.animation = 'none';
        s.innerHTML = '<div class="hk-o-note ' + N.shape + '" style="top:' + Y[nm] + '%">' + N.icon + '</div><div class="hk-o-name">' + nm.replace(/\d/, '') + '</div>';
        notesEl.appendChild(s);
      });
    }
    var since = 0; // index after last match, so a song matches once per performance
    function checkSongs() {
      for (var i = 0; i < songs.length; i++) {
        var sg = songs[i], L = sg.notes.length;
        if (!L || history.length - since < L) continue;
        var tail = history.slice(-L), ok = true;
        for (var j = 0; j < L; j++) if (tail[j] !== sg.notes[j]) { ok = false; break; }
        if (ok) {
          since = history.length;
          matchEl.textContent = '\u2605 ' + (sg.name || sg.id) + ' \u2605';
          setTimeout(function () { if (!destroyed) matchEl.textContent = ''; }, 2500);
          if (sg.onMatch) try { sg.onMatch(sg); } catch (e) { /* app error */ }
          break;
        }
      }
    }
    function clear() { history = []; since = 0; matchEl.textContent = ''; draw(false); }
    root.querySelector('.hk-o-clear').addEventListener('click', clear);

    function typing(e) { var t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
    function keyNote(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return null;
      var k = (e.key || '').toLowerCase();
      for (var i = 0; i < NOTES.length; i++) if (NOTES[i].keys.indexOf(k) >= 0 || NOTES[i].codes.indexOf(e.code) >= 0) return NOTES[i].n;
      return null;
    }
    function kd(e) {
      if (typing(e) || (e.target && e.target.closest && e.target.closest('button') && e.key === ' ' && !root.contains(e.target))) return;
      var nm = keyNote(e); if (!nm) return;
      if (!root.isConnected) return;
      e.preventDefault(); if (e.repeat) return;
      press(nm, 'k' + (e.code || e.key));
    }
    function ku(e) { var nm = keyNote(e); if (nm) release(nm, 'k' + (e.code || e.key)); }
    function vis() { if (doc.hidden) releaseAll(); }
    if (useKeys) { G.addEventListener('keydown', kd); G.addEventListener('keyup', ku); }
    G.addEventListener('blur', releaseAll); doc.addEventListener('visibilitychange', vis);
    draw(false);

    return {
      el: root,
      destroy: function () {
        destroyed = true; releaseAll();
        if (useKeys) { G.removeEventListener('keydown', kd); G.removeEventListener('keyup', ku); }
        G.removeEventListener('blur', releaseAll); doc.removeEventListener('visibilitychange', vis);
        if (root.parentNode) root.parentNode.removeChild(root);
      },
      clear: clear,
      played: function () { return history.slice(); },
      setSongs: function (list) {
        songs = (list || []).filter(function (s) { return s && s.notes && s.notes.length; }).map(function (s) { return { id: s.id, name: s.name, notes: s.notes.slice(), onMatch: s.onMatch }; });
        since = history.length;
      },
      play: function (nm, ms) { if (!btns[nm]) return; press(nm, 'api'); setTimeout(function () { release(nm, 'api'); }, ms || 300); }
    };
  }

  G.HyruleOcarina = { __kit: true, version: '1.0', notes: NOTES.map(function (n) { return n.n; }), mount: mount };
})();
