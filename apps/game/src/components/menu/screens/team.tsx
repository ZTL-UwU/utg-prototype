import { useState } from 'react';

import { BackButton } from '../../ui/BackButton';
import { CloseButton } from '../../ui/CloseButton';
import aaditPhoto from './team_photos/Aadit.jpg';
import danaPhoto from './team_photos/Dana.jpeg';
import jadePhoto from './team_photos/Jade.jpg';
import manasPhoto from './team_photos/Manas.jpg';
import nikitaPhoto from './team_photos/Nikita.jpg';
import patriciaPhoto from './team_photos/Patricia.jpg';
import tianliPhoto from './team_photos/tianli.jpg';
export interface MenuTeamScreenProps {
  onBack: () => void;
}

type TeamMember = {
  name: string;
  role: string;
  photo: string;
  from?: string;
  program?: string;
  favouriteStop?: string;
  funFact?: string;
};

const DESC_FIELDS = [
  { key: 'from', label: 'Where I’m from' },
  { key: 'program', label: 'Program + Major' },
  { key: 'favouriteStop', label: 'Favourite stop of the game' },
  { key: 'funFact', label: 'Fun fact' },
] as const;

const TEAM: TeamMember[] = [
  {
    name: 'Sai Manas Pandrangi',
    role: 'Software Lead',
    photo: manasPhoto,
    from: '🇮🇳',
    program: 'B.Sc. Computer Science',
    favouriteStop: 'Burn the naan, cuz i’ve done it in real life.',
    funFact:
      'I speak four languages - English, German, Hindi, & Telugu, with Telugu being my mother tongue.',
  },
  {
    name: 'Jade Dao',
    role: 'Media & Design Lead',
    photo: jadePhoto,
    from: '🇻🇳 🇨🇿 🇫🇷',
    program: 'Sciences Po Paris x UBC - Economics & Art History',
    favouriteStop:
      'The Two Little Goats 🐐 + Flying Jay 🐦 (shoutout to Niki who brought it to life)',
    funFact: 'I speak four languages - and learned a few Uyghur words this summer 🐪',
  },
  {
    name: 'Tianli Zhang',
    role: 'Software Developer',
    photo: tianliPhoto,
    from: '🇨🇳',
    program: 'B.ASc. Computer Engineering',
    favouriteStop: 'Sheep hop & Taklamakan Sandstorm',
  },
  {
    name: 'Nikita Prabhu',
    role: 'UI/UX Designer',
    photo: nikitaPhoto,
    from: '🇮🇳 🇧🇭',
    program: 'B.Sc. Statistics',
    favouriteStop: 'Burning the Naan and Whack a Mole',
    funFact: 'I can speak three languages and I love learning new words in different languages!',
  },
  {
    name: 'Aadit Shah',
    role: 'Software Developer',
    photo: aaditPhoto,
    from: '🇨🇦 🇮🇳',
    program: 'B.Sc. Computer Science + Statistics, Combined Major',
    favouriteStop: 'Flying Jay',
    funFact:
      'I can solve a Rubik’s Cube in under 15 seconds! I’ve been solving them since I was 10, and have ~30 puzzles in my collection.',
  },
  {
    name: 'Patricia Febi Widia Nugrahani',
    role: 'UI/UX Designer',
    photo: patriciaPhoto,
    from: '🇮🇩',
    program: 'B.A. International Relations and Minor in Economics',
    favouriteStop: 'Ski Race + Gumchen Story!',
    funFact: 'I am bilingual and I learn Korean Hangeul for fun!',
  },
  {
    name: 'Dana Turdy',
    role: 'Uyghur Language Advisor',
    photo: danaPhoto,
    from: '🇨🇦 🇨🇳',
    program: 'B.A. Political Science and Sociology',
    favouriteStop: 'The bazaar is so beautiful to look at!',
    funFact:
      'I am an Uyghur immigrant passionate about organizing social justice, travelling, eating good food, and going to see live music',
  },
];

export function MenuTeamScreen({ onBack }: MenuTeamScreenProps) {
  const [selected, setSelected] = useState<TeamMember | null>(null);

  return (
    <>
      <BackButton className="absolute top-4 left-4 z-10" onClick={onBack} />
      <h2 className="absolute top-4 right-14 left-14 flex h-10 items-center justify-center font-display text-3xl font-bold tracking-wide text-forest uppercase">
        Team
      </h2>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-2">
        <div className="flex min-h-full items-center justify-center">
          <div className="grid w-full grid-cols-2 gap-4 px-2">
            {TEAM.map((member) => (
              <button
                type="button"
                key={member.name}
                onClick={() => setSelected(member)}
                className="flex min-h-28 cursor-pointer items-center gap-4 rounded-[16px] border border-ink/15 bg-white px-5 py-5 text-left transition duration-100 hover:scale-[1.03] focus-visible:ring-4 focus-visible:ring-forest/40 focus-visible:outline-none"
              >
                <img
                  src={member.photo}
                  alt={member.name}
                  className="size-24 shrink-0 rounded-lg object-cover object-top"
                />
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold text-forest">{member.name}</p>
                  <p className="font-body text-base text-forest">{member.role}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected !== null && (
        <div
          className="absolute inset-0 z-20 grid place-items-center bg-black/40 p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <div className="relative flex w-full max-w-xl items-start gap-6 rounded-[16px] border border-ink/15 bg-white px-8 py-8">
            <CloseButton className="absolute top-2 right-2" onClick={() => setSelected(null)} />
            <img
              src={selected.photo}
              alt={selected.name}
              className="size-70 rounded-lg object-cover object-top"
            />
            <div className="min-w-0">
              <p className="font-display text-2xl font-semibold text-forest">{selected.name}</p>
              <p className="font-body text-lg text-forest">{selected.role}</p>
              {DESC_FIELDS.some(({ key }) => selected[key]) && (
                <ul className="mt-3 list-none space-y-1 p-0 font-body text-base text-forest">
                  {DESC_FIELDS.map(({ key, label }) => {
                    const value = selected[key];
                    if (!value) return null;
                    return (
                      <li key={key}>
                        <span className="font-semibold">{label}: </span>
                        {value}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
