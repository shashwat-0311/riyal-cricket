/**
 * Three stumps + two bails at one end of the pitch.
 *
 * Standard dimensions (scaled to scene units):
 *   Stump height : 0.71 m → 0.71 units
 *   Stump radius : 0.019 m → 0.019 units (thin but visible at this scale)
 *   Stump spacing: 0.228 m → 0.228 units (between inner edges; place at ±0.114 and 0)
 *   Bail length  : 0.108 m → 0.108 units (each bail bridging two stumps)
 *
 * The group origin sits at ground level at the stump line Z.
 */

const STUMP_H      = 0.71
const STUMP_R      = 0.022
const STUMP_SEG    = 10
const STUMP_X      = [-0.228, 0, 0.228] as const

const BAIL_R       = 0.014
const BAIL_LEN     = 0.218  // slightly longer than gap so it rests in grooves
const BAIL_Y       = STUMP_H + BAIL_R  // sits just above stump tops
const BAIL_SEG     = 8
const BAIL_MID_X   = 0                 // centre of both bails

const STUMP_COLOR  = '#f8f8f0'  // off-white
const BAIL_COLOR   = '#d4a85a'  // light wood

interface Props {
  position: [number, number, number]
}

export function Stumps({ position }: Props) {
  return (
    <group position={position}>
      {/* Three stumps */}
      {STUMP_X.map((x, i) => (
        <mesh
          key={i}
          position={[x, STUMP_H / 2, 0]}
          castShadow
        >
          <cylinderGeometry args={[STUMP_R, STUMP_R, STUMP_H, STUMP_SEG]} />
          <meshLambertMaterial color={STUMP_COLOR} />
        </mesh>
      ))}

      {/* Left bail: bridges off-stump to middle-stump */}
      <mesh
        position={[-0.114, BAIL_Y, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[BAIL_R, BAIL_R, BAIL_LEN, BAIL_SEG]} />
        <meshLambertMaterial color={BAIL_COLOR} />
      </mesh>

      {/* Right bail: bridges middle-stump to leg-stump */}
      <mesh
        position={[0.114, BAIL_Y, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[BAIL_R, BAIL_R, BAIL_LEN, BAIL_SEG]} />
        <meshLambertMaterial color={BAIL_COLOR} />
      </mesh>
    </group>
  )
}
