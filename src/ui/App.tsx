import React, { useEffect, useMemo, useState } from 'react'
import { Tasks } from './Tasks'
import { Training } from './Training'
import { Eval } from './Eval'
import { Settings } from './Settings'

function useBackendBase() {
  const [base, setBase] = useState('http://127.0.0.1:5173')
  useEffect(() => {
    // In Tauri, we can call the command; in browser dev, assume default
    // @ts-ignore
    if (window.__TAURI__) {
      // @ts-ignore
      window.__TAURI__.invoke('backend_url').then((u: string) => setBase(u))
    }
  }, [])
  return base
}

export default function App() {
  const [tab, setTab] = useState<'tasks'|'training'|'eval'|'settings'>('tasks')
  const base = useBackendBase()

  return (
    <div style={{ fontFamily: 'system-ui', padding: 16 }}>
      <h2>AI Coder</h2>
      <nav style={{ marginBottom: 12 }}>
        <button onClick={() => setTab('tasks')}>Tasks</button>{' '}
        <button onClick={() => setTab('training')}>Training</button>{' '}
        <button onClick={() => setTab('eval')}>Eval</button>{' '}
        <button onClick={() => setTab('settings')}>Settings</button>
      </nav>
      {tab === 'tasks' && <Tasks base={base} />}
      {tab === 'training' && <Training base={base} />}
      {tab === 'eval' && <Eval base={base} />}
      {tab === 'settings' && <Settings base={base} />}
    </div>
  )
}
