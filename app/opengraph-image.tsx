import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'JsonLab - Structured JSON workbench';
export const size = {
  width: 1200,
  height: 630
};
export const contentType = 'image/png';

const featurePills = ['Tree view', 'Diff tools', 'Schema validation', 'Type generation'];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, #06111f 0%, #0b1d34 42%, #07111d 72%, #050a13 100%)',
          color: '#f8fbff',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 16% 18%, rgba(14,165,233,0.34), transparent 30%), radial-gradient(circle at 84% 24%, rgba(16,185,129,0.24), transparent 26%), radial-gradient(circle at 72% 82%, rgba(59,130,246,0.14), transparent 28%), linear-gradient(to bottom, rgba(255,255,255,0.05), transparent 22%)'
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.65), transparent 85%)'
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 48,
            padding: '68px 72px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, flex: '0 0 52%' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                width: 'fit-content',
                padding: '12px 18px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.07)',
                boxShadow: '0 18px 50px rgba(2,8,23,0.28)'
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, #38bdf8 0%, #06b6d4 50%, #10b981 100%)',
                  boxShadow: '0 0 0 6px rgba(56,189,248,0.14)'
                }}
              />
              <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 0.2 }}>JsonLab</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 74,
                  lineHeight: 0.95,
                  letterSpacing: -3.5,
                  fontWeight: 800,
                  maxWidth: 560
                }}
              >
                Structured JSON workbench
              </h1>
              <p
                style={{
                  margin: 0,
                  maxWidth: 560,
                  fontSize: 28,
                  lineHeight: 1.32,
                  color: 'rgba(226,232,240,0.88)',
                  letterSpacing: -0.2
                }}
              >
                Inspect, compare, validate, and generate JSON with a calm interface built for fast decisions.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, maxWidth: 620 }}>
              {featurePills.map((pill) => (
                <div
                  key={pill}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 18px',
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#eff6ff',
                    fontSize: 22,
                    fontWeight: 600,
                    boxShadow: '0 14px 30px rgba(2,8,23,0.18)'
                  }}
                >
                  {pill}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              flex: '0 0 42%',
              minWidth: 0
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                padding: 28,
                borderRadius: 32,
                border: '1px solid rgba(255,255,255,0.14)',
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)',
                boxShadow: '0 28px 80px rgba(2,8,23,0.35)',
                backdropFilter: 'blur(18px)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 16, color: 'rgba(226,232,240,0.72)', textTransform: 'uppercase', letterSpacing: 2 }}>payload.json</span>
                  <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6 }}>Live structured view</span>
                </div>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 999,
                    background: 'rgba(16,185,129,0.16)',
                    color: '#a7f3d0',
                    fontSize: 18,
                    fontWeight: 700,
                    border: '1px solid rgba(16,185,129,0.24)'
                  }}
                >
                  Valid
                </div>
              </div>

              <div
                style={{
                  borderRadius: 24,
                  padding: 24,
                  background: 'rgba(2,6,23,0.52)',
                  border: '1px solid rgba(148,163,184,0.18)',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: 20,
                  lineHeight: 1.6,
                  color: '#dbeafe'
                }}
              >
                <div style={{ color: '#7dd3fc' }}>{'{'} </div>
                <div style={{ paddingLeft: 18 }}>
                  <span style={{ color: '#f9a8d4' }}>&quot;project&quot;</span>: <span style={{ color: '#c4b5fd' }}>&quot;JsonLab&quot;</span>,
                </div>
                <div style={{ paddingLeft: 18 }}>
                  <span style={{ color: '#f9a8d4' }}>&quot;state&quot;</span>: <span style={{ color: '#86efac' }}>&quot;ready&quot;</span>,
                </div>
                <div style={{ paddingLeft: 18 }}>
                  <span style={{ color: '#f9a8d4' }}>&quot;features&quot;</span>: [<span style={{ color: '#fda4af' }}>&quot;tree&quot;</span>, <span style={{ color: '#fda4af' }}>&quot;diff&quot;</span>, <span style={{ color: '#fda4af' }}>&quot;schema&quot;</span>],
                </div>
                <div style={{ paddingLeft: 18 }}>
                  <span style={{ color: '#f9a8d4' }}>&quot;depth&quot;</span>: <span style={{ color: '#93c5fd' }}>4</span>
                </div>
                <div style={{ color: '#7dd3fc' }}>{'}'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <div
                style={{
                  flex: 1,
                  padding: '22px 24px',
                  borderRadius: 28,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  boxShadow: '0 18px 50px rgba(2,8,23,0.22)'
                }}
              >
                <div style={{ fontSize: 16, color: 'rgba(226,232,240,0.72)', textTransform: 'uppercase', letterSpacing: 2 }}>Outputs</div>
                <div style={{ marginTop: 10, fontSize: 26, fontWeight: 700 }}>Tree, table, YAML, CSV</div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '22px 24px',
                  borderRadius: 28,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  boxShadow: '0 18px 50px rgba(2,8,23,0.22)'
                }}
              >
                <div style={{ fontSize: 16, color: 'rgba(226,232,240,0.72)', textTransform: 'uppercase', letterSpacing: 2 }}>Workflow</div>
                <div style={{ marginTop: 10, fontSize: 26, fontWeight: 700 }}>Inspect to share</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size
    }
  );
}