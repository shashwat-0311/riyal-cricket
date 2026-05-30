/**
 * Ground plane + pitch strip.
 *
 * Coordinate system:
 *   +X  right,  +Y  up,  +Z  towards camera (batter end)
 *   Pitch runs along Z: bowling end at z=-HALF_LEN, batting end at z=+HALF_LEN
 */

export const PITCH_HALF_LEN = 10   // half the full 20-unit pitch length
export const PITCH_HALF_W   = 1.52 // half the 3.04-unit pitch width (≈ 10 ft)
export const OUTFIELD_SIZE  = 60   // large flat plane for the outfield

export function Pitch() {
  return (
    <group>
      {/* Outfield — deep green */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.002, 0]}
        receiveShadow
      >
        <planeGeometry args={[OUTFIELD_SIZE, OUTFIELD_SIZE]} />
        <meshLambertMaterial color="#1d4a14" />
      </mesh>

      {/* Pitch strip — tan/brown */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[PITCH_HALF_W * 2, PITCH_HALF_LEN * 2]} />
        <meshLambertMaterial color="#b8956a" />
      </mesh>

      {/* Subtle pitch edge shadow to show depth */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
      >
        <planeGeometry args={[PITCH_HALF_W * 2 + 0.1, PITCH_HALF_LEN * 2 + 0.1]} />
        <meshLambertMaterial color="#8c6a3a" transparent opacity={0.4} />
      </mesh>
    </group>
  )
}
