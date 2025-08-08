import React, { useEffect, useMemo, useRef, useState } from 'react'

export function Tasks({ base }: { base: string }) {
  const [repo, setRepo] = useState('')
  const [instr, setInstr] = useState('Fix failing pytest tests')
  const [iters, setIters] = useState(3)
  const [jobId, setJobId] = useState<string | null>(null)
  const [events, setEvents] = useState<any[]>([])

  function run() {
    fetch(`${base}/tasks/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo_path: repo, instruction: instr, max_iters: iters }) })
      .then(r => r.json())
      .then(d => setJobId(d.job_id))
  }

  useEffect(() => {
    if (!jobId) return
    const ws = new WebSocket(`${base.replace('http', 'ws')}/tasks/${jobId}/stream`)
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        setEvents(prev => [...prev, data])
      } catch {}
    }
    return () => ws.close()
  }, [jobId])

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input placeholder='Repo path' value={repo} onChange={e => setRepo(e.target.value)} style={{ width: 400 }} />
        <input placeholder='Instruction' value={instr} onChange={e => setInstr(e.target.value)} style={{ width: 400 }} />
        <input type='number' value={iters} onChange={e => setIters(parseInt(e.target.value||'3')||3)} style={{ width: 80 }} />
        <button onClick={run}>Run</button>
      </div>
      <div style={{ marginTop: 12, height: 480, overflow: 'auto', border: '1px solid #ddd', padding: 8 }}>
        {events.map((e, i) => (
          <div key={i}>
            <code>[e.type}]</code> {e.message || ''}
            {e.diff ? <pre style={{ background: '#f7f7f7', padding: 8 }}>{e.diff}</pre> : null}
            {e.stdout ? <pre>{e.stdout}</pre> : null}
            {e.stderr ? <pre style={{ color: 'crimson' }}>{e.stderr}</pre> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
