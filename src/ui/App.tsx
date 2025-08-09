import React, { useEffect, useState } from 'react'
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
  const [tab, setTab] = useState<'tasks' | 'training' | 'eval' | 'settings'>('tasks')
  const [repo, setRepo] = useState('')
  const [model, setModel] = useState('')
  const [adapter, setAdapter] = useState('')
  const [dockerOk, setDockerOk] = useState(false)
  const [ragOk, setRagOk] = useState(false)
  const [toast, setToast] = useState('')
  const base = useBackendBase()

  useEffect(() => {
    fetch(`${base}/settings`).then(r => r.json()).then(d => {
      setModel(d.LOCAL_LLM || 'OpenAI')
      setAdapter(d.ADAPTER_PATH || '')
    }).catch(() => {})
    fetch(`${base}/health`).then(r => setDockerOk(r.ok)).catch(() => {
      setDockerOk(false)
      setToast('Backend unreachable')
    })
  }, [base])

  useEffect(() => {
    if (!repo) {
      setRagOk(false)
      return
    }
    const url = `${base}/rag/reindex?dry=true&repo_path=${encodeURIComponent(repo)}`
    fetch(url).then(r => setRagOk(r.ok)).catch(() => setRagOk(false))
  }, [base, repo])

  async function pickRepo() {
    try {
      // @ts-ignore
      if (window.__TAURI__ && window.__TAURI__.dialog) {
        // @ts-ignore
        const p = await window.__TAURI__.dialog.open({ directory: true })
        if (typeof p === 'string') setRepo(p)
        return
      }
    } catch (e) {}
    const p = prompt('Repo path?') || ''
    if (p) setRepo(p)
  }

  return (
    <div style={{ fontFamily: 'system-ui', padding: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button onClick={pickRepo}>Pick Repo</button>
        <input
          placeholder='Repo path'
          value={repo}
          onChange={e => setRepo(e.target.value)}
          style={{ flex: 1 }}
        />
        <span>Model: {model}{adapter ? ` / ${adapter}` : ''}</span>
        <span title='Docker' style={{ color: dockerOk ? 'green' : 'crimson' }}>●</span>
        <span title='RAG' style={{ color: ragOk ? 'green' : 'crimson' }}>●</span>
      </header>
      <nav style={{ marginBottom: 12 }}>
        <button onClick={() => setTab('tasks')}>Tasks</button>{' '}
        <button onClick={() => setTab('training')}>Training</button>{' '}
        <button onClick={() => setTab('eval')}>Eval</button>{' '}
        <button onClick={() => setTab('settings')}>Settings</button>
      </nav>
      {tab === 'tasks' && <Tasks base={base} defaultRepo={repo} onError={setToast} />}
      {tab === 'training' && <Training base={base} />}
      {tab === 'eval' && <Eval base={base} />}
      {tab === 'settings' && <Settings base={base} />}
      {toast && (
        <div
          style={{ position: 'fixed', bottom: 10, right: 10, background: '#333', color: '#fff', padding: 8 }}
          onClick={() => setToast('')}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
