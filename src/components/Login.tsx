import React, { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'

type Props = {
  onLoginSuccess: () => void
}

export default function Login({ onLoginSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      onLoginSuccess()
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#0f172a',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 40,
        maxWidth: 400,
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: 28, fontWeight: 700, color: '#0f172a' }}>
          🗺️ Australia Trip Planner
        </h1>
        <p style={{ margin: '0 0 24px 0', fontSize: 14, color: '#64748b' }}>
          {isSignUp ? 'Create an account to get started' : 'Sign in to continue'}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#334155' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#334155' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: 12,
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: 6,
              fontSize: 14,
              marginBottom: 16
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#94a3b8' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: 16
            }}
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
            }}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'transparent',
              color: '#2563eb',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </form>
      </div>
    </div>
  )
}
