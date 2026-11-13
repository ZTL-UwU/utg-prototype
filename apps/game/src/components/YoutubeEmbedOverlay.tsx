import { m } from '../paraglide/messages.js';

const EDUCATION_YOUTUBE_VIDEOS = [
  { id: 'yfA6Ax_rQzs', title: m.education_video_title({ index: 1 }) },
  { id: 'R829Wy8RdQc', title: m.education_video_title({ index: 2 }) },
  { id: '-TGIBTeqKUY', title: m.education_video_title({ index: 3 }) },
  { id: 'GT1DnXsbrno', title: m.education_video_title({ index: 4 }) },
];

export function YoutubeEmbedOverlay() {
  return (
    <div className="flex size-full items-center justify-center py-[5%] max-sm:pt-24 max-sm:pb-4">
      <div className="pointer-events-auto grid h-full w-full max-w-[75%] grid-cols-2 grid-rows-2 gap-8 max-sm:max-w-[92%] max-sm:grid-cols-1 max-sm:grid-rows-4 max-sm:gap-3">
        {EDUCATION_YOUTUBE_VIDEOS.map((video, index) => (
          <iframe
            key={`${video.id}-${index}`}
            className="size-full rounded-2xl border-4 border-[#c98144] bg-black shadow-lg"
            src={`https://www.youtube.com/embed/${video.id}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ))}
      </div>
    </div>
  );
}
