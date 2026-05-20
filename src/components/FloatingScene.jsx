import { Canvas } from "@react-three/fiber";
import { Cloud, Environment, Float, Stars } from "@react-three/drei";

export default function FloatingScene({ theme }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-3 h-screen w-screen overflow-hidden opacity-90">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 55 }}
        gl={{ alpha: true }}
        style={{
          width: "100vw",
          height: "100vh",
          display: "block",
          overflow: "hidden",
        }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[2, 3, 5]} intensity={1.5} />

        <Environment preset="sunset" />

        <Stars
          radius={80}
          depth={30}
          count={400}
          factor={1.8}
          saturation={0}
          fade
          speed={0.35}
        />

        <Float speed={1} floatIntensity={1}>
          <Cloud
            position={[-4, 2, -2]}
            opacity={0.22}
            speed={0.2}
            width={10}
            depth={1.5}
            segments={12}
            color={theme.secondary}
          />
        </Float>

        <Float speed={1.4} floatIntensity={1.5}>
          <Cloud
            position={[4, -1, -1]}
            opacity={0.18}
            speed={0.3}
            width={12}
            depth={2}
            segments={12}
            color={theme.primary}
          />
        </Float>

        <Float speed={0.8} floatIntensity={0.6}>
          <Cloud
            position={[0, 0, -4]}
            opacity={0.1}
            speed={0.15}
            width={18}
            depth={1}
            segments={12}
            color="#ffffff"
          />
        </Float>
      </Canvas>
    </div>
  );
}




