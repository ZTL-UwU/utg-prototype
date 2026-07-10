const EDUCATION_YOUTUBE_VIDEOS = [
  { id: 'yfA6Ax_rQzs', title: 'Education video 1' },
  { id: 'R829Wy8RdQc', title: 'Education video 2' },
  { id: '-TGIBTeqKUY', title: 'Education video 3' },
  { id: 'GT1DnXsbrno', title: 'Education video 4' },
];

export function YoutubeEmbedOverlay() {
  return (
    <div className="flex size-full items-center justify-center py-[5%]">
      <div className="pointer-events-auto grid h-full w-full max-w-[75%] grid-cols-2 grid-rows-2 gap-8">
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
