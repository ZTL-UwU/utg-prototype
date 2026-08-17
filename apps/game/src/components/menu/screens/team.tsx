import { BackButton } from '../../ui/BackButton';
import aaditPhoto from './team_photos/Aadit.jpg';
import jadePhoto from './team_photos/Jade.jpg';
import manasPhoto from './team_photos/Manas.jpg';
import nikitaPhoto from './team_photos/Nikita.jpg';
import patriciaPhoto from './team_photos/Patricia.jpg';
import tianliPhoto from './team_photos/tianli.jpg';

export interface MenuTeamScreenProps {
  onBack: () => void;
}

const TEAM = [
  { name: 'Sai Manas Pandrangi', role: 'Software Lead', photo: manasPhoto },
  { name: 'Jade Dao', role: 'Media & Design Lead', photo: jadePhoto },
  { name: 'Tianli Zhang', role: 'Software Developer', photo: tianliPhoto },
  { name: 'Nikita Prabhu', role: 'UI/UX Designer', photo: nikitaPhoto },
  { name: 'Aadit Shah', role: 'Software Developer', photo: aaditPhoto },
  { name: 'Patricia Febi Widia Nugrahani', role: 'UI/UX Designer', photo: patriciaPhoto },
];

export function MenuTeamScreen({ onBack }: MenuTeamScreenProps) {
  return (
    <>
      <BackButton className="absolute top-4 left-4 z-10" onClick={onBack} />
      <h2 className="absolute top-4 right-14 left-14 flex h-10 items-center justify-center font-display text-3xl font-bold tracking-wide text-forest uppercase">
        Team
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        <div className="flex min-h-full items-center justify-center">
          <div className="grid w-full grid-cols-2 gap-4">
            {TEAM.map((member) => (
              <div
                key={member.name}
                className="flex min-h-28 items-center gap-4 rounded-[16px] border border-ink/15 bg-white px-5 py-5"
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
