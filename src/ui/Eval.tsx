import React, { useState } from 'react'

interface EvalStats {
  pass_rate: number
  attempts: number
  total_secs: number
  history?: number[]
}

export function Eval({ base }: { base: string }) {
  const [tasks, setTasks] = useState(10)
  const [stats, setStats] = useState<EvalStats | null>(null)
  const [logs, setLogs] = useState('')

  function run() {
    setLogs('')
    setStats(null)
    fetch(`${base}/eval/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ num_tasks: tasks }),
    })
      .then(() => fetch(`${base}/eval/results/latest.json`))
      .then(r => r.json())
      .then(setStats)
      .catch(e => setLogs(String(e)))
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type='number'
          value={tasks}
          onChange={e => setTasks(parseInt(e.target.value || '10') || 10)}
          style={{ width: 80 }}
        />
        <button onClick={run}>Start</button>
      </div>
      {stats && (
        <div style={{ marginTop: 12 }}>
          <div>Pass rate: {stats.pass_rate}</div>
          <div>Attempts: {stats.attempts}</div>
          <div>Total secs: {stats.total_secs}</div>
          {stats.history && stats.history.length > 0 && (
            <svg width={120} height={30} style={{ marginTop: 8 }}>
              <polyline
                points={stats.history
                  .map((v, i) => `${(i / (stats.history!.length - 1 || 1)) * 120},${30 - v * 30}`)
                  .join(' ')}
                stroke='green'
                fill='none'
              />
            </svg>
          )}
          <div style={{ marginTop: 4 }}>
            <a href={`${base}/eval/results/latest.json`} target='_blank'>latest.json</a>
          </div>
        </div>
      )}
      {logs && <pre style={{ marginTop: 12 }}>{logs}</pre>}
    </div>
  )
}
