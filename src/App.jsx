import LightRays from './components/LightRays.jsx';
import TextPressure from './components/TextPressure.jsx';

const styles = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%'
  },
  background: {
    position: 'absolute',
    inset: 0
  },
  overlay: {
    position: 'relative',
    zIndex: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem',
    pointerEvents: 'none'
  },
  titleWrap: {
    width: 'min(70vw, 520px)',
    height: '120px'
  },
  tagline: {
    position: 'absolute',
    bottom: '8%',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 'clamp(0.75rem, 2vw, 1rem)',
    fontWeight: 400,
    letterSpacing: '0.45em',
    textTransform: 'uppercase',
    color: 'rgba(8, 239, 1, 0.55)',
    whiteSpace: 'nowrap'
  }
};

export default function App() {
  return (
    <div style={styles.root}>
      <div style={styles.background}>
        <LightRays
          raysOrigin="top-center"
          raysColor="#08EF01"
          raysSpeed={0.6}
          lightSpread={0.8}
          rayLength={1.2}
          fadeDistance={1}
          saturation={1}
          followMouse={true}
          mouseInfluence={0.1}
          noiseAmount={0.05}
          distortion={0.05}
        />
      </div>
      <main style={styles.overlay}>
        <div style={styles.titleWrap}>
          <TextPressure
            text="Xignis"
            textColor="#08EF01"
            flex={true}
            alpha={false}
            stroke={false}
            width={true}
            weight={true}
            italic={true}
            minFontSize={36}
          />
        </div>
        <p style={styles.tagline}>Proximamente</p>
      </main>
    </div>
  );
}
