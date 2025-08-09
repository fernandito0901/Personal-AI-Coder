import React, { useEffect, useState } from 'react'

export function Settings({ base }: { base: string }) {
  const [repo, setRepo] = useState('')
  const [testCmd, setTestCmd] = useState('pytest -q')
  const [docker, setDocker] = useState(true)
  const [local, setLocal] = useState('')
  const [adapter, setAdapter] = useState('')
  const [tries, setTries] = useState(0)
  const [tokenCap, setTokenCap] = useState(0)
  const [openai, setOpenai] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch(`${base}/settings`).then(r => r.json()).then(d => {
      setRepo(d.REPO_PATH || '')
      setTestCmd(d.TEST_CMD || 'pytest -q')
      setDocker((d.USE_DOCKER || 'true') === 'true')
      setLocal(d.LOCAL_LLM || '')
      setAdapter(d.ADAPTER_PATH || '')
      setTries(parseInt(d.TRIES_BEFORE_TEACHER || '0') || 0)
      setTokenCap(parseInt(d.TEACHER_TOKEN_CAP || '0') || 0)
    })
  }, [base])

  function save() {
    setMsg('')
    fetch(`${base}/settings/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        REPO_PATH: repo,
        TEST_CMD: testCmd,
        USE_DOCKER: docker,
        LOCAL_LLM: local,
        ADAPTER_PATH: adapter,
        TRIES_BEFORE_TEACHER: tries,
        TEACHER_TOKEN_CAP: tokenCap,
        OPENAI_API_KEY: openai || undefined,
      }),
    }).then(() => setMsg('Saved'))
  }

  function reindex() {
    fetch(`${base}/rag/reindex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_path: repo }),
    })
      .then(r => r.json())
      .then(d => setMsg(`Indexed: ${d.count}`))
      .catch(() => setMsg('Index error'))
  }

  function test(url: string) {
    fetch(url)
      .then(r => setMsg(r.ok ? 'OK' : 'Fail'))
      .catch(() => setMsg('Fail'))
  }

  return (
    <div>
      <div>
        <label>Repo path </label>
        <input value={repo} onChange={e => setRepo(e.target.value)} style={{ width: 300 }} />
      </div>
      <div>
        <label>Test command </label>
        <input value={testCmd} onChange={e => setTestCmd(e.target.value)} style={{ width: 300 }} />
      </div>
      <div>
        <label>Use Docker </label>
        <input type='checkbox' checked={docker} onChange={e => setDocker(e.target.checked)} />
      </div>
      <div>
        <label>Local model </label>
        <input value={local} onChange={e => setLocal(e.target.value)} />
      </div>
      <div>
        <label>Adapter path </label>
        <input value={adapter} onChange={e => setAdapter(e.target.value)} style={{ width: 300 }} />
      </div>
      <div>
        <label>Tries before teacher </label>
        <input type='number' value={tries} onChange={e => setTries(parseInt(e.target.value || '0') || 0)} style={{ width: 60 }} />
      </div>
      <div>
        <label>Teacher token cap </label>
        <input type='number' value={tokenCap} onChange={e => setTokenCap(parseInt(e.target.value || '0') || 0)} style={{ width: 80 }} />
      </div>
      <div>
        <label>OpenAI API Key (stored securely) </label>
        <input value={openai} onChange={e => setOpenai(e.target.value)} type='password' />
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={save}>Save</button>{' '}
        <button onClick={reindex}>Reindex</button>{' '}
        <button onClick={() => test(`${base}/health/docker`)}>Test Docker</button>{' '}
        <button onClick={() => test(`${base}/health/openai`)}>Test OpenAI</button>{' '}
        <button onClick={() => test(`${base}/health/ollama`)}>Test Ollama</button>
      </div>
      {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  )
}
