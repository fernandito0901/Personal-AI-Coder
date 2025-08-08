import React, { useEffect, useState } from 'react'

export function Training({ base }: { base: string }) {
  const [counts, setCounts] = useState<any>({})
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    fetch(`${base}/train/datasets`).then(r => r.json()).then(setCounts)
  }, [base])

  function sft() {
    fetch(`${base}/train/sft`, { method: 'POST' }).then(() => setLogs(l => [...l, 'SFT started']))
  }
  function dpo() {
    fetch(`${base}/train/dpo`, { method: 'POST' }).then(() => setLogs(l => [...l, 'DPO started']))
  }
  function loadAdapter() {
    const p = prompt('Adapter path?') || ''
    if (!p) return
    fetch(`${base}/adapters/load`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: p }) }).then(() => setLogs(l => [...l, `Adapter loaded: ${p}`]))
  }

  return (
    <div>
      <div>Datasets: {Object.entries(counts).map(([k,v]) => (<span key={k} style={{marginRight:8}}>{k}: <b>{v as any}</b></span>))}</div>
      <div style={{marginTop:8}}>
        <button onClick={sft}>Start SFT</button>{' '}
        <button onClick={dpo}>Start DPO</button>{' '}
        <button onClick={loadAdapter}>Load adapter</button>
      </div>
      <pre style={{marginTop:12, background:'#f7f7f7', padding:8}}>{logs.join('\n')}</pre>
    </div>
  )
}
