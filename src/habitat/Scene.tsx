import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { LinearFilter, ShaderMaterial, Texture, Vector2 } from 'three'
import type { HabitatKind, Plate, PlatePair } from './Habitat'
import { vertexShader, fragmentShader } from './shader'

type SceneProps = {
  pair: PlatePair
  pointer: RefObject<{ x: number; y: number }>
  active: boolean
  paused: boolean
  onReady: (ready: boolean) => void
  onLost: (lost: boolean) => void
}

const habitats: Record<HabitatKind, number> = { forest: 0, volcano: 1, pool: 2, grassland: 3 }

function textureFor(plate: Plate) {
  const texture = new Texture(plate.image)
  texture.minFilter = LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

function IllustratedTerrain({ pair, pointer, paused, active, onReady, onLost }: SceneProps) {
  const { gl, size, invalidate } = useThree()
  const textures = useMemo(() => {
    const current = textureFor(pair.current)
    const previous = pair.previous ? textureFor(pair.previous) : current
    return { incoming: current, outgoing: previous }
  }, [pair])

  const [uniforms] = useState(() => ({
    currentMap: { value: null as Texture | null },
    previousMap: { value: null as Texture | null },
    previousKind: { value: 0 },
    currentKind: { value: 0 },
    blend: { value: 1 },
    time: { value: 0 },
    aspect: { value: 1 },
    plateAspect: { value: 2.5 },
    pointerPosition: { value: new Vector2() },
  }))
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    [uniforms],
  )
  useEffect(() => () => material.dispose(), [material])
  const previousPaint = useRef(0)

  useLayoutEffect(() => {
    uniforms.currentMap.value = textures.incoming
    uniforms.previousMap.value = textures.outgoing
    uniforms.currentKind.value = habitats[pair.current.kind]
    uniforms.previousKind.value = habitats[pair.previous?.kind ?? pair.current.kind]
    uniforms.plateAspect.value = pair.current.image.naturalWidth / pair.current.image.naturalHeight
    uniforms.blend.value = pair.previous ? 0 : 1
    uniforms.time.value = 0
    previousPaint.current = 0
    invalidate()
    return () => {
      textures.incoming.dispose()
      if (textures.outgoing !== textures.incoming) textures.outgoing.dispose()
    }
  }, [pair, textures, uniforms, invalidate])

  useLayoutEffect(() => {
    uniforms.aspect.value = size.width / Math.max(size.height, 1)
    if (active) invalidate()
  }, [active, size, uniforms, invalidate, paused])

  useEffect(() => {
    const element = gl.domElement
    function lost(event: Event) {
      event.preventDefault()
      onLost(true)
    }
    element.addEventListener('webglcontextlost', lost)
    onReady(true)
    return () => {
      element.removeEventListener('webglcontextlost', lost)
      onReady(false)
    }
  }, [gl, onLost, onReady])

  useFrame((_, delta) => {
    // A suspended tab or offscreen exhibit must not advance simulation time.
    if (!active) return
    const elapsed = Math.min(delta, 0.08)
    if (uniforms.blend.value < 1) {
      // Use accumulated visible frames so a hidden tab can resume its fade.
      previousPaint.current += elapsed
      uniforms.blend.value = Math.min(1, previousPaint.current / 0.3)
      if (paused && uniforms.blend.value < 1) invalidate()
    }
    if (paused) return
    uniforms.time.value += elapsed
    const p = uniforms.pointerPosition.value
    const smoothing = 1 - Math.exp(-7 * elapsed)
    p.x += (pointer.current.x - p.x) * smoothing
    p.y += (pointer.current.y - p.y) * smoothing
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

let glSupported: boolean | undefined
function hasWebGL() {
  if (glSupported !== undefined) return glSupported
  // Some browsers expose the constructor even with hardware rendering disabled.
  try {
    const context = document.createElement('canvas').getContext('webgl2')
    glSupported = !!context
    context?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    glSupported = false
  }
  return glSupported
}

export default function Scene(props: SceneProps) {
  if (!hasWebGL()) return null
  return (
    <div className="habitat-webgl">
      <Canvas
        dpr={[1, 1.5]}
        frameloop={!props.active ? 'never' : props.paused ? 'demand' : 'always'}
        gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
        fallback={null}
      >
        <IllustratedTerrain {...props} />
      </Canvas>
    </div>
  )
}
