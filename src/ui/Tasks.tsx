import React, { useEffect, useRef, useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'

interface StreamEvent {
  type?: string
  message?: string
  stdout?: string
  stderr?: string
  diff?: any
  cost?: { calls?: number; tokens?: number }
}

export function Tasks({ base, defaultRepo, onError }: { base: string; defaultRepo?: string; onError?: (m: string) => void }) {
  const [repo, setRepo] = useState(defaultRepo || '')
  const [instr, setInstr] = useState('Fix failing pytest tests')
  const [iters, setIters] = useState(3)
  const [useTeacher, setUseTeacher] = useState(true)
  const [jobId, setJobId] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<StreamEvent[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [diff, setDiff] = useState<{ original: string; modified: string } | null>(null)
  const [cost, setCost] = useState<{ calls: number; tokens: number }>({ calls: 0, tokens: 0 })
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => setRepo(defaultRepo || ''), [defaultRepo])

  function run() {
    setTimeline([])
    setLogs([])
    setDiff(null)
    fetch(`${base}/tasks/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_path: repo, instruction: instr, max_iters: iters, use_aider: useTeacher }),
    })
      .then(r => r.json())
      .then(d => setJobId(d.job_id))
      .catch(() => onError && onError('Failed to start task'))
  }

  function stop() {
    if (!jobId) return
    fetch(`${base}/tasks/${jobId}/stop`, { method: 'POST' }).catch(() => {})
    wsRef.current?.close()
    setJobId(null)
  }

  useEffect(() => {
    if (!jobId) return
    const ws = new WebSocket(`${base.replace('http', 'ws')}/tasks/${jobId}/stream`)
    wsRef.current = ws
    ws.onmessage = ev => {
      try {
        const data: StreamEvent = JSON.parse(ev.data)
        if (data.type) {
          setTimeline(tl => [...tl, data])
        }
        if (data.stdout || data.stderr) {
          const line = (data.stdout || '') + (data.stderr || '')
          if (line) setLogs(l => [...l, line])
        }
        if (data.diff) {
          const before = typeof data.diff.before === 'string' ? data.diff.before : ''
          const after = typeof data.diff.after === 'string' ? data.diff.after : data.diff
          setDiff({ original: before, modified: after })
        }
        if (data.cost) {
          setCost(c => ({
            calls: data.cost?.calls ?? c.calls,
            tokens: data.cost?.tokens ?? c.tokens,
          }))
        }
      } catch (e) {}
    }
    ws.onclose = () => {
      wsRef.current = null
      if (jobId) onError && onError('Connection lost')
      setJobId(null)
    }
    return () => ws.close()
  }, [jobId, base])

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          placeholder='Repo path'
          value={repo}
          onChange={e => setRepo(e.target.value)}
          style={{ width: 260 }}
        />
        <input
          placeholder='Instruction'
          value={instr}
          onChange={e => setInstr(e.target.value)}
          style={{ flex: 1 }}
        />
        <input
          type='number'
          value={iters}
          onChange={e => setIters(parseInt(e.target.value || '3') || 3)}
          style={{ width: 80 }}
        />
        <label>
          <input type='checkbox' checked={useTeacher} onChange={e => setUseTeacher(e.target.checked)} /> use teacher
        </label>
        <button onClick={run} disabled={!!jobId}>Run</button>
        <button onClick={stop} disabled={!jobId}>Stop</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <h4>Timeline</h4>
          <ul>
            {timeline.map((e, i) => (
              <li key={i}>{e.type}{e.message ? `: ${e.message}` : ''}</li>
            ))}
          </ul>
        </div>
        <div style={{ flex: 1 }}>
          <h4>Console</h4>
          <pre style={{ background: '#f7f7f7', padding: 8, height: 200, overflow: 'auto' }}>
            {logs.join('\n')}
          </pre>
        </div>
      </div>

      {diff && (
        <div style={{ marginTop: 12 }}>
          <DiffEditor
            original={diff.original}
            modified={diff.modified}
            height='300px'
            language='diff'
            options={{ readOnly: true }}
          />
          <div style={{ marginTop: 8 }}>
            <button onClick={() => setDiff(null)}>Apply</button>{' '}
            <button onClick={() => setDiff(null)}>Discard</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        Teacher calls: {cost.calls} Tokens: {cost.tokens}
      </div>
    </div>
  )
}

