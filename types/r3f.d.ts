/**
 * R3F v8 + React 19 JSX type compatibility shim.
 *
 * @types/react@19 moved the JSX namespace from the global scope into
 * `declare namespace React { namespace JSX {} }`. R3F v8 only augments
 * the old `declare global { namespace JSX {} }`, so its ThreeElements
 * don't appear in React 19's type checker.
 *
 * This file re-declares the augmentation against React.JSX so that
 * `mesh`, `group`, `meshLambertMaterial`, etc. are recognised in .tsx files.
 */
import type { ThreeElements } from '@react-three/fiber'
import type React from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

export {}
