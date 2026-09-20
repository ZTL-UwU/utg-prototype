import { useState } from 'react';

import {
  BackButton,
  Button,
  CardTitle,
  CloseButton,
  Dialog,
  DialogDescription,
  DialogPopup,
  DialogTitle,
} from '../../ui';
import aaditPhoto from './team_photos/Aadit.jpg';
import danaPhoto from './team_photos/Dana.jpeg';
import jadePhoto from './team_photos/Jade.jpg';
import manasPhoto from './team_photos/Manas.jpg';
import nesibePhoto from './team_photos/Nesibe.jpeg';
import nikitaPhoto from './team_photos/Nikita.jpg';
import patriciaPhoto from './team_photos/Patricia.jpg';
import sarvenazPhoto from './team_photos/Sarvenaz.jpeg';
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
  bio?: string;
};

const DESC_FIELDS = [
  { key: 'from', label: 'Where I’m from' },
  { key: 'program', label: 'Program + Major' },
  { key: 'favouriteStop', label: 'Favourite stop of the game' },
  { key: 'funFact', label: 'Fun fact' },
  { key: 'bio', label: 'Journey with Sozler Seylisi' },
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
    name: 'Tianli Zhang',
    role: 'Software Developer',
    photo: tianliPhoto,
    from: '🇨🇳',
    program: 'B.ASc. Computer Engineering',
    favouriteStop: 'Sheep hop & Taklamakan Sandstorm',
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
    name: 'Nikita Prabhu',
    role: 'UI/UX Designer',
    photo: nikitaPhoto,
    from: '🇮🇳 🇧🇭',
    program: 'B.Sc. Statistics',
    favouriteStop: 'Burning the Naan and Whack a Mole',
    funFact: 'I can speak three languages and I love learning new words in different languages!',
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
    from: 'Uyghur, 🇨🇦',
    program: 'B.A. Political Science and Sociology',
    favouriteStop: 'The bazaar is so beautiful to look at!',
    funFact:
      'I am an Uyghur immigrant passionate about organizing social justice, travelling, eating good food, and going to see live music',
  },
  {
    name: 'Nesibe Sherif',
    role: 'Voiceover Artist',
    photo: nesibePhoto,
    from: 'Uyghur, 🇹🇷',
    program: "University of health sciences, Türkiye - Master's In Pharmacy",
    bio: 'It has been an absolute honor to lend my voice to this project. Hearing our mother tongue spoken, celebrated, and learned through play is a gift to Uyghur children everywhere. Thank you to the entire team for creating a space where our language and culture can thrive for generations to come.',
  },
  {
    name: 'Sarvenaz Nurly',
    role: 'Project Coordinator',
    photo: sarvenazPhoto,
    from: 'Uyghur, 🇨🇦',
    favouriteStop: 'Making the Tunoor nan!!',
    funFact:
      'I love hiking, travelling, and, most of all, filming and turning the moments I spend with my loved ones into videos and little edits that we can look back on and relive the memories we made together!',
  },
];

export function MenuTeamScreen({ onBack }: MenuTeamScreenProps) {
  const [selected, setSelected] = useState<TeamMember | null>(null);

  return (
    <>
      <BackButton className="absolute top-4 left-4 z-10" onClick={onBack} />
      <CardTitle className="absolute top-4 right-14 left-14 flex h-10 items-center justify-center">
        Team
      </CardTitle>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-2">
        <div className="flex min-h-full justify-center">
          <div className="grid w-full auto-rows-fr grid-cols-3 gap-5 px-2">
            {TEAM.map((member) => (
              <Button
                key={member.name}
                variant="ghost"
                data-slot="team-card"
                onClick={() => setSelected(member)}
                className="min-h-40 items-center gap-5 rounded-[16px] border border-ink/15 bg-white px-6 py-5 text-left hover:scale-[1.03]"
              >
                <img
                  src={member.photo}
                  alt={member.name}
                  className="size-32 shrink-0 rounded-lg object-cover object-top xl:size-40"
                />
                <div className="min-w-0">
                  <p className="font-display text-xl font-semibold text-forest xl:text-2xl">
                    {member.name}
                  </p>
                  <p className="font-body text-base text-forest xl:text-lg">{member.role}</p>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected !== null && (
          <DialogPopup variant="panel">
            <CloseButton className="absolute top-2 right-2" />
            <div className="flex w-full items-start gap-8">
              <img
                src={selected.photo}
                alt={selected.name}
                className="size-80 shrink-0 rounded-lg object-cover object-top xl:size-96"
              />
              <div className="min-w-0">
                <DialogTitle className="text-left font-display text-3xl font-semibold text-forest normal-case xl:text-4xl">
                  {selected.name}
                </DialogTitle>
                <DialogDescription className="text-left font-body text-xl text-forest">
                  {selected.role}
                </DialogDescription>
                {DESC_FIELDS.some(({ key }) => selected[key]) && (
                  <ul className="mt-4 flex list-none flex-col gap-2 p-0 font-body text-lg text-forest xl:text-xl">
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
          </DialogPopup>
        )}
      </Dialog>
    </>
  );
}
