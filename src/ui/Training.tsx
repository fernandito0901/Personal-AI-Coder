import React, { useEffect, useRef, useState } from 'react'

export function Training({ base }: { base: string }) {
  const [counts, setCounts] = useState<any>({})
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState('')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    fetch(`${base}/train/datasets`).then(r => r.json()).then(setCounts)
  }, [base])

  function start(kind: 'sft' | 'dpo') {
    fetch(`${base}/train/${kind}`, { method: 'POST' })
      .then(() => {
        setLogs(l => [...l, `${kind.toUpperCase()} started`])
        const ws = new WebSocket(`${base.replace('http', 'ws')}/train/${kind}/stream`)
        wsRef.current = ws
        ws.onmessage = ev => {
          try {
            const d = JSON.parse(ev.data)
            if (d.line) setLogs(l => [...l, d.line])
            if (d.result) setResult(d.result)
          } catch {
            setLogs(l => [...l, ev.data])
          }
        }
        ws.onclose = () => {
          wsRef.current = null
          setLogs(l => [...l, `${kind.toUpperCase()} finished`])
        }
      })
      .catch(() => setLogs(l => [...l, `${kind} failed to start`]))
  }

  function loadAdapter() {
    const p = prompt('Adapter path?') || ''
    if (!p) return
    fetch(`${base}/adapters/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: p }),
    }).then(() => setLogs(l => [...l, `Adapter loaded: ${p}`]))
  }

  return (
    <div>
      <div>
        Datasets:
        {Object.entries(counts).map(([k, v]) => (
          <span key={k} style={{ marginRight: 8 }}>
            {k}: <b>{v as any}</b>
          </span>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={() => start('sft')}>Start SFT</button>{' '}
        <button onClick={() => start('dpo')}>Start DPO</button>{' '}
        <button onClick={loadAdapter}>Load adapter</button>
      </div>
      {result && <div style={{ marginTop: 8 }}>Result: {result}</div>}
      <pre style={{ marginTop: 12, background: '#f7f7f7', padding: 8 }}>{logs.join('\n')}</pre>
    </div>
  )
}
