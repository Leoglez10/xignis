import Logo3D from './components/Logo3D.jsx';

const styles = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden'
  },
  stage: {
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
    justifyContent: 'flex-end',
    pointerEvents: 'none'
  },
  tagline: {
    marginBottom: '8%',
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
      <div style={styles.stage}>
        <Logo3D
          color="#08EF01"
          glowColor="#08EF01"
          glow={true}
          depth={0.42}
          floatIntensity={1}
          parallax={0.22}
        />
      </div>
      <main style={styles.overlay}>
        <p style={styles.tagline}>Proximamente</p>
      </main>
    </div>
  );
}
