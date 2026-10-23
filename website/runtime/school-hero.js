/* Injected into the existing public site's React bundle by optimize-school-public.py. */
function createSchoolHero(React, jsx, jsxs) {
  return function SchoolHero({scenes, locale = 'fr', className = ''}) {
    const scene = scenes[0];
    const videoRef = React.useRef(null);
    const [mobile, setMobile] = React.useState(() => window.matchMedia('(max-width: 860px)').matches);
    const [paused, setPaused] = React.useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const [blocked, setBlocked] = React.useState(false);
    const [painted, setPainted] = React.useState(false);
    const [failed, setFailed] = React.useState(false);
    const clip = mobile && scene?.mobileClip ? scene.mobileClip : scene?.clip;
    const poster = mobile && scene?.mobilePoster ? scene.mobilePoster : scene?.poster;
    const fr = locale === 'fr';

    React.useEffect(() => {
      const screen = window.matchMedia('(max-width: 860px)');
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const resize = () => setMobile(screen.matches);
      const preference = () => setPaused(motion.matches);
      screen.addEventListener('change', resize);
      motion.addEventListener('change', preference);
      return () => {
        screen.removeEventListener('change', resize);
        motion.removeEventListener('change', preference);
      };
    }, []);

    React.useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      let cancelled = false;
      video.muted = true;
      if (paused) video.pause();
      else video.play()?.catch(() => { if (!cancelled) setBlocked(true); });
      return () => { cancelled = true; };
    }, [clip, paused]);

    React.useEffect(() => { setPainted(false); setFailed(false); setBlocked(false); }, [clip]);

    function toggle() {
      const video = videoRef.current;
      if (!video) return;
      if (paused || blocked) {
        video.muted = true;
        // Call synchronously in the gesture for browsers which require a tap.
        video.play()?.then(() => { setPaused(false); setBlocked(false); }).catch(() => setBlocked(true));
      } else {
        video.pause();
        setPaused(true);
      }
    }

    if (!scene) return null;
    return jsxs('section', {id: scene.id, className: `school-hero ${className}`, children: [
      jsx('img', {className: 'school-hero__poster', src: poster, alt: '', loading: 'eager', fetchPriority: 'high', decoding: 'async'}),
      jsx('video', {ref: videoRef, src: clip, poster, muted: true, autoPlay: !paused, loop: true, playsInline: true,
        preload: 'auto', 'aria-hidden': true, tabIndex: -1, className: 'school-hero__video',
        style: {opacity: painted && !failed ? 1 : 0},
        onPlaying: () => { setPainted(true); setBlocked(false); },
        onError: () => { setFailed(true); setBlocked(true); }
      }),
      jsxs('div', {className: 'school-hero__copy', children: [
        jsx('h1', {children: scene.title}), jsx('p', {children: scene.body}),
        jsx('a', {href: '#planning', className: 'school-hero__cta', children: fr ? 'Trouver un cours ↗' : 'Find a class ↗'})
      ]}),
      !failed && jsx('button', {type: 'button', onClick: toggle, className: 'school-hero__control',
        'aria-label': paused || blocked ? (fr ? 'Lancer l’animation' : 'Play animation') : (fr ? 'Mettre l’animation en pause' : 'Pause animation'),
        children: paused || blocked ? (fr ? 'Lire l’animation ▶' : 'Play animation ▶') : 'Pause Ⅱ'
      })
    ]});
  };
}
