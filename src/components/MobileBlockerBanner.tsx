const MOBILE_USER_AGENT = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export function MobileBlockerBanner() {
  if (!MOBILE_USER_AGENT.test(navigator.userAgent)) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 w-screen z-50 bg-[repeating-linear-gradient(-45deg,#f1f1f3_0,#f1f1f3_14px,#fafafb_14px,#fafafb_28px)]">
      <p className="p-4 text-center text-lg font-bold text-black">
        This experience works best on a tablet or desktop. Please use a larger screen to continue.
      </p>
    </div>
  );
}
