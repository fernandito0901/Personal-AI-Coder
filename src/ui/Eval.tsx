import React, { useState } from 'react'

export function Eval({ base }: { base: string }) {
  const [out, setOut] = useState<string>('')
  function run() {
    fetch(`${base}/eval/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo_path: '' }) })
      .then(r => r.json()).then(d => setOut((d.stdout || '') + (d.stderr || '')))
  }
  return (
    <div>
      <button onClick={run}>Run Eval</button>
      <pre style={{marginTop:12, background:'#f7f7f7', padding:8, maxHeight:400, overflow:'auto'}}>{out}</pre>
    </div>
  )
}
